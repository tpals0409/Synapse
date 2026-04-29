// Sprint 3 receipt step 16 — e2e: Concept 추출.
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types sprint3-extract.mjs
//   → '어제 산책 중 들은 노래가 좋았어' 입력 → sendStream 1 회 + runMemoryFormation 1 회.
//   → exit 0 + stdout "concepts=<n>;label0=<first label>"
//   → concepts >= 1 (label 비어있지 않음) 단계 검증은 shell 측.
//
// fire-and-forget hook 은 결정적 await 가 어려워, runMemoryFormation 을 *직접* 1 회 호출
// (loop.ts 가 export 하는 동일 함수). sendStream 회귀 (assistant 응답 적재) 도 함께 검증.
//
// Ollama 의존 — `SKIP_OLLAMA=1` 이면 shell 단계가 이 진입점을 호출하지 않는다.

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');
const conversation = await import('@synapse/conversation');

const db = storage.openDb(dbPath);
storage.migrate(db);

const userMessage = '어제 산책 중 들은 노래가 좋았어';

// (1) sendStream — assistant 응답 적재 회귀.
let chunks = 0;
try {
  for await (const tok of conversation.sendStream(userMessage, { db })) {
    chunks += 1;
    void tok;
    process.stderr.write('.');
  }
} catch (err) {
  process.stderr.write('\n');
  console.error('sendStream threw:', err?.message || err);
  process.exit(3);
}
process.stderr.write('\n');

if (chunks < 1) {
  console.error(`expected sendStream chunks >= 1, got ${chunks}`);
  process.exit(4);
}

// (2) runMemoryFormation — 결정적 await 가능. sendStream 의 fire-and-forget 와 동일 path.
let concepts;
try {
  concepts = await conversation.runMemoryFormation(userMessage, { db });
} catch (err) {
  console.error('runMemoryFormation threw:', err?.message || err);
  process.exit(5);
}

if (!Array.isArray(concepts) || concepts.length < 1) {
  console.error(`expected concepts >= 1, got ${concepts?.length ?? 'undefined'}`);
  process.exit(6);
}

const firstLabel = concepts[0]?.label;
if (typeof firstLabel !== 'string' || firstLabel.length < 1) {
  console.error(`expected concept[0].label non-empty string, got ${JSON.stringify(firstLabel)}`);
  process.exit(7);
}

// concepts 테이블 적재 회귀.
const stored = db.prepare('SELECT COUNT(*) AS n FROM concepts').get().n;
if (stored < 1) {
  console.error(`expected concepts table rows >= 1, got ${stored}`);
  process.exit(8);
}

process.stdout.write(`concepts=${concepts.length};label0=${firstLabel}`);
