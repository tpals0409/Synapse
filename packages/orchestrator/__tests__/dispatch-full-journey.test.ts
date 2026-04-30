import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openDb,
  migrate,
  seedFullJourney,
  recentlyDecidedFor,
  markDismissed,
  decayEdgeWeight,
  pruneEdgesBelow,
} from '@synapse/storage';
import type {
  DecideContext,
  DecisionAct,
  RecallLogRow,
} from '@synapse/protocol';
import { decide } from '../src/decide.ts';
import { applySilence } from '../src/silence.ts';
import { applyDismiss, type DismissOptions } from '../src/dismiss.ts';

// Sprint 7 T9 — orchestrator e2e full-journey dispatch 검증.
// 신규 코드 0 (검증 only). storage T10 의 seedFullJourney(db) → FullJourneyFixture 가 박은
// 9 단계 DB 상태 + 단계별 fixture 위에서 decide / applySilence / applyDismiss 의 종단 dispatch
// 결정성 + 4 원 enum drift 0 + dismiss 의 storage 어댑터 wiring 정합 검증.
//
// 시드 contract (FROZEN D-S7-storage-seedFullJourney-shape):
//   recall_log: r-l1 ghost decided_at=now+3000 cand=[c-jazz]
//               r-l2 suggestion now+4000 cand=[c-jazz, c-coltrane] (dismissed=[c-jazz])
//               r-l3 strong now+5000 cand=[c-music, c-jazz]
//               r-hyper suggestion now+6500 cand=[c-saxophone]
//   edges (post step 8 dismiss): jazz↔coltrane co_occur 0.35 (=0.7*0.5)
//                                 music↔jazz semantic 0.6
//                                 coltrane↔saxophone co_occur 0.5
//   fixture.{ghost,suggestion,strong,hyperRecall}: 단계별 RecallCandidate[] 결정성 frozen.
//   fixture.{dismiss,retraction,recentDecisions,concepts,advancedNow}: 종단 검증 입력.

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-orch-fj-'));
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

const VALID_ACTS: ReadonlySet<string> = new Set<DecisionAct>([
  'silence',
  'ghost',
  'suggestion',
  'strong',
]);

// 시드 frozen literal IDs — `feedback_root_index_grep.md` 정신 정합 (메모리 단일 진실원).
// storage seed 본체는 아래 literal 을 박음 (D-S7-storage-seedFullJourney-shape).
const ID_MUSIC = 'c-music';
const ID_JAZZ = 'c-jazz';
const ID_COLTRANE = 'c-coltrane';

