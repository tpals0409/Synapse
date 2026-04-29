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
  nearestConcepts,
} from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-graph-'));
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

function fakeEmbedding(seed: number): number[] {
  // deterministic 768d unit-ish vector — enough for KNN ordering tests.
  const vec = new Array<number>(768);
  for (let i = 0; i < 768; i++) {
    vec[i] = Math.sin(seed * 0.123 + i * 0.017);
  }
  return vec;
}

test('0003: migrate creates concepts + edges + vec_concepts; idempotent', () => {
  const { db, cleanup } = freshDb();
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE name IN ('concepts','edges','vec_concepts')")
      .all() as { name: string }[];
    const names = new Set(tables.map((t) => t.name));
    assert.ok(names.has('concepts'), 'concepts table exists');
    assert.ok(names.has('edges'), 'edges table exists');
    assert.ok(names.has('vec_concepts'), 'vec_concepts virtual table exists');

    const before = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    migrate(db);
    migrate(db);
    const after = db.prepare('SELECT COUNT(*) as n FROM _migrations').get() as { n: number };
    assert.equal(after.n, before.n, '_migrations row count unchanged on re-run');
    assert.ok(before.n >= 3, 'at least 0001 + 0002 + 0003 applied');
  } finally {
    cleanup();
  }
});

test('appendConcept inserts row + vec entry; INSERT OR IGNORE on duplicate id', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, {
      id: 'c1',
      label: '글쓰기',
      embedding: fakeEmbedding(1),
      createdAt: 100,
    });
    appendConcept(db, {
      id: 'c2',
      label: '루틴',
      embedding: fakeEmbedding(2),
      createdAt: 200,
    });

    const rows = db.prepare('SELECT id, label, created_at FROM concepts ORDER BY created_at ASC').all() as {
      id: string;
      label: string;
      created_at: number;
    }[];
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.id, 'c1');
    assert.equal(rows[0]?.label, '글쓰기');
    assert.equal(rows[1]?.id, 'c2');

    const vecCount = db.prepare('SELECT COUNT(*) as n FROM vec_concepts').get() as { n: number };
    assert.equal(vecCount.n, 2, 'vec_concepts mirrors concepts');

    // duplicate id is silently ignored.
    appendConcept(db, {
      id: 'c1',
      label: '다른 라벨',
      embedding: fakeEmbedding(99),
      createdAt: 999,
    });
    const after = db.prepare('SELECT COUNT(*) as n FROM concepts').get() as { n: number };
    assert.equal(after.n, 2, 'duplicate id not re-inserted');
    const labelStill = db.prepare('SELECT label FROM concepts WHERE id = ?').get('c1') as { label: string };
    assert.equal(labelStill.label, '글쓰기', 'original label preserved');

    const vecAfter = db.prepare('SELECT COUNT(*) as n FROM vec_concepts').get() as { n: number };
    assert.equal(vecAfter.n, 2, 'vec_concepts not double-inserted');
  } finally {
    cleanup();
  }
});

test('appendConcept tolerates missing embedding (BLOB null, no vec entry)', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'c1', label: 'no-embed', createdAt: 1 });
    const row = db.prepare('SELECT embedding FROM concepts WHERE id = ?').get('c1') as { embedding: Buffer | null };
    assert.equal(row.embedding, null);
    const vecCount = db.prepare('SELECT COUNT(*) as n FROM vec_concepts').get() as { n: number };
    assert.equal(vecCount.n, 0);
  } finally {
    cleanup();
  }
});

test('appendEdge inserts; INSERT OR IGNORE on duplicate (from,to,kind)', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'c1', label: 'a', createdAt: 1 });
    appendConcept(db, { id: 'c2', label: 'b', createdAt: 2 });

    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.9, kind: 'co_occur' });
    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.7, kind: 'semantic' });

    const rows = db.prepare('SELECT from_id, to_id, weight, kind FROM edges ORDER BY kind ASC').all() as {
      from_id: string;
      to_id: string;
      weight: number;
      kind: string;
    }[];
    assert.equal(rows.length, 2, 'co_occur duplicate ignored, semantic kept separate');
    assert.equal(rows[0]?.kind, 'co_occur');
    assert.equal(rows[0]?.weight, 0.5, 'first weight preserved (INSERT OR IGNORE)');
    assert.equal(rows[1]?.kind, 'semantic');
  } finally {
    cleanup();
  }
});

test('nearestConcepts returns top-k by descending score; query vector ranks self highest', async () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'c1', label: 'one', embedding: fakeEmbedding(1), createdAt: 1 });
    appendConcept(db, { id: 'c2', label: 'two', embedding: fakeEmbedding(2), createdAt: 2 });
    appendConcept(db, { id: 'c3', label: 'three', embedding: fakeEmbedding(3), createdAt: 3 });
    appendConcept(db, { id: 'c4', label: 'four', embedding: fakeEmbedding(4), createdAt: 4 });

    const query = new Float32Array(fakeEmbedding(1));
    const top = await nearestConcepts(db, query, 3);

    assert.equal(top.length, 3);
    assert.equal(top[0]?.id, 'c1', 'self ranks first');
    // [D-S5-storage-label-expose] label 직접 노출 — id != label.
    assert.equal(top[0]?.label, 'one', 'concepts.label 흡수 (id != label)');
    // monotonically non-increasing score.
    for (let i = 1; i < top.length; i++) {
      assert.ok(
        (top[i - 1]?.score ?? 0) >= (top[i]?.score ?? 0),
        `score order at ${i}: ${top[i - 1]?.score} >= ${top[i]?.score}`,
      );
    }
    // score = 1 - distance, so self should be ~1.
    assert.ok((top[0]?.score ?? 0) > 0.99, `self score near 1, got ${top[0]?.score}`);
  } finally {
    cleanup();
  }
});

test('nearestConcepts excludeId drops the query concept and keeps k results', async () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'c1', label: 'one', embedding: fakeEmbedding(1), createdAt: 1 });
    appendConcept(db, { id: 'c2', label: 'two', embedding: fakeEmbedding(2), createdAt: 2 });
    appendConcept(db, { id: 'c3', label: 'three', embedding: fakeEmbedding(3), createdAt: 3 });

    const query = new Float32Array(fakeEmbedding(1));
    const top = await nearestConcepts(db, query, 2, { excludeId: 'c1' });

    assert.equal(top.length, 2);
    assert.ok(!top.some((r) => r.id === 'c1'), 'c1 excluded');
  } finally {
    cleanup();
  }
});

test('nearestConcepts with k=0 returns empty', async () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'c1', label: 'one', embedding: fakeEmbedding(1), createdAt: 1 });
    const out = await nearestConcepts(db, new Float32Array(fakeEmbedding(1)), 0);
    assert.deepEqual(out, []);
  } finally {
    cleanup();
  }
});
