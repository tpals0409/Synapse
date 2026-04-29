import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DecideContext, RecallCandidate } from '@synapse/protocol';
import { decide } from '../src/decide.ts';

function cand(score: number, conceptId = 'c1'): RecallCandidate {
  return { conceptId, label: conceptId, score, source: 'semantic' };
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