test('dispatch-full-journey: step 4 L1 ghost — fixture.ghost.candidates → strong (high score)', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);
    // fixture.ghost.candidates = [{ jazz, score 0.9, semantic }] — strong source.
    // decide 결과 = strong (UI 분기 별개 — orchestrator 가 score 기반 분류, 시드의
    // recall_log.act='ghost' 는 *과거 결정의 기록* 일 뿐 본 호출과 무관).
    const ctx: DecideContext = {
      userMessage: '재즈 들었어',
      candidates: fx.ghost.candidates,
      recencyMs: 10_000,
      tokenContext: 100,
    };
    const act = decide(ctx);
    assert.equal(act, 'strong');
    assert.ok(VALID_ACTS.has(act), '4-원 enum drift 0');
    assert.equal(fx.ghost.recallLogId, 'r-l1');
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: step 5 L2 suggestion — fixture.suggestion.candidates → strong', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);
    const ctx: DecideContext = {
      userMessage: '재즈 콜트레인 얘기',
      candidates: fx.suggestion.candidates,
      recencyMs: 10_000,
      tokenContext: 100,
    };
    assert.equal(decide(ctx), 'strong');
    assert.equal(fx.suggestion.recallLogId, 'r-l2');
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: step 6 L3 strong — fixture.strong.candidates → strong', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);
    const ctx: DecideContext = {
      userMessage: '음악, 재즈, 콜트레인',
      candidates: fx.strong.candidates,
      recencyMs: 10_000,
      tokenContext: 100,
    };
    assert.equal(decide(ctx), 'strong');
    assert.equal(fx.strong.recallLogId, 'r-l3');
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: step 7 hyper-recall — bridge weak source weakens (ghost→silence)', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);
    // hyperRecall.candidates = [{ saxophone, score 0.55, bridge }]:
    //   classifyByScore(0.55) → ghost. weak source max → 1 step weakened → silence.
    const ctx: DecideContext = {
      userMessage: '색소폰 떠올랐어',
      candidates: fx.hyperRecall.candidates,
      recencyMs: 10_000,
      tokenContext: 100,
    };
    const act = decide(ctx);
    assert.equal(act, 'silence', 'bridge weak source weakens ghost→silence');
    assert.ok(VALID_ACTS.has(act));
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: silence rule — hyperRecall (bridge weak) → silence + low-confidence', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);
    const ctx: DecideContext = {
      userMessage: '색소폰 후보',
      candidates: fx.hyperRecall.candidates,
      recencyMs: 10_000,
      tokenContext: 100,
    };
    const decision = decide(ctx);
    assert.equal(decision, 'silence');
    const result = applySilence(decision, ctx);
    assert.equal(result.act, 'silence');
    assert.equal(result.suppressedReason, 'low-confidence');
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: silence rule — synthetic cooldown (Date.now() - 30s) suppresses', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);
    // 시드 advancedNow (faked clock) 는 너무 과거라 cooldown cutoff 밖 → cooldown 분기 검증
    // 위해 동기화된 Date.now() 기반 synthetic recentDecisions 박음. fixture.strong.recallLogId
    // 와 candidate (music, jazz) 활용.
    const recent: RecallLogRow[] = [
      {
        id: fx.strong.recallLogId,
        decided_at: Date.now() - 30_000,
        act: 'strong',
        candidate_ids: [ID_MUSIC, ID_JAZZ],
      },
    ];
    const ctx: DecideContext = {
      userMessage: '재즈 또?',
      candidates: fx.ghost.candidates, // single jazz 0.9 semantic → strong
      recencyMs: 10_000,
      tokenContext: 100,
      recentDecisions: recent,
    };
    const decision = decide(ctx);
    assert.equal(decision, 'strong');
    const result = applySilence(decision, ctx);
    assert.deepEqual(result, { act: 'silence', suppressedReason: 'cooldown' });
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: silence rule — pure duplicate (no cooldown overlap, > 60s old) → suppresses', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);
    // cooldown 60s 밖 + 동일 candidate set → duplicate 만 박힘.
    // suggestion.candidates conceptId set = {jazz, coltrane} — match.
    const recent: RecallLogRow[] = [
      {
        id: 'r-syn-old',
        decided_at: Date.now() - 120_000,
        act: 'suggestion',
        candidate_ids: [ID_JAZZ, ID_COLTRANE],
      },
    ];
    const ctx: DecideContext = {
      userMessage: '오래된 같은 후보',
      candidates: fx.suggestion.candidates,
      recencyMs: 10_000,
      tokenContext: 100,
      recentDecisions: recent,
    };
    const decision = decide(ctx);
    assert.equal(decision, 'strong');
    const result = applySilence(decision, ctx);
    assert.deepEqual(result, { act: 'silence', suppressedReason: 'duplicate' });
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: silence rule — empty recentDecisions → passthrough', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);
    const ctx: DecideContext = {
      userMessage: '신규 결정',
      candidates: fx.strong.candidates,
      recencyMs: 10_000,
      tokenContext: 100,
    };
    const decision = decide(ctx);
    assert.equal(decision, 'strong');
    const result = applySilence(decision, ctx);
    assert.deepEqual(result, { act: 'strong' });
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: silence rule — fx.recentDecisions latest = r-hyper (saxophone) → duplicate against hyperRecall', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);
    // 가장 최근 fx.recentDecisions = r-hyper (advancedNow 기반 — 시드 시각). cooldown cutoff 밖,
    // duplicate 매칭은 시간 무관 — 단, decide 단계에서 hyperRecall 가 silence 가 되므로
    // applySilence 의 duplicate 분기 (RECALL_ACTS only) 가 적용 안 됨 → low-confidence.
    const ctx: DecideContext = {
      userMessage: '색소폰 또?',
      candidates: fx.hyperRecall.candidates,
      recencyMs: 10_000,
      tokenContext: 100,
      recentDecisions: fx.recentDecisions,
    };
    const decision = decide(ctx);
    assert.equal(decision, 'silence');
    const result = applySilence(decision, ctx);
    assert.equal(result.act, 'silence');
    assert.equal(result.suppressedReason, 'low-confidence');
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: recentlyDecidedFor — jazz 회수 시 r-l3 (가장 최근 jazz 후보) 회수', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);
    // r-l3 (now+5000) 가 가장 최근 jazz 포함. r-hyper 는 jazz 미포함.
    const row = recentlyDecidedFor(db, ID_JAZZ, 60_000, fx.now + 10_000);
    assert.ok(row, 'recentlyDecidedFor 가 row 회수');
    assert.equal(row?.id, fx.strong.recallLogId);
    assert.equal(row?.act, 'strong');
    assert.ok(row?.candidate_ids.includes(ID_JAZZ));
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: step 8 applyDismiss — storage adapter wiring 정합 (mark + decay + prune)', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);

    // 시드는 이미 r-l2 의 c-jazz 를 dismissed 박음. 추가 dismiss (r-l3 의 c-jazz) 를 orchestrator
    // 가 storage 어댑터로 dispatch 해 mark + decay + prune 결과 정합.
    type Call =
      | { kind: 'mark'; recallLogId: string; conceptIds: string[] }
      | { kind: 'decay'; conceptIds: string[]; penalty: number }
      | { kind: 'prune'; threshold: number };
    const calls: Call[] = [];

    const opts: DismissOptions = {
      markDismissed: (recallLogId, conceptIds) => {
        calls.push({ kind: 'mark', recallLogId, conceptIds });
        markDismissed(db, recallLogId, conceptIds);
      },
      decayEdges: (conceptIds, penalty) => {
        calls.push({ kind: 'decay', conceptIds, penalty });
        // music↔jazz edge 약화 (l3 의 후보 쌍 중 dismiss 대상은 jazz, music 과 인접).
        decayEdgeWeight(db, ID_JAZZ, ID_MUSIC, penalty);
      },
      // [DIRECTIVE D-S7-orchestrator-pruneEdges-signature-mismatch +
      //  D-S7-orchestrator-pruneEdges-mock-shape]
      // pruneEdgesBelow DI 시그니처 = `(threshold) => { pruned: number }` storage SoT.
      pruneEdgesBelow: (threshold) => {
        calls.push({ kind: 'prune', threshold });
        return pruneEdgesBelow(db, threshold);
      },
    };

    const result = applyDismiss(fx.strong.recallLogId, [ID_JAZZ], opts);

    // 호출 순서 — mark → decay → prune.
    assert.equal(calls.length, 3);
    assert.equal(calls[0]?.kind, 'mark');
    assert.equal(calls[1]?.kind, 'decay');
    assert.equal(calls[2]?.kind, 'prune');
    if (calls[1]?.kind === 'decay') assert.equal(calls[1].penalty, 0.5);
    if (calls[2]?.kind === 'prune') assert.equal(calls[2].threshold, 0.05);
    // result 모양 — { decayed, pruned } only (DecisionAct 노출 X — 4 원 enum drift 가드).
    assert.deepEqual(Object.keys(result).sort(), ['decayed', 'pruned']);
    assert.equal(result.decayed, 1);

    // storage 측 결과 — r-l3 의 dismissed_concept_ids 갱신 + music↔jazz weight 0.3 (=0.6*0.5).
    const row = db
      .prepare('SELECT dismissed_concept_ids FROM recall_log WHERE id = ?')
      .get(fx.strong.recallLogId) as { dismissed_concept_ids: string | null } | undefined;
    assert.ok(row?.dismissed_concept_ids);
    assert.deepEqual(JSON.parse(row?.dismissed_concept_ids ?? '[]') as string[], [ID_JAZZ]);
    const mj = db
      .prepare(
        `SELECT weight FROM edges WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) LIMIT 1`,
      )
      .get(ID_MUSIC, ID_JAZZ, ID_JAZZ, ID_MUSIC) as { weight: number } | undefined;
    assert.ok(mj);
    assert.ok(Math.abs((mj?.weight ?? 0) - 0.3) < 1e-9, `expected ~0.3, got ${mj?.weight}`);
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: step 8 applyDismiss against fixture.dismiss — idempotent re-dispatch (시드의 r-l2 c-jazz)', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);

    // 시드가 이미 r-l2 c-jazz dismissed 박음. orchestrator 가 같은 (recallLogId, conceptIds) 로
    // 다시 dispatch 해도 markDismissed 멱등 (union) + decayEdges 누적 + DismissResult 4 원 enum drift 0.
    type Call = { kind: 'mark' | 'decay' | 'prune' };
    const calls: Call[] = [];

    const opts: DismissOptions = {
      markDismissed: (recallLogId, conceptIds) => {
        calls.push({ kind: 'mark' });
        markDismissed(db, recallLogId, conceptIds);
      },
      decayEdges: () => {
        calls.push({ kind: 'decay' });
      },
      // pruneEdgesBelow 미주입 — DismissOptions 의 옵션 필드 (Sprint 6 박힘).
    };

    const result = applyDismiss(fx.dismiss.recallLogId, fx.dismiss.conceptIds, opts);

    assert.equal(calls.length, 2, 'mark + decay (no prune)');
    assert.equal(result.decayed, fx.dismiss.conceptIds.length);
    assert.equal(result.pruned, 0);

    // storage 측 — dismissed_concept_ids 변하지 않음 (이미 c-jazz 박혀있음, union 결과 동일).
    const row = db
      .prepare('SELECT dismissed_concept_ids FROM recall_log WHERE id = ?')
      .get(fx.dismiss.recallLogId) as { dismissed_concept_ids: string | null } | undefined;
    assert.deepEqual(
      JSON.parse(row?.dismissed_concept_ids ?? '[]') as string[],
      [ID_JAZZ],
      '시드 dismissed_concept_ids 멱등 유지',
    );
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: step 9 retraction — markRetracted DB 상태가 decide 결정에 영향 없음', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);

    // retracted 마킹은 messages 테이블에만 영향. orchestrator decide 는 candidates + recencyMs +
    // tokenContext 만 입력 — retract 가 DecisionAct 4 원 분기에 흘러들지 않음을 가드.
    const beforeRetractedCount = (
      db.prepare('SELECT COUNT(*) AS c FROM messages WHERE retracted = 1').get() as { c: number }
    ).c;
    assert.equal(beforeRetractedCount, 1, '시드 retracted = 1 (msg-fc-assistant)');
    const retractedRow = db
      .prepare('SELECT retracted FROM messages WHERE id = ?')
      .get(fx.retraction.messageId) as { retracted: number } | undefined;
    assert.equal(retractedRow?.retracted, 1);

    // decide 가 동일 candidate 입력에 동일 act 반환 (retraction 무관).
    const ctx: DecideContext = {
      userMessage: 'retraction 후',
      candidates: fx.ghost.candidates,
      recencyMs: 10_000,
      tokenContext: 100,
    };
    const a1 = decide(ctx);
    const a2 = decide(ctx);
    assert.equal(a1, a2);
    assert.ok(VALID_ACTS.has(a1));
  } finally {
    cleanup();
  }
});

