// Sprint 5 receipt — storage.traverse(db, id, depth ≥ 2) BFS 멱등성 + cycle 가드.
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types sprint5-traverse-depth.mjs
//   → fixture 그래프 적재 → traverse(seed, 1) ↔ traverse(seed, 2) 정합 검증.
//   → exit 0 + stdout: "depth1=<n>;depth2=<m>;superset=<bool>;cycles=<c>;maxdepth_throw=<bool>"
//
// 그래프:
//     A —— B —— C
//     |    |
//     D —— B  (cycle: A-B-D, A-D-B)
//
//   depth=1 (seed=A) = {B, D}    (2 hits)
//   depth=2 (seed=A) = {B, D, C} (3 hits — A 자신 제외, cycle 차단)
//
// 검증:
//   1) depth=2 ⊃ depth=1 의 conceptId 집합 (superset).
//   2) depth=2 결과에 seed (A) 미포함 (cycle 차단).
//   3) depth=2 결과 conceptId 중복 0 (visited Set 작동).
//   4) traverse(seed, 5) → throw (max-depth 가드, default=3).
//   5) traverse(seed, 0) → throw (depth <= 0 가드).

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');

const db = storage.openDb(dbPath);
storage.migrate(db);

// Concept 4 종 적재 — protocol Concept 형 (createdAt 보유, D-S5-concept-createdAt-retain).
// 사유: D-S5-storage-appendConcept-createdAt-split SUPERSEDED — Concept 가 createdAt 직접 보유.
const now = Date.now();
storage.appendConcept(db, { id: 'A', label: 'A-label', createdAt: now });
storage.appendConcept(db, { id: 'B', label: 'B-label', createdAt: now });
storage.appendConcept(db, { id: 'C', label: 'C-label', createdAt: now });
storage.appendConcept(db, { id: 'D', label: 'D-label', createdAt: now });

// Edges — 무방향 graph (A-B, B-C, A-D, B-D). 마지막 B-D 가 cycle 형성 (A-B-D 와 A-D-B 두 경로).
storage.appendEdge(db, { fromId: 'A', toId: 'B', kind: 'co_occur', weight: 0.8 });
storage.appendEdge(db, { fromId: 'B', toId: 'C', kind: 'co_occur', weight: 0.6 });
storage.appendEdge(db, { fromId: 'A', toId: 'D', kind: 'co_occur', weight: 0.7 });
storage.appendEdge(db, { fromId: 'B', toId: 'D', kind: 'co_occur', weight: 0.5 });

// depth=1 검증.
const d1 = storage.traverse(db, 'A', 1);
const d1Ids = d1.map((h) => h.conceptId).sort();
if (d1.length < 2) {
  console.error(`depth=1 expected >= 2 hits, got ${d1.length} (${JSON.stringify(d1Ids)})`);
  process.exit(3);
}
const d1Set = new Set(d1Ids);
if (!d1Set.has('B') || !d1Set.has('D')) {
  console.error(`depth=1 expected {B, D} subset, got ${JSON.stringify(d1Ids)}`);
  process.exit(4);
}

// depth=2 검증.
const d2 = storage.traverse(db, 'A', 2);
const d2Ids = d2.map((h) => h.conceptId).sort();
const d2Set = new Set(d2Ids);

// superset.
const isSuperset = [...d1Set].every((id) => d2Set.has(id));
if (!isSuperset) {
  console.error(
    `depth=2 must be superset of depth=1. d1=${JSON.stringify(d1Ids)} d2=${JSON.stringify(d2Ids)}`,
  );
  process.exit(5);
}

// seed 'A' 미포함.
if (d2Set.has('A')) {
  console.error(`depth=2 결과에 seed 'A' 포함 (cycle 차단 실패): ${JSON.stringify(d2Ids)}`);
  process.exit(6);
}

// C 가 등장해야 함 (2-hop hit).
if (!d2Set.has('C')) {
  console.error(`depth=2 expected to contain 'C' (2-hop), got ${JSON.stringify(d2Ids)}`);
  process.exit(7);
}

// 중복 0 — visited Set 검증.
const dupCount = d2Ids.length - d2Set.size;
if (dupCount !== 0) {
  console.error(`depth=2 결과에 중복 ${dupCount} 건 (visited Set 작동 실패): ${JSON.stringify(d2Ids)}`);
  process.exit(8);
}

// max-depth 가드.
let maxDepthThrew = false;
try {
  storage.traverse(db, 'A', 5);
} catch (err) {
  maxDepthThrew = true;
}
if (!maxDepthThrew) {
  console.error(`max-depth 가드 실패 — depth=5 는 throw 해야 함 (default maxDepth=3).`);
  process.exit(9);
}

// depth <= 0 가드.
let zeroThrew = false;
try {
  storage.traverse(db, 'A', 0);
} catch (err) {
  zeroThrew = true;
}
if (!zeroThrew) {
  console.error(`depth=0 가드 실패 — throw 해야 함.`);
  process.exit(10);
}

process.stdout.write(
  `depth1=${d1.length};depth2=${d2.length};superset=${isSuperset};cycles=${dupCount};maxdepth_throw=${maxDepthThrew}`,
);
