import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb, migrate, appendMessage, listMessages } from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-'));
  const path = join(dir, 'test.db');
  const db = openDb(path);
  migrate(db);
  return {
    db,
    cleanup: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test('migrate creates messages + messages_vec; append + list round-trips ts ASC', () => {
  const { db, cleanup } = freshDb();
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type IN ('table','virtual') OR name = 'messages_vec'")
      .all() as { name: string }[];
    const names = new Set(tables.map((t) => t.name));
    assert.ok(names.has('messages'), 'messages table exists');
    assert.ok(names.has('messages_vec'), 'messages_vec virtual table exists');

    appendMessage(db, { id: 'm2', role: 'assistant', content: '안녕하세요', ts: 200 });
    appendMessage(db, { id: 'm1', role: 'user', content: '안녕', ts: 100 });

    const got = listMessages(db);
    assert.equal(got.length, 2);
    assert.equal(got[0]?.id, 'm1');
    assert.equal(got[0]?.role, 'user');
    assert.equal(got[0]?.content, '안녕');
    assert.equal(got[1]?.id, 'm2');
    assert.equal(got[1]?.role, 'assistant');
  } finally {
    cleanup();
  }
});

test('migrate is idempotent', () => {
  const { db, cleanup } = freshDb();
  try {
    migrate(db);
    migrate(db);
    const applied = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    assert.equal(applied.n, 1);
  } finally {
    cleanup();
  }
});
