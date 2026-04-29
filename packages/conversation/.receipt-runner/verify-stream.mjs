// Sprint 1 receipt step 6 — verify: latency_ms 가 마지막 assistant row 에 채워졌는지.
//
// 호출: SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types verify-stream.mjs
//   → stdout 한 줄 "latency_ms=<n>" 출력.
//   → exit 0 일 때만 receipt step 6 통과.
//
// streamSend.mjs 직후 호출되는 검증기. listMessages() 의 마지막 assistant row 의
// `latency_ms` 가 number AND > 0 이어야 한다 (Sprint 1 dev doc §7 T7 contract).

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');
const db = storage.openDb(dbPath);
const rows = storage.listMessages(db);

const assistants = rows.filter((r) => r.role === 'assistant');
if (assistants.length === 0) {
  console.error('no assistant row found in messages table');
  process.exit(3);
}

const last = assistants[assistants.length - 1];
if (typeof last.latency_ms !== 'number') {
  console.error(
    `last assistant.latency_ms is not a number: typeof=${typeof last.latency_ms}, value=${JSON.stringify(last.latency_ms)}`,
  );
  process.exit(4);
}
if (!(last.latency_ms > 0)) {
  console.error(`last assistant.latency_ms must be > 0, got ${last.latency_ms}`);
  process.exit(5);
}

process.stdout.write(`latency_ms=${last.latency_ms}`);
