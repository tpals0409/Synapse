import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bridgeCandidates,
  temporalCandidates,
  domainCrossingCandidates,
  type HyperTraverseFn,
  type HyperTraverseHit,
  DEFAULT_BRIDGE_DEPTH,
  DEFAULT_TEMPORAL_WINDOW_MS,
  DEFAULT_KIND_WEIGHT,
} from '../src/hyperRecall.ts';
import type { RecallLogRow } from '@synapse/protocol';

const fakeDb = { __fake: true };

// ── helpers ──────────────────────────────────────────────────────────────────
function traverseFromGraph(
  graph: Record<string, HyperTraverseHit[]>,
): HyperTraverseFn {
  return async (_db, conceptId) => graph[conceptId] ?? [];
}

// ── bridge ───────────────────────────────────────────────────────────────────

test('bridgeCandidates: A→B→C → returns C as bridge with via=B, depth=2, score=mid*far weight', async () => {
  const traverse = traverseFromGraph({
    A: [{ id: 'B', label: 'B-label', weight: 0.8, kind: 'co_occur' }],
    B: [
      { id: 'A', label: 'A-label', weight: 0.8, kind: 'co_occur' },
      { id: 'C', label: 'C-label', weight: 0.6, kind: 'semantic' },
    ],
    C: [{ id: 'B', label: 'B-label', weight: 0.6, kind: 'semantic' }],
  });
  const out = await bridgeCandidates('A', { db: fakeDb, traverse });
  assert.equal(out.length, 1);
  assert.equal(out[0]?.conceptId, 'C');
  assert.equal(out[0]?.viaConceptId, 'B');
  assert.equal(out[0]?.depth, 2);
  assert.equal(out[0]?.source, 'bridge');
  assert.ok(Math.abs((out[0]?.score ?? 0) - 0.48) < 1e-9, `score≈0.48 actual=${out[0]?.score}`);
  assert.equal(out[0]?.label, 'C-label');
});

test('bridgeCandidates: 1-hop neighbors are excluded from bridge result (BFS hop=2 only, depth=2)', async () => {
  const traverse = traverseFromGraph({
    A: [
      { id: 'B', label: 'B', weight: 0.5, kind: 'co_occur' },
      { id: 'C', label: 'C', weight: 0.5, kind: 'co_occur' },
    ],
    B: [
      { id: 'A', label: 'A', weight: 0.5, kind: 'co_occur' },
      { id: 'C', label: 'C', weight: 0.9, kind: 'semantic' },
    ],
    C: [
      { id: 'A', label: 'A', weight: 0.5, kind: 'co_occur' },
      { id: 'B', label: 'B', weight: 0.9, kind: 'semantic' },
    ],
  });
  const out = await bridgeCandidates('A', { db: fakeDb, traverse });
  // Both B and C are 1-hop from A → neither qualifies as bridge.
  assert.equal(out.length, 0);
});

test('bridgeCandidates: seed itself is excluded even when reachable via 2 hops (cycle A→B→A)', async () => {
  const traverse = traverseFromGraph({
    A: [{ id: 'B', label: 'B', weight: 0.7, kind: 'co_occur' }],
    B: [{ id: 'A', label: 'A', weight: 0.7, kind: 'co_occur' }],
  });
  const out = await bridgeCandidates('A', { db: fakeDb, traverse });
  assert.equal(out.length, 0);
});

test('bridgeCandidates: depth<2 returns [] (depth=1 is co_occur direct, not bridge)', async () => {
  const traverse = traverseFromGraph({
    A: [{ id: 'B', label: 'B', weight: 0.7, kind: 'co_occur' }],
    B: [{ id: 'C', label: 'C', weight: 0.7, kind: 'co_occur' }],
  });
  const out = await bridgeCandidates('A', { db: fakeDb, traverse, depth: 1 });
  assert.deepEqual(out, []);
});

test('bridgeCandidates: multiple paths to same far node — score = max of weight products (deterministic)', async () => {
  const traverse = traverseFromGraph({
    A: [
      { id: 'B', label: 'B', weight: 0.5, kind: 'co_occur' },
      { id: 'X', label: 'X', weight: 0.9, kind: 'semantic' },
    ],
    B: [
      { id: 'A', label: 'A', weight: 0.5, kind: 'co_occur' },
      { id: 'C', label: 'C', weight: 0.6, kind: 'co_occur' },
    ],
    X: [
      { id: 'A', label: 'A', weight: 0.9, kind: 'semantic' },
      { id: 'C', label: 'C', weight: 0.4, kind: 'co_occur' },
    ],
    C: [],
  });
  const out = await bridgeCandidates('A', { db: fakeDb, traverse });
  assert.equal(out.length, 1);
  assert.equal(out[0]?.conceptId, 'C');
  // max(0.5*0.6, 0.9*0.4) = 0.36
  assert.ok(Math.abs((out[0]?.score ?? 0) - 0.36) < 1e-9, `score=0.36 actual=${out[0]?.score}`);
  // via = path that achieved max (B since 0.5*0.6=0.30 vs 0.9*0.4=0.36 → X wins).
  assert.equal(out[0]?.viaConceptId, 'X');
});

