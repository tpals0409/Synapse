import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb, migrate, seedFullJourney, listMessages } from '../index.ts';
import type { FullJourneyFixture } from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-seed-fj-'));
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

// FullJourneyFixture 의 결정성 비교 (Set / embedding 등 deepEqual 우회 필드 제외).
function fixtureProjection(f: FullJourneyFixture) {
  return {
    now: f.now,
    advancedNow: f.advancedNow,
    conceptIds: f.concepts.map((c) => c.id),
    dismissed: Array.from(f.dismissedConceptIds).sort(),
    decisions: f.recentDecisions.map((d) => ({
      id: d.id,
      act: d.act,
      candidate_ids: d.candidate_ids,
      dismissed: d.dismissed ?? 0,
    })),
    ghost: f.ghost,
    suggestion: f.suggestion,
    strong: f.strong,
    hyperRecall: f.hyperRecall,
    dismiss: f.dismiss,
    retraction: f.retraction,
    forgetting: f.forgetting,
  };
}

test('seedFullJourney: 두 fresh DB → fixture projection 결정성 (diff 0)', () => {
  const { db: dbA, cleanup: cA } = freshDb();
  const { db: dbB, cleanup: cB } = freshDb();
  try {
    const a = seedFullJourney(dbA);
    const b = seedFullJourney(dbB);
    assert.deepEqual(fixtureProjection(a), fixtureProjection(b));

    const counts = (db: typeof dbA) => ({
      messages: (db.prepare('SELECT COUNT(*) AS c FROM messages').get() as { c: number }).c,
      concepts: (db.prepare('SELECT COUNT(*) AS c FROM concepts').get() as { c: number }).c,
      edges: (db.prepare('SELECT COUNT(*) AS c FROM edges').get() as { c: number }).c,
      recall: (db.prepare('SELECT COUNT(*) AS c FROM recall_log').get() as { c: number }).c,
    });
    assert.deepEqual(counts(dbA), counts(dbB));
  } finally {
    cA();
    cB();
  }
});

test('seedFullJourney: 시간축 결정성 — now / advancedNow / forgetting alias', () => {
  const { db, cleanup } = freshDb();
  try {
    const f = seedFullJourney(db);
    assert.equal(f.now, 1735689600000, '2025-01-01T00:00:00Z UTC frozen');
    const sevenD = 7 * 24 * 60 * 60 * 1000;
    assert.equal(f.advancedNow, f.now + sevenD, 'advancedNow = now + 7d');
    assert.equal(f.forgetting.nowAt, f.now);
    assert.equal(f.forgetting.sevenDaysLater, f.advancedNow);
  } finally {
    cleanup();
  }
});

test('seedFullJourney: engine 입력 — concepts 4 + dismissedConceptIds + recentDecisions', () => {
  const { db, cleanup } = freshDb();
  try {
    const f = seedFullJourney(db);

    assert.equal(f.concepts.length, 4);
    const ids = f.concepts.map((c) => c.id).sort();
    assert.deepEqual(ids, ['c-coltrane', 'c-jazz', 'c-music', 'c-saxophone']);
    for (const c of f.concepts) {
      assert.equal(c.embedding?.length, 768, `${c.id} embedding 768d`);
      assert.ok((c.last_used_at ?? 0) >= f.now, `${c.id} last_used_at ≥ now`);
    }

    assert.deepEqual(Array.from(f.dismissedConceptIds), ['c-jazz']);

    assert.equal(f.recentDecisions.length, 4);
    const l2 = f.recentDecisions.find((d) => d.id === 'r-l2');
    assert.equal(l2?.dismissed, 1, 'r-l2 short-form dismissed=1');
    const l1 = f.recentDecisions.find((d) => d.id === 'r-l1');
    assert.equal(l1?.dismissed, undefined, 'r-l1 미dismiss → undefined');
  } finally {
    cleanup();
  }
});

