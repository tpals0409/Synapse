import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DecideContext, RecallCandidate } from '@synapse/protocol';
import { decide } from '../src/decide.ts';

function cand(score: number, conceptId = 'c1'): RecallCandidate {
  return { conceptId, label: conceptId, score, source: 'semantic' };
}

function candWith(
  score: number,
  source: RecallCandidate['source'],
  conceptId = 'c1',
): RecallCandidate {
  return { conceptId, label: conceptId, score, source };
}

function ctx(over: Partial<DecideContext> = {}): DecideContext {
  return {
    userMessage: 'hi',
    candidates: [],
    recencyMs: 10_000,
    tokenContext: 100,
    ...over,
  };
}

test('decide: empty candidates → silence', () => {
  assert.equal(decide(ctx({ candidates: [] })), 'silence');
});

test('decide: max score < 0.4 → silence (low-confidence)', () => {
  assert.equal(decide(ctx({ candidates: [cand(0.39)] })), 'silence');
});

test('decide: max score in [0.4, 0.6) → ghost', () => {
  assert.equal(decide(ctx({ candidates: [cand(0.4)] })), 'ghost');
  assert.equal(decide(ctx({ candidates: [cand(0.59)] })), 'ghost');
});

test('decide: max score in [0.6, 0.8) → suggestion', () => {
  assert.equal(decide(ctx({ candidates: [cand(0.6)] })), 'suggestion');
  assert.equal(decide(ctx({ candidates: [cand(0.79)] })), 'suggestion');
});

test('decide: max score >= 0.8 → strong', () => {
  assert.equal(decide(ctx({ candidates: [cand(0.8)] })), 'strong');
  assert.equal(decide(ctx({ candidates: [cand(0.95)] })), 'strong');
});

test('decide: picks max score from multi-candidate', () => {
  assert.equal(
    decide(ctx({ candidates: [cand(0.3, 'a'), cand(0.85, 'b'), cand(0.5, 'c')] })),
    'strong',
  );
});

test('decide: tokenContext > 2000 weakens one step (strong→suggestion)', () => {
  assert.equal(
    decide(ctx({ candidates: [cand(0.9)], tokenContext: 2001 })),
    'suggestion',
  );
});

test('decide: tokenContext > 2000 weakens (ghost→silence)', () => {
  assert.equal(
    decide(ctx({ candidates: [cand(0.4)], tokenContext: 3000 })),
    'silence',
  );
});

test('decide: recencyMs < 1500 weakens one step (suggestion→ghost)', () => {
  assert.equal(
    decide(ctx({ candidates: [cand(0.7)], recencyMs: 500 })),
    'ghost',
  );
});

test('decide: both weaken conditions stack (strong→ghost)', () => {
  assert.equal(
    decide(ctx({ candidates: [cand(0.9)], tokenContext: 2500, recencyMs: 100 })),
    'ghost',
  );
});

test('decide: weakening of silence stays silence', () => {
  assert.equal(
    decide(ctx({ candidates: [cand(0.2)], tokenContext: 5000, recencyMs: 0 })),
    'silence',
  );
});

test('decide: tokenContext exactly 2000 does not weaken (boundary)', () => {
  assert.equal(
    decide(ctx({ candidates: [cand(0.85)], tokenContext: 2000 })),
    'strong',
  );
});

test('decide: recencyMs exactly 1500 does not weaken (boundary)', () => {
  assert.equal(
    decide(ctx({ candidates: [cand(0.85)], recencyMs: 1500 })),
    'strong',
  );
});

// Sprint 5 — D-S5-orchestrator-decide-hyper-source
// weak source (bridge/temporal/domain_crossing) 의 max score 가 결정에 반영되면 1 단계 추가 약화.

test('decide: weak source bridge max → 1 step weakened (strong→suggestion)', () => {
  assert.equal(
    decide(ctx({ candidates: [candWith(0.85, 'bridge', 'b1')] })),
    'suggestion',
  );
});

test('decide: weak source temporal max → 1 step weakened (suggestion→ghost)', () => {
  assert.equal(
    decide(ctx({ candidates: [candWith(0.65, 'temporal', 't1')] })),
    'ghost',
  );
});

test('decide: weak source domain_crossing max → 1 step weakened (ghost→silence)', () => {
  assert.equal(
    decide(ctx({ candidates: [candWith(0.45, 'domain_crossing', 'd1')] })),
    'silence',
  );
});

test('decide: strong + weak with strong winning → no weak weakening', () => {
  // semantic 0.85 가 max. bridge 0.5 는 max 미달 → 약화 면제 (semantic strong 가중).
  assert.equal(
    decide(
      ctx({
        candidates: [candWith(0.85, 'semantic', 's1'), candWith(0.5, 'bridge', 'b1')],
      }),
    ),
    'strong',
  );
});

test('decide: strong + weak tie at max → strong wins (weak weakening 면제)', () => {
  // semantic 0.85 와 bridge 0.85 가 동일 max. strong source 동시 존재 → 약화 면제.
  assert.equal(
    decide(
      ctx({
        candidates: [candWith(0.85, 'bridge', 'b1'), candWith(0.85, 'semantic', 's1')],
      }),
    ),
    'strong',
  );
});

test('decide: weak max + tokenContext > 2000 stacks (strong→ghost, 2 steps)', () => {
  // bridge 0.9 → strong → tokenContext>2000 약화 → suggestion → weak 약화 → ghost.
  assert.equal(
    decide(
      ctx({
        candidates: [candWith(0.9, 'bridge', 'b1')],
        tokenContext: 2500,
      }),
    ),
    'ghost',
  );
});

test('decide: weak max + tokenContext + recencyMs all stack (strong→silence, 3 steps)', () => {
  // bridge 0.9 → strong → tokenContext + recencyMs + weak = 3 step 약화 → silence.
  assert.equal(
    decide(
      ctx({
        candidates: [candWith(0.9, 'temporal', 't1')],
        tokenContext: 2500,
        recencyMs: 100,
      }),
    ),
    'silence',
  );
});

test('decide: mixed source counts as strong (no weak weakening)', () => {
  assert.equal(
    decide(ctx({ candidates: [candWith(0.85, 'mixed', 'm1')] })),
    'strong',
  );
});

test('decide: co_occur source counts as strong (no weak weakening)', () => {
  assert.equal(
    decide(ctx({ candidates: [candWith(0.85, 'co_occur', 'co1')] })),
    'strong',
  );
});

test('decide: 4-원 enum drift guard — only silence/ghost/suggestion/strong returned', () => {
  // 다양한 입력에 대해 act 가 4 원 안에만 머무는지 확인.
  const valid: ReadonlySet<string> = new Set(['silence', 'ghost', 'suggestion', 'strong']);
  const samples = [
    ctx({ candidates: [] }),
    ctx({ candidates: [candWith(0.2, 'bridge', 'b')] }),
    ctx({ candidates: [candWith(0.85, 'semantic', 's')] }),
    ctx({
      candidates: [candWith(0.9, 'domain_crossing', 'd')],
      tokenContext: 9999,
      recencyMs: 0,
    }),
    ctx({ candidates: [candWith(0.7, 'temporal', 't')] }),
  ];
  for (const c of samples) {
    assert.ok(valid.has(decide(c)), `decide returned non-4-원 act for ${JSON.stringify(c)}`);
  }
});