test('dispatch-full-journey: 9 단계 종단 dispatch — 4-원 enum drift 0 across all steps', () => {
  const { db, cleanup } = freshDb();
  try {
    const fx = seedFullJourney(db);

    const steps: { label: string; ctx: DecideContext }[] = [
      {
        label: 'step 4 ghost fixture',
        ctx: {
          userMessage: 'g',
          candidates: fx.ghost.candidates,
          recencyMs: 10_000,
          tokenContext: 100,
        },
      },
      {
        label: 'step 5 suggestion fixture',
        ctx: {
          userMessage: 's',
          candidates: fx.suggestion.candidates,
          recencyMs: 10_000,
          tokenContext: 100,
        },
      },
      {
        label: 'step 6 strong fixture',
        ctx: {
          userMessage: 'st',
          candidates: fx.strong.candidates,
          recencyMs: 10_000,
          tokenContext: 100,
        },
      },
      {
        label: 'step 7 hyper bridge → silence (weak weakening)',
        ctx: {
          userMessage: 'h',
          candidates: fx.hyperRecall.candidates,
          recencyMs: 10_000,
          tokenContext: 100,
        },
      },
      {
        label: 'empty candidates → silence (default 침묵)',
        ctx: {
          userMessage: 'empty',
          candidates: [],
          recencyMs: 10_000,
          tokenContext: 100,
        },
      },
    ];

    for (const s of steps) {
      const act = decide(s.ctx);
      assert.ok(VALID_ACTS.has(act), `${s.label}: 4-원 enum drift detected (got ${act})`);
      const sil = applySilence(act, s.ctx);
      assert.ok(VALID_ACTS.has(sil.act), `${s.label}: silence result drift`);
    }
  } finally {
    cleanup();
  }
});
