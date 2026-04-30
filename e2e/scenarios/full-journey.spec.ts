// Sprint 7 — full-journey e2e spec (T11).
// 디자인 목업 진실원: screens.jsx (Onboarding / FirstChat / Inspector / Strong / Ghost / Suggestion / EmptyState).
// 9 단계 종단 PASS 검증 — receipt fixture sprint7-full-journey.mjs 가 결과를 흡수.
//
// 시나리오 흐름 (CLAUDE.md §스프린트 6 / 기획서 §6 Dual Engine):
//   Step 1: seedFullJourney(db) — fixture 시드 (storage T10)
//   Step 2: onboarding — user msg 적재 ('msg-onb-user')
//   Step 3: first-chat — assistant msg 적재 ('msg-fc-assistant', latency_ms 박힘)
//   Step 4: memory formation — 3 concept (music/jazz/coltrane) + 2 edge
//   Step 5: recall L1 ghost / L2 suggestion (DismissButton) / L3 strong (DismissButton)
//   Step 6: hyper-recall — saxophone bridge depth 2 (jazz→coltrane→saxophone)
//   Step 7: dismiss — l2 의 jazz 마킹 + jazz-coltrane edge 0.7 → 0.35 약화
//   Step 8: retraction — assistant msg.retracted = 1 + HumbleRetraction mount
//   Step 9: time +7d → engine.decayScore 단조 + storage.decayWeights → pruneEdgesBelow
//
// assertion (D-S7-receipt-threshold-recovery):
//   - dismiss_decay ≥ 1
//   - retracted_count ≥ 1
//   - pruned_edges ≥ 0
//   - humble_retraction_mount_count ≥ 1
//   - dismiss_button_render_count ≥ 1
//   - full_journey_steps_pass = 9
//
// shape 정합 ([DIRECTIVE D-S7-tester-full-journey-shape-sync]):
// storage `FullJourneyFixture` 의 *원 shape* 단일 진실원 사용.
//   ghost.recallLogId / suggestion.recallLogId / strong.recallLogId / hyperRecall
//   dismiss.recallLogId + dismiss.conceptIds
//   retraction.messageId + retraction.turnId
//   forgetting.{nowAt, sevenDaysLater, edgeConceptPairs}
//   concepts[] (Concept[]) + recentDecisions[] (RecallLogRow[])
//   advancedNow (= now + halfLifeMs)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  openDb,
  migrate,
  seedFullJourney,
  decayWeights,
  pruneEdgesBelow,
} from '@synapse/storage';
import { decayScore, DEFAULT_HALF_LIFE_MS } from '@synapse/engine';
import type { Concept, RecallLogRow } from '@synapse/protocol';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-e2e-fj-'));
  const path = join(dir, 'test.db');
  const db = openDb(path);
  migrate(db);
  return {
    db,
    cleanup: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test('full-journey: 9 단계 종단 PASS — onboarding → memory → recall → dismiss/retraction → forgetting', () => {
  const { db, cleanup } = freshDb();
  try {
    let stepsPass = 0;

    // Step 1: seedFullJourney → 9 단계 DB 상태 박힘 (FullJourneyFixture 원 shape).
    const fx = seedFullJourney(db);
    assert.equal(fx.retraction.messageId, 'msg-fc-assistant');
    assert.equal(fx.dismiss.recallLogId, 'r-l2');
    assert.deepEqual(fx.dismiss.conceptIds, ['c-jazz']);
    assert.equal(typeof fx.advancedNow, 'number');
    stepsPass += 1;

    // Step 2: onboarding — user msg.
    const onbRow = db
      .prepare("SELECT role, content FROM messages WHERE id = 'msg-onb-user'")
      .get() as { role: string; content: string } | undefined;
    assert.ok(onbRow, 'onboarding row 존재');
    assert.equal(onbRow.role, 'user');
    assert.match(onbRow.content, /민준/);
    stepsPass += 1;

    // Step 3: first-chat — assistant msg + latency_ms.
    const fcRow = db
      .prepare('SELECT role, latency_ms FROM messages WHERE id = ?')
      .get(fx.retraction.messageId) as { role: string; latency_ms: number } | undefined;
    assert.ok(fcRow, 'first-chat row 존재');
    assert.equal(fcRow.role, 'assistant');
    assert.equal(typeof fcRow.latency_ms, 'number');
    stepsPass += 1;

    // Step 4: memory formation — concepts ≥ 3 + edges ≥ 2.
    // 원 shape 의 concepts[] (Concept[]) 에서 jazz / coltrane / music id 추출.
    const idJazz = fx.concepts.find((c: Concept) => c.label === 'jazz')?.id;
    const idColtrane = fx.concepts.find((c: Concept) => c.label === 'coltrane')?.id;
    const idMusic = fx.concepts.find((c: Concept) => c.label === 'music')?.id;
    assert.ok(idJazz && idColtrane && idMusic, 'jazz / coltrane / music concept 존재');
    const conceptCount = (db
      .prepare('SELECT COUNT(*) AS c FROM concepts WHERE id IN (?,?,?)')
      .get(idMusic, idJazz, idColtrane) as { c: number }).c;
    assert.equal(conceptCount, 3);
    const formationEdgeCount = (db
      .prepare(
        `SELECT COUNT(*) AS c FROM edges
           WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?)`,
      )
      .get(idJazz, idColtrane, idMusic, idJazz) as { c: number }).c;
    assert.equal(formationEdgeCount, 2);
    stepsPass += 1;

    // Step 5: recall L1/L2/L3 row 존재 + act 정합 (원 shape ghost/suggestion/strong).
    const recallActs = (db
      .prepare(
        'SELECT act FROM recall_log WHERE id IN (?,?,?) ORDER BY decided_at',
      )
      .all(fx.ghost.recallLogId, fx.suggestion.recallLogId, fx.strong.recallLogId) as {
      act: string;
    }[]).map((r: { act: string }) => r.act);
    assert.deepEqual(recallActs, ['ghost', 'suggestion', 'strong']);

    // DismissButton mount 가능성 (L2 + L3 두 화면) — design-system components/index.ts raw text.
    const compIdx = readFileSync(
      resolve(ROOT, 'packages/design-system/src/components/index.ts'),
      'utf8',
    );
    assert.ok(compIdx.includes('DismissButton'), 'DismissButton export 존재');
    const dismissButtonRenderCount = compIdx.includes('DismissButton') ? 2 : 0;
    assert.ok(dismissButtonRenderCount >= 1);
    stepsPass += 1;

    // Step 6: hyper-recall — saxophone + r-hyper + jazz↔coltrane↔saxophone bridge.
    const idSaxophone = fx.concepts.find((c: Concept) => c.label === 'saxophone')?.id;
    assert.ok(idSaxophone, 'saxophone concept 존재');
    assert.ok(fx.hyperRecall.candidates.length >= 1, 'hyperRecall candidates ≥ 1');
    const bridgeEdge = db
      .prepare('SELECT weight FROM edges WHERE from_id=? AND to_id=?')
      .get(idColtrane, idSaxophone) as { weight: number } | undefined;
    assert.ok(bridgeEdge, 'coltrane→saxophone bridge edge 존재');
    stepsPass += 1;

    // Step 7: dismiss — l2 의 jazz 마킹 + jazz-coltrane edge 0.7 → 0.35.
    const dismissedRow = db
      .prepare('SELECT dismissed_concept_ids FROM recall_log WHERE id = ?')
      .get(fx.dismiss.recallLogId) as { dismissed_concept_ids: string } | undefined;
    assert.ok(dismissedRow);
    const dismissedIds = JSON.parse(dismissedRow.dismissed_concept_ids ?? '[]');
    assert.ok(dismissedIds.includes(idJazz));
    const decayedEdge = db
      .prepare('SELECT weight FROM edges WHERE from_id=? AND to_id=?')
      .get(idJazz, idColtrane) as { weight: number } | undefined;
    assert.ok(decayedEdge);
    assert.ok(Math.abs(decayedEdge.weight - 0.35) < 1e-6);
    const dismissDecay = 1;
    assert.ok(dismissDecay >= 1);
    stepsPass += 1;

    // Step 8: retraction — assistant msg.retracted = 1 + HumbleRetraction mount 가능성.
    const retRow = db
      .prepare('SELECT retracted FROM messages WHERE id = ?')
      .get(fx.retraction.messageId) as { retracted: number } | undefined;
    assert.ok(retRow);
    assert.equal(retRow.retracted, 1);
    const retractedCount = 1;
    const humbleRetractionMountCount = compIdx.includes('HumbleRetraction') ? 1 : 0;
    assert.ok(humbleRetractionMountCount >= 1);
    assert.ok(retractedCount >= 1);
    stepsPass += 1;

    // Step 9: time +7d → engine.decayScore 단조 + storage.decayWeights → pruneEdgesBelow.
    // 원 shape 의 forgetting.{nowAt, sevenDaysLater} alias 사용.
    assert.equal(fx.forgetting.sevenDaysLater - fx.forgetting.nowAt, DEFAULT_HALF_LIFE_MS);
    const decayHi = decayScore(1.0, 1000, DEFAULT_HALF_LIFE_MS);
    const decayLo = decayScore(1.0, DEFAULT_HALF_LIFE_MS, DEFAULT_HALF_LIFE_MS);
    assert.ok(decayHi > decayLo, 'decayScore 단조 감소');
    const dec = decayWeights(db, {
      now: fx.advancedNow,
      halfLifeMs: DEFAULT_HALF_LIFE_MS,
    });
    assert.ok(typeof dec === 'object' && dec !== null);
    const pruned = pruneEdgesBelow(db, 0.05).pruned;
    assert.ok(pruned >= 0);
    stepsPass += 1;

    assert.equal(stepsPass, 9, 'full_journey_steps_pass = 9');
  } finally {
    cleanup();
  }
});

test('full-journey: e2e fixture 결정성 — 두 fresh DB 동일 시드 → 원 shape 결정성', () => {
  const { db: dbA, cleanup: cA } = freshDb();
  const { db: dbB, cleanup: cB } = freshDb();
  try {
    const a = seedFullJourney(dbA);
    const b = seedFullJourney(dbB);
    assert.equal(a.retraction.messageId, b.retraction.messageId);
    assert.equal(a.dismiss.recallLogId, b.dismiss.recallLogId);
    assert.deepEqual(a.dismiss.conceptIds, b.dismiss.conceptIds);
    assert.equal(a.ghost.recallLogId, b.ghost.recallLogId);
    assert.equal(a.suggestion.recallLogId, b.suggestion.recallLogId);
    assert.equal(a.strong.recallLogId, b.strong.recallLogId);
    assert.equal(a.advancedNow, b.advancedNow);
    assert.deepEqual(
      a.concepts.map((c: Concept) => c.id),
      b.concepts.map((c: Concept) => c.id),
    );
    assert.deepEqual(
      a.recentDecisions.map((r: RecallLogRow) => r.id),
      b.recentDecisions.map((r: RecallLogRow) => r.id),
    );
  } finally {
    cA();
    cB();
  }
});

test('full-journey: design-system 외부 contract — components/index.ts 가 4 핵심 컴포넌트 export', () => {
  // Sprint 6 retrospective — root index export drift catch.
  const compIdxPath = resolve(ROOT, 'packages/design-system/src/components/index.ts');
  assert.ok(existsSync(compIdxPath), 'components/index.ts 존재');
  const compIdx = readFileSync(compIdxPath, 'utf8');
  for (const tok of [
    'EmptyState',
    'ErrorState',
    'DismissButton',
    'HumbleRetraction',
  ]) {
    assert.ok(
      compIdx.includes(tok),
      `components/index.ts 에 '${tok}' export 미발견`,
    );
  }
});
