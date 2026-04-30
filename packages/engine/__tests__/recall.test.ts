import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recallCandidates,
  EMBED_DIM,
  DEFAULT_HALF_LIFE_MS,
  type EmbedFn,
  type NearestRecallFn,
  type TraverseFn,
  type RecordTouchFn,
  type GetLastUsedAtFn,
} from '../index.ts';

const fakeDb = { __fake: true };
const fakeVec = (): Float32Array => new Float32Array(EMBED_DIM);
const embed: EmbedFn = async () => fakeVec();

test('recallCandidates returns [] on empty graph (no nearest hits)', async () => {
  const nearest: NearestRecallFn = async () => [];
  const out = await recallCandidates('hello', { db: fakeDb, embed, nearest });
  assert.deepEqual(out, []);
});

test('recallCandidates returns semantic-only candidates when traverse omitted', async () => {
  const nearest: NearestRecallFn = async () => [
    { id: 'c1', label: '산책', score: 0.81 },
    { id: 'c2', label: '음악', score: 0.62 },
  ];
  const out = await recallCandidates('어제 산책', {
    db: fakeDb,
    embed,
    nearest,
  });
  assert.equal(out.length, 2);
  assert.equal(out[0]?.source, 'semantic');
  assert.equal(out[0]?.conceptId, 'c1');
  assert.equal(out[0]?.label, '산책');
  assert.equal(out[0]?.score, 0.81);
  assert.equal(out[1]?.source, 'semantic');
  assert.equal(out[1]?.conceptId, 'c2');
});

test('recallCandidates filters semantic hits below threshold', async () => {
  const nearest: NearestRecallFn = async () => [
    { id: 'a', label: 'A', score: 0.6 },
    { id: 'b', label: 'B', score: 0.4 },
  ];
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    semanticThreshold: 0.5,
  });
  assert.equal(out.length, 1);
  assert.equal(out[0]?.conceptId, 'a');
});

test('recallCandidates expands with co_occur via traverse', async () => {
  const nearest: NearestRecallFn = async () => [
    { id: 'seed', label: '씨앗', score: 0.9 },
  ];
  const traverse: TraverseFn = async (_db, conceptId) => {
    if (conceptId === 'seed') {
      return [
        { id: 'neighbor1', label: '이웃1', weight: 0.7 },
        { id: 'neighbor2', label: '이웃2', weight: 0.5 },
      ];
    }
    return [];
  };
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    traverse,
  });
  assert.equal(out.length, 3);
  const seed = out.find((c) => c.conceptId === 'seed');
  assert.equal(seed?.source, 'semantic');
  const n1 = out.find((c) => c.conceptId === 'neighbor1');
  assert.equal(n1?.source, 'co_occur');
  assert.equal(n1?.label, '이웃1');
  assert.equal(n1?.score, 0.7);
});

test('recallCandidates dedups by conceptId — semantic + co_occur becomes mixed with max score', async () => {
  const nearest: NearestRecallFn = async () => [
    { id: 'shared', label: '공통', score: 0.6 },
    { id: 'seed', label: '씨앗', score: 0.9 },
  ];
  const traverse: TraverseFn = async (_db, conceptId) => {
    if (conceptId === 'seed') {
      return [{ id: 'shared', label: '공통', weight: 0.8 }];
    }
    if (conceptId === 'shared') return [];
    return [];
  };
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    traverse,
  });
  const shared = out.find((c) => c.conceptId === 'shared');
  assert.equal(shared?.source, 'mixed');
  assert.equal(shared?.score, 0.8);
});

test('recallCandidates returns [] when nearest fn omitted (no semantic seed)', async () => {
  const out = await recallCandidates('q', { db: fakeDb, embed });
  assert.deepEqual(out, []);
});

test('recallCandidates throws on dimension mismatch', async () => {
  const nearest: NearestRecallFn = async () => [];
  const badEmbed: EmbedFn = async () => new Float32Array(10);
  await assert.rejects(
    () => recallCandidates('q', { db: fakeDb, embed: badEmbed, nearest }),
    /768-dim embedding, got 10/,
  );
});

test('recallCandidates orders results by score descending', async () => {
  const nearest: NearestRecallFn = async () => [
    { id: 'low', label: 'low', score: 0.55 },
    { id: 'mid', label: 'mid', score: 0.7 },
    { id: 'high', label: 'high', score: 0.95 },
  ];
  const out = await recallCandidates('q', { db: fakeDb, embed, nearest });
  assert.deepEqual(
    out.map((c) => c.conceptId),
    ['high', 'mid', 'low'],
  );
});

