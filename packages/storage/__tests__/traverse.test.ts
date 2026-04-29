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
    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { fromId: 'c1', toId: 'c3', weight: 0.7, kind: 'semantic' });

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
    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.4, kind: 'co_occur' });

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
    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.5, kind: 'co_occur' });   // c1→c2
    appendEdge(db, { fromId: 'c3', toId: 'c1', weight: 0.6, kind: 'semantic' });   // c3→c1
    appendEdge(db, { fromId: 'c1', toId: 'c4', weight: 0.8, kind: 'semantic' });   // c1→c4

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
    appendEdge(db, { fromId: 'c1', toId: 'c1', weight: 1.0, kind: 'co_occur' });
    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.5, kind: 'semantic' });

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
    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.5, kind: 'co_occur' });

    const hits = traverse(db, 'c9');
    assert.deepEqual(hits, []);
  } finally {
    cleanup();
  }
});

test('traverse: kind 필드는 co_occur 와 semantic 모두 정확히 보존', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['c1', 'c2']);
    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.7, kind: 'semantic' });

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

// --- Sprint 5: depth ≥ 2 BFS [FROZEN v2026-04-29 D-S5-storage-traverse-bfs] ---

test('traverse: depth=2 BFS — A-B-C chain → seedA → {B (hop1), C (hop2 via B)}', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['A', 'B', 'C']);
    appendEdge(db, { fromId: 'A', toId: 'B', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { fromId: 'B', toId: 'C', weight: 0.7, kind: 'semantic' });

    const hits = traverse(db, 'A', 2);
    const ids = hits.map((h) => h.conceptId).sort();
    assert.deepEqual(ids, ['B', 'C'], 'A 의 1-hop B + B 의 1-hop C');
    const b = hits.find((h) => h.conceptId === 'B');
    const c = hits.find((h) => h.conceptId === 'C');
    assert.equal(b?.weight, 0.5, 'B 는 A→B edge weight');
    assert.equal(b?.kind, 'co_occur');
    assert.equal(c?.weight, 0.7, 'C 는 B→C edge weight (매개 노드)');
    assert.equal(c?.kind, 'semantic');
  } finally {
    cleanup();
  }
});

test('traverse: depth=2 가 depth=1 의 superset (cycle 없는 그래프)', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['A', 'B', 'C', 'D']);
    appendEdge(db, { fromId: 'A', toId: 'B', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { fromId: 'A', toId: 'C', weight: 0.6, kind: 'semantic' });
    appendEdge(db, { fromId: 'B', toId: 'D', weight: 0.4, kind: 'co_occur' });

    const oneHop = traverse(db, 'A', 1).map((h) => h.conceptId).sort();
    const twoHop = traverse(db, 'A', 2).map((h) => h.conceptId).sort();
    assert.deepEqual(oneHop, ['B', 'C']);
    assert.deepEqual(twoHop, ['B', 'C', 'D'], 'depth=2 = depth=1 ∪ {D via B}');
    for (const id of oneHop) {
      assert.ok(twoHop.includes(id), `${id} ∈ depth=2 (superset)`);
    }
  } finally {
    cleanup();
  }
});

test('traverse: 가장 짧은 경로 우선 — 같은 노드가 hop1/hop2 모두에서 도달 가능 시 hop1 보존', () => {
  const { db, cleanup } = freshDb();
  try {
    // A-B (직접, hop1, weight=0.9, co_occur), A-C (hop1), C-B (hop2 경유, weight=0.1).
    // depth=2 호출 시 B 는 hop1 의 weight=0.9/co_occur 로 보존되어야 함.
    seedConcepts(db, ['A', 'B', 'C']);
    appendEdge(db, { fromId: 'A', toId: 'B', weight: 0.9, kind: 'co_occur' });
    appendEdge(db, { fromId: 'A', toId: 'C', weight: 0.5, kind: 'semantic' });
    appendEdge(db, { fromId: 'C', toId: 'B', weight: 0.1, kind: 'semantic' });

    const hits = traverse(db, 'A', 2);
    const b = hits.find((h) => h.conceptId === 'B');
    assert.ok(b, 'B 도달 가능');
    assert.equal(b?.weight, 0.9, 'hop1 의 weight 보존 (hop2 의 0.1 X)');
    assert.equal(b?.kind, 'co_occur', 'hop1 의 kind 보존');
  } finally {
    cleanup();
  }
});

