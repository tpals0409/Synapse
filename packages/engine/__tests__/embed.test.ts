import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embedConcept, EMBED_DIM, type EmbedFn } from '../index.ts';
import type { Concept } from '../index.ts';

const concept: Concept = { id: 'c1', label: '산책', createdAt: 1 };

test('embedConcept returns concept with 768d Float32Array', async () => {
  const embed: EmbedFn = async () => new Float32Array(EMBED_DIM);
  const out = await embedConcept(concept, { embed });
  assert.equal(out.id, 'c1');
  assert.equal(out.label, '산책');
  assert.equal(out.createdAt, 1);
  assert.ok(out.embedding instanceof Float32Array);
  assert.equal(out.embedding.length, EMBED_DIM);
});

test('embedConcept throws on dimension mismatch', async () => {
  const embed: EmbedFn = async () => new Float32Array(512);
  await assert.rejects(() => embedConcept(concept, { embed }), /768.*512|512.*768/);
});

test('embedConcept propagates embed network error', async () => {
  const embed: EmbedFn = async () => {
    throw new Error('network down');
  };
  await assert.rejects(() => embedConcept(concept, { embed }), /network down/);
});

test('embedConcept passes concept.label to embed fn', async () => {
  const seen: string[] = [];
  const embed: EmbedFn = async (text) => {
    seen.push(text);
    return new Float32Array(EMBED_DIM);
  };
  await embedConcept(concept, { embed });
  assert.deepEqual(seen, ['산책']);
});

test('embedConcept does not mutate input concept', async () => {
  const embed: EmbedFn = async () => new Float32Array(EMBED_DIM);
  await embedConcept(concept, { embed });
  assert.equal(concept.embedding, undefined);
});
