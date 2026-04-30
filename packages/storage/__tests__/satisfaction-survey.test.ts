import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openDb,
  migrate,
  appendSatisfactionSurvey,
  listSatisfactionSurveys,
  type SatisfactionSurveyRow,
} from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-satisfaction-'));
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

test('appendSatisfactionSurvey round-trips minimal row (no comment)', () => {
  const { db, cleanup } = freshDb();
  try {
    const row: SatisfactionSurveyRow = {
      id: 's1',
      ts: 1000,
      score: 4,
      session_marker: 'mid',
    };
    appendSatisfactionSurvey(db, row);

    const got = listSatisfactionSurveys(db);
    assert.equal(got.length, 1);
    assert.deepEqual(got[0], row, 'comment undefined preserved (not null)');
  } finally {
    cleanup();
  }
});

test('appendSatisfactionSurvey round-trips comment string', () => {
  const { db, cleanup } = freshDb();
  try {
    appendSatisfactionSurvey(db, {
      id: 's2',
      ts: 200,
      score: 5,
      comment: '잘 동작했어요',
      session_marker: 'end',
    });
    const got = listSatisfactionSurveys(db);
    assert.equal(got[0]?.comment, '잘 동작했어요');
    assert.equal(got[0]?.session_marker, 'end');
  } finally {
    cleanup();
  }
});

test('appendSatisfactionSurvey INSERT OR IGNORE preserves original on duplicate id', () => {
  const { db, cleanup } = freshDb();
  try {
    appendSatisfactionSurvey(db, { id: 's1', ts: 100, score: 3, session_marker: 'mid' });
    appendSatisfactionSurvey(db, { id: 's1', ts: 999, score: 1, session_marker: 'end' });

    const got = listSatisfactionSurveys(db);
    assert.equal(got.length, 1);
    assert.equal(got[0]?.score, 3, 'original score preserved');
    assert.equal(got[0]?.session_marker, 'mid', 'original session_marker preserved');
  } finally {
    cleanup();
  }
});

test('appendSatisfactionSurvey: score CHECK enforced (1..5)', () => {
  const { db, cleanup } = freshDb();
  try {
    assert.throws(
      () =>
        appendSatisfactionSurvey(db, { id: 's-bad', ts: 1, score: 0, session_marker: 'mid' }),
      /CHECK constraint/i,
    );
    assert.throws(
      () =>
        appendSatisfactionSurvey(db, { id: 's-bad6', ts: 1, score: 6, session_marker: 'mid' }),
      /CHECK constraint/i,
    );
    // edge values valid.
    appendSatisfactionSurvey(db, { id: 's-1', ts: 1, score: 1, session_marker: 'mid' });
    appendSatisfactionSurvey(db, { id: 's-5', ts: 2, score: 5, session_marker: 'end' });
    const got = listSatisfactionSurveys(db);
    assert.equal(got.length, 2);
  } finally {
    cleanup();
  }
});

test('listSatisfactionSurveys: ORDER BY ts ASC, id ASC — tie-break determinism', () => {
  const { db, cleanup } = freshDb();
  try {
    appendSatisfactionSurvey(db, { id: 's-c', ts: 500, score: 3, session_marker: 'mid' });
    appendSatisfactionSurvey(db, { id: 's-a', ts: 500, score: 4, session_marker: 'mid' });
    appendSatisfactionSurvey(db, { id: 's-b', ts: 500, score: 5, session_marker: 'mid' });

    const got = listSatisfactionSurveys(db);
    assert.deepEqual(
      got.map((r) => r.id),
      ['s-a', 's-b', 's-c'],
    );
  } finally {
    cleanup();
  }
});

test('listSatisfactionSurveys: sinceMs filter + limit', () => {
  const { db, cleanup } = freshDb();
  try {
    appendSatisfactionSurvey(db, { id: 's1', ts: 100, score: 3, session_marker: 'mid' });
    appendSatisfactionSurvey(db, { id: 's2', ts: 500, score: 4, session_marker: 'mid' });
    appendSatisfactionSurvey(db, { id: 's3', ts: 1000, score: 5, session_marker: 'end' });

    const got = listSatisfactionSurveys(db, { sinceMs: 500, limit: 1 });
    assert.deepEqual(
      got.map((r) => r.id),
      ['s2'],
    );
  } finally {
    cleanup();
  }
});
