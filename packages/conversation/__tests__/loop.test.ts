import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, migrate, listMessages } from '@synapse/storage';
import { send } from '../index.ts';

test('send appends user + assistant rows and returns LLM reply', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const fakeReply = '안녕! 무엇을 도와드릴까요?';
  const reply = await send('안녕', {
    db,
    complete: async (prompt) => {
      assert.equal(prompt, '안녕');
      return fakeReply;
    },
  });

  assert.equal(reply, fakeReply);

  const rows = listMessages(db);
  assert.equal(rows.length, 2, 'expected user + assistant rows');
  assert.equal(rows[0]?.role, 'user');
  assert.equal(rows[0]?.content, '안녕');
  assert.equal(rows[1]?.role, 'assistant');
  assert.equal(rows[1]?.content, fakeReply);
  assert.ok(rows[0]!.ts <= rows[1]!.ts, 'user ts should precede assistant ts');
});

test('send propagates LLM errors and does not append assistant row', async () => {
  const db = openDb(':memory:');
  migrate(db);

  await assert.rejects(
    send('hello', {
      db,
      complete: async () => {
        throw new Error('gemma down');
      },
    }),
    /gemma down/,
  );

  const rows = listMessages(db);
  assert.equal(rows.length, 1, 'user row should still be persisted');
  assert.equal(rows[0]?.role, 'user');
});
