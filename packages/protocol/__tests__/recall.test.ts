import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  RecallCandidate,
  DecideContext,
  RecallLogRow,
  DecisionAct,
  RecallSource,
  SuppressedReason,
} from '../index.ts';

test('protocol: RecallCandidate shape compiles with all 3 sources', () => {
  const semantic: RecallCandidate = {
    conceptId: 'c1',
    label: '산책',
    score: 0.82,
    source: 'semantic',
  };
  const co: RecallCandidate = {
    conceptId: 'c2',
    label: '아침',
    score: 0.7,
    source: 'co_occur',
  };
  const mixed: RecallCandidate = {
    conceptId: 'c3',
    label: '카페',
    score: 0.91,
    source: 'mixed',
  };
  assert.equal(semantic.source, 'semantic');
  assert.equal(co.source, 'co_occur');
  assert.equal(mixed.source, 'mixed');
});

test('protocol: DecisionAct union has exactly 4 members (frozen)', () => {
  const acts: DecisionAct[] = ['silence', 'ghost', 'suggestion', 'strong'];
  assert.equal(acts.length, 4);
});

test('protocol: RecallLogRow uses snake_case fields per storage schema', () => {
  const row: RecallLogRow = {
    id: 'rl_1',
    decided_at: 1_700_000_000_000,
    act: 'ghost',
    candidate_ids: ['c1', 'c2'],
    suppressed_reason: 'cooldown',
  };
  assert.equal(row.decided_at, 1_700_000_000_000);
  assert.deepEqual(row.candidate_ids, ['c1', 'c2']);
  assert.equal(row.suppressed_reason, 'cooldown');
});

test('protocol: RecallLogRow.suppressed_reason is optional', () => {
  const row: RecallLogRow = {
    id: 'rl_2',
    decided_at: 1,
    act: 'silence',
    candidate_ids: [],
  };
  assert.equal(row.suppressed_reason, undefined);
});

test('protocol: DecideContext shape requires userMessage / candidates / recencyMs / tokenContext', () => {
  const ctx: DecideContext = {
    userMessage: '안녕',
    candidates: [
      { conceptId: 'c1', label: '산책', score: 0.8, source: 'semantic' },
    ],
    recencyMs: 5_000,
    tokenContext: 1_024,
  };
  assert.equal(ctx.userMessage, '안녕');
  assert.equal(ctx.candidates.length, 1);
  assert.equal(ctx.recencyMs, 5_000);
  assert.equal(ctx.tokenContext, 1_024);
  assert.equal(ctx.recentDecisions, undefined);
});

test('protocol: SuppressedReason union accepts cooldown / duplicate / low-confidence', () => {
  const reasons: SuppressedReason[] = ['cooldown', 'duplicate', 'low-confidence'];
  assert.equal(reasons.length, 3);
});

test('protocol: RecallSource union accepts semantic / co_occur / mixed', () => {
  const sources: RecallSource[] = ['semantic', 'co_occur', 'mixed'];
  assert.equal(sources.length, 3);
});
