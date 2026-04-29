import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type Concept,
  type GraphEdge,
  type RecallCandidate,
  type RecallReason,
} from '../index.ts';

test('Concept type compiles with required fields (re-exported from protocol — D-S5-concept-createdAt-retain CONFIRM)', () => {
  const c: Concept = { id: 'c1', label: '작업', createdAt: 0 };
  assert.equal(c.id, 'c1');
  assert.equal(c.label, '작업');
  assert.equal(c.embedding, undefined);
  assert.equal(c.kind, undefined);
});

test('Concept supports optional 768-dim embedding (number[]) + optional kind', () => {
  const embedding = new Array(768).fill(0);
  const c: Concept = { id: 'c2', label: 'x', createdAt: 1, embedding, kind: 'place' };
  assert.equal(c.embedding?.length, 768);
  assert.equal(c.kind, 'place');
});

test('GraphEdge.kind narrowed to co_occur | semantic (T1.5 — bridge/temporal 은 source layer 책임이지 edge layer X)', () => {
  const edges: GraphEdge[] = [
    { fromId: 'a', toId: 'b', weight: 0.5, kind: 'co_occur' },
    { fromId: 'a', toId: 'b', weight: 0.5, kind: 'semantic' },
  ];
  assert.equal(edges.length, 2);
});

test('RecallCandidate (Sprint 5) has source field with 6 union members + label + score', () => {
  const c: RecallCandidate = {
    conceptId: 'c1',
    label: 'L',
    score: 0.9,
    source: 'semantic',
  };
  assert.equal(c.source, 'semantic');
});

test('RecallReason (engine-only, Sprint 5 합집합 RecallCandidate.source 의 subset 표기) enumerates semantic|bridge|temporal|domain_crossing', () => {
  const reasons: RecallReason[] = ['semantic', 'bridge', 'temporal', 'domain_crossing'];
  assert.equal(reasons.length, 4);
});