test('traverse: cycle 가드 — A-B-A 같은 cycle 에서 무한 루프 0', () => {
  const { db, cleanup } = freshDb();
  try {
    // 무방향 그래프에서 A-B edge 자체가 cycle (B→A 도 도달 가능).
    // 추가로 B-C, C-A 로 삼각형 cycle.
    seedConcepts(db, ['A', 'B', 'C']);
    appendEdge(db, { fromId: 'A', toId: 'B', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { fromId: 'B', toId: 'C', weight: 0.6, kind: 'co_occur' });
    appendEdge(db, { fromId: 'C', toId: 'A', weight: 0.7, kind: 'semantic' });

    // 무한 루프 없이 종료해야 함. seed=A, depth=3 이라도 A-B-C 모두 한 번씩만 등장.
    const hits = traverse(db, 'A', 3);
    const ids = hits.map((h) => h.conceptId).sort();
    assert.deepEqual(ids, ['B', 'C'], 'A 자기 자신 제외, B/C 각 1번만');
  } finally {
    cleanup();
  }
});

test('traverse: depth ≤ 0 throw (silent fallback X)', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['c1']);
    assert.throws(() => traverse(db, 'c1', 0), /depth=0 not supported/);
    assert.throws(() => traverse(db, 'c1', -1), /depth=-1 not supported/);
  } finally {
    cleanup();
  }
});

test('traverse: depth > maxDepth throw — default maxDepth=3', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['c1']);
    assert.throws(() => traverse(db, 'c1', 4), /depth=4 exceeds maxDepth=3/);
    assert.throws(() => traverse(db, 'c1', 10), /depth=10 exceeds maxDepth=3/);
  } finally {
    cleanup();
  }
});

test('traverse: opts.maxDepth override — maxDepth=2 면 depth=3 throw', () => {
  const { db, cleanup } = freshDb();
  try {
    seedConcepts(db, ['c1']);
    assert.throws(
      () => traverse(db, 'c1', 3, { maxDepth: 2 }),
      /depth=3 exceeds maxDepth=2/,
    );
    // maxDepth=2 + depth=2 는 통과.
    assert.doesNotThrow(() => traverse(db, 'c1', 2, { maxDepth: 2 }));
  } finally {
    cleanup();
  }
});

// --- D-S5-storage-label-expose: label 직접 노출 (carry-over 10 해소) ---

test('traverse: TraverseHit 에 concepts 테이블의 label 직접 노출 (id ≠ label 검증)', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'c1', label: '글쓰기', createdAt: 1 });
    appendConcept(db, { id: 'c2', label: '루틴', createdAt: 2 });
    appendConcept(db, { id: 'c3', label: '저녁', createdAt: 3 });
    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { fromId: 'c2', toId: 'c3', weight: 0.7, kind: 'semantic' });

    const oneHop = traverse(db, 'c1', 1);
    const c2 = oneHop.find((h) => h.conceptId === 'c2');
    assert.equal(c2?.label, '루틴', 'depth=1: label 은 conceptId 가 아닌 concepts.label');

    const twoHop = traverse(db, 'c1', 2);
    const c3 = twoHop.find((h) => h.conceptId === 'c3');
    assert.equal(c3?.label, '저녁', 'depth=2: BFS 경유 노드도 label 흡수');
    assert.notEqual(c3?.label, c3?.conceptId, 'label 이 conceptId 와 별개의 값');
  } finally {
    cleanup();
  }
});
