import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupConcepts,
  DEFAULT_DEDUP_EMBED_THRESHOLD,
  type MergePlan,
  type DedupConceptInput,
} from '../index.ts';

const T0 = 1_700_000_000_000;

function makeConcept(
  id: string,
  label: string,
  createdAt: number,
  embedding?: number[] | Float32Array,
): DedupConceptInput {
  return embedding === undefined
    ? { id, label, createdAt }
    : { id, label, createdAt, embedding };
}

// ---------- normalize-only 매칭 ----------

test('dedup/normalize: identical labels different ids → 1 MergePlan', () => {
  const concepts = [
    makeConcept('a', '토큰', T0),
    makeConcept('b', '토큰', T0 + 1000),
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].canonicalId, 'a');
  assert.deepEqual(plans[0].aliasIds, ['b']);
  assert.equal(plans[0].reason, 'normalized-label-equal');
  assert.equal(plans[0].score, 1.0);
});

test('dedup/normalize: case + whitespace + NFKC variants merged', () => {
  const concepts = [
    makeConcept('a', 'Token', T0),
    makeConcept('b', 'token', T0 + 1),
    makeConcept('c', '  TOKEN  ', T0 + 2),
    // NFKC: full-width 'Ｔｏｋｅｎ' → 'Token'
    makeConcept('d', 'Ｔｏｋｅｎ', T0 + 3),
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].canonicalId, 'a');
  assert.deepEqual(plans[0].aliasIds, ['b', 'c', 'd']);
  assert.equal(plans[0].reason, 'normalized-label-equal');
});

test('dedup/normalize: createdAt ASC + id ASC tie-break for canonical', () => {
  const concepts = [
    makeConcept('zzz', '토큰', T0 + 100),
    makeConcept('aaa', '토큰', T0 + 100), // same createdAt → id ASC wins
    makeConcept('mmm', '토큰', T0 + 50), // earlier createdAt → wins overall
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].canonicalId, 'mmm');
  assert.deepEqual(plans[0].aliasIds, ['aaa', 'zzz']);
});

test('dedup/normalize: empty label skipped', () => {
  const concepts = [
    makeConcept('a', '', T0),
    makeConcept('b', '   ', T0 + 1),
    makeConcept('c', '토큰', T0 + 2),
    makeConcept('d', '토큰', T0 + 3),
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].canonicalId, 'c');
});

test('dedup/normalize: distinct labels never merged', () => {
  const concepts = [
    makeConcept('a', '토큰', T0),
    makeConcept('b', '벡터', T0 + 1),
    makeConcept('c', '그래프', T0 + 2),
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 0);
});

// ---------- embedding similarity 매칭 ----------

test('dedup/embedding: cosine ≥ threshold pairs different normalized labels', () => {
  const v1 = [1, 0, 0];
  const v2 = [0.9, 0.1, 0]; // cosine ≈ 0.994 — high similarity
  const concepts = [
    makeConcept('a', 'AI', T0, v1),
    makeConcept('b', '인공지능', T0 + 1, v2),
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].canonicalId, 'a');
  assert.deepEqual(plans[0].aliasIds, ['b']);
  assert.equal(plans[0].reason, 'embedding-similarity');
  assert.ok(plans[0].score >= DEFAULT_DEDUP_EMBED_THRESHOLD);
});

test('dedup/embedding: cosine < threshold no merge', () => {
  const v1 = [1, 0, 0];
  const v2 = [0, 1, 0]; // cosine = 0
  const concepts = [
    makeConcept('a', 'AI', T0, v1),
    makeConcept('b', '벡터', T0 + 1, v2),
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 0);
});

test('dedup/embedding: custom threshold respected', () => {
  const v1 = [1, 0];
  const v2 = [0.6, 0.8]; // cosine = 0.6
  const concepts = [
    makeConcept('a', 'AI', T0, v1),
    makeConcept('b', '인공지능', T0 + 1, v2),
  ];
  // threshold 0.5 → merge
  const plansLow = dedupConcepts(concepts, { embedThreshold: 0.5 });
  assert.equal(plansLow.length, 1);
  // threshold 0.7 → no merge
  const plansHigh = dedupConcepts(concepts, { embedThreshold: 0.7 });
  assert.equal(plansHigh.length, 0);
});

test('dedup/embedding: Float32Array and number[] both accepted', () => {
  const concepts: DedupConceptInput[] = [
    makeConcept('a', 'AI', T0, [1, 0, 0]),
    makeConcept('b', '인공지능', T0 + 1, Float32Array.from([0.95, 0.05, 0])),
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 1);
});

test('dedup/embedding: zero vector returns 0 cosine — no merge', () => {
  const concepts = [
    makeConcept('a', 'AI', T0, [0, 0, 0]),
    makeConcept('b', '인공지능', T0 + 1, [0, 0, 0]),
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 0);
});

test('dedup/embedding: step 1 claimed concept excluded from step 2 (one concept = one plan)', () => {
  // 알고리즘 의도: 한 concept 은 한 plan 의 일원만. step 1 에서 claim 된 a/b 는
  // step 2 candidate 에서 제외 → c 는 비교 상대 없음 → plan 0개 추가.
  // 결과: normalize plan 1개만 (a canonical, b alias). c 는 separate.
  const v1 = [1, 0];
  const v2 = [1, 0];
  const v3 = [0.99, 0.01];
  const concepts = [
    makeConcept('a', 'AI', T0, v1),
    makeConcept('b', 'ai', T0 + 1, v2), // same normalize → step 1 claim a, b
    makeConcept('c', '인공지능', T0 + 2, v3), // c 만 step 2 candidate — 비교 상대 0
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].reason, 'normalized-label-equal');
  assert.equal(plans[0].canonicalId, 'a');
  assert.deepEqual(plans[0].aliasIds, ['b']);
});

