// Sprint 3 receipt step 18 — e2e: nearestConcepts top-3.
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types sprint3-nearest.mjs
//   → 4 발화 → ≥4 concept 적재 → 첫 concept 의 embedding 으로 nearest top-3 (excludeId=self).
//   → exit 0 + stdout "rows=<n>;sorted=<true|false>;top0=<id-prefix>"
//   → 단계 검증: rows >= 1, sorted=true (score DESC).
//
// Ollama 의존 (embed 호출).

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');
const conversation = await import('@synapse/conversation');
const engine = await import('@synapse/engine');

const db = storage.openDb(dbPath);
storage.migrate(db);

const messages = [
  '커피 향이 진한 아침',
  '주말에 본 영화가 좋았다',
  '동네 도서관에서 시간을 보냈다',
  '오랜만에 친구와 통화했다',
];

const allConcepts = [];
for (const m of messages) {
  const cs = await conversation.runMemoryFormation(m, { db });
  for (const c of cs) allConcepts.push(c);
}

if (allConcepts.length < 2) {
  console.error(`expected total concepts >= 2 for nearest query, got ${allConcepts.length}`);
  process.exit(3);
}

// 쿼리: 첫 concept 의 embedding 을 다시 만들어서 nearest top-3 호출.
const seed = allConcepts[0];
const embedded = await engine.embedConcept(seed);
const queryVec = embedded.embedding; // Float32Array 768

const rows = await storage.nearestConcepts(db, queryVec, 3, { excludeId: seed.id });

if (!Array.isArray(rows) || rows.length < 1) {
  console.error(`expected nearest rows >= 1, got ${rows?.length ?? 'undefined'}`);
  process.exit(4);
}

// score DESC 검증.
let sorted = true;
for (let i = 1; i < rows.length; i++) {
  if (rows[i - 1].score < rows[i].score) {
    sorted = false;
    break;
  }
}

if (!sorted) {
  console.error(`nearest rows not sorted DESC by score: ${JSON.stringify(rows)}`);
  process.exit(5);
}

// excludeId 회귀 — self 제외.
if (rows.some((r) => r.id === seed.id)) {
  console.error(`excludeId not honored: self id ${seed.id} present in nearest rows`);
  process.exit(6);
}

const top0 = String(rows[0].id).slice(0, 8);
process.stdout.write(`rows=${rows.length};sorted=${sorted};top0=${top0}`);