test('seedFullJourney: 단계별 fixture — ghost / suggestion / strong / hyperRecall', () => {
  const { db, cleanup } = freshDb();
  try {
    const f = seedFullJourney(db);

    assert.equal(f.ghost.recallLogId, 'r-l1');
    assert.equal(f.ghost.candidates.length, 1);
    assert.equal(f.ghost.candidates[0]?.conceptId, 'c-jazz');

    assert.equal(f.suggestion.recallLogId, 'r-l2');
    assert.equal(f.suggestion.candidates.length, 2);
    assert.deepEqual(
      f.suggestion.candidates.map((c) => c.conceptId),
      ['c-jazz', 'c-coltrane'],
    );

    assert.equal(f.strong.recallLogId, 'r-l3');
    assert.equal(f.strong.candidates.length, 2);
    assert.deepEqual(
      f.strong.candidates.map((c) => c.conceptId),
      ['c-music', 'c-jazz'],
    );

    assert.equal(f.hyperRecall.candidates.length, 1);
    assert.equal(f.hyperRecall.candidates[0]?.conceptId, 'c-saxophone');
    assert.equal(f.hyperRecall.candidates[0]?.source, 'bridge');
  } finally {
    cleanup();
  }
});

test('seedFullJourney: dismiss / retraction / forgetting 단계 fixture', () => {
  const { db, cleanup } = freshDb();
  try {
    const f = seedFullJourney(db);

    assert.equal(f.dismiss.recallLogId, 'r-l2');
    assert.deepEqual(f.dismiss.conceptIds, ['c-jazz']);

    assert.equal(f.retraction.messageId, 'msg-fc-assistant');
    assert.equal(f.retraction.turnId, 'turn-fc-1');

    assert.equal(f.forgetting.edgeConceptPairs.length, 3);
    assert.deepEqual(f.forgetting.edgeConceptPairs, [
      ['c-jazz', 'c-coltrane'],
      ['c-music', 'c-jazz'],
      ['c-coltrane', 'c-saxophone'],
    ]);
  } finally {
    cleanup();
  }
});

test('seedFullJourney: messages 2 — onboarding user + first-chat assistant retracted', () => {
  const { db, cleanup } = freshDb();
  try {
    seedFullJourney(db);
    const msgs = listMessages(db);
    assert.equal(msgs.length, 2);
    const onb = msgs.find((m) => m.id === 'msg-onb-user');
    const asst = msgs.find((m) => m.id === 'msg-fc-assistant');
    assert.equal(onb?.role, 'user');
    assert.equal(onb?.retracted, undefined, 'onboarding user msg 회수 안됨');
    assert.equal(asst?.role, 'assistant');
    assert.equal(asst?.latency_ms, 420);
    assert.equal(asst?.retracted, 1, 'first-chat assistant msg 회수됨');
  } finally {
    cleanup();
  }
});

test('seedFullJourney: edges 3 (jazz↔coltrane decay 0.5 / music↔jazz / coltrane↔saxophone) + last_used_at 박힘', () => {
  const { db, cleanup } = freshDb();
  try {
    const f = seedFullJourney(db);
    const rows = db
      .prepare(
        'SELECT from_id, to_id, kind, weight, last_used_at FROM edges ORDER BY from_id ASC, to_id ASC',
      )
      .all() as {
      from_id: string;
      to_id: string;
      kind: string;
      weight: number;
      last_used_at: number;
    }[];
    assert.equal(rows.length, 3);

    // step 8 dismiss 적용: jazz↔coltrane co_occur weight = 0.7 * 0.5 = 0.35.
    const jc = rows.find((r) => r.from_id === 'c-jazz' && r.to_id === 'c-coltrane');
    assert.ok(jc);
    assert.ok(Math.abs((jc?.weight ?? 0) - 0.35) < 1e-9, `expected ~0.35, got ${jc?.weight}`);

    const mj = rows.find((r) => r.from_id === 'c-music' && r.to_id === 'c-jazz');
    assert.ok(mj);
    assert.ok(Math.abs((mj?.weight ?? 0) - 0.6) < 1e-9);

    const cs = rows.find((r) => r.from_id === 'c-coltrane' && r.to_id === 'c-saxophone');
    assert.ok(cs);
    assert.ok(Math.abs((cs?.weight ?? 0) - 0.5) < 1e-9);

    for (const r of rows) {
      assert.ok(r.last_used_at >= f.now, `${r.from_id}->${r.to_id} last_used_at ≥ now`);
      assert.ok(r.last_used_at <= f.advancedNow, `${r.from_id}->${r.to_id} ≤ advancedNow`);
    }
  } finally {
    cleanup();
  }
});

