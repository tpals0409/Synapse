// Sprint 6 receipt — conversation.detectRetractionSignal + storage.markRetracted +
// rollbackCaptureForTurn 검증 (stub-only, Ollama/embed 비의존).
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types sprint6-retraction-rollback.mjs
//   → fixture (assistant 메시지 1 + concept Z + edge Z-W) →
//      (1) detectRetractionSignal 한·영 6 케이스 + 부정 hit 4 케이스 검증
//      (2) markRetracted(db, msgId) → messages.retracted = 1 검증
//      (3) rollbackCaptureForTurn(db, [Z]) → concept Z + edge (Z,*) 모두 hard-delete 검증
//   → exit 0 + stdout: "retracted=<n>;rolledback=<n>;detect_hit=<n>;detect_miss=<n>;edges_after=<n>"
//
// 외부 contract 가드: storage.markRetracted / storage.rollbackCaptureForTurn /
// conversation.detectRetractionSignal root index export.

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');
const conversation = await import('@synapse/conversation');

if (typeof storage.markRetracted !== 'function') {
  console.error('storage.markRetracted 미export from @synapse/storage root index');
  process.exit(3);
}
if (typeof storage.rollbackCaptureForTurn !== 'function') {
  console.error('storage.rollbackCaptureForTurn 미export from @synapse/storage root index');
  process.exit(3);
}
if (typeof conversation.detectRetractionSignal !== 'function') {
  console.error('conversation.detectRetractionSignal 미export from @synapse/conversation root index');
  process.exit(3);
}

// (1) 부정 신호 패턴 매칭 — 한·영 anchor.
const HIT_CASES = [
  '아니야 그건 다른 얘기',
  '아니, 그건 틀렸어',
  '그건 다른 의미였어',
  'no, that was wrong',
  "no that's not what I meant",
  "I didn't say that",
];
const MISS_CASES = [
  '오늘 카페에서 책을 읽었다',
  '책에서 영감을 받았다',
  '그건 다른 얘기지만 사실 비슷해', // 첫 단어 anchor — '그건' 만으로는 hit X (정책: '그건 다른' anchor 는 hit O — 본 케이스는 hit 가능). 아래 케이스로 교체.
  'this is a test',
];
// MISS_CASES[2] 는 '그건 다른' 으로 시작 → hit 로 잡혀 false negative. mid-sentence 케이스로 교체.
MISS_CASES[2] = '오늘 그건 다른 얘기였지만 사실 같다';

let detectHit = 0;
for (const text of HIT_CASES) {
  if (conversation.detectRetractionSignal(text)) {
    detectHit += 1;
  } else {
    console.error(`expected hit, missed: '${text}'`);
    process.exit(4);
  }
}
if (detectHit !== HIT_CASES.length) {
  console.error(`detect_hit=${detectHit}, expected ${HIT_CASES.length}`);
  process.exit(5);
}

let detectMiss = 0;
for (const text of MISS_CASES) {
  if (!conversation.detectRetractionSignal(text)) {
    detectMiss += 1;
  } else {
    console.error(`expected miss, hit: '${text}'`);
    process.exit(6);
  }
}
if (detectMiss !== MISS_CASES.length) {
  console.error(`detect_miss=${detectMiss}, expected ${MISS_CASES.length}`);
  process.exit(7);
}

// (2) markRetracted 검증.
const db = storage.openDb(dbPath);
storage.migrate(db);

const now = Date.now();
const asstMsgId = 'msg-asst-1';
storage.appendMessage(db, {
  id: asstMsgId,
  role: 'assistant',
  content: '이전 응답입니다',
  ts: now,
});

storage.markRetracted(db, asstMsgId);
const msgRow = db
  .prepare('SELECT retracted FROM messages WHERE id = ?')
  .get(asstMsgId);
if (!msgRow) {
  console.error(`message row missing: ${asstMsgId}`);
  process.exit(8);
}
if (msgRow.retracted !== 1) {
  console.error(`expected retracted=1, got ${msgRow.retracted}`);
  process.exit(9);
}

// (3) rollbackCaptureForTurn 검증.
storage.appendConcept(db, { id: 'Z', label: 'Z-label', createdAt: now });
storage.appendConcept(db, { id: 'W', label: 'W-label', createdAt: now });
storage.appendEdge(db, { fromId: 'Z', toId: 'W', kind: 'co_occur', weight: 0.7 });

// 사전 검증 — concept Z + edge (Z,W) 적재.
const conceptZBefore = db
  .prepare('SELECT id FROM concepts WHERE id = ?')
  .get('Z');
if (!conceptZBefore) {
  console.error('concept Z 적재 실패 (pre-rollback)');
  process.exit(10);
}
const edgesBefore = db
  .prepare('SELECT COUNT(*) AS n FROM edges WHERE from_id = ? OR to_id = ?')
  .get('Z', 'Z');
if (!edgesBefore || edgesBefore.n < 1) {
  console.error('edge (Z, *) 적재 실패 (pre-rollback)');
  process.exit(11);
}

const rollback = storage.rollbackCaptureForTurn(db, ['Z']);
if (rollback.rolledback < 1) {
  console.error(`expected rolledback >= 1, got ${rollback.rolledback}`);
  process.exit(12);
}

// concept Z 사라짐 검증.
const conceptZAfter = db
  .prepare('SELECT id FROM concepts WHERE id = ?')
  .get('Z');
if (conceptZAfter) {
  console.error('concept Z hard-delete 실패 (post-rollback)');
  process.exit(13);
}

// edge (Z, *) 사라짐 검증.
const edgesAfter = db
  .prepare('SELECT COUNT(*) AS n FROM edges WHERE from_id = ? OR to_id = ?')
  .get('Z', 'Z');
if (!edgesAfter || edgesAfter.n !== 0) {
  console.error(`expected edges (Z,*)=0 after rollback, got ${edgesAfter?.n}`);
  process.exit(14);
}

// concept W 는 잔존 (rollback list 에 없음).
const conceptWAfter = db
  .prepare('SELECT id FROM concepts WHERE id = ?')
  .get('W');
if (!conceptWAfter) {
  console.error('concept W 가 잘못 삭제됨 (rollback list 에 없는데 hard-delete)');
  process.exit(15);
}

process.stdout.write(
  `retracted=1;rolledback=${rollback.rolledback};detect_hit=${detectHit};detect_miss=${detectMiss};edges_after=${edgesAfter.n}`,
);