test('recallCandidates respects custom k passed to nearest', async () => {
  let observedK = -1;
  const nearest: NearestRecallFn = async (_db, _vec, k) => {
    observedK = k;
    return [];
  };
  await recallCandidates('q', { db: fakeDb, embed, nearest, k: 3 });
  assert.equal(observedK, 3);
});

test('recallCandidates passes db through to nearest and traverse', async () => {
  let nearestDb: unknown;
  let traverseDb: unknown;
  const nearest: NearestRecallFn = async (db) => {
    nearestDb = db;
    return [{ id: 's', label: 's', score: 0.9 }];
  };
  const traverse: TraverseFn = async (db) => {
    traverseDb = db;
    return [];
  };
  await recallCandidates('q', { db: fakeDb, embed, nearest, traverse });
  assert.equal(nearestDb, fakeDb);
  assert.equal(traverseDb, fakeDb);
});

// ── Sprint 5: 합집합 갱신 (D-S5-recall-source-priority) ─────────────────────

test('recallCandidates Sprint 5: 합집합 hyperTraverse 주입 시 bridge candidate 가 결과에 포함 (DI override)', async () => {
  const nearest: NearestRecallFn = async () => [
    { id: 'seed', label: '씨앗', score: 0.9 },
  ];
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    hyperTraverse: async () => [],
    bridge: async () => [
      {
        conceptId: 'far',
        label: '먼개념',
        score: 0.4,
        source: 'bridge',
      },
    ],
    domainCrossing: async () => [],
  });
  assert.equal(out.length, 2);
  const far = out.find((c) => c.conceptId === 'far');
  assert.equal(far?.source, 'bridge');
  assert.equal(far?.label, '먼개념');
});

test('recallCandidates Sprint 5: 합집합 source priority — mixed > semantic > co_occur > bridge > temporal > domain_crossing', async () => {
  const nearest: NearestRecallFn = async () => [
    { id: 'sem', label: 'sem', score: 0.55 },
  ];
  const traverse: TraverseFn = async (_db, conceptId) => {
    if (conceptId === 'sem') {
      return [{ id: 'co', label: 'co', weight: 0.95 }];
    }
    return [];
  };
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    traverse,
    hyperTraverse: async () => [],
    bridge: async () => [
      { conceptId: 'br', label: 'br', score: 0.99, source: 'bridge' },
    ],
    domainCrossing: async () => [
      { conceptId: 'dc', label: 'dc', score: 0.99, source: 'domain_crossing' },
    ],
    recentDecisions: [
      { id: 'l1', decided_at: 1, act: 'ghost', candidate_ids: ['tm'] },
    ],
    temporal: async () => [
      { conceptId: 'tm', label: 'tm', score: 0.99, source: 'temporal' },
    ],
  });
  // sem hit → 'sem' 만 source semantic. co 는 traverse 로 co_occur. bridge / temporal / dc 는 hyperRecall.
  // priority order: semantic 'sem' < co_occur 'co' < bridge 'br' < temporal 'tm' < domain_crossing 'dc'
  // (mixed 는 conceptId 충돌 시 발생, 본 케이스는 모두 distinct).
  const sources = out.map((c) => c.source);
  assert.deepEqual(sources, ['semantic', 'co_occur', 'bridge', 'temporal', 'domain_crossing']);
  assert.equal(out[0]?.conceptId, 'sem');
  assert.equal(out[1]?.conceptId, 'co');
  assert.equal(out[2]?.conceptId, 'br');
  assert.equal(out[3]?.conceptId, 'tm');
  assert.equal(out[4]?.conceptId, 'dc');
});

test('recallCandidates Sprint 5: 같은 conceptId 가 semantic + bridge 모두 hit → mixed 승격, score=max', async () => {
  const nearest: NearestRecallFn = async () => [
    { id: 'shared', label: '공통', score: 0.6 },
  ];
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    hyperTraverse: async () => [],
    bridge: async () => [
      { conceptId: 'shared', label: '공통', score: 0.85, source: 'bridge' },
    ],
    domainCrossing: async () => [],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0]?.source, 'mixed');
  assert.equal(out[0]?.score, 0.85);
});

// ── Sprint 6: forgetting decay + dismiss penalty (D-S6-engine-recall-forgetting-dismiss) ──

test('recallCandidates Sprint 6: recordTouch DI 호출 — semantic hit conceptId 마다 1회', async () => {
  const nearest: NearestRecallFn = async () => [
    { id: 'a', label: 'a', score: 0.9 },
    { id: 'b', label: 'b', score: 0.7 },
    { id: 'low', label: 'low', score: 0.3 },
  ];
  const touched: Array<{ id: string; now: number }> = [];
  const recordTouch: RecordTouchFn = async (_db, id, now) => {
    touched.push({ id, now });
  };
  const NOW = 1_700_000_000_000;
  await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    recordTouch,
    now: NOW,
    semanticThreshold: 0.5,
  });
  // threshold 미만 'low' 는 touch 0 회. 'a', 'b' 만 touch.
  assert.equal(touched.length, 2);
  assert.deepEqual(
    touched.map((t) => t.id).sort(),
    ['a', 'b'],
  );
  assert.ok(touched.every((t) => t.now === NOW));
});

