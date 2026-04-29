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
    path,
    dir,
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

test('migrate is idempotent (re-run does not re-apply)', () => {
  const { db, cleanup } = freshDb();
  try {
    const before = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    migrate(db);
    migrate(db);
    const after = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    assert.equal(after.n, before.n, '_migrations row count unchanged on re-run');
    assert.ok(before.n >= 2, 'at least 0001 + 0002 applied');
  } finally {
    cleanup();
  }
});

test('0002: messages.latency_ms column exists, round-trips on appendMessage', () => {
  const { db, cleanup } = freshDb();
  try {
    const cols = db.prepare("PRAGMA table_info('messages')").all() as { name: string }[];
    const colNames = new Set(cols.map((c) => c.name));
    assert.ok(colNames.has('latency_ms'), 'latency_ms column added by 0002');

    appendMessage(db, { id: 'u1', role: 'user', content: '안녕', ts: 100 });
    appendMessage(db, {
      id: 'a1',
      role: 'assistant',
      content: '안녕하세요',
      ts: 200,
      latency_ms: 1234,
    });

    const got = listMessages(db);
    assert.equal(got.length, 2);
    assert.equal(got[0]?.latency_ms, undefined, 'user row latency_ms NULL → undefined');
    assert.equal(got[1]?.latency_ms, 1234, 'assistant row latency_ms round-trips');
  } finally {
    cleanup();
  }
});

test('migrate from 0001-only DB upgrades to 0001+0002 (forward compat)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-'));
  const path = join(dir, 'legacy.db');
  try {
    // simulate a Sprint 0 DB: only 0001 was applied.
    const db = openDb(path);
    db.exec(
      `CREATE TABLE _migrations (name TEXT PRIMARY KEY, ts INTEGER NOT NULL);
       CREATE TABLE messages (
         id TEXT PRIMARY KEY,
         role TEXT NOT NULL CHECK(role IN ('user','assistant')),
         content TEXT NOT NULL,
         ts INTEGER NOT NULL
       );
       CREATE INDEX idx_messages_ts ON messages(ts);
       CREATE VIRTUAL TABLE messages_vec USING vec0(
         message_id TEXT PRIMARY KEY,
         embedding float[768]
       );
       INSERT INTO _migrations (name, ts) VALUES ('0001_init.sql', 1);`,
    );
    // pre-existing user row from Sprint 0.
    db.prepare('INSERT INTO messages (id, role, content, ts) VALUES (?,?,?,?)').run(
      'legacy-1',
      'user',
      'old',
      50,
    );

    migrate(db);

    const cols = db.prepare("PRAGMA table_info('messages')").all() as { name: string }[];
    assert.ok(cols.some((c) => c.name === 'latency_ms'), 'latency_ms added by 0002');

    const applied = db
      .prepare('SELECT name FROM _migrations ORDER BY name ASC')
      .all() as { name: string }[];
    const names = applied.map((r) => r.name);
    assert.ok(names.includes('0001_init.sql'), '0001 tracked');
    assert.ok(names.includes('0002_latency.sql'), '0002 tracked (forward compat)');
    // newer migrations (0003+) are also applied on upgrade — verify monotonic order.
    const sorted = [...names].sort();
    assert.deepEqual(names, sorted, 'migrations applied in lexical order');

    // legacy row preserved with NULL latency_ms.
    const got = listMessages(db);
    assert.equal(got.length, 1);
    assert.equal(got[0]?.id, 'legacy-1');
    assert.equal(got[0]?.latency_ms, undefined);

    // re-running migrate is still idempotent on upgraded DB.
    const before = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    migrate(db);
    const after = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    assert.equal(after.n, before.n, 'idempotent on upgraded DB');

    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
