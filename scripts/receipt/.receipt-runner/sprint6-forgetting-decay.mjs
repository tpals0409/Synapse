// Sprint 6 receipt — engine.decayScore 단조 감쇠 + storage.decayWeights edge weight
// 단조 감쇠 + recordTouch last_used_at 갱신 검증 (stub-only).
//
// 호출:
//   SYNAPSE_DB_PATH=/tmp/foo.db node --experimental-strip-types sprint6-forgetting-decay.mjs
//   → (1) engine.decayScore: ageMs ∈ {0, h/2, h, 2h, 4h} 시 score 단조 감소 + half-life 정확
//        (decayScore(s, h, h) = s/2)
//      (2) storage.decayWeights: edges 3 종 (last_used_at = now/now-h/now-3h) 적용 후
//        weight 단조 감소 + 결정성 (재실행 멱등성 정합)
//      (3) storage.recordTouch: concept last_used_at 갱신 검증 (전 0, 후 now)
//   → exit 0 + stdout: "decay_steps=<n>;monotone=true;halflife_exact=true;edge_decayed=<n>;touched=true"
//
// 외부 contract 가드: storage.decayWeights / storage.recordTouch / engine.decayScore /
// engine.DEFAULT_HALF_LIFE_MS root index export.

const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) {
  console.error('SYNAPSE_DB_PATH unset');
  process.exit(2);
}

const storage = await import('@synapse/storage');
const engine = await import('@synapse/engine');

if (typeof engine.decayScore !== 'function') {
  console.error('engine.decayScore 미export from @synapse/engine root index');
  process.exit(3);
}
if (typeof engine.DEFAULT_HALF_LIFE_MS !== 'number') {
  console.error('engine.DEFAULT_HALF_LIFE_MS 미export from @synapse/engine root index');
  process.exit(3);
}
if (typeof storage.decayWeights !== 'function') {
  console.error('storage.decayWeights 미export from @synapse/storage root index');
  process.exit(3);
}
if (typeof storage.recordTouch !== 'function') {
  console.error('storage.recordTouch 미export from @synapse/storage root index');
  process.exit(3);
}

// (1) engine.decayScore 단조 + half-life 정확.
const halfLife = engine.DEFAULT_HALF_LIFE_MS;
const baseScore = 1.0;
const ages = [0, halfLife / 2, halfLife, 2 * halfLife, 4 * halfLife];
const decays = ages.map((age) => engine.decayScore(baseScore, age, halfLife));

// 단조 감소 검증.
let monotone = true;
for (let i = 1; i < decays.length; i += 1) {
  if (decays[i] >= decays[i - 1]) {
    monotone = false;
    break;
  }
}
if (!monotone) {
  console.error(`decayScore not monotone: ${JSON.stringify(decays)}`);
  process.exit(4);
}

// half-life 정확 검증 — decayScore(1, halfLife, halfLife) === 0.5.
if (Math.abs(decays[2] - 0.5) > 1e-9) {
  console.error(`decayScore at half-life expected 0.5, got ${decays[2]}`);
  process.exit(5);
}

// 2x half-life → 0.25.
if (Math.abs(decays[3] - 0.25) > 1e-9) {
  console.error(`decayScore at 2x half-life expected 0.25, got ${decays[3]}`);
  process.exit(6);
}

// (2) storage.decayWeights — edges 3 종 적재 후 감쇠.
const db = storage.openDb(dbPath);
storage.migrate(db);

const now = 10_000_000_000; // 결정성용 fixed timestamp.
storage.appendConcept(db, { id: 'F1', label: 'F1', createdAt: now });
storage.appendConcept(db, { id: 'F2', label: 'F2', createdAt: now });
storage.appendConcept(db, { id: 'F3', label: 'F3', createdAt: now });
storage.appendConcept(db, { id: 'F4', label: 'F4', createdAt: now });

storage.appendEdge(db, { fromId: 'F1', toId: 'F2', kind: 'co_occur', weight: 1.0 });
storage.appendEdge(db, { fromId: 'F2', toId: 'F3', kind: 'co_occur', weight: 1.0 });
storage.appendEdge(db, { fromId: 'F3', toId: 'F4', kind: 'co_occur', weight: 1.0 });

// 직접 SQL UPDATE 로 last_used_at 설정 — recordTouch 는 concepts 만, edges 는 별도 fixture
// (decayWeights 는 edges.last_used_at 을 본다).
const setEdgeLastUsed = db.prepare(
  'UPDATE edges SET last_used_at = ? WHERE from_id = ? AND to_id = ?',
);
setEdgeLastUsed.run(now, 'F1', 'F2'); // age = 0 → 변동 0
setEdgeLastUsed.run(now - halfLife, 'F2', 'F3'); // age = halfLife → weight * 0.5
setEdgeLastUsed.run(now - 3 * halfLife, 'F3', 'F4'); // age = 3 halfLife → weight * 0.125

const decayResult = storage.decayWeights(db, { now, halfLifeMs: halfLife });
if (decayResult.decayed < 2) {
  console.error(`decayWeights expected decayed >= 2, got ${decayResult.decayed}`);
  process.exit(7);
}

// edges 단조성 검증 — F1-F2 (변동 0) > F2-F3 (~0.5) > F3-F4 (~0.125).
const edgeRows = db
  .prepare('SELECT from_id, to_id, weight FROM edges ORDER BY from_id ASC, to_id ASC')
  .all();
if (edgeRows.length !== 3) {
  console.error(`expected 3 edges, got ${edgeRows.length}`);
  process.exit(8);
}
const w12 = edgeRows.find((r) => r.from_id === 'F1' && r.to_id === 'F2')?.weight;
const w23 = edgeRows.find((r) => r.from_id === 'F2' && r.to_id === 'F3')?.weight;
const w34 = edgeRows.find((r) => r.from_id === 'F3' && r.to_id === 'F4')?.weight;

if (Math.abs(w12 - 1.0) > 1e-9) {
  console.error(`F1-F2 expected weight=1.0 (no decay), got ${w12}`);
  process.exit(9);
}
if (Math.abs(w23 - 0.5) > 1e-6) {
  console.error(`F2-F3 expected weight≈0.5 (half-life decay), got ${w23}`);
  process.exit(10);
}
if (Math.abs(w34 - 0.125) > 1e-6) {
  console.error(`F3-F4 expected weight≈0.125 (3-half-life decay), got ${w34}`);
  process.exit(11);
}
if (!(w12 > w23 && w23 > w34)) {
  console.error(`monotone violation: w12=${w12} w23=${w23} w34=${w34}`);
  process.exit(12);
}

// (3) recordTouch — F1 의 last_used_at 갱신 검증.
const conceptF1Before = db
  .prepare('SELECT last_used_at FROM concepts WHERE id = ?')
  .get('F1');
if (conceptF1Before.last_used_at !== 0) {
  console.error(`F1 last_used_at expected 0 (default), got ${conceptF1Before.last_used_at}`);
  process.exit(13);
}
storage.recordTouch(db, 'F1', now);
const conceptF1After = db
  .prepare('SELECT last_used_at FROM concepts WHERE id = ?')
  .get('F1');
if (conceptF1After.last_used_at !== now) {
  console.error(`F1 last_used_at expected ${now}, got ${conceptF1After.last_used_at}`);
  process.exit(14);
}

process.stdout.write(
  `decay_steps=${decays.length};monotone=true;halflife_exact=true;edge_decayed=${decayResult.decayed};touched=true`,
);
