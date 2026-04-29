// Sprint 1 receipt step 5 — e2e: 안녕 → Gemma stream → SQLite
//
// 호출: SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types streamSend.mjs
//   → stdout 한 줄 "<chunks>:<length>" 출력 (예: "7:34").
//   → exit 0 일 때만 receipt step 5 통과 간주.
//
// workspace alias `@synapse/*` 는 *진입 스크립트 파일이 위치한* 디렉토리의 node_modules 에서
// resolve 된다. 이 파일이 packages/conversation/.receipt-runner/ 안에 있어야
// `@synapse/storage`, `@synapse/conversation` 가 정상 resolve. (Sprint 0 carry-over.)

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');
const conversation = await import('@synapse/conversation');

const db = storage.openDb(dbPath);
storage.migrate(db);

let chunks = 0;
let total = '';
const t0 = Date.now();

try {
  for await (const tok of conversation.sendStream('안녕', { db })) {
    chunks += 1;
    total += tok;
    process.stderr.write('.'); // 진행 표시 (stdout 은 결과 전용)
  }
} catch (err) {
  process.stderr.write('\n');
  console.error('sendStream threw:', err?.message || err);
  process.exit(3);
}

process.stderr.write('\n');
const ms = Date.now() - t0;

// 스트리밍 contract: 최소 1 청크 + 비빈 응답.
// (Ollama gemma3:4b 의 짧은 답변 케이스에서 ≥ 2 청크가 보장되지 않을 수 있어
//  `≥ 1 AND length ≥ 1` 으로 시작. shell 단계가 추가 강화 가능.)
if (chunks < 1) {
  console.error(`expected chunks >= 1, got ${chunks}`);
  process.exit(4);
}
if (total.length < 1) {
  console.error(`expected length >= 1, got ${total.length}`);
  process.exit(5);
}

process.stdout.write(`${chunks}:${total.length}:${ms}`);
