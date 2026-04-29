import type { Concept, GraphEdge } from '@synapse/engine';
import type { Database } from '../db.ts';

function embeddingToBlob(embedding: number[] | undefined): Buffer | null {
  if (!embedding) return null;
  const f32 = new Float32Array(embedding);
  return Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);
}

export function appendConcept(db: Database, concept: Concept): void {
  const tx = db.transaction(() => {
    const blob = embeddingToBlob(concept.embedding);
    const result = db
      .prepare(
        'INSERT OR IGNORE INTO concepts (id, label, embedding, created_at) VALUES (?, ?, ?, ?)',
      )
      .run(concept.id, concept.label, blob, concept.createdAt);

    if (result.changes === 0) return;

    if (blob) {
      // sqlite-vec vec0 requires INTEGER rowid bound as BigInt; better-sqlite3
      // returns lastInsertRowid as number by default, so coerce explicitly.
      const rowid =
        typeof result.lastInsertRowid === 'bigint'
          ? result.lastInsertRowid
          : BigInt(result.lastInsertRowid);
      db.prepare(
        'INSERT INTO vec_concepts (rowid, embedding) VALUES (?, ?)',
      ).run(rowid, blob);
    }
  });
  tx();
}

export function appendEdge(db: Database, edge: GraphEdge): void {
  const tx = db.transaction(() => {
    db.prepare(
      'INSERT OR IGNORE INTO edges (from_id, to_id, weight, kind) VALUES (?, ?, ?, ?)',
    ).run(edge.from, edge.to, edge.weight, edge.kind);
  });
  tx();
}

export type EdgeKind = 'co_occur' | 'semantic';

export type TraverseHit = {
  conceptId: string;
  weight: number;
  kind: EdgeKind;
};

// 1-hop 무방향 traverse. depth ≥ 2 는 Sprint 5+ Hyper-Recall 대상.
// 자기 자신 (other === conceptId) 은 결과에서 제외 (self-loop edge 가 있더라도).
export function traverse(
  db: Database,
  conceptId: string,
  depth: number = 1,
): TraverseHit[] {
  if (depth !== 1) {
    throw new Error(`traverse: depth=${depth} not supported (Sprint 4 = depth=1 only)`);
  }
  const rows = db
    .prepare(
      `SELECT to_id AS other, weight, kind FROM edges WHERE from_id = ?
       UNION ALL
       SELECT from_id AS other, weight, kind FROM edges WHERE to_id = ?`,
    )
    .all(conceptId, conceptId) as { other: string; weight: number; kind: EdgeKind }[];
  return rows
    .filter((r) => r.other !== conceptId)
    .map((r) => ({ conceptId: r.other, weight: r.weight, kind: r.kind }));
}