test('bridgeCandidates: maxBridges caps result count, sorted by score desc + conceptId asc tiebreak', async () => {
  const traverse = traverseFromGraph({
    seed: [{ id: 'mid', label: 'mid', weight: 1.0, kind: 'co_occur' }],
    mid: [
      { id: 'aa', label: 'aa', weight: 0.5, kind: 'co_occur' },
      { id: 'bb', label: 'bb', weight: 0.5, kind: 'co_occur' },
      { id: 'cc', label: 'cc', weight: 0.5, kind: 'co_occur' },
      { id: 'dd', label: 'dd', weight: 0.7, kind: 'co_occur' },
    ],
    aa: [],
    bb: [],
    cc: [],
    dd: [],
  });
  const out = await bridgeCandidates('seed', { db: fakeDb, traverse, maxBridges: 2 });
  assert.equal(out.length, 2);
  assert.equal(out[0]?.conceptId, 'dd', 'dd has highest score 0.7');
  // aa/bb/cc all tie at 0.5 — asc by conceptId → aa first.
  assert.equal(out[1]?.conceptId, 'aa');
});

test('bridgeCandidates: empty 1-hop → [] (no seed neighbors)', async () => {
  const traverse: HyperTraverseFn = async () => [];
  const out = await bridgeCandidates('lonely', { db: fakeDb, traverse });
  assert.deepEqual(out, []);
});

// ── temporal ─────────────────────────────────────────────────────────────────

test('temporalCandidates: empty recentDecisions → []', async () => {
  const out = await temporalCandidates({
    db: fakeDb,
    recentDecisions: [],
  });
  assert.deepEqual(out, []);
});

test('temporalCandidates: window 안 같은 row 의 conceptId 들 — coDecidedIds 정렬 + hit count 기반 score', async () => {
  const decisions: RecallLogRow[] = [
    {
      id: 'l1',
      decided_at: 1_700_000_000_000,
      act: 'ghost',
      candidate_ids: ['c1', 'c2', 'c3'],
    },
  ];
  const out = await temporalCandidates({ db: fakeDb, recentDecisions: decisions });
  assert.equal(out.length, 3);
  const c1 = out.find((c) => c.conceptId === 'c1');
  assert.equal(c1?.source, 'temporal');
  assert.equal(c1?.score, 0.4, 'hit_count=1 → 0.4');
  assert.deepEqual(c1?.coDecidedIds, ['c2', 'c3']);
  assert.equal(c1?.windowMs, DEFAULT_TEMPORAL_WINDOW_MS);
});

test('temporalCandidates: 같은 conceptId 가 여러 row 에서 등장 — hit count 누적, 2 → 0.7, 3+ → 0.9', async () => {
  const decisions: RecallLogRow[] = [
    { id: 'l1', decided_at: 1_700_000_000_000, act: 'ghost', candidate_ids: ['c1', 'c2'] },
    { id: 'l2', decided_at: 1_700_000_001_000, act: 'ghost', candidate_ids: ['c1', 'c3'] },
    { id: 'l3', decided_at: 1_700_000_002_000, act: 'suggestion', candidate_ids: ['c1', 'c4'] },
  ];
  const out = await temporalCandidates({ db: fakeDb, recentDecisions: decisions });
  const c1 = out.find((c) => c.conceptId === 'c1');
  assert.equal(c1?.score, 0.9, 'hit_count=3 → 0.9');
  assert.deepEqual(c1?.coDecidedIds, ['c2', 'c3', 'c4']);
});

test('temporalCandidates: 윈도우 밖 row 무시 (now = max decided_at, cutoff = now - windowMs)', async () => {
  const decisions: RecallLogRow[] = [
    { id: 'old', decided_at: 1_000_000, act: 'ghost', candidate_ids: ['stale'] },
    { id: 'new', decided_at: 1_000_000 + 10 * 60 * 60 * 1000, act: 'ghost', candidate_ids: ['fresh'] },
  ];
  const out = await temporalCandidates({
    db: fakeDb,
    recentDecisions: decisions,
    windowMs: 60 * 60 * 1000, // 1h — old 은 윈도우 밖
  });
  assert.equal(out.length, 1);
  assert.equal(out[0]?.conceptId, 'fresh');
});

test('temporalCandidates: resolveLabel 미주입 → label = conceptId fallback (carry-over 10 패턴)', async () => {
  const decisions: RecallLogRow[] = [
    { id: 'l1', decided_at: 1_700_000_000_000, act: 'ghost', candidate_ids: ['c1'] },
  ];
  const out = await temporalCandidates({ db: fakeDb, recentDecisions: decisions });
  assert.equal(out[0]?.label, 'c1');
});

