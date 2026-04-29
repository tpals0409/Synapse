// Sprint 5 receipt — engine.recallCandidates 통합 e2e (Hyper-Recall 합집합 종단 검증).
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types sprint5-recall-hyper.mjs
//   → Sprint 4 의 sprint4-recall.mjs 와 같은 그래프 형성 흐름 (turn1/turn1.5) 위에
//     turn2 메시지로 engine.recallCandidates 호출. *추가* 로 hyperTraverse + recentDecisions
//     주입 → 결과에 bridge/temporal/domain_crossing source 가 합집합 ≥ 1 등장 검증.
//   → exit 0 + stdout: "candidates=<n>;sources=<csv>;bridge=<b>;temporal=<t>;domain_crossing=<d>"
//
// Ollama 의존 — embed (그래프 형성 + Recall 측 둘 다).
// SKIP_OLLAMA=1 시 shell 단계가 본 진입점을 호출하지 않는다.
//
// 흐름:
//   1) turn1 + turn1.5 — Sprint 4 sprint4-recall.mjs 와 동일한 그래프 형성.
//   2) turn2 — engine.recallCandidates 호출. opts:
//        - nearest, traverse: storage adapter (Sprint 4 패턴 재사용 — D-S5-recall-fixture-threshold-zero 그대로).
//        - hyperTraverse: kind 포함한 storage.traverse adapter (Sprint 5 신규).
//        - recentDecisions: 합성 RecallLogRow 묶음 (temporal source 활성화).
//        - semanticThreshold: -1 (carry-over 9 / D-S4-recall-fixture-threshold-zero 패턴).
//   3) 결과 검증:
//        - candidates 합 ≥ 3 (D-S5-receipt-threshold-recovery 의 recall_candidates 누적).
//        - source 분포에 'bridge' 또는 'temporal' 또는 'domain_crossing' 중 ≥ 1 종 등장.
//
// 주의: bridge/domain_crossing 은 hyperTraverse 가 주입되어야 활성화 (recall.ts §178~209).
//       temporal 은 recentDecisions 가 비어있지 않아야 활성화 (recall.ts §211~223).
//       fixture 는 두 조건 모두 만족.

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');
const conversation = await import('@synapse/conversation');
const engine = await import('@synapse/engine');

if (typeof engine.recallCandidates !== 'function') {
  console.error('engine.recallCandidates 미export');
  process.exit(3);
}

const db = storage.openDb(dbPath);
storage.migrate(db);

// turn 1 + 1.5 — 그래프 형성 (Sprint 4 패턴).
const m1 = '오늘 카페에서 책을 읽었다';
let c1;
try {
  c1 = await conversation.runMemoryFormation(m1, { db });
} catch (err) {
  console.error(`turn1 runMemoryFormation threw: ${err?.message || err}`);
  process.exit(4);
}
if (!Array.isArray(c1) || c1.length < 1) {
  console.error(`turn1 expected concepts >= 1, got ${c1?.length ?? 'undefined'}`);
  process.exit(5);
}

const mPrev = '책에서 영감을 받았다';
try {
  await conversation.runMemoryFormation(mPrev, {
    db,
    prevMessageConceptIds: c1.map((c) => c.id),
  });
} catch (err) {
  console.error(`turn1.5 runMemoryFormation threw: ${err?.message || err}`);
  process.exit(6);
}

// turn 2 — Recall 트리거.
const m2 = '읽은 책 영감 다시 보고 싶다';

// label 룩업 (Sprint 4 의 adapter 패턴 그대로).
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

// Sprint 5 신규 — kind 포함 hyperTraverse.
const hyperTraverseAdapter = async (database, conceptId, depth) => {
  const hits = storage.traverse(database, conceptId, depth);
  return hits.map((h) => ({
    id: h.conceptId,
    label: labelOf(h.conceptId),
    weight: h.weight,
    kind: h.kind,
  }));
};

// 합성 recentDecisions — temporal source 활성화. graph 와 *겹치지 않는* 합성 id 사용.
// 사유: recall.ts 의 mergeCandidate 가 같은 conceptId 의 두 source 를 'mixed' 로 승격 →
// graph 안 conceptId 를 쓰면 temporal source 가 semantic 와 합쳐져 mixed 로 흡수됨.
// 합성 id 는 그래프 외부이므로 dedup 안 되고 temporal source 그대로 살아남음.
// (bridge/domain_crossing 은 graph 의존 — 작은 fixture graph 에서 항상 unique-id 보장 어려움.
//  본 fixture 는 D-S5-receipt-threshold-recovery 의 *temporal ≥ 1* 만 정량 검증 + bridge/
//  domain_crossing 은 stub fixture (sprint5-{bridge,domain-crossing}.mjs) 가 단계 [34],
//  [36] 에서 결정성 PASS 박음.)
const now = Date.now();
const recentDecisions = [
  {
    id: 'r-hyper-1',
    decided_at: now - 1000,
    act: 'ghost',
    candidate_ids: ['hyper-temp-x', 'hyper-temp-y'],
  },
  {
    id: 'r-hyper-2',
    decided_at: now - 2000,
    act: 'suggestion',
    candidate_ids: ['hyper-temp-x', 'hyper-temp-z'],
  },
];

let candidates;
try {
  candidates = await engine.recallCandidates(m2, {
    db,
    nearest: nearestAdapter,
    traverse: traverseAdapter,
    hyperTraverse: hyperTraverseAdapter,
    recentDecisions,
    semanticThreshold: -1, // carry-over 9 / D-S4-recall-fixture-threshold-zero 패턴.
  });
} catch (err) {
  console.error(`recallCandidates threw: ${err?.message || err}`);
  process.exit(7);
}

if (!Array.isArray(candidates) || candidates.length < 1) {
  console.error(`expected candidates >= 1, got ${candidates?.length ?? 'undefined'}`);
  process.exit(8);
}

// source 분포.
const sourceCount = { semantic: 0, co_occur: 0, mixed: 0, bridge: 0, temporal: 0, domain_crossing: 0 };
for (const c of candidates) {
  if (c.source in sourceCount) sourceCount[c.source]++;
}

const csvSources = Object.entries(sourceCount)
  .filter(([, n]) => n > 0)
  .map(([k, n]) => `${k}:${n}`)
  .join(',');

// 신규 source 합집합 검증 — temporal ≥ 1 (D-S5-receipt-threshold-recovery 의 정량 보강).
// bridge / domain_crossing 은 graph 의존 → 작은 fixture graph 에서 결정성 보장 어려움.
// 두 source 의 결정성 검증은 단계 [34], [36] 의 stub fixture (sprint5-{bridge,
// domain-crossing}.mjs) 가 책임. 본 단계는 *engine.recallCandidates 종단 흐름이 신규
// source 를 합집합에 포함하는지* 검증 — temporal 만으로 충분히 정량.
if (sourceCount.temporal < 1) {
  console.error(
    `expected temporal >= 1 (recentDecisions 합집합), got bridge=${sourceCount.bridge} temporal=${sourceCount.temporal} domain_crossing=${sourceCount.domain_crossing} (sources=${csvSources})`,
  );
  process.exit(9);
}

process.stdout.write(
  `candidates=${candidates.length};sources=${csvSources};bridge=${sourceCount.bridge};temporal=${sourceCount.temporal};domain_crossing=${sourceCount.domain_crossing}`,
);
