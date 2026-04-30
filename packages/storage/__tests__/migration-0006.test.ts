import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb, migrate } from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-mig0006-'));
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

test('0006: decision_log table + indexes exist', () => {
  const { db, cleanup } = freshDb();
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'decision_log'")
      .all() as { name: string }[];
    assert.equal(tables.length, 1, 'decision_log table exists');

    const cols = db.prepare("PRAGMA table_info('decision_log')").all() as {
      name: string;
      notnull: number;
    }[];
    const colNames = new Set(cols.map((c) => c.name));
    for (const c of ['id', 'ts', 'actor', 'action', 'payload']) {
      assert.ok(colNames.has(c), `column ${c} exists`);
    }

    const idxTs = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_decision_log_ts'")
      .all() as { name: string }[];
    assert.equal(idxTs.length, 1, 'idx_decision_log_ts exists');

    const idxActorAction = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_decision_log_actor_action'",
      )
      .all() as { name: string }[];
    assert.equal(idxActorAction.length, 1, 'idx_decision_log_actor_action exists');
  } finally {
    cleanup();
  }
});

test('0006: satisfaction_survey table + score CHECK + session_marker CHECK + idx', () => {
  const { db, cleanup } = freshDb();
  try {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'satisfaction_survey'",
      )
      .all() as { name: string }[];
    assert.equal(tables.length, 1, 'satisfaction_survey table exists');

    const cols = db.prepare("PRAGMA table_info('satisfaction_survey')").all() as {
      name: string;
    }[];
    const colNames = new Set(cols.map((c) => c.name));
    for (const c of ['id', 'ts', 'score', 'comment', 'session_marker']) {
      assert.ok(colNames.has(c), `column ${c} exists`);
    }

    const idxTs = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_satisfaction_survey_ts'",
      )
      .all() as { name: string }[];
    assert.equal(idxTs.length, 1, 'idx_satisfaction_survey_ts exists');

    // score CHECK 1~5.
    assert.throws(
      () =>
        db
          .prepare(
            'INSERT INTO satisfaction_survey (id, ts, score, comment, session_marker) VALUES (?,?,?,?,?)',
          )
          .run('s-bad', 1, 0, null, 'mid'),
      /CHECK constraint/i,
      'score=0 rejected',
    );
    assert.throws(
      () =>
        db
          .prepare(
            'INSERT INTO satisfaction_survey (id, ts, score, comment, session_marker) VALUES (?,?,?,?,?)',
          )
          .run('s-bad6', 1, 6, null, 'mid'),
      /CHECK constraint/i,
      'score=6 rejected',
    );

    // session_marker CHECK.
    assert.throws(
      () =>
        db
          .prepare(
            'INSERT INTO satisfaction_survey (id, ts, score, comment, session_marker) VALUES (?,?,?,?,?)',
          )
          .run('s-bad-marker', 1, 5, null, 'unknown'),
      /CHECK constraint/i,
      'unknown session_marker rejected',
    );
  } finally {
    cleanup();
  }
});

test('0006: decision_log.action accepts free-form string (no CHECK)', () => {
  // [DIRECTIVE D-S8-storage-shape-ack] (b) — DB CHECK 없음, 컴파일 타임 가드는 protocol DecisionLogAction union.
  const { db, cleanup } = freshDb();
  try {
    db.prepare(
      'INSERT INTO decision_log (id, ts, actor, action, payload) VALUES (?,?,?,?,?)',
    ).run('d-novel', 100, 'mobile', 'novel_event_kind', null);
    const row = db
      .prepare('SELECT action FROM decision_log WHERE id = ?')
      .get('d-novel') as { action: string };
    assert.equal(row.action, 'novel_event_kind');
  } finally {
    cleanup();
  }
});

test('0006: migrate idempotent — 0001~0006 = at least 6 rows', () => {
  const { db, cleanup } = freshDb();
  try {
    const before = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    assert.ok(before.n >= 6, `at least 6 migrations applied, got ${before.n}`);

    migrate(db);
    migrate(db);
    const after = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    assert.equal(after.n, before.n, '_migrations row count unchanged on re-run');

    const applied = db
      .prepare('SELECT name FROM _migrations WHERE name = ?')
      .all('0006_telemetry.sql') as { name: string }[];
    assert.equal(applied.length, 1, '0006_telemetry.sql tracked');
  } finally {
    cleanup();
  }
});
