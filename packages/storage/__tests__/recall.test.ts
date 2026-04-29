import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RecallLogRow } from '@synapse/protocol';
import {
  openDb,
  migrate,
  appendRecallLog,
  recentlyDecidedFor,
} from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-recall-'));
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

test('0004: migrate creates recall_log + idx_recall_log_decided_at; idempotent', () => {
  const { db, cleanup } = freshDb();
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'recall_log'")
      .all() as { name: string }[];
    assert.equal(tables.length, 1, 'recall_log table exists');

    const idx = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_recall_log_decided_at'")
      .all() as { name: string }[];
    assert.equal(idx.length, 1, 'idx_recall_log_decided_at exists');

    const cols = db.prepare("PRAGMA table_info('recall_log')").all() as { name: string; notnull: number }[];
    const colNames = new Set(cols.map((c) => c.name));
    for (const c of ['id', 'decided_at', 'act', 'candidate_ids', 'suppressed_reason']) {
      assert.ok(colNames.has(c), `column ${c} exists`);
    }

    // 0001+0002+0003+0004 = at least 4 migrations applied.
    const before = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    assert.ok(before.n >= 4, `at least 4 migrations applied, got ${before.n}`);

    // re-run is no-op.
    migrate(db);
    migrate(db);
    const after = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    assert.equal(after.n, before.n, '_migrations row count unchanged on re-run');
  } finally {
    cleanup();
  }
});

test('act CHECK constraint rejects unknown enum value', () => {
  const { db, cleanup } = freshDb();
  try {
    assert.throws(
      () =>
        db
          .prepare(
            'INSERT INTO recall_log (id, decided_at, act, candidate_ids, suppressed_reason) VALUES (?,?,?,?,?)',
          )
          .run('r-bad', 1, 'unknown_act', '[]', null),
      /CHECK constraint/i,
    );
  } finally {
    cleanup();
  }
});

test('appendRecallLog persists row; INSERT OR IGNORE on duplicate id', () => {
  const { db, cleanup } = freshDb();
  try {
    const log: RecallLogRow = {
      id: 'r1',
      decided_at: 1000,
      act: 'ghost',
      candidate_ids: ['c1', 'c2'],
    };
    appendRecallLog(db, log);

    const row = db
      .prepare('SELECT id, decided_at, act, candidate_ids, suppressed_reason FROM recall_log WHERE id = ?')
      .get('r1') as {
      id: string;
      decided_at: number;
      act: string;
      candidate_ids: string;
      suppressed_reason: string | null;
    };
    assert.equal(row.id, 'r1');
    assert.equal(row.decided_at, 1000);
    assert.equal(row.act, 'ghost');
    assert.deepEqual(JSON.parse(row.candidate_ids), ['c1', 'c2']);
    assert.equal(row.suppressed_reason, null);

    // duplicate id: INSERT OR IGNORE preserves original.
    appendRecallLog(db, {
      id: 'r1',
      decided_at: 9999,
      act: 'strong',
      candidate_ids: ['cX'],
    });
    const after = db.prepare('SELECT COUNT(*) as n FROM recall_log').get() as { n: number };
    assert.equal(after.n, 1, 'duplicate id not re-inserted');
    const stillGhost = db.prepare('SELECT act, decided_at FROM recall_log WHERE id = ?').get('r1') as {
      act: string;
      decided_at: number;
    };
    assert.equal(stillGhost.act, 'ghost', 'original act preserved');
    assert.equal(stillGhost.decided_at, 1000, 'original decided_at preserved');
  } finally {
    cleanup();
  }
});

test('appendRecallLog persists silence with suppressed_reason', () => {
  const { db, cleanup } = freshDb();
  try {
    appendRecallLog(db, {
      id: 'r-sil',
      decided_at: 500,
      act: 'silence',
      candidate_ids: ['c9'],
      suppressed_reason: 'cooldown',
    });
    const row = db.prepare('SELECT act, suppressed_reason FROM recall_log WHERE id = ?').get('r-sil') as {
      act: string;
      suppressed_reason: string | null;
    };
    assert.equal(row.act, 'silence');
    assert.equal(row.suppressed_reason, 'cooldown');
  } finally {
    cleanup();
  }
});

test('recentlyDecidedFor: returns latest log within window matching candidate id', () => {
  const { db, cleanup } = freshDb();
  try {
    const now = 10_000;
    appendRecallLog(db, { id: 'r-old', decided_at: 1_000, act: 'ghost', candidate_ids: ['c1'] });
    appendRecallLog(db, { id: 'r-mid', decided_at: 5_000, act: 'suggestion', candidate_ids: ['c1', 'c2'] });
    appendRecallLog(db, { id: 'r-recent', decided_at: 9_000, act: 'strong', candidate_ids: ['c2', 'c3'] });

    // c1 within last 6000ms (decided_at >= 4000): r-mid only.
    const hit = recentlyDecidedFor(db, 'c1', 6_000, now);
    assert.ok(hit, 'expected a hit for c1');
    assert.equal(hit?.id, 'r-mid');
    assert.equal(hit?.act, 'suggestion');
    assert.deepEqual(hit?.candidate_ids, ['c1', 'c2']);

    // c2 within last 6000ms: r-recent (most recent), then r-mid — DESC order returns r-recent.
    const hit2 = recentlyDecidedFor(db, 'c2', 6_000, now);
    assert.equal(hit2?.id, 'r-recent');

    // c1 with very narrow window (last 500ms → cutoff 9500): no match.
    const miss = recentlyDecidedFor(db, 'c1', 500, now);
    assert.equal(miss, null, 'no recent decision for c1 in narrow window');

    // unknown candidate id: null.
    const noneSuch = recentlyDecidedFor(db, 'c-none', 100_000, now);
    assert.equal(noneSuch, null);
  } finally {
    cleanup();
  }
});

test('recentlyDecidedFor: LIKE matching is anchored on quoted id (no substring false-positive)', () => {
  const { db, cleanup } = freshDb();
  try {
    const now = 1_000;
    // candidate ids 'c1' and 'c10' — naive %c1% would match both. Quoted-pattern '%"c1"%' must not match c10.
    appendRecallLog(db, { id: 'r-c10', decided_at: 500, act: 'ghost', candidate_ids: ['c10'] });

    const hit = recentlyDecidedFor(db, 'c1', 10_000, now);
    assert.equal(hit, null, '"c1" must not match a row whose only candidate is "c10"');

    appendRecallLog(db, { id: 'r-c1', decided_at: 600, act: 'ghost', candidate_ids: ['c1'] });
    const hit2 = recentlyDecidedFor(db, 'c1', 10_000, now);
    assert.equal(hit2?.id, 'r-c1');
  } finally {
    cleanup();
  }
});

test('recentlyDecidedFor: round-trips suppressed_reason on retrieved row', () => {
  const { db, cleanup } = freshDb();
  try {
    appendRecallLog(db, {
      id: 'r-sup',
      decided_at: 100,
      act: 'silence',
      candidate_ids: ['cX'],
      suppressed_reason: 'low-confidence',
    });
    const hit = recentlyDecidedFor(db, 'cX', 1_000, 200);
    assert.ok(hit);
    assert.equal(hit?.suppressed_reason, 'low-confidence');
    assert.equal(hit?.act, 'silence');
  } finally {
    cleanup();
  }
});
