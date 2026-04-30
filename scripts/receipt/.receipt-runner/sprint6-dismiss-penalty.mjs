// Sprint 6 receipt — orchestrator.applyDismiss + storage markDismissed + decayEdgeWeight 검증.
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types sprint6-dismiss-penalty.mjs
//   → fixture (concepts X/Y, edge X-Y weight 0.8, recall_log row with candidate_ids=[X,Y])
//   → applyDismiss(rid, [X,Y], {markDismissed, decayEdges: penalty=0.5, pruneEdgesBelow})
//   → 검증:
//       (1) edges.weight = 0.8 * 0.5 = 0.4 (decayEdgeWeight)
//       (2) recall_log.dismissed_concept_ids = '["X","Y"]' (sorted JSON)
//       (3) applyDismiss return: decayed >= 1
//       (4) prune 호출 정상 (낮은 임계 미만 edge 0 — pruned=0 정상)
//   → exit 0 + stdout: "decayed=<n>;edge_weight=<w>;dismissed_ids=<json>;pruned=<p>"
//
// 외부 contract 가드 (carry-over feedback_receipt_external_contract):
//   storage.markDismissed / storage.decayEdgeWeight / storage.pruneEdgesBelow / orchestrator.applyDismiss
//   가 root index 에서 export 되는지 첫 import 단계에서 자동 실패.

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');
const orchestrator = await import('@synapse/orchestrator');

if (typeof storage.markDismissed !== 'function') {
  console.error('storage.markDismissed 미export from @synapse/storage root index');
  process.exit(3);
}
if (typeof storage.decayEdgeWeight !== 'function') {
  console.error('storage.decayEdgeWeight 미export from @synapse/storage root index');
  process.exit(3);
}
if (typeof storage.pruneEdgesBelow !== 'function') {
  console.error('storage.pruneEdgesBelow 미export from @synapse/storage root index');
  process.exit(3);
}
if (typeof orchestrator.applyDismiss !== 'function') {
  console.error('orchestrator.applyDismiss 미export from @synapse/orchestrator root index');
  process.exit(3);
}

const db = storage.openDb(dbPath);
storage.migrate(db);

const now = Date.now();

// concepts X, Y.
storage.appendConcept(db, { id: 'X', label: 'X-label', createdAt: now });
storage.appendConcept(db, { id: 'Y', label: 'Y-label', createdAt: now });

// edge X-Y weight 0.8 (initial).
storage.appendEdge(db, { fromId: 'X', toId: 'Y', kind: 'co_occur', weight: 0.8 });

// recall_log row (candidate_ids = [X, Y]).
const recallLogId = 'rid-dismiss-test';
storage.appendRecallLog(db, {
  id: recallLogId,
  decided_at: now,
  act: 'suggestion',
  candidate_ids: ['X', 'Y'],
});

// applyDismiss 호출 — markDismissed + decayEdges + pruneEdgesBelow DI.
const conceptIds = ['X', 'Y'];
const result = orchestrator.applyDismiss(recallLogId, conceptIds, {
  markDismissed: (rid, ids) => storage.markDismissed(db, rid, ids),
  // decayEdges 시그니처: (conceptIds, penalty) → void.
  // applyDismiss 는 conceptIds 전체를 한 번에 넘긴다 (페어로 분해 책임은 caller).
  // 본 fixture 는 단일 페어 (X, Y) 만 — 직접 decayEdgeWeight 호출.
  decayEdges: (ids, penalty) => {
    if (ids.length >= 2) {
      storage.decayEdgeWeight(db, ids[0], ids[1], penalty);
    }
  },
  pruneEdgesBelow: (threshold) => storage.pruneEdgesBelow(db, threshold),
  // penalty / pruneThreshold 모두 default (0.5 / 0.05).
});

// (1) edges.weight 검증.
const edgeRow = db
  .prepare('SELECT weight FROM edges WHERE from_id = ? AND to_id = ? AND kind = ?')
  .get('X', 'Y', 'co_occur');
if (!edgeRow) {
  console.error('edge X-Y co_occur missing');
  process.exit(4);
}
const expected = 0.8 * 0.5;
if (Math.abs(edgeRow.weight - expected) > 1e-6) {
  console.error(`expected edge weight ≈ ${expected}, got ${edgeRow.weight}`);
  process.exit(5);
}

// (2) recall_log.dismissed_concept_ids 검증.
const logRow = db
  .prepare('SELECT dismissed_concept_ids FROM recall_log WHERE id = ?')
  .get(recallLogId);
if (!logRow) {
  console.error(`recall_log row missing: ${recallLogId}`);
  process.exit(6);
}
const dismissedJson = logRow.dismissed_concept_ids ?? '';
let dismissedIds;
try {
  dismissedIds = JSON.parse(dismissedJson);
} catch (err) {
  console.error(`dismissed_concept_ids invalid JSON: ${dismissedJson}`);
  process.exit(7);
}
if (!Array.isArray(dismissedIds) || dismissedIds.length !== 2) {
  console.error(`expected 2 dismissed ids, got ${JSON.stringify(dismissedIds)}`);
  process.exit(8);
}
if (dismissedIds[0] !== 'X' || dismissedIds[1] !== 'Y') {
  console.error(`expected sorted ['X','Y'], got ${JSON.stringify(dismissedIds)}`);
  process.exit(9);
}

// (3) applyDismiss return — decayed >= 1.
if (typeof result.decayed !== 'number' || result.decayed < 1) {
  console.error(`expected result.decayed >= 1, got ${result.decayed}`);
  process.exit(10);
}

// (4) prune 호출 정상 — weight=0.4 > 0.05 default 임계 → pruned=0.
if (typeof result.pruned !== 'number' || result.pruned < 0) {
  console.error(`expected result.pruned >= 0, got ${result.pruned}`);
  process.exit(11);
}

process.stdout.write(
  `decayed=${result.decayed};edge_weight=${edgeRow.weight.toFixed(4)};dismissed_ids=${dismissedJson};pruned=${result.pruned}`,
);