test('recallCandidates Sprint 6: forgetting decay 적용 — last_used_at=now-7d → score*0.5', async () => {
  const NOW = 1_700_000_000_000;
  const nearest: NearestRecallFn = async () => [
    { id: 'old', label: 'old', score: 1.0 },
  ];
  const getLastUsedAt: GetLastUsedAtFn = async (_db, id) => {
    if (id === 'old') return NOW - DEFAULT_HALF_LIFE_MS; // 7 days ago
    return undefined;
  };
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    getLastUsedAt,
    now: NOW,
  });
  assert.equal(out.length, 1);
  assert.equal(out[0]?.conceptId, 'old');
  assert.equal(out[0]?.score, 0.5);
});

test('recallCandidates Sprint 6: forgetting decay 비활성 — getLastUsedAt 미주입 시 score 변화 0', async () => {
  const NOW = 1_700_000_000_000;
  const nearest: NearestRecallFn = async () => [
    { id: 'a', label: 'a', score: 0.9 },
  ];
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    now: NOW,
  });
  assert.equal(out[0]?.score, 0.9);
});

test('recallCandidates Sprint 6: forgetting decay skip — last_used_at undefined or 0 (silent migration default)', async () => {
  const NOW = 1_700_000_000_000;
  const nearest: NearestRecallFn = async () => [
    { id: 'fresh', label: 'fresh', score: 0.9 },
    { id: 'never', label: 'never', score: 0.8 },
  ];
  const getLastUsedAt: GetLastUsedAtFn = async (_db, id) => {
    if (id === 'fresh') return undefined;
    if (id === 'never') return 0;
    return undefined;
  };
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    getLastUsedAt,
    now: NOW,
  });
  // 둘 다 decay 비적용 — score 그대로
  const fresh = out.find((c) => c.conceptId === 'fresh');
  const never = out.find((c) => c.conceptId === 'never');
  assert.equal(fresh?.score, 0.9);
  assert.equal(never?.score, 0.8);
});

test('recallCandidates Sprint 6: dismiss penalty — dismissedConceptIds set 매칭 시 score *= 0.5 (default)', async () => {
  const nearest: NearestRecallFn = async () => [
    { id: 'dismissed', label: 'X', score: 0.9 },
    { id: 'kept', label: 'Y', score: 0.8 },
  ];
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    dismissedConceptIds: new Set(['dismissed']),
  });
  const dismissed = out.find((c) => c.conceptId === 'dismissed');
  const kept = out.find((c) => c.conceptId === 'kept');
  assert.equal(dismissed?.score, 0.45); // 0.9 * 0.5
  assert.equal(kept?.score, 0.8);
});

test('recallCandidates Sprint 6: dismiss penalty 커스텀 배수 (dismissPenalty=0.1) 적용', async () => {
  const nearest: NearestRecallFn = async () => [
    { id: 'd', label: 'd', score: 1.0 },
  ];
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    dismissedConceptIds: new Set(['d']),
    dismissPenalty: 0.1,
  });
  assert.equal(out[0]?.score, 0.1);
});

test('recallCandidates Sprint 6: forgetting + dismiss 합성 — 7d 경과 + dismiss → score *= 0.5 * 0.5 = 0.25', async () => {
  const NOW = 1_700_000_000_000;
  const nearest: NearestRecallFn = async () => [
    { id: 'both', label: 'both', score: 1.0 },
  ];
  const getLastUsedAt: GetLastUsedAtFn = async () => NOW - DEFAULT_HALF_LIFE_MS;
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
    getLastUsedAt,
    dismissedConceptIds: new Set(['both']),
    now: NOW,
  });
  assert.equal(out[0]?.score, 0.25);
});

test('recallCandidates Sprint 6: 시그니처 동결 — 기존 옵션 (db/embed/nearest/traverse/hyperTraverse/bridge/temporal/domainCrossing/recentDecisions/k/semanticThreshold) 그대로 동작', async () => {
  const nearest: NearestRecallFn = async () => [
    { id: 'a', label: 'a', score: 0.7 },
  ];
  // Sprint 6 신규 옵션 0개 — Sprint 5 그대로
  const out = await recallCandidates('q', {
    db: fakeDb,
    embed,
    nearest,
  });
  assert.equal(out.length, 1);
  assert.equal(out[0]?.score, 0.7);
});
