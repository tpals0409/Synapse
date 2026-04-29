import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEdges, EMBED_DIM, type NearestFn } from '../index.ts';
import type { EmbeddedConcept } from '../index.ts';

const newConcept: EmbeddedConcept = {
  id: 'new',
  label: '신규',
  createdAt: 100,
  embedding: new Float32Array(EMBED_DIM),
};

test('buildEdges returns 0 edges on empty DB first message', async () => {
  const nearest: NearestFn = async () => [];
  const edges = await buildEdges(newConcept, { nearest });
  assert.deepEqual(edges, []);
});

test('buildEdges produces co_occur edges from prevMessageConceptIds (1:1)', async () => {
  const nearest: NearestFn = async () => [];
  const edges = await buildEdges(newConcept, {
    prevMessageConceptIds: ['p1', 'p2'],
    nearest,
  });
  const coOccur = edges.filter((e) => e.kind === 'co_occur');
  assert.equal(coOccur.length, 2);
  assert.deepEqual(
    coOccur.map((e) => e.toId).sort(),
    ['p1', 'p2'],
  );
  for (const e of coOccur) {
    assert.equal(e.fromId, 'new');
    assert.equal(e.weight, 1.0);
  }
});

test('buildEdges semantic edges produce {fromId, toId} (T1.5 protocol field naming)', async () => {
  const nearest: NearestFn = async () => [{ id: 'x', score: 0.95 }];
  const edges = await buildEdges(newConcept, { nearest });
  const semantic = edges.filter((e) => e.kind === 'semantic');
  assert.equal(semantic.length, 1);
  assert.equal(semantic[0]?.fromId, 'new');
  assert.equal(semantic[0]?.toId, 'x');
});

test('buildEdges semantic edges only for score ≥ threshold(default 0.7)', async () => {
  const nearest: NearestFn = async () => [
    { id: 'a', score: 0.91 },
    { id: 'b', score: 0.72 },
    { id: 'c', score: 0.69 },
    { id: 'd', score: 0.50 },
    { id: 'e', score: 0.10 },
  ];
  const edges = await buildEdges(newConcept, { nearest });
  const semantic = edges.filter((e) => e.kind === 'semantic');
  assert.equal(semantic.length, 2);
  assert.deepEqual(
    semantic.map((e) => e.toId).sort(),
    ['a', 'b'],
  );
  const aEdge = semantic.find((e) => e.toId === 'a');
  assert.equal(aEdge?.weight, 0.91);
  assert.equal(aEdge?.fromId, 'new');
});

test('buildEdges respects custom threshold', async () => {
  const nearest: NearestFn = async () => [
    { id: 'a', score: 0.6 },
    { id: 'b', score: 0.4 },
  ];
  const edges = await buildEdges(newConcept, { nearest, threshold: 0.5 });
  const semantic = edges.filter((e) => e.kind === 'semantic');
  assert.equal(semantic.length, 1);
  assert.equal(semantic[0]?.toId, 'a');
});

test('buildEdges combines co_occur + semantic in one call', async () => {
  const nearest: NearestFn = async () => [{ id: 's1', score: 0.85 }];
  const edges = await buildEdges(newConcept, {
    prevMessageConceptIds: ['p1'],
    nearest,
  });
  assert.equal(edges.length, 2);
  assert.equal(edges.filter((e) => e.kind === 'co_occur').length, 1);
  assert.equal(edges.filter((e) => e.kind === 'semantic').length, 1);
});

test('buildEdges excludes self id from co_occur', async () => {
  const nearest: NearestFn = async () => [];
  const edges = await buildEdges(newConcept, {
    prevMessageConceptIds: ['new', 'p1'],
    nearest,
  });
  const coOccur = edges.filter((e) => e.kind === 'co_occur');
  assert.equal(coOccur.length, 1);
  assert.equal(coOccur[0]?.toId, 'p1');
});

test('buildEdges excludes self id from nearest hits', async () => {
  const nearest: NearestFn = async () => [
    { id: 'new', score: 1.0 },
    { id: 'a', score: 0.9 },
  ];
  const edges = await buildEdges(newConcept, { nearest });
  const semantic = edges.filter((e) => e.kind === 'semantic');
  assert.equal(semantic.length, 1);
  assert.equal(semantic[0]?.toId, 'a');
});

test('buildEdges passes excludeId + topK to nearest', async () => {
  const calls: Array<{ k: number; excludeId?: string }> = [];
  const nearest: NearestFn = async (_vec, k, opts) => {
    calls.push({ k, excludeId: opts?.excludeId });
    return [];
  };
  await buildEdges(newConcept, { nearest });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.k, 5);
  assert.equal(calls[0]?.excludeId, 'new');
});

test('buildEdges skips semantic when concept has no embedding (Concept)', async () => {
  const seen: string[] = [];
  const nearest: NearestFn = async () => {
    seen.push('called');
    return [];
  };
  const edges = await buildEdges(
    { id: 'plain', label: 'p', createdAt: 0 },
    { prevMessageConceptIds: ['x'], nearest },
  );
  assert.equal(seen.length, 0);
  assert.equal(edges.length, 1);
  assert.equal(edges[0]?.kind, 'co_occur');
});
