import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DecideContext, RecallCandidate, RecallLogRow } from '@synapse/protocol';
import { applySilence } from '../src/silence.ts';

function cand(conceptId: string, score = 0.7): RecallCandidate {
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

function row(over: Partial<RecallLogRow> = {}): RecallLogRow {
  return {
    id: 'r1',
    decided_at: Date.now(),
    act: 'ghost',
    candidate_ids: ['c1'],
    ...over,
  };
}

test('applySilence: passthrough when no recentDecisions and decision is recall act', () => {
  const result = applySilence('ghost', ctx({ candidates: [cand('c1')] }));
  assert.deepEqual(result, { act: 'ghost' });
});

test('applySilence: passthrough when decision is silence and no candidates', () => {
  const result = applySilence('silence', ctx({ candidates: [] }));
  assert.deepEqual(result, { act: 'silence' });
});

test('applySilence: low-confidence label when silence with non-empty candidates', () => {
  const result = applySilence('silence', ctx({ candidates: [cand('c1', 0.3)] }));
  assert.deepEqual(result, { act: 'silence', suppressedReason: 'low-confidence' });
});

test('applySilence: cooldown wins over duplicate (priority 1)', () => {
  const recent: RecallLogRow[] = [
    row({
      id: 'r-prev',
      decided_at: Date.now() - 30_000,
      act: 'ghost',
      candidate_ids: ['c1'],
    }),
  ];
  const result = applySilence(
    'suggestion',
    ctx({ candidates: [cand('c1')], recentDecisions: recent }),
  );
  assert.deepEqual(result, { act: 'silence', suppressedReason: 'cooldown' });
});

test('applySilence: cooldown applies on overlapping candidate id (set intersection)', () => {
  const recent: RecallLogRow[] = [
    row({
      decided_at: Date.now() - 10_000,
      act: 'strong',
      candidate_ids: ['c1', 'c2'],
    }),
  ];
  const result = applySilence(
    'ghost',
    ctx({ candidates: [cand('c2'), cand('c3')], recentDecisions: recent }),
  );
  assert.deepEqual(result, { act: 'silence', suppressedReason: 'cooldown' });
});

test('applySilence: cooldown does NOT apply when previous act was silence', () => {
  const recent: RecallLogRow[] = [
    row({
      decided_at: Date.now() - 10_000,
      act: 'silence',
      candidate_ids: ['c1'],
    }),
  ];
  const result = applySilence(
    'ghost',
    ctx({ candidates: [cand('c1')], recentDecisions: recent }),
  );
  assert.deepEqual(result, { act: 'ghost' });
});

test('applySilence: cooldown expires after 60_000 ms', () => {
  // candidate sets differ so duplicate does not fire — isolating cooldown expiry.
  const recent: RecallLogRow[] = [
    row({
      decided_at: Date.now() - 60_001,
      act: 'ghost',
      candidate_ids: ['c1'],
    }),
  ];
  const result = applySilence(
    'ghost',
    ctx({ candidates: [cand('c1'), cand('c2')], recentDecisions: recent }),
  );
  assert.deepEqual(result, { act: 'ghost' });
});

test('applySilence: cooldown does NOT apply to silence decision', () => {
  const recent: RecallLogRow[] = [
    row({ decided_at: Date.now() - 10_000, act: 'ghost', candidate_ids: ['c1'] }),
  ];
  const result = applySilence(
    'silence',
    ctx({ candidates: [cand('c1', 0.2)], recentDecisions: recent }),
  );
  assert.deepEqual(result, { act: 'silence', suppressedReason: 'low-confidence' });
});

test('applySilence: duplicate when latest decision has same candidate set', () => {
  const recent: RecallLogRow[] = [
    row({
      id: 'r-old',
      decided_at: Date.now() - 120_000,
      act: 'ghost',
      candidate_ids: ['c1', 'c2'],
    }),
  ];
  const result = applySilence(
    'ghost',
    ctx({ candidates: [cand('c2'), cand('c1')], recentDecisions: recent }),
  );
  assert.deepEqual(result, { act: 'silence', suppressedReason: 'duplicate' });
});

test('applySilence: duplicate uses latest by decided_at', () => {
  const recent: RecallLogRow[] = [
    row({
      id: 'older',
      decided_at: Date.now() - 200_000,
      act: 'ghost',
      candidate_ids: ['x'],
    }),
    row({
      id: 'latest',
      decided_at: Date.now() - 100_000,
      act: 'ghost',
      candidate_ids: ['c1', 'c2'],
    }),
  ];
  const result = applySilence(
    'suggestion',
    ctx({ candidates: [cand('c1'), cand('c2')], recentDecisions: recent }),
  );
  assert.deepEqual(result, { act: 'silence', suppressedReason: 'duplicate' });
});

test('applySilence: not duplicate when sets differ', () => {
  const recent: RecallLogRow[] = [
    row({
      decided_at: Date.now() - 200_000,
      act: 'ghost',
      candidate_ids: ['c1'],
    }),
  ];
  const result = applySilence(
    'ghost',
    ctx({ candidates: [cand('c1'), cand('c2')], recentDecisions: recent }),
  );
  assert.deepEqual(result, { act: 'ghost' });
});

test('applySilence: empty candidate set never triggers duplicate', () => {
  const recent: RecallLogRow[] = [
    row({
      decided_at: Date.now() - 100_000,
      act: 'silence',
      candidate_ids: [],
    }),
  ];
  const result = applySilence('silence', ctx({ candidates: [], recentDecisions: recent }));
  assert.deepEqual(result, { act: 'silence' });
});
