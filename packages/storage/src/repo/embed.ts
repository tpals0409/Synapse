import type { Database } from '../db.ts';

// [FROZEN v2026-04-29 D-S5-storage-label-expose] — label 직접 노출.
// chatStore adapter 의 `label = id fallback` 제거 → carry-over 10 해소.
export type NearestConcept = {
  id: string;
  label: string;
  score: number;
};

type NearestRow = {
  id: string;
  label: string;
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

  // [D-S5-storage-nearest-label-determinism] secondary sort by c.id ASC —
  // distance tie 시 결정성 보장 (sqlite-vec MATCH 의 implicit ordering 외부 보강).
  // sqlite-vec 는 `k = ?` 와 `MATCH ?` 를 함께 받아 LIMIT 처럼 동작 — 그러나 ORDER BY
  // 가 distance ASC 단일 키만 명시되면 floating-point tie 시 row 순서가 platform/run
  // 마다 달라질 수 있음. id ASC secondary sort 로 결정성 박음.
  const rows = db
    .prepare(
      `SELECT c.id AS id, c.label AS label, v.distance AS distance
         FROM vec_concepts v
         JOIN concepts c ON c.rowid = v.rowid
        WHERE v.embedding MATCH ?
          AND k = ?
        ORDER BY v.distance ASC, c.id ASC`,
    )
    .all(blob, limit) as NearestRow[];

  const filtered = opts?.excludeId
    ? rows.filter((r) => r.id !== opts.excludeId)
    : rows;

  return filtered.slice(0, k).map((r) => ({
    id: r.id,
    label: r.label,
    score: 1 - r.distance,
  }));
}
