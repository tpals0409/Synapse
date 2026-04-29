import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractConcepts, type CompleteFn } from '../index.ts';

function stub(response: string): CompleteFn {
  return async () => response;
}

test('extractConcepts parses normal JSON with ≤3 concepts', async () => {
  const complete = stub(
    JSON.stringify({
      concepts: [{ label: '산책' }, { label: '음악' }],
    }),
  );
  const out = await extractConcepts('어제 산책 중 들은 노래가 좋았어', {
    complete,
    now: () => 1000,
    newId: (() => {
      let n = 0;
      return () => `c${++n}`;
    })(),
  });
  assert.equal(out.length, 2);
  assert.equal(out[0]?.label, '산책');
  assert.equal(out[1]?.label, '음악');
  assert.equal(out[0]?.createdAt, 1000);
  assert.equal(out[0]?.id, 'c1');
});

test('extractConcepts truncates to 3 when LLM returns 4', async () => {
  const complete = stub(
    JSON.stringify({
      concepts: [{ label: 'a' }, { label: 'b' }, { label: 'c' }, { label: 'd' }],
    }),
  );
  const out = await extractConcepts('msg', { complete });
  assert.equal(out.length, 3);
  assert.deepEqual(
    out.map((c) => c.label),
    ['a', 'b', 'c'],
  );
});

test('extractConcepts returns [] for empty concepts array', async () => {
  const complete = stub(JSON.stringify({ concepts: [] }));
  const out = await extractConcepts('의미 없는 발화', { complete });
  assert.deepEqual(out, []);
});

test('extractConcepts filters out empty / non-string labels', async () => {
  const complete = stub(
    JSON.stringify({
      concepts: [{ label: '' }, { label: '   ' }, { label: '카페' }, { label: 42 }],
    }),
  );
  const out = await extractConcepts('msg', { complete });
  assert.equal(out.length, 1);
  assert.equal(out[0]?.label, '카페');
});

test('extractConcepts returns [] on malformed JSON', async () => {
  const complete = stub('not-json{{{');
  const out = await extractConcepts('msg', { complete });
  assert.deepEqual(out, []);
});

test('extractConcepts returns [] when payload missing concepts field', async () => {
  const complete = stub(JSON.stringify({ other: 'x' }));
  const out = await extractConcepts('msg', { complete });
  assert.deepEqual(out, []);
});

test('extractConcepts forwards system prompt + format=json to complete', async () => {
  const calls: Array<{ system: string; user: string; format: string }> = [];
  const complete: CompleteFn = async (opts) => {
    calls.push(opts);
    return JSON.stringify({ concepts: [{ label: 'x' }] });
  };
  await extractConcepts('hello', { complete });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.format, 'json');
  assert.equal(calls[0]?.user, 'hello');
  assert.match(calls[0]?.system ?? '', /Concept/);
});

test('extractConcepts trims whitespace in label', async () => {
  const complete = stub(JSON.stringify({ concepts: [{ label: '  여행  ' }] }));
  const out = await extractConcepts('msg', { complete });
  assert.equal(out[0]?.label, '여행');
});
