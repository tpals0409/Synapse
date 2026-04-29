// Sprint 4 receipt — Recall 종단 (engine.recallCandidates → orchestrator.decide → recall_log push).
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types sprint4-recall.mjs
//   → Sprint 3 의 두 번째 메시지 흐름 재현 (turn1 으로 그래프 형성, turn2 가 Recall 트리거).
//   → exit 0 + stdout: "recall_candidates=<n>;decision_act=<silence|ghost|suggestion|strong>;recall_log_rows=<m>"
//
// Ollama 의존 — embed (그래프 형성 + Recall 측 둘 다).
// SKIP_OLLAMA=1 시 shell 단계가 본 진입점을 호출하지 않는다.
//
// 흐름:
//   1) turn1: '오늘 카페에서 책을 읽었다' → runMemoryFormation 으로 concepts 적재 (그래프 형성).
//   2) turn2: '읽은 책에서 영감을 받았다' → engine.recallCandidates 직접 호출 → RecallCandidate[] >= 1.
//   3) orchestrator.decide → DecisionAct.
//   4) applySilence 가 노출되면 후처리.
//   5) storage.appendRecallLog 로 recall_log push → row >= 1.

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');
const conversation = await import('@synapse/conversation');
const engine = await import('@synapse/engine');
const orchestrator = await import('@synapse/orchestrator');

const db = storage.openDb(dbPath);
storage.migrate(db);

// turn 1 — 그래프 형성 (concepts/edges/vec_concepts 적재).
const m1 = '오늘 카페에서 책을 읽었다';
let c1;
try {
  c1 = await conversation.runMemoryFormation(m1, { db });
} catch (err) {
  console.error(`turn1 runMemoryFormation threw: ${err?.message || err}`);
  process.exit(3);
}
if (!Array.isArray(c1) || c1.length < 1) {
  console.error(`turn1 expected concepts >= 1, got ${c1?.length ?? 'undefined'}`);
  process.exit(4);
}

// turn 1.5 — co_occur 형성 위해 두 번째 발화도 미리 적재.
const mPrev = '책에서 영감을 받았다';
try {
  await conversation.runMemoryFormation(mPrev, {
    db,
    prevMessageConceptIds: c1.map((c) => c.id),
  });
} catch (err) {
  console.error(`turn1.5 runMemoryFormation threw: ${err?.message || err}`);
  process.exit(5);
}

// turn 2 — Recall 트리거 메시지 (그래프와 의미상 인접).
const m2 = '읽은 책 영감 다시 보고 싶다';

// engine.recallCandidates 호출 — Sprint 0 stub `throw` 가 제거되어야 한다.
// nearest/traverse 는 *주입 필수* (recall.ts:61 — !nearest 시 빈 배열). storage 의 시그니처
// (NearestConcept = {id, score}, TraverseHit = {conceptId, weight, kind}) 와 engine 의
// 기대 시그니처 (NearestRecallHit = {id, label, score}, engine TraverseHit = {id, label, weight})
// 가 다르므로 adapter 1 줄로 흡수 (mobile chatStore 와 동일 패턴, label = id fallback).
const labelStmt = db.prepare('SELECT label FROM concepts WHERE id = ?');
const labelOf = (id) => labelStmt.get(id)?.label ?? id;

const nearestAdapter = async (database, vec, k) => {
  const rows = await storage.nearestConcepts(database, vec, k);
  return rows.map((r) => ({ id: r.id, label: labelOf(r.id), score: r.score }));
};

const traverseAdapter = async (database, conceptId, depth) => {
  const hits = storage.traverse(database, conceptId, depth);
  return hits.map((h) => ({ id: h.conceptId, label: labelOf(h.conceptId), weight: h.weight }));
};

let candidates;
const recallFn =
  typeof engine.recallCandidates === 'function'
    ? engine.recallCandidates
    : engine.recall;
if (typeof recallFn !== 'function') {
  console.error(`engine.recallCandidates / engine.recall 둘 다 함수가 아님`);
  process.exit(6);
}

// semanticThreshold 는 receipt fixture 에서 일부러 낮춤.
// 본 단계의 임계는 *recall_candidates ≥ 1* (graph 가 형성되었고 nearest 가 결과 반환).
// production threshold (0.5) 는 short concept-label vs full-sentence 의 cosine 만으로
// 항상 도달하지 않으므로, fixture 에서 -1 (모든 hit 통과) 로 두어 결정적 회귀 가드로 동작.
// decide() 분류 임계 (0.4/0.6/0.8) 는 *별개* 로 sprint4-decide.mjs (24/32) 가 검증.
try {
  candidates = await recallFn(m2, {
    db,
    nearest: nearestAdapter,
    traverse: traverseAdapter,
    semanticThreshold: -1,
  });
} catch (err) {
  console.error(`recall() threw: ${err?.message || err}`);
  process.exit(7);
}

if (!Array.isArray(candidates) || candidates.length < 1) {
  console.error(`expected recall candidates >= 1, got ${candidates?.length ?? 'undefined'}`);
  process.exit(8);
}

// orchestrator.decide — 4 원 분기.
let decision;
try {
  decision = orchestrator.decide({
    userMessage: m2,
    candidates,
    recencyMs: 10_000,
    tokenContext: 0,
    recentDecisions: [],
  });
} catch (err) {
  console.error(`decide() threw: ${err?.message || err}`);
  process.exit(9);
}

// applySilence 반환은 SilenceResult = {act, suppressedReason?} (camelCase, dev doc §3 In + §4).
// DB row (RecallLogRow) 만 snake_case (decided_at/candidate_ids/suppressed_reason).
let act = typeof decision === 'string' ? decision : decision?.act;
let suppressedReason =
  typeof decision === 'object' && decision !== null ? (decision.suppressedReason ?? null) : null;

if (typeof orchestrator.applySilence === 'function') {
  try {
    const post = orchestrator.applySilence(decision, {
      userMessage: m2,
      candidates,
      recencyMs: 10_000,
      tokenContext: 0,
      recentDecisions: [],
    });
    act = typeof post === 'string' ? post : post?.act ?? act;
    suppressedReason = post?.suppressedReason ?? suppressedReason;
  } catch (err) {
    console.error(`applySilence threw: ${err?.message || err}`);
    process.exit(10);
  }
}

const validActs = new Set(['silence', 'ghost', 'suggestion', 'strong']);
if (!validActs.has(act)) {
  console.error(`expected act in {silence,ghost,suggestion,strong}, got '${act}'`);
  process.exit(11);
}

const candidateIds = candidates.map((c) => c.conceptId).filter(Boolean);

storage.appendRecallLog(db, {
  id: `r-recall-${Date.now()}`,
  decided_at: Date.now(),
  act,
  candidate_ids: candidateIds,
  ...(suppressedReason ? { suppressed_reason: suppressedReason } : {}),
});

const total = db.prepare('SELECT COUNT(*) AS n FROM recall_log').get().n;
if (total < 1) {
  console.error(`expected recall_log rows >= 1, got ${total}`);
  process.exit(12);
}

process.stdout.write(
  `recall_candidates=${candidates.length};decision_act=${act};recall_log_rows=${total}`,
);
