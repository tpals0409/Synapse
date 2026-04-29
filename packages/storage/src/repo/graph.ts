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
