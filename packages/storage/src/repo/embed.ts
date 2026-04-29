import type { Database } from '../db.ts';

export type NearestConcept = {
  id: string;
  score: number;
};

type NearestRow = {
  id: string;
  distance: number;
};

export async function nearestConcepts(
  db: Database,
  vec: Float32Array,
  k: number,
  opts?: { excludeId?: string },
): Promise<NearestConcept[]> {
  if (k <= 0) return [];

  const blob = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);

  // sqlite-vec KNN: MATCH on the virtual table, ORDER BY distance.
  // Over-fetch by 1 when excludeId is provided so we can drop it client-side
  // without losing a slot.
  const limit = opts?.excludeId ? k + 1 : k;

  const rows = db
    .prepare(
      `SELECT c.id AS id, v.distance AS distance
         FROM vec_concepts v
         JOIN concepts c ON c.rowid = v.rowid
        WHERE v.embedding MATCH ?
          AND k = ?
        ORDER BY v.distance ASC`,
    )
    .all(blob, limit) as NearestRow[];

  const filtered = opts?.excludeId
    ? rows.filter((r) => r.id !== opts.excludeId)
    : rows;

  return filtered.slice(0, k).map((r) => ({
    id: r.id,
    score: 1 - r.distance,
  }));
}
