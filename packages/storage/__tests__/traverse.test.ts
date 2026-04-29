import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb, migrate, appendConcept, appendEdge, traverse } from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-traverse-'));
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

function seedConcepts(db: ReturnType<typeof openDb>, ids: string[]) {
  for (const id of ids) {
    appendConcept(db, { id, label: id, createdAt: 1 });
  }
}

test('traverse: from_id 매칭 — 단방향', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['c1', 'c2', 'c3']);
    appendEdge(db, { from: 'c1', to: 'c2', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { from: 'c1', to: 'c3', weight: 0.7, kind: 'semantic' });

    const hits = traverse(db, 'c1');
    const ids = hits.map((h) => h.conceptId).sort();
    assert.deepEqual(ids, ['c2', 'c3']);
    const c2 = hits.find((h) => h.conceptId === 'c2');
    assert.equal(c2?.weight, 0.5);
    assert.equal(c2?.kind, 'co_occur');
    const c3 = hits.find((h) => h.conceptId === 'c3');
    assert.equal(c3?.kind, 'semantic');
  } finally {
    cleanup();
  }
});

test('traverse: to_id 매칭 — 역방향 (무방향 동작)', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['c1', 'c2']);
    // c1 → c2 만 INSERT 되었지만 traverse(c2) 도 c1 을 찾아야 함.
    appendEdge(db, { from: 'c1', to: 'c2', weight: 0.4, kind: 'co_occur' });

    const hits = traverse(db, 'c2');
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.conceptId, 'c1');
    assert.equal(hits[0]?.weight, 0.4);
    assert.equal(hits[0]?.kind, 'co_occur');
  } finally {
    cleanup();
  }
});

test('traverse: 양방향 결합 (from + to UNION ALL)', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['c1', 'c2', 'c3', 'c4']);
    appendEdge(db, { from: 'c1', to: 'c2', weight: 0.5, kind: 'co_occur' });   // c1→c2
    appendEdge(db, { from: 'c3', to: 'c1', weight: 0.6, kind: 'semantic' });   // c3→c1
    appendEdge(db, { from: 'c1', to: 'c4', weight: 0.8, kind: 'semantic' });   // c1→c4

    const hits = traverse(db, 'c1');
    const ids = hits.map((h) => h.conceptId).sort();
    assert.deepEqual(ids, ['c2', 'c3', 'c4']);
  } finally {
    cleanup();
  }
});

test('traverse: 자기 자신 (self-loop) 제외', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['c1', 'c2']);
    // self-loop edge: from = to = c1 (INSERT 가능, 실 데이터에는 드물지만 방어).
    appendEdge(db, { from: 'c1', to: 'c1', weight: 1.0, kind: 'co_occur' });
    appendEdge(db, { from: 'c1', to: 'c2', weight: 0.5, kind: 'semantic' });

    const hits = traverse(db, 'c1');
    assert.equal(hits.length, 1, 'self-loop excluded');
    assert.equal(hits[0]?.conceptId, 'c2');
  } finally {
    cleanup();
  }
});

test('traverse: 빈 그래프 → []', () => {
  const { db, cleanup } = freshDb();
  try {
    const hits = traverse(db, 'no-such-id');
    assert.deepEqual(hits, []);
  } finally {
    cleanup();
  }
});

test('traverse: edges 있지만 conceptId 와 무관 → []', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['c1', 'c2', 'c9']);
    appendEdge(db, { from: 'c1', to: 'c2', weight: 0.5, kind: 'co_occur' });

    const hits = traverse(db, 'c9');
    assert.deepEqual(hits, []);
  } finally {
    cleanup();
  }
});

test('traverse: depth=2 throw (Sprint 4 = depth=1 only)', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['c1']);
    assert.throws(() => traverse(db, 'c1', 2), /depth=2 not supported/);
    assert.throws(() => traverse(db, 'c1', 0), /depth=0 not supported/);
  } finally {
    cleanup();
  }
});

test('traverse: kind 필드는 co_occur 와 semantic 모두 정확히 보존', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['c1', 'c2']);
    appendEdge(db, { from: 'c1', to: 'c2', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { from: 'c1', to: 'c2', weight: 0.7, kind: 'semantic' });

    const hits = traverse(db, 'c1');
    assert.equal(hits.length, 2, 'co_occur + semantic 두 행 모두 반환');
    const kinds = hits.map((h) => h.kind).sort();
    assert.deepEqual(kinds, ['co_occur', 'semantic']);
    const cooccur = hits.find((h) => h.kind === 'co_occur');
    const semantic = hits.find((h) => h.kind === 'semantic');
    assert.equal(cooccur?.weight, 0.5);
    assert.equal(semantic?.weight, 0.7);
  } finally {
    cleanup();
  }
});
