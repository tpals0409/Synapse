import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb, migrate } from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-mig0007-'));
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

test('0007: decision_log.session_hash column + index exists, NULL allowed', () => {
  const { db, cleanup } = freshDb();
  try {
    const cols = db.prepare("PRAGMA table_info('decision_log')").all() as {
      name: string;
      notnull: number;
    }[];
    const sh = cols.find((c) => c.name === 'session_hash');
    assert.ok(sh, 'session_hash column exists on decision_log');
    assert.equal(sh!.notnull, 0, 'session_hash NULL allowed');

    const idx = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_decision_log_session_hash'",
      )
      .all() as { name: string }[];
    assert.equal(idx.length, 1, 'idx_decision_log_session_hash exists');

    db.prepare(
      'INSERT INTO decision_log (id, ts, actor, action, payload, session_hash) VALUES (?,?,?,?,?,?)',
    ).run('d-with-hash', 100, 'mobile', 'recall_click', null, 'abcdef0123456789');
    db.prepare(
      'INSERT INTO decision_log (id, ts, actor, action, payload, session_hash) VALUES (?,?,?,?,?,?)',
    ).run('d-null-hash', 101, 'orchestrator', 'silence', null, null);

    const rows = db
      .prepare('SELECT id, session_hash FROM decision_log ORDER BY id ASC')
      .all() as { id: string; session_hash: string | null }[];
    assert.equal(rows.length, 2);
    assert.equal(rows[0]!.session_hash, null, 'null row stored as null');
    assert.equal(rows[1]!.session_hash, 'abcdef0123456789', 'hashed row preserved');
  } finally {
    cleanup();
  }
});

test('0007: satisfaction_survey.session_hash column + index exists, NULL allowed', () => {
  const { db, cleanup } = freshDb();
  try {
    const cols = db.prepare("PRAGMA table_info('satisfaction_survey')").all() as {
      name: string;
      notnull: number;
    }[];
    const sh = cols.find((c) => c.name === 'session_hash');
    assert.ok(sh, 'session_hash column exists on satisfaction_survey');
    assert.equal(sh!.notnull, 0, 'session_hash NULL allowed');

    const idx = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_satisfaction_survey_session_hash'",
      )
      .all() as { name: string }[];
    assert.equal(idx.length, 1, 'idx_satisfaction_survey_session_hash exists');

    db.prepare(
      'INSERT INTO satisfaction_survey (id, ts, score, comment, session_marker, session_hash) VALUES (?,?,?,?,?,?)',
    ).run('s-with-hash', 200, 5, null, 'mid', '0123456789abcdef');
    const row = db
      .prepare('SELECT session_hash FROM satisfaction_survey WHERE id = ?')
      .get('s-with-hash') as { session_hash: string };
    assert.equal(row.session_hash, '0123456789abcdef');
  } finally {
    cleanup();
  }
});

test('0007: recall_log.session_hash column + index exists, NULL allowed', () => {
  const { db, cleanup } = freshDb();
  try {
    const cols = db.prepare("PRAGMA table_info('recall_log')").all() as {
      name: string;
      notnull: number;
    }[];
    const sh = cols.find((c) => c.name === 'session_hash');
    assert.ok(sh, 'session_hash column exists on recall_log');
    assert.equal(sh!.notnull, 0, 'session_hash NULL allowed');

    const idx = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_recall_log_session_hash'",
      )
      .all() as { name: string }[];
    assert.equal(idx.length, 1, 'idx_recall_log_session_hash exists');

    db.prepare(
      'INSERT INTO recall_log (id, decided_at, act, candidate_ids, suppressed_reason, session_hash) VALUES (?,?,?,?,?,?)',
    ).run('r-with-hash', 300, 'ghost', '["c1"]', null, 'fedcba9876543210');
    const row = db
      .prepare('SELECT session_hash, act FROM recall_log WHERE id = ?')
      .get('r-with-hash') as { session_hash: string; act: string };
    assert.equal(row.session_hash, 'fedcba9876543210');
    assert.equal(row.act, 'ghost', 'act CHECK 4-원 enum still enforced');
  } finally {
    cleanup();
  }
});

test('0007: migrate idempotent — at least 7 rows including 0007', () => {
  const { db, cleanup } = freshDb();
  try {
    const before = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    assert.ok(before.n >= 7, `at least 7 migrations applied, got ${before.n}`);

    migrate(db);
    migrate(db);
    const after = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    assert.equal(after.n, before.n, '_migrations row count unchanged on re-run');

    const applied = db
      .prepare('SELECT name FROM _migrations WHERE name = ?')
      .all('0007_pii_session_hash.sql') as { name: string }[];
    assert.equal(applied.length, 1, '0007_pii_session_hash.sql tracked');
  } finally {
    cleanup();
  }
});
