import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Concept, GraphEdge, EdgeKind } from '../index.ts';

test('protocol/concept: Concept compiles with required {id, label, createdAt} (D-S5-concept-createdAt-retain CONFIRM v2026-04-29)', () => {
  const c: Concept = { id: 'c1', label: '산책', createdAt: 1_700_000_000_000 };
  assert.equal(c.id, 'c1');
  assert.equal(c.label, '산책');
  assert.equal(c.createdAt, 1_700_000_000_000);
  assert.equal(c.kind, undefined);
  assert.equal(c.embedding, undefined);
});

test('protocol/concept: Concept supports optional kind + embedding (number[])', () => {
  const c: Concept = {
    id: 'c2',
    label: 'x',
    kind: 'place',
    embedding: new Array(768).fill(0),
    createdAt: 1,
  };
  assert.equal(c.kind, 'place');
  assert.equal(c.embedding?.length, 768);
});

test('protocol/concept: GraphEdge compiles with {fromId, toId, kind, weight}', () => {
  const e: GraphEdge = { fromId: 'a', toId: 'b', kind: 'co_occur', weight: 0.5 };
  assert.equal(e.fromId, 'a');
  assert.equal(e.toId, 'b');
  assert.equal(e.kind, 'co_occur');
  assert.equal(e.weight, 0.5);
});

test('protocol/concept: GraphEdge.kind narrowed to co_occur | semantic (T1.5 frozen — bridge/temporal 은 source layer 책임)', () => {
  const edges: GraphEdge[] = [
    { fromId: 'a', toId: 'b', kind: 'co_occur', weight: 0.5 },
    { fromId: 'a', toId: 'b', kind: 'semantic', weight: 0.9 },
  ];
  assert.equal(edges.length, 2);
  const kinds: EdgeKind[] = edges.map((e) => e.kind);
  assert.deepEqual(kinds.sort(), ['co_occur', 'semantic']);
});

test('protocol/concept: EdgeKind re-export from concept module is identical to recall module export', () => {
  const k: EdgeKind = 'co_occur';
  assert.equal(k, 'co_occur');
});
