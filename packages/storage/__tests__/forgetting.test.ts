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
  decayWeights,
  pruneEdgesBelow,
  recordTouch,
  recordEdgeTouch,
  getLastUsedAt,
} from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-forgetting-'));
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

test('0005: migrate adds last_used_at to concepts/edges + retracted to messages + dismissed_concept_ids to recall_log', () => {
  const { db, cleanup } = freshDb();
  try {
    const conceptCols = db.prepare("PRAGMA table_info('concepts')").all() as { name: string }[];
    assert.ok(conceptCols.some((c) => c.name === 'last_used_at'), 'concepts.last_used_at exists');

    const edgeCols = db.prepare("PRAGMA table_info('edges')").all() as { name: string }[];
    assert.ok(edgeCols.some((c) => c.name === 'last_used_at'), 'edges.last_used_at exists');

    const msgCols = db.prepare("PRAGMA table_info('messages')").all() as { name: string }[];
    assert.ok(msgCols.some((c) => c.name === 'retracted'), 'messages.retracted exists');

    const recallCols = db.prepare("PRAGMA table_info('recall_log')").all() as { name: string }[];
    assert.ok(
      recallCols.some((c) => c.name === 'dismissed_concept_ids'),
      'recall_log.dismissed_concept_ids exists',
    );

    // existing row default = 0 / NULL.
    appendConcept(db, { id: 'c1', label: 'a', createdAt: 1 });
    const row = db.prepare('SELECT last_used_at FROM concepts WHERE id = ?').get('c1') as {
      last_used_at: number;
    };
    assert.equal(row.last_used_at, 0, 'default last_used_at = 0');
  } finally {
    cleanup();
  }
});

test('recordTouch updates concepts.last_used_at; non-existent id is silent no-op', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'c1', label: 'a', createdAt: 1 });
    recordTouch(db, 'c1', 5_000);
    const row = db.prepare('SELECT last_used_at FROM concepts WHERE id = ?').get('c1') as {
      last_used_at: number;
    };
    assert.equal(row.last_used_at, 5_000);

    // non-existent id: no throw.
    assert.doesNotThrow(() => recordTouch(db, 'no-such', 9999));
  } finally {
    cleanup();
  }
});

test('recordEdgeTouch updates both directions; (from,to) or (to,from) match', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'a', label: 'a', createdAt: 1 });
    appendConcept(db, { id: 'b', label: 'b', createdAt: 2 });
    appendEdge(db, { fromId: 'a', toId: 'b', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { fromId: 'a', toId: 'b', weight: 0.7, kind: 'semantic' });

    // (a,b) 와 (b,a) 모두 매칭. 두 kind 모두 갱신.
    const r = recordEdgeTouch(db, 'b', 'a', 7_777);
    assert.equal(r.touched, 2, 'both kinds touched (undirected)');

    const rows = db
      .prepare('SELECT kind, last_used_at FROM edges ORDER BY kind ASC')
      .all() as { kind: string; last_used_at: number }[];
    assert.equal(rows[0]?.last_used_at, 7_777);
    assert.equal(rows[1]?.last_used_at, 7_777);
  } finally {
    cleanup();
  }
});

test('decayWeights: exponential decay with halfLifeMs — age=halfLife → weight ~= w/2', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'a', label: 'a', createdAt: 1 });
    appendConcept(db, { id: 'b', label: 'b', createdAt: 2 });
    appendEdge(db, { fromId: 'a', toId: 'b', weight: 1.0, kind: 'co_occur' });

    // last_used_at=0 (default) — age = now → 매우 큰 ageMs 면 거의 0.
    // 명시 last_used_at 으로 정확한 control.
    db.prepare('UPDATE edges SET last_used_at = ? WHERE from_id = ? AND to_id = ?').run(
      0,
      'a',
      'b',
    );
    const halfLifeMs = 7 * 24 * 60 * 60 * 1000;
    const result = decayWeights(db, { now: halfLifeMs, halfLifeMs });
    assert.equal(result.decayed, 1, 'one row decayed');

    const row = db.prepare('SELECT weight FROM edges WHERE from_id = ?').get('a') as {
      weight: number;
    };
    // age=halfLife → factor = exp(-ln2) = 0.5. weight 1.0 * 0.5 = 0.5.
    assert.ok(Math.abs(row.weight - 0.5) < 1e-9, `expected ~0.5, got ${row.weight}`);
  } finally {
    cleanup();
  }
});