test('temporalCandidates: resolveLabel 주입 → 매핑된 라벨 사용', async () => {
  const decisions: RecallLogRow[] = [
    { id: 'l1', decided_at: 1_700_000_000_000, act: 'ghost', candidate_ids: ['c1'] },
  ];
  const out = await temporalCandidates({
    db: fakeDb,
    recentDecisions: decisions,
    resolveLabel: (id) => (id === 'c1' ? '산책' : undefined),
  });
  assert.equal(out[0]?.label, '산책');
});

// ── domain crossing ────────────────────────────────────────────────────────

test('domainCrossingCandidates: 1-hop 중 두 kind 모두 등장 노드 추출 + 비대칭 score', async () => {
  // shared 노드는 co_occur(0.4) + semantic(0.9) 두 edge 모두 있음.
  const traverse = traverseFromGraph({
    seed: [
      { id: 'shared', label: '공유', weight: 0.4, kind: 'co_occur' },
      { id: 'shared', label: '공유', weight: 0.9, kind: 'semantic' },
      { id: 'only_co', label: 'co', weight: 0.5, kind: 'co_occur' },
      { id: 'only_sem', label: 'sem', weight: 0.7, kind: 'semantic' },
    ],
  });
  const out = await domainCrossingCandidates('seed', { db: fakeDb, traverse });
  assert.equal(out.length, 1);
  assert.equal(out[0]?.conceptId, 'shared');
  assert.equal(out[0]?.source, 'domain_crossing');
  assert.equal(out[0]?.edgeKindFrom, 'co_occur');
  assert.equal(out[0]?.edgeKindTo, 'semantic');
  // 0.4*0.5 + 0.9*1.0 = 0.2 + 0.9 = 1.1
  assert.ok(Math.abs((out[0]?.score ?? 0) - 1.1) < 1e-9, `score=1.1 actual=${out[0]?.score}`);
  assert.equal(out[0]?.label, '공유');
});

test('domainCrossingCandidates: 한 kind 만 hit 노드는 제외', async () => {
  const traverse = traverseFromGraph({
    seed: [
      { id: 'co_only', label: 'co', weight: 1.0, kind: 'co_occur' },
      { id: 'sem_only', label: 'sem', weight: 1.0, kind: 'semantic' },
    ],
  });
  const out = await domainCrossingCandidates('seed', { db: fakeDb, traverse });
  assert.deepEqual(out, []);
});

test('domainCrossingCandidates: kindWeight override (semantic 약화 시 score 변화)', async () => {
  const traverse = traverseFromGraph({
    seed: [
      { id: 'shared', label: 's', weight: 0.5, kind: 'co_occur' },
      { id: 'shared', label: 's', weight: 0.5, kind: 'semantic' },
    ],
  });
  const out = await domainCrossingCandidates('seed', {
    db: fakeDb,
    traverse,
    kindWeight: { co_occur: 1.0, semantic: 1.0 },
  });
  assert.equal(out.length, 1);
  // 0.5*1.0 + 0.5*1.0 = 1.0
  assert.equal(out[0]?.score, 1.0);
});

test('domainCrossingCandidates: seed 자기 자신 제외', async () => {
  const traverse = traverseFromGraph({
    seed: [
      { id: 'seed', label: 's', weight: 1.0, kind: 'co_occur' },
      { id: 'seed', label: 's', weight: 1.0, kind: 'semantic' },
    ],
  });
  const out = await domainCrossingCandidates('seed', { db: fakeDb, traverse });
  assert.deepEqual(out, []);
});

test('domainCrossingCandidates: 동일 kind 다중 hit → max weight 사용 (결정성)', async () => {
  const traverse = traverseFromGraph({
    seed: [
      { id: 'shared', label: 's', weight: 0.3, kind: 'co_occur' },
      { id: 'shared', label: 's', weight: 0.6, kind: 'co_occur' },
      { id: 'shared', label: 's', weight: 0.8, kind: 'semantic' },
    ],
  });
  const out = await domainCrossingCandidates('seed', { db: fakeDb, traverse });
  // 0.6*0.5 + 0.8*1.0 = 0.3 + 0.8 = 1.1
  assert.ok(Math.abs((out[0]?.score ?? 0) - 1.1) < 1e-9);
});

// ── defaults exposure ───────────────────────────────────────────────────────

test('hyperRecall: defaults exposed for receipt threshold tuning', () => {
  assert.equal(DEFAULT_BRIDGE_DEPTH, 2);
  assert.equal(DEFAULT_TEMPORAL_WINDOW_MS, 24 * 60 * 60 * 1000);
  assert.equal(DEFAULT_KIND_WEIGHT.co_occur, 0.5);
  assert.equal(DEFAULT_KIND_WEIGHT.semantic, 1.0);
});
