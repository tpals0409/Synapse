// Sprint 5 receipt — Bridge candidate fixture (stub-only, Ollama/DB 비의존).
//
// 호출:
//   node --experimental-strip-types sprint5-bridge.mjs
//   → fixture (3 noun 그래프 A-B / B-C edges) → seedA → bridge=C 발견 (B 매개).
//   → exit 0 + stdout: "bridge_count=<n>;bridge_id=<id>;via=<viaId>;depth=<d>"
//
// 그래프 (무방향):
//     A ——(co_occur,0.8)—— B ——(co_occur,0.6)—— C
//   seed = A
//   1-hop = {B}
//   2-hop = traverse(B, 1) = {A, C}
//     - A 제외 (seed),
//     - C: oneHopIds 미포함 → bridge.
//   score = middle.weight × far.weight = 0.8 × 0.6 = 0.48.
//
// stub TraverseFn 시그니처 = HyperTraverseFn = (db, conceptId, depth) → Promise<HyperTraverseHit[]>
// HyperTraverseHit = {id, label, weight, kind} — engine T3 가 박은 시그니처 그대로.
// hyperRecall.bridgeCandidates 는 내부에서 depth=1 두 번만 호출 (2-hop BFS = 1-hop chain).
//
// fixture 결정성 (carry-over 9 / D-S4-recall-fixture-threshold-zero 패턴):
//   - stub TraverseFn 으로 그래프 합성 → embedding 0 hits.
//   - score 결정성 = bridgeCandidates 내부 (score desc, 동률 시 conceptId asc).

// hyperRecall 3 함수는 engine root index 가 re-export 해야 정합 (SoT = package.json
// exports). 본 fixture 는 해당 외부 contract 를 검증하는 가드 — root re-export 누락 시
// 즉시 실패하여 engine 워커에게 신호.
const engine = await import('@synapse/engine');

if (typeof engine.bridgeCandidates !== 'function') {
  console.error('engine.bridgeCandidates 미export from @synapse/engine root index');
  console.error('  → engine T3 워커: index.ts 에 hyperRecall 3 함수 + 신규 type re-export 추기 필요.');
  process.exit(2);
}

// 무방향 인접 (양방향 entry).
const adj = new Map([
  ['A', [{ id: 'B', label: 'B-label', weight: 0.8, kind: 'co_occur' }]],
  ['B', [
    { id: 'A', label: 'A-label', weight: 0.8, kind: 'co_occur' },
    { id: 'C', label: 'C-label', weight: 0.6, kind: 'co_occur' },
  ]],
  ['C', [{ id: 'B', label: 'B-label', weight: 0.6, kind: 'co_occur' }]],
]);

const stubTraverse = async (_db, conceptId, depth) => {
  if (depth !== 1) {
    throw new Error(`bridge fixture stub: depth=${depth} 미지원 (1-hop 만 호출되어야 함)`);
  }
  return adj.get(conceptId) ?? [];
};

let bridges;
try {
  bridges = await engine.bridgeCandidates('A', {
    db: null,
    traverse: stubTraverse,
  });
} catch (err) {
  console.error(`bridgeCandidates threw: ${err?.message || err}`);
  process.exit(3);
}

if (!Array.isArray(bridges)) {
  console.error(`expected array, got ${typeof bridges}`);
  process.exit(4);
}

if (bridges.length < 1) {
  console.error(`expected bridge_count >= 1, got ${bridges.length}`);
  process.exit(5);
}

const top = bridges[0];
if (top.conceptId !== 'C') {
  console.error(`expected bridge[0].conceptId='C', got '${top.conceptId}'`);
  process.exit(6);
}
if (top.viaConceptId !== 'B') {
  console.error(`expected bridge[0].viaConceptId='B', got '${top.viaConceptId}'`);
  process.exit(7);
}
if (top.source !== 'bridge') {
  console.error(`expected source='bridge', got '${top.source}'`);
  process.exit(8);
}
if (top.depth !== 2) {
  console.error(`expected depth=2, got ${top.depth}`);
  process.exit(9);
}

// score = 0.8 * 0.6 = 0.48 (부동소수 허용).
if (Math.abs(top.score - 0.48) > 1e-6) {
  console.error(`expected score≈0.48, got ${top.score}`);
  process.exit(10);
}

// depth < 2 가드 검증 — depth=1 호출 시 빈 배열.
const guard = await engine.bridgeCandidates('A', {
  db: null,
  traverse: stubTraverse,
  depth: 1,
});
if (!Array.isArray(guard) || guard.length !== 0) {
  console.error(`depth=1 가드 실패 — expected []. got=${JSON.stringify(guard)}`);
  process.exit(11);
}

process.stdout.write(
  `bridge_count=${bridges.length};bridge_id=${top.conceptId};via=${top.viaConceptId};depth=${top.depth}`,
);
