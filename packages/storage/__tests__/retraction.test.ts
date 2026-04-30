import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openDb,
  migrate,
  appendMessage,
  appendConcept,
  appendEdge,
  markRetracted,
  rollbackCaptureForTurn,
} from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-retraction-'));
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
  const v = new Array<number>(768);
  for (let i = 0; i < 768; i++) v[i] = Math.sin(seed * 0.123 + i * 0.017);
  return v;
}

test('markRetracted: messages.retracted = 1 갱신', () => {
  const { db, cleanup } = freshDb();
  try {
    appendMessage(db, { id: 'm1', role: 'assistant', content: 'wrong answer', ts: 100 });
    let row = db.prepare('SELECT retracted FROM messages WHERE id = ?').get('m1') as {
      retracted: number;
    };
    assert.equal(row.retracted, 0, 'default = 0');

    markRetracted(db, 'm1');
    row = db.prepare('SELECT retracted FROM messages WHERE id = ?').get('m1') as {
      retracted: number;
    };
    assert.equal(row.retracted, 1);
  } finally {
    cleanup();
  }
});

test('markRetracted: 존재하지 않는 messageId 는 silent no-op', () => {
  const { db, cleanup } = freshDb();
  try {
    assert.doesNotThrow(() => markRetracted(db, 'no-such'));
  } finally {
    cleanup();
  }
});

test('rollbackCaptureForTurn: concepts/edges/vec_concepts hard-delete (caller-pass)', () => {
  const { db, cleanup } = freshDb();
  try {
    // turn1 capture: c1, c2 + edge c1↔c2.
    appendConcept(db, { id: 'c1', label: 'one', embedding: fakeEmbedding(1), createdAt: 100 });
    appendConcept(db, { id: 'c2', label: 'two', embedding: fakeEmbedding(2), createdAt: 100 });
    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.5, kind: 'co_occur' });
    // turn2 capture: c3 + edge c2↔c3 (c2 는 turn1 의 것이지만 turn2 에서도 등장).
    appendConcept(db, { id: 'c3', label: 'three', embedding: fakeEmbedding(3), createdAt: 200 });
    appendEdge(db, { fromId: 'c2', toId: 'c3', weight: 0.7, kind: 'semantic' });

    // turn2 만 회수: caller 가 c3 을 전달.
    const r = rollbackCaptureForTurn(db, ['c3']);
    assert.equal(r.rolledback, 1, 'c3 만 삭제');

    // c1, c2 보존. c3 삭제. c2↔c3 edge 삭제. c1↔c2 edge 보존.
    const concepts = db
      .prepare('SELECT id FROM concepts ORDER BY id ASC')
      .all() as { id: string }[];
    assert.deepEqual(
      concepts.map((c) => c.id),
      ['c1', 'c2'],
    );

    const edges = db
      .prepare('SELECT from_id, to_id FROM edges ORDER BY from_id ASC, to_id ASC')
      .all() as { from_id: string; to_id: string }[];
    assert.equal(edges.length, 1);
    assert.equal(edges[0]?.from_id, 'c1');
    assert.equal(edges[0]?.to_id, 'c2');

    // vec_concepts 도 c3 의 rowid 삭제됨.
    const vecCount = db.prepare('SELECT COUNT(*) as n FROM vec_concepts').get() as { n: number };
    assert.equal(vecCount.n, 2, 'vec_concepts 에서 c3 의 rowid 삭제');
  } finally {
    cleanup();
  }
});

test('rollbackCaptureForTurn: 빈 conceptIds → no-op', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'c1', label: 'a', createdAt: 1 });
    const r = rollbackCaptureForTurn(db, []);
    assert.equal(r.rolledback, 0);
    const cnt = db.prepare('SELECT COUNT(*) as n FROM concepts').get() as { n: number };
    assert.equal(cnt.n, 1, 'concepts 그대로');
  } finally {
    cleanup();
  }
});

test('rollbackCaptureForTurn: 일부 conceptIds 가 부재 — 존재하는 것만 삭제', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'c1', label: 'a', createdAt: 1 });
    const r = rollbackCaptureForTurn(db, ['c1', 'no-such', 'also-no']);
    assert.equal(r.rolledback, 1);
  } finally {
    cleanup();
  }
});

test('rollbackCaptureForTurn: edges 가 from 또는 to 어느 쪽이든 매칭되면 삭제', () => {
  const { db, cleanup } = freshDb();
  try {
    appendConcept(db, { id: 'a', label: 'a', createdAt: 1 });
    appendConcept(db, { id: 'b', label: 'b', createdAt: 2 });
    appendConcept(db, { id: 'c', label: 'c', createdAt: 3 });
    appendEdge(db, { fromId: 'a', toId: 'b', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { fromId: 'c', toId: 'a', weight: 0.6, kind: 'semantic' });
    appendEdge(db, { fromId: 'b', toId: 'c', weight: 0.7, kind: 'co_occur' });

    rollbackCaptureForTurn(db, ['a']);

    // a 가 from 또는 to 인 모든 edge 삭제. b↔c 보존.
    const edges = db
      .prepare('SELECT from_id, to_id FROM edges ORDER BY from_id ASC, to_id ASC')
      .all() as { from_id: string; to_id: string }[];
    assert.equal(edges.length, 1);
    assert.equal(edges[0]?.from_id, 'b');
    assert.equal(edges[0]?.to_id, 'c');
  } finally {
    cleanup();
  }
});
