import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openDb,
  migrate,
  seedFullJourney,
  nearestConcepts,
  traverse as storageTraverse,
  getLastUsedAt as storageGetLastUsedAt,
  recordTouch as storageRecordTouch,
  type Database,
  type FullJourneyFixture,
} from '@synapse/storage';
import {
  recallCandidates,
  DEFAULT_HALF_LIFE_MS,
  DEFAULT_DISMISS_PENALTY,
  type EmbedFn,
  type NearestRecallFn,
  type TraverseFn,
  type GetLastUsedAtFn,
  type RecordTouchFn,
} from '../index.ts';
import type { HyperTraverseFn } from '../src/hyperRecall.ts';

// [Sprint 7 T8 — recall-full-journey 결정성 재확인]
// storage T10 seedFullJourney (FROZEN D-S7-storage-seedFullJourney-shape) 위에
// engine recallCandidates 의 Sprint 6 frozen 동작 검증:
//   accumulate → forgetting decay → dismiss penalty → recordTouch (semantic hit only).
//
// 신규 src 0 — 검증 위주. recall.ts 는 Sprint 6 그대로.

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-engine-fj-'));
  const path = join(dir, 'test.db');
  const db = openDb(path);
  migrate(db);
  return {
    db,
    cleanup: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

// chatStore.ts 의 adapter 1:1 복제 (D-S5-mobile-T6-label-direct).
// storage shape ↔ engine shape 차이: storage.traverse 의 conceptId → engine TraverseHit 의 id.
const nearest: NearestRecallFn = async (db, vec, k) => {
  const hits = await nearestConcepts(db as Database, vec, k);
  return hits.map((h) => ({ id: h.id, label: h.label, score: h.score }));
};

const traverse: TraverseFn = async (db, conceptId, depth) => {
  const hits = storageTraverse(db as Database, conceptId, depth);
  return hits.map((h) => ({ id: h.conceptId, label: h.label, weight: h.weight }));
};

const hyperTraverse: HyperTraverseFn = async (db, conceptId, depth) => {
  const hits = storageTraverse(db as Database, conceptId, depth);
  return hits.map((h) => ({
    id: h.conceptId,
    label: h.label,
    weight: h.weight,
    kind: h.kind,
  }));
};

const getLastUsedAt: GetLastUsedAtFn = (db, conceptId) =>
  storageGetLastUsedAt(db as Database, conceptId);

const recordTouch: RecordTouchFn = (db, conceptId, now) => {
  storageRecordTouch(db as Database, conceptId, now);
};

// fixture.concepts 는 array — label 로 Concept lookup.
function conceptIdByLabel(seed: FullJourneyFixture, label: string): string {
  const c = seed.concepts.find((x) => x.label === label);
  if (!c) throw new Error(`fixture concept not found: ${label}`);
  return c.id;
}

// 시드 결정성: 두 fresh DB → 같은 FullJourneyFixture (frozen literal IDs).
test('seedFullJourney: 두 fresh DB → 같은 FullJourneyFixture (frozen literal IDs)', () => {
  const a = freshDb();
  const b = freshDb();
  const ra = seedFullJourney(a.db);
  const rb = seedFullJourney(b.db);
  a.cleanup();
  b.cleanup();
  assert.equal(ra.now, rb.now);
  assert.equal(ra.advancedNow, rb.advancedNow);
  assert.equal(ra.advancedNow - ra.now, DEFAULT_HALF_LIFE_MS);
  assert.deepEqual(
    ra.concepts.map((c) => c.id),
    rb.concepts.map((c) => c.id),
  );
  assert.deepEqual(
    [...ra.dismissedConceptIds].sort(),
    [...rb.dismissedConceptIds].sort(),
  );
  assert.deepEqual(ra.recentDecisions, rb.recentDecisions);
});

// recall L1~L3 + hyper-recall 결정성 — jazz seed query, T+0 시점 두 번 호출 → 같은 score 순서.
test('recallCandidates Sprint 7 T8: jazz seed @ T+0 두 번 실행 → 같은 결과 순서 (결정성)', async () => {
  const fx = freshDb();
  try {
    const seed = seedFullJourney(fx.db);
    const jazzVec = makeEmbed('jazz');
    const embed: EmbedFn = async () => jazzVec;
    const idJazz = conceptIdByLabel(seed, 'jazz');

    const optsBase = {
      db: fx.db,
      embed,
      nearest,
      traverse,
      hyperTraverse,
      recentDecisions: seed.recentDecisions,
      now: seed.now,
      semanticThreshold: 0.5,
    };
    const out1 = await recallCandidates('jazz?', optsBase);
    const out2 = await recallCandidates('jazz?', optsBase);
    assert.deepEqual(
      out1.map((c) => ({ id: c.conceptId, src: c.source, score: c.score })),
      out2.map((c) => ({ id: c.conceptId, src: c.source, score: c.score })),
    );
    const jazz = out1.find((c) => c.conceptId === idJazz);
    assert.ok(jazz, 'jazz 는 결과에 포함되어야 한다');
    assert.ok(
      jazz!.source === 'semantic' || jazz!.source === 'mixed',
      `jazz source 는 semantic|mixed 여야 한다 (실제=${jazz!.source})`,
    );
  } finally {
    fx.cleanup();
  }
});

// dismiss penalty: fixture.dismissedConceptIds (=[jazz]) → jazz score *= DEFAULT_DISMISS_PENALTY.
test('recallCandidates Sprint 7 T8: fixture.dismissedConceptIds @ T+0 → jazz score *= 0.5', async () => {
  const fx = freshDb();
  try {
    const seed = seedFullJourney(fx.db);
    const jazzVec = makeEmbed('jazz');
    const embed: EmbedFn = async () => jazzVec;
    const idJazz = conceptIdByLabel(seed, 'jazz');

    const baseOpts = {
      db: fx.db,
      embed,
      nearest,
      traverse,
      hyperTraverse,
      recentDecisions: seed.recentDecisions,
      now: seed.now,
      semanticThreshold: 0.5,
    };

    const before = await recallCandidates('jazz?', baseOpts);
    const after = await recallCandidates('jazz?', {
      ...baseOpts,
      dismissedConceptIds: seed.dismissedConceptIds,
    });

    const jazzBefore = before.find((c) => c.conceptId === idJazz)!;
    const jazzAfter = after.find((c) => c.conceptId === idJazz)!;
    assert.ok(
      seed.dismissedConceptIds.has(idJazz),
      'fixture 에 jazz 가 dismissed 로 박혀있어야 함',
    );
    assert.ok(
      Math.abs(jazzAfter.score - jazzBefore.score * DEFAULT_DISMISS_PENALTY) < 1e-9,
      `jazz dismiss penalty: before=${jazzBefore.score} after=${jazzAfter.score} ratio≠${DEFAULT_DISMISS_PENALTY}`,
    );
    const others = before.filter((c) => c.conceptId !== idJazz);
    for (const o of others) {
      const same = after.find((c) => c.conceptId === o.conceptId);
      if (same) {
        assert.ok(
          Math.abs(same.score - o.score) < 1e-9,
          `non-dismissed ${o.conceptId} score 변동 0 위배: ${o.score} → ${same.score}`,
        );
      }
    }
  } finally {
    fx.cleanup();
  }
});

// forgetting decay: T+7d (advancedNow) + getLastUsedAt → score *= ~0.5.
// fixture jazz 의 last_used_at = now+2000 이라 ageMs ≈ 7d-2s → 0.5^(1-2s/7d) ≈ 0.5.
test('recallCandidates Sprint 7 T8: T+7d + getLastUsedAt → jazz score *= ~0.5 (forgetting decay)', async () => {
  const fx = freshDb();
  try {
    const seed = seedFullJourney(fx.db);
    const jazzVec = makeEmbed('jazz');
    const embed: EmbedFn = async () => jazzVec;
    const idJazz = conceptIdByLabel(seed, 'jazz');

    const baseOpts = {
      db: fx.db,
      embed,
      nearest,
      traverse,
      hyperTraverse,
      recentDecisions: seed.recentDecisions,
      semanticThreshold: 0.5,
    };

    const tZero = await recallCandidates('jazz?', { ...baseOpts, now: seed.now });
    const tSevenD = await recallCandidates('jazz?', {
      ...baseOpts,
      now: seed.advancedNow,
      getLastUsedAt,
    });

    const jazzZero = tZero.find((c) => c.conceptId === idJazz)!;
    const jazzSeven = tSevenD.find((c) => c.conceptId === idJazz)!;
    const ratio = jazzSeven.score / jazzZero.score;
    assert.ok(
      Math.abs(ratio - 0.5) < 0.001,
      `jazz forgetting decay ratio ≠ 0.5 (실제=${ratio}, score zero=${jazzZero.score} seven=${jazzSeven.score})`,
    );
    assert.ok(jazzSeven.score < jazzZero.score, '단조 감소 위배');
  } finally {
    fx.cleanup();
  }
});

// recordTouch: semantic|mixed hit conceptId 의 last_used_at = advancedNow 갱신.
test('recallCandidates Sprint 7 T8: recordTouch DI → semantic hit concept 의 last_used_at 갱신', async () => {
  const fx = freshDb();
  try {
    const seed = seedFullJourney(fx.db);
    const jazzVec = makeEmbed('jazz');
    const embed: EmbedFn = async () => jazzVec;

    const out = await recallCandidates('jazz?', {
      db: fx.db,
      embed,
      nearest,
      traverse,
      hyperTraverse,
      recentDecisions: seed.recentDecisions,
      now: seed.advancedNow,
      semanticThreshold: 0.5,
      recordTouch,
      getLastUsedAt,
    });
    assert.ok(out.length > 0);

    const semanticHits = out.filter(
      (c) => c.source === 'semantic' || c.source === 'mixed',
    );
    assert.ok(semanticHits.length > 0, 'semantic|mixed 후보 ≥ 1');
    let touchedCount = 0;
    for (const h of semanticHits) {
      const lua = storageGetLastUsedAt(fx.db, h.conceptId);
      if (lua === seed.advancedNow) touchedCount += 1;
    }
    assert.ok(
      touchedCount >= 1,
      `semantic|mixed hit 중 ≥ 1개의 last_used_at 가 advancedNow (${seed.advancedNow}) 로 갱신되어야 함 (실제 touched=${touchedCount})`,
    );
  } finally {
    fx.cleanup();
  }
});

// frozen order: forgetting decay → dismiss penalty 합성 = score * 0.5 * 0.5 = 0.25.
test('recallCandidates Sprint 7 T8: T+7d + dismiss=fixture → jazz score 합성 ≈ base * 0.25', async () => {
  const fx = freshDb();
  try {
    const seed = seedFullJourney(fx.db);
    const jazzVec = makeEmbed('jazz');
    const embed: EmbedFn = async () => jazzVec;
    const idJazz = conceptIdByLabel(seed, 'jazz');

    const baseOpts = {
      db: fx.db,
      embed,
      nearest,
      traverse,
      hyperTraverse,
      recentDecisions: seed.recentDecisions,
      semanticThreshold: 0.5,
    };
    const tZero = await recallCandidates('jazz?', { ...baseOpts, now: seed.now });
    const composed = await recallCandidates('jazz?', {
      ...baseOpts,
      now: seed.advancedNow,
      getLastUsedAt,
      dismissedConceptIds: seed.dismissedConceptIds,
    });
    const jazzZero = tZero.find((c) => c.conceptId === idJazz)!;
    const jazzComposed = composed.find((c) => c.conceptId === idJazz)!;
    const ratio = jazzComposed.score / jazzZero.score;
    assert.ok(
      Math.abs(ratio - 0.25) < 0.001,
      `합성 비율 ≠ 0.25 (실제=${ratio}, zero=${jazzZero.score} composed=${jazzComposed.score})`,
    );
  } finally {
    fx.cleanup();
  }
});

// hyper-recall: bridge depth=2 통해 saxophone (jazz→coltrane→saxophone) 또는 1-hop coltrane 도달.
test('recallCandidates Sprint 7 T8: hyper-recall — saxophone 또는 coltrane 합집합 도달', async () => {
  const fx = freshDb();
  try {
    const seed = seedFullJourney(fx.db);
    const jazzVec = makeEmbed('jazz');
    const embed: EmbedFn = async () => jazzVec;
    const idColtrane = conceptIdByLabel(seed, 'coltrane');
    const idSaxophone = conceptIdByLabel(seed, 'saxophone');
    const out = await recallCandidates('jazz?', {
      db: fx.db,
      embed,
      nearest,
      traverse,
      hyperTraverse,
      recentDecisions: seed.recentDecisions,
      now: seed.now,
      semanticThreshold: 0.5,
    });
    const ids = new Set(out.map((c) => c.conceptId));
    assert.ok(
      ids.has(idSaxophone) || ids.has(idColtrane),
      `saxophone 또는 coltrane 중 하나는 결과에 포함되어야 함 (실제=${[...ids].join(',')})`,
    );
  } finally {
    fx.cleanup();
  }
});

// ── helpers ──────────────────────────────────────────────────────────────────
//
// storage seedFullJourney 의 seedEmbedding(label) 알고리즘 1:1 재현.
// 시드와 동일 결과여야 nearest MATCH 가 label concept 를 distance 0 으로 hit.
function makeEmbed(label: string): Float32Array {
  let seed = 0;
  for (let i = 0; i < label.length; i++) {
    seed = (seed + label.charCodeAt(i) * (i + 1)) >>> 0;
  }
  if (seed === 0) seed = 1;
  let state = seed;
  const mulberry32 = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const DIM = 768;
  const vec = new Float32Array(DIM);
  let sumSq = 0;
  for (let i = 0; i < DIM; i++) {
    const v = mulberry32() * 2 - 1;
    vec[i] = v;
    sumSq += v * v;
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < DIM; i++) {
    vec[i] = vec[i]! / norm;
  }
  return vec;
}
