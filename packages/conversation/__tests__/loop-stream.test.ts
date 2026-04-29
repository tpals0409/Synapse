import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, migrate, listMessages } from '@synapse/storage';
import { sendStream } from '../index.ts';

async function* fromArray(chunks: string[]): AsyncIterable<string> {
  for (const c of chunks) {
    yield c;
  }
}

test('sendStream golden: yields chunks in order, persists user + assistant, returns latency_ms', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const tokens: string[] = [];
  for await (const tok of sendStream('안녕', {
    db,
    completeStream: (prompt) => {
      assert.equal(prompt, '안녕');
      return fromArray(['안', '녕', '!']);
    },
  })) {
    tokens.push(tok);
  }

  assert.deepEqual(tokens, ['안', '녕', '!']);

  const rows = listMessages(db);
  assert.equal(rows.length, 2, 'expected user + assistant rows');
  assert.equal(rows[0]?.role, 'user');
  assert.equal(rows[0]?.content, '안녕');
  assert.equal(rows[1]?.role, 'assistant');
  assert.equal(rows[1]?.content, '안녕!');
  assert.ok(rows[0]!.ts <= rows[1]!.ts, 'user ts should precede assistant ts');
});

test('sendStream error mid-stream: user row preserved, no assistant row, throws', async () => {
  const db = openDb(':memory:');
  migrate(db);

  async function* explodingStream(): AsyncIterable<string> {
    yield '안';
    throw new Error('gemma down mid-stream');
  }

  const collected: string[] = [];
  await assert.rejects(async () => {
    for await (const tok of sendStream('안녕', {
      db,
      completeStream: () => explodingStream(),
    })) {
      collected.push(tok);
    }
  }, /gemma down mid-stream/);

  assert.deepEqual(collected, ['안'], 'consumer received chunks before failure');

  const rows = listMessages(db);
  assert.equal(rows.length, 1, 'user row must still be persisted');
  assert.equal(rows[0]?.role, 'user');
  assert.equal(rows[0]?.content, '안녕');
});

test('sendStream records latency_ms (ms = ts1 - ts0) on assistant row', async () => {
  const db = openDb(':memory:');
  migrate(db);

  async function* slowStream(): AsyncIterable<string> {
    await new Promise((r) => setTimeout(r, 12));
    yield 'hi';
    await new Promise((r) => setTimeout(r, 8));
    yield '!';
  }

  for await (const _ of sendStream('hello', {
    db,
    completeStream: () => slowStream(),
  })) {
    // drain
  }

  const rows = listMessages(db);
  assert.equal(rows.length, 2);
  const asst = rows[1]!;
  assert.equal(asst.role, 'assistant');
  assert.equal(asst.content, 'hi!');
  assert.ok(typeof asst.latency_ms === 'number', 'latency_ms must be a number');
  assert.ok(asst.latency_ms! >= 15, `latency_ms ${asst.latency_ms} should be ≥ 15ms (sleeps totalled 20ms)`);
  assert.ok(asst.latency_ms! < 5_000, 'latency_ms sanity upper bound');
});
