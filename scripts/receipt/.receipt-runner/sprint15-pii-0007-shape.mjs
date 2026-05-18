// Sprint 15 receipt — Step T5: PII 0007 schema + export pipeline shape.
//
// 호출:
//   node --experimental-strip-types sprint15-pii-0007-shape.mjs
//   → 0007 마이그레이션 SQL 형상 + export 스크립트 존재 + package.json scripts 등록 검증.
//   → exit 0 + stdout:
//      "pii_0007_columns_added=3;pii_0007_indexes_added=3;export_script_present=1;export_npm_script_present=1;workspace_member_present=1"
//
// 정책 (D-S15-pii-0007-shape):
//   Sprint 15 T5 storage 슬라이스 — D-S8-pii-policy Rule 1 (session_hash) 영속화.
//   mobile 측 hash emit 은 Sprint 16 으로 분리 (T5 경계: storage + scripts 만).
//   본 fixture 는 *형상* 검증만 — 실제 export 실행은 수동 CLI (pnpm run export:sprint8).
//
// 검증 항목 5종 (모두 PASS 시 exit 0):
//   (A) packages/storage/schema/0007_pii_session_hash.sql 존재 + telemetry 3 테이블
//       (decision_log / satisfaction_survey / recall_log) 에 session_hash 컬럼 추가.
//   (B) (A) 의 SQL 안 idx_*_session_hash 인덱스 3개 정의.
//   (C) scripts/export/sprint8-data.mjs 존재 + Rule 1~5 토큰 매칭 + ESM 형식.
//   (D) root package.json scripts.export:sprint8 등록.
//   (E) pnpm-workspace.yaml 에 scripts/export 워크스페이스 멤버 등록.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

// (A) 0007 SQL
const SCHEMA_0007 = resolve(ROOT, 'packages/storage/schema/0007_pii_session_hash.sql');
if (!existsSync(SCHEMA_0007)) {
  console.error(`packages/storage/schema/0007_pii_session_hash.sql 미존재 — D-S15-pii-0007-shape 위반.`);
  process.exit(2);
}
const sql0007 = readFileSync(SCHEMA_0007, 'utf8');

const COL_RE = /ALTER TABLE\s+(decision_log|satisfaction_survey|recall_log)\s+ADD COLUMN\s+session_hash\s+TEXT/gi;
const colMatches = [...sql0007.matchAll(COL_RE)];
const colTables = new Set(colMatches.map((m) => m[1].toLowerCase()));
for (const t of ['decision_log', 'satisfaction_survey', 'recall_log']) {
  if (!colTables.has(t)) {
    console.error(`0007 SQL — ${t}.session_hash ALTER 미매칭.`);
    process.exit(3);
  }
}
const columnsAdded = colTables.size;

// (B) 0007 indexes
const IDX_RE = /CREATE INDEX\s+IF NOT EXISTS\s+idx_(decision_log|satisfaction_survey|recall_log)_session_hash/gi;
const idxMatches = [...sql0007.matchAll(IDX_RE)];
const idxTables = new Set(idxMatches.map((m) => m[1].toLowerCase()));
for (const t of ['decision_log', 'satisfaction_survey', 'recall_log']) {
  if (!idxTables.has(t)) {
    console.error(`0007 SQL — idx_${t}_session_hash 인덱스 미정의.`);
    process.exit(4);
  }
}
const indexesAdded = idxTables.size;

// (C) export 스크립트
const EXPORT_SCRIPT = resolve(ROOT, 'scripts/export/sprint8-data.mjs');
if (!existsSync(EXPORT_SCRIPT)) {
  console.error(`scripts/export/sprint8-data.mjs 미존재 — D-S15-pii-0007-shape (C) 위반.`);
  process.exit(5);
}
const exportSrc = readFileSync(EXPORT_SCRIPT, 'utf8');

const RULE_TOKENS = [
  /Rule 1[:\s]/i,
  /Rule 2[:\s]/i,
  /Rule 3[:\s]/i,
  /Rule 4[:\s]/i,
  /Rule 5[:\s]/i,
  /session_hash/,
  /better-sqlite3/,
  /--dry-run/,
];
for (const re of RULE_TOKENS) {
  if (!re.test(exportSrc)) {
    console.error(`export 스크립트 — 토큰 미매칭: ${re}`);
    process.exit(6);
  }
}

// (D) root package.json scripts.export:sprint8
const ROOT_PKG = resolve(ROOT, 'package.json');
const rootPkg = JSON.parse(readFileSync(ROOT_PKG, 'utf8'));
const exportScriptCmd = rootPkg.scripts && rootPkg.scripts['export:sprint8'];
if (!exportScriptCmd) {
  console.error(`root package.json scripts['export:sprint8'] 미정의 — D-S15-pii-0007-shape (D) 위반.`);
  process.exit(7);
}
if (!/@synapse\/export-pipeline/.test(exportScriptCmd) && !/sprint8-data\.mjs/.test(exportScriptCmd)) {
  console.error(`scripts['export:sprint8']="${exportScriptCmd}" — sprint8-data.mjs 또는 @synapse/export-pipeline 토큰 미매칭.`);
  process.exit(8);
}

// (E) pnpm-workspace.yaml 멤버
const WORKSPACE_YAML = resolve(ROOT, 'pnpm-workspace.yaml');
const wsSrc = readFileSync(WORKSPACE_YAML, 'utf8');
if (!/scripts\/export/.test(wsSrc)) {
  console.error(`pnpm-workspace.yaml — 'scripts/export' 멤버 미등록 — D-S15-pii-0007-shape (E) 위반.`);
  process.exit(9);
}

process.stdout.write(
  `pii_0007_columns_added=${columnsAdded};` +
    `pii_0007_indexes_added=${indexesAdded};` +
    `export_script_present=1;` +
    `export_npm_script_present=1;` +
    `workspace_member_present=1`,
);
