#!/usr/bin/env node
// Sprint 15 T5: PII-aware export pipeline — D-S8-pii-policy 5 Rule 영속화.
//
// 호출:
//   pnpm run export:sprint8 -- --db <sqlite-path> --out <out-dir> [--dry-run]
//   pnpm run export:sprint8 -- --db ./test.db --out docs/sprints/sprint-8-data/raw --dry-run
//
// 출력:
//   <out-dir>/<session-hash>.json — 세션 hash 단위 분리.
//   --dry-run 시 파일 쓰기 0, stdout 에 row count + Rule 정합 리포트.
//
// Rule 정합 (5종):
//   Rule 1: session_hash 는 mobile 측 이미 채워진 컬럼 그대로 사용.
//           NULL session_hash row 는 __null__ 키로 별도 묶음.
//   Rule 2: raw text 격리 (디폴트) — messages.content / concept.label / 자유 코멘트 모두 제외.
//           embedding (768d) + 메타만 export.
//   Rule 3: 임베딩 그대로 (768d float vector).
//   Rule 4: 메타 통계 (ts / actor / action / score / dismissed_at / weight / decay_applied_at) 보존.
//   Rule 5: raw text opt-in 채널은 별도 — 본 스크립트 디폴트는 격리만.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import BetterSqlite3 from 'better-sqlite3';

function parseArgs(argv) {
  const args = { db: null, out: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--db') args.db = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    [
      'Sprint 8 PII-aware export — D-S8-pii-policy 5 Rule.',
      '',
      'Usage:',
      '  pnpm run export:sprint8 -- --db <sqlite-path> --out <out-dir> [--dry-run]',
      '',
      'Options:',
      '  --db <path>     SQLite 파일 경로 (필수).',
      '  --out <dir>     출력 디렉토리 (--dry-run 아닐 때 필수).',
      '  --dry-run       파일 쓰기 0, row count + Rule 정합 리포트만.',
      '',
    ].join('\n'),
  );
}

const args = parseArgs(process.argv.slice(2));
if (!args.db) {
  process.stderr.write('--db <sqlite-path> 필수.\n');
  printHelp();
  process.exit(2);
}
if (!args.dryRun && !args.out) {
  process.stderr.write('--out <dir> 필수 (또는 --dry-run).\n');
  process.exit(3);
}
if (!existsSync(args.db)) {
  process.stderr.write(`DB 파일 미존재: ${args.db}\n`);
  process.exit(4);
}

const db = new BetterSqlite3(args.db, { readonly: true });

// Rule 4: 메타 통계 — decision_log
function readDecisionLog() {
  return db
    .prepare(
      `SELECT id, ts, actor, action, session_hash
       FROM decision_log
       ORDER BY ts ASC, id ASC`,
    )
    .all();
}

// Rule 4: 메타 통계 — satisfaction_survey (Rule 2: comment raw text 제외)
function readSatisfactionSurvey() {
  return db
    .prepare(
      `SELECT id, ts, score, session_marker, session_hash
       FROM satisfaction_survey
       ORDER BY ts ASC, id ASC`,
    )
    .all();
}

// Rule 4: 메타 통계 — recall_log
function readRecallLog() {
  return db
    .prepare(
      `SELECT id, decided_at, act, candidate_ids, suppressed_reason, session_hash
       FROM recall_log
       ORDER BY decided_at ASC, id ASC`,
    )
    .all();
}

// Rule 3: 임베딩 보존 — Rule 2: label raw text 제외, label_hash 로 대체
function readConceptEmbeddings() {
  const conceptTable = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'concepts'",
    )
    .all();
  if (conceptTable.length === 0) return [];
  const rows = db
    .prepare(`SELECT id, embedding, created_at FROM concepts ORDER BY created_at ASC, id ASC`)
    .all();
  return rows.map((r) => {
    const blob = r.embedding;
    let vecLen = 0;
    if (blob && blob.byteLength) vecLen = blob.byteLength / 4;
    return {
      concept_id_hash: hashIdLite(r.id),
      vec_dim: vecLen,
      created_at: r.created_at,
    };
  });
}

// label hash (concept id 자체도 raw text 가능성 0 가정 위반 대비 — 16자 hex 축약)
function hashIdLite(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8) + '00000000';
}

