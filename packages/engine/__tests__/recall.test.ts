import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recallCandidates,
  EMBED_DIM,
  type EmbedFn,
  type NearestRecallFn,
  type TraverseFn,
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
    bridge: async (seedId) => [
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
