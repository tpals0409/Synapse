// Sprint 6 receipt — storage.pruneEdgesBelow 임계 미만 edge 자동 hard-delete 검증.
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types sprint6-edge-prune.mjs
//   → fixture (edges 5 종, weight = {0.9, 0.5, 0.1, 0.04, 0.01})
//   → pruneEdgesBelow(db, 0.05) → weight < 0.05 edge 2 종 (0.04, 0.01) DELETE
//   → 검증:
//       (1) pruned = 2
//       (2) 잔존 edge 3 종 (weight ∈ {0.9, 0.5, 0.1}) — 임계 (= 0.05) 와 정확히 같은 weight 는 잔존
//       (3) 두 번째 호출 멱등 — pruned = 0 (이미 삭제됨)
//   → exit 0 + stdout: "pruned=<n>;remaining=<n>;idempotent=true"
//
// 외부 contract 가드: storage.pruneEdgesBelow root index export.

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');

if (typeof storage.pruneEdgesBelow !== 'function') {
  console.error('storage.pruneEdgesBelow 미export from @synapse/storage root index');
  process.exit(3);
}

const db = storage.openDb(dbPath);
storage.migrate(db);

const now = Date.now();

// concepts 6 종.
for (const id of ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']) {
  storage.appendConcept(db, { id, label: id, createdAt: now });
}

// edges 5 종 — weight 분포 [0.9, 0.5, 0.1, 0.04, 0.01].
storage.appendEdge(db, { fromId: 'P1', toId: 'P2', kind: 'co_occur', weight: 0.9 });
storage.appendEdge(db, { fromId: 'P2', toId: 'P3', kind: 'co_occur', weight: 0.5 });
storage.appendEdge(db, { fromId: 'P3', toId: 'P4', kind: 'co_occur', weight: 0.1 });
storage.appendEdge(db, { fromId: 'P4', toId: 'P5', kind: 'co_occur', weight: 0.04 });
storage.appendEdge(db, { fromId: 'P5', toId: 'P6', kind: 'co_occur', weight: 0.01 });

// 사전 검증.
const before = db.prepare('SELECT COUNT(*) AS n FROM edges').get();
if (before.n !== 5) {
  console.error(`expected 5 edges before prune, got ${before.n}`);
  process.exit(4);
}

// (1) prune 첫 호출 — threshold = 0.05.
const first = storage.pruneEdgesBelow(db, 0.05);
if (first.pruned !== 2) {
  console.error(`expected pruned=2 (weights 0.04, 0.01), got ${first.pruned}`);
  process.exit(5);
}

// (2) 잔존 edge 3 종 검증.
const remainingRows = db
  .prepare('SELECT weight FROM edges ORDER BY weight DESC')
  .all();
if (remainingRows.length !== 3) {
  console.error(`expected 3 remaining, got ${remainingRows.length}`);
  process.exit(6);
}
const expectedWeights = [0.9, 0.5, 0.1];
for (let i = 0; i < expectedWeights.length; i += 1) {
  if (Math.abs(remainingRows[i].weight - expectedWeights[i]) > 1e-9) {
    console.error(
      `remaining[${i}] expected ${expectedWeights[i]}, got ${remainingRows[i].weight}`,
    );
    process.exit(7);
  }
}

// (3) 멱등 검증 — 같은 임계로 두 번째 호출 시 pruned=0.
const second = storage.pruneEdgesBelow(db, 0.05);
if (second.pruned !== 0) {
  console.error(`expected idempotent pruned=0 on second call, got ${second.pruned}`);
  process.exit(8);
}

process.stdout.write(
  `pruned=${first.pruned};remaining=${remainingRows.length};idempotent=true`,
);