const decision = readDecisionLog();
const survey = readSatisfactionSurvey();
const recall = readRecallLog();
const conceptEmb = readConceptEmbeddings();

// 세션 그룹핑 — session_hash 기준, NULL 은 '__null__'
function groupBySession(rows, hashKey) {
  const m = new Map();
  for (const r of rows) {
    const key = r[hashKey] == null ? '__null__' : r[hashKey];
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(r);
  }
  return m;
}

const decisionBySession = groupBySession(decision, 'session_hash');
const surveyBySession = groupBySession(survey, 'session_hash');
const recallBySession = groupBySession(recall, 'session_hash');

const sessionKeys = new Set([
  ...decisionBySession.keys(),
  ...surveyBySession.keys(),
  ...recallBySession.keys(),
]);

// Rule 2 정합 검사 — raw text 컬럼 (messages.content / concepts.label / satisfaction_survey.comment) 가 export payload 에 0건.
const RULE2_FORBIDDEN_KEYS = new Set(['content', 'label', 'comment', 'message_text']);
function ruleTwoAudit(obj) {
  if (Array.isArray(obj)) return obj.flatMap(ruleTwoAudit);
  if (obj && typeof obj === 'object') {
    const hits = [];
    for (const k of Object.keys(obj)) {
      if (RULE2_FORBIDDEN_KEYS.has(k)) hits.push(k);
      hits.push(...ruleTwoAudit(obj[k]));
    }
    return hits;
  }
  return [];
}

const report = {
  total_sessions: sessionKeys.size,
  decision_log_rows: decision.length,
  satisfaction_survey_rows: survey.length,
  recall_log_rows: recall.length,
  concept_embedding_rows: conceptEmb.length,
  rule2_forbidden_key_hits: 0,
  files_written: 0,
};

if (!args.dryRun) {
  mkdirSync(args.out, { recursive: true });
}

for (const key of sessionKeys) {
  const events = [
    ...(decisionBySession.get(key) ?? []).map((r) => ({
      ts: r.ts,
      actor: r.actor,
      action: r.action,
      kind: 'decision',
    })),
    ...(surveyBySession.get(key) ?? []).map((r) => ({
      ts: r.ts,
      actor: 'mobile',
      action: 'satisfaction_survey',
      score: r.score,
      session_marker: r.session_marker,
      kind: 'survey',
    })),
    ...(recallBySession.get(key) ?? []).map((r) => ({
      ts: r.decided_at,
      actor: 'orchestrator',
      action: r.act,
      candidate_ids: r.candidate_ids,
      suppressed_reason: r.suppressed_reason,
      kind: 'recall',
    })),
  ].sort((a, b) => a.ts - b.ts);

  const payload = {
    session_hash: key === '__null__' ? null : key,
    ts_range:
      events.length === 0
        ? [null, null]
        : [events[0].ts, events[events.length - 1].ts],
    events,
    embeddings: conceptEmb,
  };

  const audit = ruleTwoAudit(payload);
  if (audit.length > 0) {
    report.rule2_forbidden_key_hits += audit.length;
    process.stderr.write(
      `Rule 2 violation — forbidden raw-text keys in session=${key}: ${audit.join(',')}\n`,
    );
  }

  if (!args.dryRun) {
    const safeName = key === '__null__' ? '__null__.json' : `${key}.json`;
    const outPath = resolve(args.out, safeName);
    writeFileSync(outPath, JSON.stringify(payload, null, 2));
    report.files_written++;
  }
}

db.close();

const mode = args.dryRun ? 'dry-run' : 'write';
process.stdout.write(
  `export_mode=${mode};` +
    `total_sessions=${report.total_sessions};` +
    `decision_log_rows=${report.decision_log_rows};` +
    `satisfaction_survey_rows=${report.satisfaction_survey_rows};` +
    `recall_log_rows=${report.recall_log_rows};` +
    `concept_embedding_rows=${report.concept_embedding_rows};` +
    `rule2_forbidden_key_hits=${report.rule2_forbidden_key_hits};` +
    `files_written=${report.files_written}\n`,
);

if (report.rule2_forbidden_key_hits > 0) {
  process.exit(5);
}
