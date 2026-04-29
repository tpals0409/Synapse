// Sprint 4 receipt — Silence cooldown 시나리오.
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types sprint4-cooldown.mjs
//   → 동일 candidate 가 60s 내 두 번째 등장하면 silence 강제 (suppressedReason='cooldown').
//   → exit 0 + stdout: "cooldown_silence=1;recall_log_rows=2;suppressed_reason=cooldown"
//
// stub-only — Ollama 의존 없음. orchestrator + storage 만 사용.
//
// 시나리오:
//   1) ctx1 = recencyMs/tokenContext 정상 + score 0.85 candidate 'c-x' →
//      decide → 'strong' → applySilence (recentDecisions=[]) → passthrough → recall_log push.
//   2) (60s 내 동일 candidate 재등장) ctx2 = 동일 candidate 'c-x' + recentDecisions=[1번 row] →
//      decide → 'strong' (재계산) → applySilence → cooldown 강제 silence.
//      recall_log 두 번째 row 의 suppressed_reason='cooldown'.

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');
const orchestrator = await import('@synapse/orchestrator');

const db = storage.openDb(dbPath);
storage.migrate(db);

const candidate = {
  conceptId: 'c-cooldown-x',
  label: '산책',
  score: 0.85,
  source: 'mixed',
};

const baseCtx = {
  userMessage: '주말 산책 어땠지',
  candidates: [candidate],
  recencyMs: 10_000,
  tokenContext: 0,
};

// (1) 첫 결정 — silence rule 미발동 (recentDecisions 비어있음).
let first;
try {
  first = orchestrator.decide({ ...baseCtx, recentDecisions: [] });
} catch (err) {
  console.error(`decide() turn1 threw: ${err?.message || err}`);
  process.exit(3);
}
const firstAct = typeof first === 'string' ? first : first?.act;
if (firstAct === 'silence') {
  console.error(`turn1 expected non-silence (score=0.85 → strong), got 'silence'`);
  process.exit(4);
}

const firstRow = {
  id: 'r-cooldown-1',
  decided_at: Date.now(),
  act: firstAct,
  candidate_ids: [candidate.conceptId],
};
storage.appendRecallLog(db, firstRow);

// (2) 두 번째 결정 — cooldown 시나리오. recentDecisions 에 첫 row 포함.
//     applySilence 가 export 되어 있으면 명시 호출, 아니면 decide 가 cooldown context 로 silence 반환해야.
let second;
try {
  second = orchestrator.decide({
    ...baseCtx,
    recentDecisions: [
      {
        id: firstRow.id,
        decided_at: firstRow.decided_at,
        act: firstRow.act,
        candidate_ids: firstRow.candidate_ids,
      },
    ],
  });
} catch (err) {
  console.error(`decide() turn2 threw: ${err?.message || err}`);
  process.exit(5);
}

// applySilence 반환은 SilenceResult = {act, suppressedReason?} (camelCase, dev doc §3 In + §4).
// DB row (RecallLogRow) 만 snake_case (decided_at/candidate_ids/suppressed_reason).
let secondAct = typeof second === 'string' ? second : second?.act;
let suppressedReason =
  typeof second === 'object' && second !== null ? (second.suppressedReason ?? null) : null;

// orchestrator 가 별도 applySilence 를 노출하면 후처리 시도.
if (typeof orchestrator.applySilence === 'function' && secondAct !== 'silence') {
  try {
    const post = orchestrator.applySilence(second, {
      ...baseCtx,
      recentDecisions: [
        {
          id: firstRow.id,
          decided_at: firstRow.decided_at,
          act: firstRow.act,
          candidate_ids: firstRow.candidate_ids,
        },
      ],
    });
    secondAct = typeof post === 'string' ? post : post?.act ?? secondAct;
    suppressedReason = post?.suppressedReason ?? suppressedReason;
  } catch (err) {
    console.error(`applySilence threw: ${err?.message || err}`);
    process.exit(6);
  }
}

if (secondAct !== 'silence') {
  console.error(
    `turn2 expected act='silence' (cooldown 강제), got '${secondAct}' (raw=${JSON.stringify(second)})`,
  );
  process.exit(7);
}

if (suppressedReason !== 'cooldown') {
  console.error(
    `turn2 expected suppressedReason='cooldown', got '${suppressedReason}' (raw=${JSON.stringify(second)})`,
  );
  process.exit(8);
}

const secondRow = {
  id: 'r-cooldown-2',
  decided_at: Date.now(),
  act: secondAct,
  candidate_ids: [candidate.conceptId],
  suppressed_reason: suppressedReason,
};
storage.appendRecallLog(db, secondRow);

// recall_log row count 검증.
const total = db.prepare('SELECT COUNT(*) AS n FROM recall_log').get().n;
if (total < 2) {
  console.error(`expected recall_log rows >= 2, got ${total}`);
  process.exit(9);
}

const secondStored = db
  .prepare('SELECT suppressed_reason FROM recall_log WHERE id = ?')
  .get(secondRow.id);
if (!secondStored || secondStored.suppressed_reason !== 'cooldown') {
  console.error(
    `recall_log[secondRow].suppressed_reason 기대 'cooldown', 실제 ${JSON.stringify(secondStored)}`,
  );
  process.exit(10);
}

process.stdout.write(
  `cooldown_silence=1;recall_log_rows=${total};suppressed_reason=cooldown`,
);