test('dedup/embedding: independent embedding-similarity pairs co-exist with normalize plans', () => {
  // step 1: x/y normalize merge. step 2: p/q embedding merge (distinct labels, claimed 0).
  const concepts = [
    makeConcept('x', 'foo', T0, [1, 0, 0]),
    makeConcept('y', 'FOO', T0 + 1, [0, 1, 0]),
    makeConcept('p', 'AI', T0 + 2, [0, 0, 1]),
    makeConcept('q', '인공지능', T0 + 3, [0, 0.01, 0.99]),
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 2);
  const byReason = new Map<string, MergePlan>();
  for (const p of plans) byReason.set(p.reason, p);
  const norm = byReason.get('normalized-label-equal')!;
  const emb = byReason.get('embedding-similarity')!;
  assert.equal(norm.canonicalId, 'x');
  assert.deepEqual(norm.aliasIds, ['y']);
  assert.equal(emb.canonicalId, 'p');
  assert.deepEqual(emb.aliasIds, ['q']);
});

// ---------- 결정성 ----------

test('dedup/determinism: input order does not affect output', () => {
  const c1 = makeConcept('a', '토큰', T0);
  const c2 = makeConcept('b', '토큰', T0 + 1);
  const c3 = makeConcept('c', '벡터', T0 + 2);
  const order1 = dedupConcepts([c1, c2, c3]);
  const order2 = dedupConcepts([c3, c2, c1]);
  const order3 = dedupConcepts([c2, c1, c3]);
  assert.deepEqual(order1, order2);
  assert.deepEqual(order2, order3);
});

test('dedup/determinism: alias ids sorted createdAt ASC + id ASC', () => {
  const concepts = [
    makeConcept('m', '토큰', T0 + 5),
    makeConcept('z', '토큰', T0 + 5),
    makeConcept('a', '토큰', T0 + 5),
    makeConcept('canonical', '토큰', T0), // earliest
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].canonicalId, 'canonical');
  // same createdAt → id ASC.
  assert.deepEqual(plans[0].aliasIds, ['a', 'm', 'z']);
});

test('dedup/determinism: plans sorted by canonicalId', () => {
  const concepts = [
    makeConcept('zz1', 'foo', T0),
    makeConcept('zz2', 'foo', T0 + 1),
    makeConcept('aa1', 'bar', T0 + 2),
    makeConcept('aa2', 'bar', T0 + 3),
  ];
  const plans = dedupConcepts(concepts);
  assert.equal(plans.length, 2);
  assert.equal(plans[0].canonicalId, 'aa1');
  assert.equal(plans[1].canonicalId, 'zz1');
});

// ---------- 옵션 / 엣지 ----------

test('dedup/empty input returns empty plans', () => {
  assert.deepEqual(dedupConcepts([]), []);
  assert.deepEqual(dedupConcepts([makeConcept('a', '토큰', T0)]), []);
});

test('dedup/custom normalizeLabel', () => {
  const concepts = [
    makeConcept('a', 'AI', T0),
    makeConcept('b', 'ai', T0 + 1),
  ];
  // Custom normalize: identity (case-sensitive) → no merge.
  const plansIdentity = dedupConcepts(concepts, {
    normalizeLabel: (s) => s,
  });
  assert.equal(plansIdentity.length, 0);
});

test('dedup/custom embedSimilarity injection', () => {
  const concepts = [
    makeConcept('a', 'AI', T0, [1, 0]),
    makeConcept('b', '인공지능', T0 + 1, [1, 0]),
  ];
  // Custom: always returns 0 → no merge.
  const plans = dedupConcepts(concepts, {
    embedSimilarity: () => 0,
  });
  assert.equal(plans.length, 0);
});

test('dedup/no embedding skips embedding step entirely', () => {
  const concepts = [
    makeConcept('a', '토큰', T0),
    makeConcept('b', '토큰', T0 + 1),
    makeConcept('c', '벡터', T0 + 2),
    makeConcept('d', '그래프', T0 + 3),
  ];
  const plans = dedupConcepts(concepts);
  // step 1 만 — '토큰' 하나만 merge.
  assert.equal(plans.length, 1);
  assert.equal(plans[0].reason, 'normalized-label-equal');
});

test('dedup/first-claim wins: alias not double-claimed across plans', () => {
  // a, b, c 가 transitive 유사 — 단일 plan 으로 합치지 않고 first-claim 만.
  // a-b: cosine 0.95, a-c: cosine 0.95, b-c: cosine 0.9.
  const concepts = [
    makeConcept('a', 'X', T0, [1, 0, 0]),
    makeConcept('b', 'Y', T0 + 1, [0.95, 0.05, 0]),
    makeConcept('c', 'Z', T0 + 2, [0.95, 0, 0.05]),
  ];
  const plans = dedupConcepts(concepts);
  // a 가 canonical, b 와 c 모두 a 의 alias 로 묶여야 — single plan.
  assert.equal(plans.length, 1);
  assert.equal(plans[0].canonicalId, 'a');
  assert.deepEqual(plans[0].aliasIds, ['b', 'c']);
});
