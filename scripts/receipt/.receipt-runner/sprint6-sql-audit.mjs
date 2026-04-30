// Sprint 6 receipt — SQL secondary sort 결정성 검증 (carry-over 6 흡수, T1.5 산출물 가드).
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types sprint6-sql-audit.mjs
//   → fixture (recall_log 4 row — decided_at tie 3 row + non-tie 1 row, candidate_ids
//      모두 'tie-target' 포함) → recentlyDecidedFor(db, 'tie-target', windowMs) 5 회 호출
//   → 검증:
//       (1) 모든 호출 결과 동일 row id (결정성 — id ASC secondary sort)
//       (2) 5 회 연속 PASS (D-S6-storage-sql-secondary-sort-audit FROZEN 정합)
//       (3) ORDER BY 다중 키 검증을 위해 재검사 — 같은 decided_at tie 중 id 가 최소인 row 가
//           DESC primary 후 ASC secondary 결과로 선택되는지
//   → exit 0 + stdout: "consecutive=<n>;chosen_id=<id>;tied_count=<n>"
//
// 정책:
//   - decided_at 동률 시 id ASC tie-breaker 가 정상 동작.
//   - 같은 query 5 회 호출 → 5 회 모두 동일 chosen_id.
//   - traverseOneHop / appendRecallLog / 기타 함수의 secondary sort 도 본 fixture 와 같은
//     원리 — 본 fixture 는 recall_log 한정. 추가 audit 은 codebase grep 기반 lint 단계 책임.
//
// 외부 contract 가드: storage.appendRecallLog / storage.recentlyDecidedFor root index export.

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');

if (typeof storage.appendRecallLog !== 'function') {
  console.error('storage.appendRecallLog 미export from @synapse/storage root index');
  process.exit(3);
}
if (typeof storage.recentlyDecidedFor !== 'function') {
  console.error('storage.recentlyDecidedFor 미export from @synapse/storage root index');
  process.exit(3);
}

const db = storage.openDb(dbPath);
storage.migrate(db);

const now = 20_000_000_000; // 결정성용 fixed timestamp.
const target = 'tie-target';

// recall_log 4 row 적재.
//   r-zzz: decided_at = now (tie A)
//   r-aaa: decided_at = now (tie A) — id ASC tie-break → 'r-aaa' 가 selected
//   r-mmm: decided_at = now (tie A)
//   r-bbb: decided_at = now - 10 (older, primary DESC 에 패배)
storage.appendRecallLog(db, {
  id: 'r-zzz',
  decided_at: now,
  act: 'suggestion',
  candidate_ids: [target, 'other'],
});
storage.appendRecallLog(db, {
  id: 'r-aaa',
  decided_at: now,
  act: 'ghost',
  candidate_ids: [target],
});
storage.appendRecallLog(db, {
  id: 'r-mmm',
  decided_at: now,
  act: 'strong',
  candidate_ids: [target, 'other'],
});
storage.appendRecallLog(db, {
  id: 'r-bbb',
  decided_at: now - 10,
  act: 'silence',
  candidate_ids: [target],
});

// recentlyDecidedFor 5 회 연속 호출 — chosen_id 결정성.
const windowMs = 60_000;
let consecutive = 0;
let chosenId = null;
for (let i = 0; i < 5; i += 1) {
  const row = storage.recentlyDecidedFor(db, target, windowMs, now);
  if (!row) {
    console.error(`call ${i + 1}: row null (expected non-null)`);
    process.exit(4);
  }
  if (chosenId === null) {
    chosenId = row.id;
  } else if (row.id !== chosenId) {
    console.error(
      `non-deterministic: call ${i + 1} returned id=${row.id}, expected ${chosenId}`,
    );
    process.exit(5);
  }
  consecutive += 1;
}

// id ASC secondary sort 검증 — 'r-aaa' 가 chosen 되어야 함 (decided_at tie 3 중 lex min).
if (chosenId !== 'r-aaa') {
  console.error(`expected chosen_id='r-aaa' (id ASC tie-break), got '${chosenId}'`);
  process.exit(6);
}

// tied_count 검증 — 같은 decided_at 인 row 가 3 인지.
const tiedCount = db
  .prepare('SELECT COUNT(*) AS n FROM recall_log WHERE decided_at = ?')
  .get(now).n;
if (tiedCount !== 3) {
  console.error(`expected tied_count=3, got ${tiedCount}`);
  process.exit(7);
}

process.stdout.write(
  `consecutive=${consecutive};chosen_id=${chosenId};tied_count=${tiedCount}`,
);