test('decayWeights: monotonic — weight 시간이 지날수록 단조 감소', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'a', label: 'a', createdAt: 1 });
    appendConcept(db, { id: 'b', label: 'b', createdAt: 2 });
    appendEdge(db, { fromId: 'a', toId: 'b', weight: 1.0, kind: 'co_occur' });
    db.prepare('UPDATE edges SET last_used_at = 0 WHERE from_id = ? AND to_id = ?').run('a', 'b');

    const halfLifeMs = 1000;
    const weights: number[] = [];
    for (const now of [0, 500, 1000, 2000]) {
      // 매번 fresh start — last_used_at 을 0 으로 reset 하고 weight 만 1.0 으로 reset.
      db.prepare(
        'UPDATE edges SET weight = 1.0, last_used_at = 0 WHERE from_id = ? AND to_id = ?',
      ).run('a', 'b');
      decayWeights(db, { now, halfLifeMs });
      const row = db.prepare('SELECT weight FROM edges WHERE from_id = ?').get('a') as {
        weight: number;
      };
      weights.push(row.weight);
    }
    // [now=0]=1, [now=500]≈0.707, [now=1000]=0.5, [now=2000]=0.25
    for (let i = 1; i < weights.length; i++) {
      assert.ok(
        (weights[i - 1] ?? 0) >= (weights[i] ?? 0),
        `monotonic at i=${i}: ${weights[i - 1]} >= ${weights[i]}`,
      );
    }
    assert.equal(weights[0], 1.0, 'now=0 → weight 변동 0');
  } finally {
    cleanup();
  }
});

test('decayWeights: halfLifeMs ≤ 0 throws', () => {
  const { db, cleanup } = freshDb();
  try {
    assert.throws(() => decayWeights(db, { now: 1000, halfLifeMs: 0 }), /halfLifeMs must be > 0/);
    assert.throws(() => decayWeights(db, { now: 1000, halfLifeMs: -1 }), /halfLifeMs must be > 0/);
  } finally {
    cleanup();
  }
});

test('pruneEdgesBelow: weight < threshold edge 삭제, ≥ threshold 보존', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'a', label: 'a', createdAt: 1 });
    appendConcept(db, { id: 'b', label: 'b', createdAt: 2 });
    appendConcept(db, { id: 'c', label: 'c', createdAt: 3 });
    appendEdge(db, { fromId: 'a', toId: 'b', weight: 0.05, kind: 'co_occur' });
    appendEdge(db, { fromId: 'a', toId: 'c', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { fromId: 'b', toId: 'c', weight: 0.1, kind: 'semantic' });

    const r = pruneEdgesBelow(db, 0.1);
    assert.equal(r.pruned, 1, 'only 0.05 < 0.1 pruned');

    const remaining = db
      .prepare('SELECT from_id, to_id, weight FROM edges ORDER BY from_id ASC, to_id ASC')
      .all() as { from_id: string; to_id: string; weight: number }[];
    assert.equal(remaining.length, 2);
    // 0.1 == threshold 는 보존 (strict <).
    assert.ok(remaining.some((r) => r.weight === 0.1), 'weight == threshold preserved (strict <)');
  } finally {
    cleanup();
  }
});

test('getLastUsedAt: 존재 → number, 부재 → undefined, 한 번도 touch 안 된 row → 0', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'c1', label: 'a', createdAt: 1 });
    // 한 번도 touch 안 됨 → DEFAULT 0.
    assert.equal(getLastUsedAt(db, 'c1'), 0);
    recordTouch(db, 'c1', 9_999);
    assert.equal(getLastUsedAt(db, 'c1'), 9_999);
    // 부재 conceptId → undefined.
    assert.equal(getLastUsedAt(db, 'no-such'), undefined);
  } finally {
    cleanup();
  }
});

test('pruneEdgesBelow: 모든 edge 가 threshold 이상 → pruned=0', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'a', label: 'a', createdAt: 1 });
    appendConcept(db, { id: 'b', label: 'b', createdAt: 2 });
    appendEdge(db, { fromId: 'a', toId: 'b', weight: 0.9, kind: 'co_occur' });

    const r = pruneEdgesBelow(db, 0.1);
    assert.equal(r.pruned, 0);
  } finally {
    cleanup();
  }
});
