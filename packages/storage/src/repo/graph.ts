import type { Concept, GraphEdge, EdgeKind } from '@synapse/protocol';
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
    ).run(edge.fromId, edge.toId, edge.weight, edge.kind);
  });
  tx();
}

// [FROZEN v2026-04-29 D-S5-storage-label-expose] — label 직접 노출.
// chatStore adapter 의 `label = conceptId fallback` 제거 → carry-over 10 해소.
export type TraverseHit = {
  conceptId: string;
  label: string;
  weight: number;
  kind: EdgeKind;
};

export type TraverseOptions = {
  maxDepth?: number;
};

const DEFAULT_MAX_DEPTH = 3;

// 1-hop SQL UNION ALL — Sprint 4 의 동결된 native 결과. depth=1 은 항상 이 경로.
// `seed` 자신은 제외 (self-loop edge 가 있더라도).
// concepts 테이블 INNER JOIN 으로 label 직접 흡수 (D-S5-storage-label-expose).
// edge 가 가리키는 concept 가 concepts 테이블에 부재한 경우 (실 데이터에는 거의 없음 —
// FK 미설정이지만 appendConcept → appendEdge 순서 보장) 결과에서 제외.
function traverseOneHop(db: Database, seedId: string): TraverseHit[] {
  const rows = db
    .prepare(
      `SELECT e.to_id AS other, c.label AS label, e.weight AS weight, e.kind AS kind
         FROM edges e
         JOIN concepts c ON c.id = e.to_id
        WHERE e.from_id = ?
       UNION ALL
       SELECT e.from_id AS other, c.label AS label, e.weight AS weight, e.kind AS kind
         FROM edges e
         JOIN concepts c ON c.id = e.from_id
        WHERE e.to_id = ?`,
    )
    .all(seedId, seedId) as {
    other: string;
    label: string;
    weight: number;
    kind: EdgeKind;
  }[];
  return rows
    .filter((r) => r.other !== seedId)
    .map((r) => ({ conceptId: r.other, label: r.label, weight: r.weight, kind: r.kind }));
}

// 무방향 graph traverse. depth=1 은 SQL UNION ALL (Sprint 4 동결, 회귀 0).
// depth ≥ 2 는 BFS — visited Set 으로 cycle 가드, max-depth 가드.
// 결과 = 1..depth hop 모든 hit. 같은 conceptId 가 여러 hop 에서 도달 시 *가장 짧은 경로*
// (= 더 작은 hop) 의 weight/kind 보존. seed 자신은 결과에서 제외.
//
// `D-S4-storage-traverse-depth-throw` (Sprint 4) + `D-S5-storage-traverse-bfs` (Sprint 5):
// silent fallback 절대 X — depth ≤ 0 또는 depth > maxDepth (default 3) 시 throw.
export function traverse(
  db: Database,
  conceptId: string,
  depth: number = 1,
  opts?: TraverseOptions,
): TraverseHit[] {
  const maxDepth = opts?.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (depth <= 0) {
    throw new Error(`traverse: depth=${depth} not supported (must be >= 1)`);
  }
  if (depth > maxDepth) {
    throw new Error(`traverse: depth=${depth} exceeds maxDepth=${maxDepth}`);
  }

  if (depth === 1) {
    return traverseOneHop(db, conceptId);
  }

  // BFS: visited 에는 seed + 이미 결과에 포함된 conceptId 를 모두 등록.
  // frontier 는 다음 hop 에서 확장할 conceptId. 각 hop 마다 frontier 노드의 1-hop 이웃을
  // 조회하고, visited 가 아닌 이웃만 결과 + 다음 frontier 에 추가.
  // 가장 짧은 경로 우선: 같은 hop 내 중복은 처음 등장한 weight/kind 보존.
  const results: TraverseHit[] = [];
  const visited = new Set<string>([conceptId]);
  let frontier: string[] = [conceptId];

  for (let hop = 1; hop <= depth; hop++) {
    const nextFrontier: string[] = [];
    for (const currentId of frontier) {
      const neighbors = traverseOneHop(db, currentId);
      for (const hit of neighbors) {
        if (visited.has(hit.conceptId)) continue;
        visited.add(hit.conceptId);
        results.push(hit);
        nextFrontier.push(hit.conceptId);
      }
    }
    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  return results;
}
