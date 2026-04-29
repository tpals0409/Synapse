// Sprint 3 receipt step 15 — 0003 마이그 멱등성.
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types migrate-twice.mjs
//   → 빈 DB 에 migrate() 두 번 → exit 0.
//   → stdout: "tables=concepts,edges,vec_concepts;migrations=<n>"
//   → 두 번째 호출에서 _migrations 행 수가 첫 번째와 같아야 함 (멱등).
//
// 단일 진실원: packages/storage/schema/0003_graph.sql.

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');

const db = storage.openDb(dbPath);

// 1st migration
storage.migrate(db);
const after1 = db
  .prepare('SELECT COUNT(*) AS n FROM _migrations')
  .get().n;

// 2nd migration — must be idempotent (no-op for already-applied schema files).
storage.migrate(db);
const after2 = db
  .prepare('SELECT COUNT(*) AS n FROM _migrations')
  .get().n;

if (after1 !== after2) {
  console.error(`migrate is not idempotent: _migrations rows ${after1} → ${after2}`);
  process.exit(3);
}

// 0003 schema 의 핵심 테이블 / 가상 테이블 존재 검증.
const required = ['concepts', 'edges', 'vec_concepts'];
const missing = [];
for (const name of required) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE name = ?")
    .get(name);
  if (!row) missing.push(name);
}

if (missing.length > 0) {
  console.error(`missing tables after migrate: ${missing.join(',')}`);
  process.exit(4);
}

process.stdout.write(`tables=${required.join(',')};migrations=${after2}`);