test('seedFullJourney: recall_log 4 + r-l2 dismissed_concept_ids JSON = ["c-jazz"]', () => {
  const { db, cleanup } = freshDb();
  try {
    seedFullJourney(db);
    const rows = db
      .prepare(
        'SELECT id, act, dismissed_concept_ids FROM recall_log ORDER BY id ASC',
      )
      .all() as { id: string; act: string; dismissed_concept_ids: string | null }[];
    assert.equal(rows.length, 4);

    const l2 = rows.find((r) => r.id === 'r-l2');
    assert.ok(l2?.dismissed_concept_ids);
    assert.deepEqual(
      JSON.parse(l2?.dismissed_concept_ids ?? '[]') as string[],
      ['c-jazz'],
    );

    const l1 = rows.find((r) => r.id === 'r-l1');
    assert.equal(l1?.dismissed_concept_ids, null, 'l1 미dismiss → NULL');
  } finally {
    cleanup();
  }
});

// [DIRECTIVE D-S7-storage-seedFullJourney-shape-UNION] cross-shape consistency 의무.
test('seedFullJourney: UNION cross-shape consistency — named lookup ⇔ array / alias ⇔ canonical', () => {
  const { db, cleanup } = freshDb();
  try {
    const f = seedFullJourney(db);

    // (1) conceptIds.* ⇔ concepts.find(label === ...).id
    const conceptByLabel = (label: string) =>
      f.concepts.find((c) => c.label === label)?.id;
    assert.equal(f.conceptIds.music, conceptByLabel('music'));
    assert.equal(f.conceptIds.jazz, conceptByLabel('jazz'));
    assert.equal(f.conceptIds.coltrane, conceptByLabel('coltrane'));
    assert.equal(f.conceptIds.saxophone, conceptByLabel('saxophone'));

    // (2) recallLogIds.* ⇔ recentDecisions[*].id (act 매핑)
    const decisionByAct = (act: string) =>
      f.recentDecisions.find((d) => d.act === act)?.id;
    assert.equal(f.recallLogIds.l1Ghost, decisionByAct('ghost'));
    assert.equal(f.recallLogIds.l3Strong, decisionByAct('strong'));
    // suggestion 은 r-l2/r-hyper 둘 다 — l2Suggestion 은 dismiss 대상.
    assert.equal(f.recallLogIds.l2Suggestion, f.dismiss.recallLogId);

    // (3) day7 ⇔ advancedNow ⇔ forgetting.sevenDaysLater (alias 일치)
    assert.equal(f.day7, f.advancedNow);
    assert.equal(f.forgetting.sevenDaysLater, f.advancedNow);
    assert.equal(f.forgetting.nowAt, f.now);

    // (4) halfLifeMs = 7d.
    assert.equal(f.halfLifeMs, 7 * 24 * 60 * 60 * 1000);
    assert.equal(f.day7, f.now + f.halfLifeMs);

    // (5) 단일 ID alias.
    assert.equal(f.dismissedRecallLogId, f.recallLogIds.l2Suggestion);
    assert.equal(f.retractedMessageId, f.firstChatAssistantMessageId);
    assert.equal(f.retraction.messageId, f.firstChatAssistantMessageId);

    // (6) 단계별 fixture ⇔ recallLogIds.
    assert.equal(f.ghost.recallLogId, f.recallLogIds.l1Ghost);
    assert.equal(f.suggestion.recallLogId, f.recallLogIds.l2Suggestion);
    assert.equal(f.strong.recallLogId, f.recallLogIds.l3Strong);
  } finally {
    cleanup();
  }
});
