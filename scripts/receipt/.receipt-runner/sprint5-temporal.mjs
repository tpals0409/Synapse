// Sprint 5 receipt — Temporal candidate fixture (stub-only, graph 비의존).
//
// 호출:
//   node --experimental-strip-types sprint5-temporal.mjs
//   → fixture (RecallLogRow 묶음, 24h 윈도우 안 같은 시기 conceptId 묶음) →
//     temporalCandidates ≥ 1, top 의 coDecidedIds 비어있지 않음.
//   → exit 0 + stdout: "temporal_count=<n>;top_id=<id>;top_score=<s>;codecided=<m>"
//
// 시나리오:
//   t0 = 2026-04-29 12:00:00 (Date.now() 사용, 절대값 의존 없음)
//   row1 = {decided_at: t0,           candidate_ids: ['x', 'y']}
//   row2 = {decided_at: t0 - 1h,      candidate_ids: ['x', 'z']}
//   row3 = {decided_at: t0 - 30 days, candidate_ids: ['old']}    // 윈도우 밖
//
//   결과 (windowMs = 24h 기본):
//     x → 2 hit → score=0.7 (hyperRecall scoreFor: 2 → 0.7), coDecidedIds={'y','z'} (sort)
//     y → 1 hit → score=0.4, coDecidedIds={'x'}
//     z → 1 hit → score=0.4, coDecidedIds={'x'}
//     old → 윈도우 밖 → 제외.
//
// 정렬 (score desc, conceptId asc) → top = x.
//
// fixture 결정성 (carry-over 9 패턴):
//   - 합성 RecallLogRow → DB / 외부 시계 의존 X.
//   - hyperRecall 의 `now = max(decided_at)` 정책 → 외부 시계와 무관, 입력만으로 결정성.

const engine = await import('@synapse/engine');

if (typeof engine.temporalCandidates !== 'function') {
  console.error('engine.temporalCandidates 미export from @synapse/engine root index');
  console.error('  → engine T3 워커: index.ts 에 hyperRecall 3 함수 + 신규 type re-export 추기 필요.');
  process.exit(2);
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const t0 = Date.now();

const rows = [
  {
    id: 'r-temp-1',
    decided_at: t0,
    act: 'ghost',
    candidate_ids: ['x', 'y'],
  },
  {
    id: 'r-temp-2',
    decided_at: t0 - 1 * HOUR,
    act: 'suggestion',
    candidate_ids: ['x', 'z'],
  },
  {
    id: 'r-temp-3',
    decided_at: t0 - 30 * DAY, // 윈도우 밖
    act: 'silence',
    candidate_ids: ['old'],
  },
];

let cands;
try {
  cands = await engine.temporalCandidates({
    db: null,
    recentDecisions: rows,
  });
} catch (err) {
  console.error(`temporalCandidates threw: ${err?.message || err}`);
  process.exit(3);
}

if (!Array.isArray(cands)) {
  console.error(`expected array, got ${typeof cands}`);
  process.exit(4);
}

if (cands.length < 1) {
  console.error(`expected temporal_count >= 1, got ${cands.length}`);
  process.exit(5);
}

// 'old' 가 들어있으면 안 됨 (윈도우 밖).
if (cands.some((c) => c.conceptId === 'old')) {
  console.error(`'old' candidate 가 24h 윈도우 밖인데 결과에 포함됨: ${JSON.stringify(cands)}`);
  process.exit(6);
}

const top = cands[0];
if (top.conceptId !== 'x') {
  console.error(`expected top.conceptId='x' (2 hit), got '${top.conceptId}' raw=${JSON.stringify(cands)}`);
  process.exit(7);
}
if (top.source !== 'temporal') {
  console.error(`expected top.source='temporal', got '${top.source}'`);
  process.exit(8);
}
// hyperRecall scoreFor: 2 hit → 0.7
if (Math.abs(top.score - 0.7) > 1e-6) {
  console.error(`expected top.score≈0.7 (2-hit), got ${top.score}`);
  process.exit(9);
}
if (!Array.isArray(top.coDecidedIds) || top.coDecidedIds.length < 1) {
  console.error(`expected top.coDecidedIds non-empty, got ${JSON.stringify(top.coDecidedIds)}`);
  process.exit(10);
}
// y / z 모두 등장해야 함 (정렬은 sort asc).
const expectedCo = ['y', 'z'];
if (
  top.coDecidedIds.length !== expectedCo.length ||
  top.coDecidedIds.some((v, i) => v !== expectedCo[i])
) {
  console.error(`expected coDecidedIds=['y','z'] sorted, got ${JSON.stringify(top.coDecidedIds)}`);
  process.exit(11);
}

// windowMs 명시 — 외부 시계 의존 0 검증.
if (top.windowMs !== 24 * 60 * 60 * 1000) {
  console.error(`expected top.windowMs=24h, got ${top.windowMs}`);
  process.exit(12);
}

// empty 입력 가드.
const empty = await engine.temporalCandidates({ db: null, recentDecisions: [] });
if (!Array.isArray(empty) || empty.length !== 0) {
  console.error(`empty 입력 가드 실패 — expected []. got=${JSON.stringify(empty)}`);
  process.exit(13);
}

process.stdout.write(
  `temporal_count=${cands.length};top_id=${top.conceptId};top_score=${top.score};codecided=${top.coDecidedIds.length}`,
);
