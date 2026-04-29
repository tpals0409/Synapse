// Sprint 3 receipt step 17 — e2e: 그래프 형성.
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types sprint3-graph.mjs
//   → 두 메시지 연속 입력 → concepts >= 2, edges co_occur >= 1.
//   → exit 0 + stdout "concepts=<n>;co_occur=<m>;total_edges=<k>"
//
// 두 번째 turn 의 prevMessageConceptIds 에 첫 turn 의 concept ids 를 넘겨야 co_occur 가 형성됨.
// (loop.ts 의 sendStream 은 prevMessageConceptIds 를 deps 로 받으므로 직접 전달.)
//
// Ollama 의존.

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');
const conversation = await import('@synapse/conversation');

const db = storage.openDb(dbPath);
storage.migrate(db);

// turn 1 — 첫 발화.
const m1 = '오늘 카페에서 책을 읽었다';
const c1 = await conversation.runMemoryFormation(m1, { db });
if (!Array.isArray(c1) || c1.length < 1) {
  console.error(`turn1: expected concepts >= 1, got ${c1?.length ?? 'undefined'}`);
  process.exit(3);
}

// turn 2 — prevMessageConceptIds = turn1 concept ids → co_occur 1:1 곱.
const m2 = '읽은 책에서 영감을 받았다';
const c2 = await conversation.runMemoryFormation(m2, {
  db,
  prevMessageConceptIds: c1.map((c) => c.id),
});
if (!Array.isArray(c2) || c2.length < 1) {
  console.error(`turn2: expected concepts >= 1, got ${c2?.length ?? 'undefined'}`);
  process.exit(4);
}

const totalConcepts = db.prepare('SELECT COUNT(*) AS n FROM concepts').get().n;
const totalEdges = db.prepare('SELECT COUNT(*) AS n FROM edges').get().n;
const coOccurEdges = db
  .prepare("SELECT COUNT(*) AS n FROM edges WHERE kind = 'co_occur'")
  .get().n;

if (totalConcepts < 2) {
  console.error(`expected concepts >= 2, got ${totalConcepts}`);
  process.exit(5);
}
if (coOccurEdges < 1) {
  console.error(`expected co_occur edges >= 1, got ${coOccurEdges}`);
  process.exit(6);
}

process.stdout.write(
  `concepts=${totalConcepts};co_occur=${coOccurEdges};total_edges=${totalEdges}`,
);
