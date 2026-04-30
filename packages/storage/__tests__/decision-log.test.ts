import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openDb,
  migrate,
  appendDecisionLog,
  listDecisionLog,
  type DecisionLogRow,
} from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-decision-log-'));
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

test('appendDecisionLog round-trips minimal row (no payload)', () => {
  const { db, cleanup } = freshDb();
  try {
    const row: DecisionLogRow = {
      id: 'd1',
      ts: 1000,
      actor: 'mobile',
      action: 'recall_click',
    };
    appendDecisionLog(db, row);

    const got = listDecisionLog(db);
    assert.equal(got.length, 1);
    assert.deepEqual(got[0], row, 'payload undefined preserved (not null)');
  } finally {
    cleanup();
  }
});

test('appendDecisionLog round-trips payload (JSON-encoded string)', () => {
  const { db, cleanup } = freshDb();
  try {
    const payload = JSON.stringify({ recallId: 'r-7', conceptId: 'c-3' });
    appendDecisionLog(db, {
      id: 'd-pay',
      ts: 200,
      actor: 'orchestrator',
      action: 'ghost',
      payload,
    });
    const got = listDecisionLog(db);
    assert.equal(got[0]?.payload, payload);
  } finally {
    cleanup();
  }
});

test('appendDecisionLog INSERT OR IGNORE preserves original on duplicate id', () => {
  const { db, cleanup } = freshDb();
  try {
    appendDecisionLog(db, { id: 'd1', ts: 100, actor: 'mobile', action: 'dismiss' });
    appendDecisionLog(db, { id: 'd1', ts: 999, actor: 'engine', action: 'satisfaction' });

    const got = listDecisionLog(db);
    assert.equal(got.length, 1);
    assert.equal(got[0]?.ts, 100);
    assert.equal(got[0]?.actor, 'mobile');
    assert.equal(got[0]?.action, 'dismiss');
  } finally {
    cleanup();
  }
});

test('listDecisionLog: ORDER BY ts ASC, id ASC — tie-break determinism', () => {
  const { db, cleanup } = freshDb();
  try {
    appendDecisionLog(db, { id: 'd-c', ts: 500, actor: 'mobile', action: 'dismiss' });
    appendDecisionLog(db, { id: 'd-a', ts: 500, actor: 'mobile', action: 'dismiss' });
    appendDecisionLog(db, { id: 'd-b', ts: 500, actor: 'mobile', action: 'dismiss' });

    for (let i = 0; i < 3; i++) {
      const got = listDecisionLog(db);
      assert.deepEqual(
        got.map((r) => r.id),
        ['d-a', 'd-b', 'd-c'],
        `tie-break by id ASC, run ${i}`,
      );
    }
  } finally {
    cleanup();
  }
});

test('listDecisionLog: sinceMs filter', () => {
  const { db, cleanup } = freshDb();
  try {
    appendDecisionLog(db, { id: 'd1', ts: 100, actor: 'mobile', action: 'dismiss' });
    appendDecisionLog(db, { id: 'd2', ts: 500, actor: 'mobile', action: 'dismiss' });
    appendDecisionLog(db, { id: 'd3', ts: 1000, actor: 'mobile', action: 'dismiss' });

    const got = listDecisionLog(db, { sinceMs: 500 });
    assert.deepEqual(
      got.map((r) => r.id),
      ['d2', 'd3'],
    );
  } finally {
    cleanup();
  }
});

test('listDecisionLog: actor filter', () => {
  const { db, cleanup } = freshDb();
  try {
    appendDecisionLog(db, { id: 'd1', ts: 100, actor: 'mobile', action: 'dismiss' });
    appendDecisionLog(db, { id: 'd2', ts: 200, actor: 'orchestrator', action: 'ghost' });
    appendDecisionLog(db, { id: 'd3', ts: 300, actor: 'mobile', action: 'recall_click' });

    const got = listDecisionLog(db, { actor: 'mobile' });
    assert.deepEqual(
      got.map((r) => r.id),
      ['d1', 'd3'],
    );
  } finally {
    cleanup();
  }
});

test('listDecisionLog: action filter + limit', () => {
  const { db, cleanup } = freshDb();
  try {
    appendDecisionLog(db, { id: 'd1', ts: 100, actor: 'mobile', action: 'dismiss' });
    appendDecisionLog(db, { id: 'd2', ts: 200, actor: 'mobile', action: 'dismiss' });
    appendDecisionLog(db, { id: 'd3', ts: 300, actor: 'mobile', action: 'dismiss' });
    appendDecisionLog(db, { id: 'd-other', ts: 50, actor: 'mobile', action: 'satisfaction' });

    const got = listDecisionLog(db, { action: 'dismiss', limit: 2 });
    assert.deepEqual(
      got.map((r) => r.id),
      ['d1', 'd2'],
    );
  } finally {
    cleanup();
  }
});

test('listDecisionLog: combined filters (actor + action + sinceMs)', () => {
  const { db, cleanup } = freshDb();
  try {
    appendDecisionLog(db, { id: 'd1', ts: 100, actor: 'mobile', action: 'dismiss' });
    appendDecisionLog(db, { id: 'd2', ts: 500, actor: 'mobile', action: 'dismiss' });
    appendDecisionLog(db, { id: 'd3', ts: 600, actor: 'orchestrator', action: 'dismiss' });
    appendDecisionLog(db, { id: 'd4', ts: 700, actor: 'mobile', action: 'recall_click' });

    const got = listDecisionLog(db, { actor: 'mobile', action: 'dismiss', sinceMs: 200 });
    assert.deepEqual(
      got.map((r) => r.id),
      ['d2'],
    );
  } finally {
    cleanup();
  }
});
