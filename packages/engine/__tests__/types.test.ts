import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recall,
  type Concept,
  type GraphEdge,
  type RecallCandidate,
} from '../index.ts';

test('Concept type compiles with required fields', () => {
  const c: Concept = { id: 'c1', label: '작업', createdAt: 0 };
  assert.equal(c.id, 'c1');
  assert.equal(c.label, '작업');
  assert.equal(c.embedding, undefined);
});

test('Concept supports optional 768-dim embedding', () => {
  const embedding = new Array(768).fill(0);
  const c: Concept = { id: 'c2', label: 'x', createdAt: 1, embedding };
  assert.equal(c.embedding?.length, 768);
});

test('GraphEdge enumerates kind co_occur|semantic|bridge|temporal', () => {
  const edges: GraphEdge[] = [
    { from: 'a', to: 'b', weight: 0.5, kind: 'co_occur' },
    { from: 'a', to: 'b', weight: 0.5, kind: 'semantic' },
    { from: 'a', to: 'b', weight: 0.5, kind: 'bridge' },
    { from: 'a', to: 'b', weight: 0.5, kind: 'temporal' },
  ];
  assert.equal(edges.length, 4);
});

test('RecallCandidate enumerates reason semantic|bridge|temporal|domain_crossing', () => {
  const cands: RecallCandidate[] = [
    { conceptId: 'c1', score: 0.9, reason: 'semantic' },
    { conceptId: 'c1', score: 0.9, reason: 'bridge' },
    { conceptId: 'c1', score: 0.9, reason: 'temporal' },
    { conceptId: 'c1', score: 0.9, reason: 'domain_crossing', sourceMessageId: 'm1' },
  ];
  assert.equal(cands.length, 4);
  assert.equal(cands[3]?.sourceMessageId, 'm1');
});

test('recall is a stub that rejects in sprint 0', async () => {
  await assert.rejects(
    () => recall({ recentMessages: [] }),
    /not implemented in sprint 0/,
  );
});
