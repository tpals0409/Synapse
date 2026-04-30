import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openDb,
  migrate,
  appendConcept,
  appendEdge,
  appendRecallLog,
  markDismissed,
  decayEdgeWeight,
} from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-dismiss-'));
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

test('markDismissed: 신규 row → dismissed_concept_ids JSON 저장', () => {
  const { db, cleanup } = freshDb();
  try {
    appendRecallLog(db, {
      id: 'r1',
      decided_at: 100,
      act: 'suggestion',
      candidate_ids: ['c1', 'c2', 'c3'],
    });
    markDismissed(db, 'r1', ['c2', 'c3']);

    const row = db
      .prepare('SELECT dismissed_concept_ids FROM recall_log WHERE id = ?')
      .get('r1') as { dismissed_concept_ids: string | null };
    assert.ok(row.dismissed_concept_ids);
    const ids = JSON.parse(row.dismissed_concept_ids ?? '[]') as string[];
    assert.deepEqual(ids.sort(), ['c2', 'c3']);
  } finally {
    cleanup();
  }
});

test('markDismissed: 두 번 호출 시 union (멱등 + idempotent merge)', () => {
  const { db, cleanup } = freshDb();
  try {
    appendRecallLog(db, {
      id: 'r1',
      decided_at: 100,
      act: 'suggestion',
      candidate_ids: ['c1', 'c2', 'c3'],
    });
    markDismissed(db, 'r1', ['c2']);
    markDismissed(db, 'r1', ['c2', 'c3']);

    const row = db
      .prepare('SELECT dismissed_concept_ids FROM recall_log WHERE id = ?')
      .get('r1') as { dismissed_concept_ids: string };
    const ids = JSON.parse(row.dismissed_concept_ids) as string[];
    assert.deepEqual(ids, ['c2', 'c3'], 'union 결과 sorted');
  } finally {
    cleanup();
  }
});

test('markDismissed: 빈 conceptIds 또는 stale recallLogId → silent no-op', () => {
  const { db, cleanup } = freshDb();
  try {
    appendRecallLog(db, {
      id: 'r1',
      decided_at: 100,
      act: 'suggestion',
      candidate_ids: ['c1'],
    });
    markDismissed(db, 'r1', []); // 빈 list — 변동 0.
    let row = db
      .prepare('SELECT dismissed_concept_ids FROM recall_log WHERE id = ?')
      .get('r1') as { dismissed_concept_ids: string | null };
    assert.equal(row.dismissed_concept_ids, null);

    // stale id — throw 0.
    assert.doesNotThrow(() => markDismissed(db, 'no-such-id', ['c1']));
  } finally {
    cleanup();
  }
});

test('decayEdgeWeight: weight *= multiplier (양방향 매칭)', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'a', label: 'a', createdAt: 1 });
    appendConcept(db, { id: 'b', label: 'b', createdAt: 2 });
    appendEdge(db, { fromId: 'a', toId: 'b', weight: 1.0, kind: 'co_occur' });
    appendEdge(db, { fromId: 'a', toId: 'b', weight: 0.8, kind: 'semantic' });

    // (b, a) 호출 — 양방향 매칭. 두 kind 모두 약화.
    const r = decayEdgeWeight(db, 'b', 'a', 0.5);
    assert.equal(r.decayed, 2);

    const rows = db
      .prepare('SELECT kind, weight FROM edges ORDER BY kind ASC')
      .all() as { kind: string; weight: number }[];
    assert.ok(Math.abs((rows[0]?.weight ?? 0) - 0.5) < 1e-9, 'co_occur 1.0 * 0.5 = 0.5');
    assert.ok(Math.abs((rows[1]?.weight ?? 0) - 0.4) < 1e-9, 'semantic 0.8 * 0.5 = 0.4');
  } finally {
    cleanup();
  }
});

test('decayEdgeWeight: multiplier 범위 검증 (0,1] — 외부 throw', () => {
  const { db, cleanup } = freshDb();
  try {
    assert.throws(() => decayEdgeWeight(db, 'a', 'b', 0), /multiplier must be in \(0, 1\]/);
    assert.throws(() => decayEdgeWeight(db, 'a', 'b', -0.5), /multiplier must be in \(0, 1\]/);
    assert.throws(() => decayEdgeWeight(db, 'a', 'b', 1.5), /multiplier must be in \(0, 1\]/);
    // 1.0 정상.
    assert.doesNotThrow(() => decayEdgeWeight(db, 'a', 'b', 1));
  } finally {
    cleanup();
  }
});
