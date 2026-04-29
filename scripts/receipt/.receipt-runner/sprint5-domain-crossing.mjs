// Sprint 5 receipt — DomainCrossing candidate fixture (stub-only, Ollama/DB 비의존).
//
// 호출:
//   node --experimental-strip-types sprint5-domain-crossing.mjs
//   → fixture (seed 의 1-hop 중 같은 노드가 'co_occur' + 'semantic' 두 kind 모두로 연결) →
//     domainCrossingCandidates ≥ 1, 비대칭 score (semantic 가중치 > co_occur 가중치).
//   → exit 0 + stdout: "domain_crossing_count=<n>;top_id=<id>;edgeFrom=<k>;edgeTo=<k>;score=<s>"
//
// 그래프 (1-hop 만, depth=1 호출):
//   seed = S
//   neighbors:
//     - X via co_occur, weight 0.7
//     - X via semantic, weight 0.9   ← 같은 X, 두 kind 모두
//     - Y via co_occur, weight 0.5   ← 단일 kind, 제외되어야 함
//     - Z via semantic, weight 0.6   ← 단일 kind, 제외되어야 함
//
// 기대 결과:
//   X 만 등장. score = 0.7 × 0.5 + 0.9 × 1.0 = 0.35 + 0.9 = 1.25
//   edgeKindFrom='co_occur', edgeKindTo='semantic' (hyperRecall 의 결정성 정렬)
//
// fixture 결정성:
//   - stub TraverseFn (depth=1 만 호출되어야 함).
//   - kindWeight default {co_occur: 0.5, semantic: 1.0} 그대로 사용 — 비대칭 강조.

const engine = await import('@synapse/engine');

if (typeof engine.domainCrossingCandidates !== 'function') {
  console.error('engine.domainCrossingCandidates 미export from @synapse/engine root index');
  console.error('  → engine T3 워커: index.ts 에 hyperRecall 3 함수 + 신규 type re-export 추기 필요.');
  process.exit(2);
}

const stubTraverse = async (_db, conceptId, depth) => {
  if (depth !== 1) {
    throw new Error(`domain-crossing fixture stub: depth=${depth} 미지원`);
  }
  if (conceptId !== 'S') return [];
  return [
    { id: 'X', label: 'X-label', weight: 0.7, kind: 'co_occur' },
    { id: 'X', label: 'X-label', weight: 0.9, kind: 'semantic' },
    { id: 'Y', label: 'Y-label', weight: 0.5, kind: 'co_occur' },
    { id: 'Z', label: 'Z-label', weight: 0.6, kind: 'semantic' },
  ];
};

let cands;
try {
  cands = await engine.domainCrossingCandidates('S', {
    db: null,
    traverse: stubTraverse,
  });
} catch (err) {
  console.error(`domainCrossingCandidates threw: ${err?.message || err}`);
  process.exit(3);
}

if (!Array.isArray(cands)) {
  console.error(`expected array, got ${typeof cands}`);
  process.exit(4);
}

if (cands.length < 1) {
  console.error(`expected domain_crossing_count >= 1, got ${cands.length}`);
  process.exit(5);
}

// 단일 kind 노드 (Y, Z) 가 결과에 포함되면 안 됨.
const ids = new Set(cands.map((c) => c.conceptId));
if (ids.has('Y') || ids.has('Z')) {
  console.error(`단일 kind 노드 (Y/Z) 가 결과에 포함됨: ${JSON.stringify(cands)}`);
  process.exit(6);
}

const top = cands.find((c) => c.conceptId === 'X');
if (!top) {
  console.error(`expected X candidate, got ${JSON.stringify(cands)}`);
  process.exit(7);
}
if (top.source !== 'domain_crossing') {
  console.error(`expected top.source='domain_crossing', got '${top.source}'`);
  process.exit(8);
}
if (top.edgeKindFrom !== 'co_occur') {
  console.error(`expected edgeKindFrom='co_occur', got '${top.edgeKindFrom}'`);
  process.exit(9);
}
if (top.edgeKindTo !== 'semantic') {
  console.error(`expected edgeKindTo='semantic', got '${top.edgeKindTo}'`);
  process.exit(10);
}

// score = 0.7 * 0.5 + 0.9 * 1.0 = 1.25 (부동소수 허용).
const expected = 0.7 * 0.5 + 0.9 * 1.0;
if (Math.abs(top.score - expected) > 1e-6) {
  console.error(`expected score≈${expected}, got ${top.score}`);
  process.exit(11);
}

process.stdout.write(
  `domain_crossing_count=${cands.length};top_id=${top.conceptId};edgeFrom=${top.edgeKindFrom};edgeTo=${top.edgeKindTo};score=${top.score}`,
);
