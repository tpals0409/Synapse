import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  RecallCandidate,
  DecideContext,
  RecallLogRow,
  DecisionAct,
  RecallSource,
  SuppressedReason,
  EdgeKind,
  BridgeCandidate,
  TemporalCandidate,
  DomainCrossingCandidate,
} from '../index.ts';

test('protocol: RecallCandidate shape compiles with all 6 sources (Sprint 5 enum extended)', () => {
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
  const bridge: RecallCandidate = {
    conceptId: 'c4',
    label: '책',
    score: 0.6,
    source: 'bridge',
  };
  const temporal: RecallCandidate = {
    conceptId: 'c5',
    label: '저녁',
    score: 0.55,
    source: 'temporal',
  };
  const domainCrossing: RecallCandidate = {
    conceptId: 'c6',
    label: '음악',
    score: 0.5,
    source: 'domain_crossing',
  };
  assert.equal(semantic.source, 'semantic');
  assert.equal(co.source, 'co_occur');
  assert.equal(mixed.source, 'mixed');
  assert.equal(bridge.source, 'bridge');
  assert.equal(temporal.source, 'temporal');
  assert.equal(domainCrossing.source, 'domain_crossing');
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

test('protocol: RecallSource union accepts 6 sources (Sprint 5 frozen enum)', () => {
  const sources: RecallSource[] = [
    'semantic',
    'co_occur',
    'mixed',
    'bridge',
    'temporal',
    'domain_crossing',
  ];
  assert.equal(sources.length, 6);
});

test('protocol: EdgeKind union accepts co_occur / semantic (T1.5 holding ground for protocol Concept/GraphEdge migration)', () => {
  const kinds: EdgeKind[] = ['co_occur', 'semantic'];
  assert.equal(kinds.length, 2);
});

test('protocol: BridgeCandidate carries viaConceptId + depth + literal source bridge', () => {
  const b: BridgeCandidate = {
    conceptId: 'far',
    label: '먼개념',
    score: 0.45,
    source: 'bridge',
    viaConceptId: 'middle',
    depth: 2,
  };
  assert.equal(b.source, 'bridge');
  assert.equal(b.viaConceptId, 'middle');
  assert.equal(b.depth, 2);
});

test('protocol: TemporalCandidate carries windowMs + coDecidedIds + literal source temporal', () => {
  const t: TemporalCandidate = {
    conceptId: 'c1',
    label: '아침',
    score: 0.5,
    source: 'temporal',
    windowMs: 24 * 60 * 60 * 1000,
    coDecidedIds: ['c2', 'c3'],
  };
  assert.equal(t.source, 'temporal');
  assert.equal(t.windowMs, 86_400_000);
  assert.deepEqual(t.coDecidedIds, ['c2', 'c3']);
});

test('protocol: DomainCrossingCandidate carries edgeKindFrom + edgeKindTo + literal source domain_crossing', () => {
  const d: DomainCrossingCandidate = {
    conceptId: 'cross',
    label: '횡단',
    score: 0.6,
    source: 'domain_crossing',
    edgeKindFrom: 'co_occur',
    edgeKindTo: 'semantic',
  };
  assert.equal(d.source, 'domain_crossing');
  assert.equal(d.edgeKindFrom, 'co_occur');
  assert.equal(d.edgeKindTo, 'semantic');
});

test('protocol: 3 specialized candidates are assignable to RecallCandidate (dedup primitive — same conceptId, source promotion at engine layer)', () => {
  const b: BridgeCandidate = {
    conceptId: 'shared',
    label: 'L',
    score: 0.4,
    source: 'bridge',
    viaConceptId: 'm',
    depth: 2,
  };
  const t: TemporalCandidate = {
    conceptId: 'shared',
    label: 'L',
    score: 0.5,
    source: 'temporal',
    windowMs: 1,
    coDecidedIds: [],
  };
  const d: DomainCrossingCandidate = {
    conceptId: 'shared',
    label: 'L',
    score: 0.6,
    source: 'domain_crossing',
    edgeKindFrom: 'co_occur',
    edgeKindTo: 'semantic',
  };
  const widened: RecallCandidate[] = [b, t, d];
  assert.equal(widened.length, 3);
  assert.equal(widened.every((c) => c.conceptId === 'shared'), true);
  const sources = new Set(widened.map((c) => c.source));
  assert.equal(sources.size, 3);
});
