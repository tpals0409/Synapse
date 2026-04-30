import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DecisionAct } from '@synapse/protocol';
import { applyDismiss, type DismissOptions, type DismissResult } from '../src/dismiss.ts';

type Call =
  | { kind: 'mark'; recallLogId: string; conceptIds: string[] }
  | { kind: 'decay'; conceptIds: string[]; penalty: number }
  | { kind: 'prune'; threshold: number };

function makeRecorder(prunedReturn = 0): {
  calls: Call[];
  opts: DismissOptions;
  optsNoPrune: DismissOptions;
} {
  const calls: Call[] = [];
  const opts: DismissOptions = {
    markDismissed: (recallLogId, conceptIds) =>
      calls.push({ kind: 'mark', recallLogId, conceptIds }),
    decayEdges: (conceptIds, penalty) =>
      calls.push({ kind: 'decay', conceptIds, penalty }),
    pruneEdgesBelow: (threshold) => {
      calls.push({ kind: 'prune', threshold });
      return prunedReturn;
    },
  };
  const optsNoPrune: DismissOptions = {
    markDismissed: (recallLogId, conceptIds) =>
      calls.push({ kind: 'mark', recallLogId, conceptIds }),
    decayEdges: (conceptIds, penalty) =>
      calls.push({ kind: 'decay', conceptIds, penalty }),
  };
  return { calls, opts, optsNoPrune };
}

test('applyDismiss: invokes markDismissed + decayEdges + pruneEdgesBelow in order', () => {
  const { calls, opts } = makeRecorder(3);

  const result = applyDismiss('r-1', ['c1', 'c2'], opts);

  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0], { kind: 'mark', recallLogId: 'r-1', conceptIds: ['c1', 'c2'] });
  assert.deepEqual(calls[1], { kind: 'decay', conceptIds: ['c1', 'c2'], penalty: 0.5 });
  assert.deepEqual(calls[2], { kind: 'prune', threshold: 0.05 });
  assert.deepEqual(result, { decayed: 2, pruned: 3 });
});

test('applyDismiss: penalty default 0.5 when not provided', () => {
  const { calls, opts } = makeRecorder();
  applyDismiss('r-2', ['c1'], opts);

  const decayCall = calls.find((c) => c.kind === 'decay');
  assert.ok(decayCall && decayCall.kind === 'decay');
  assert.equal(decayCall.penalty, 0.5);
});

test('applyDismiss: penalty override is forwarded to decayEdges', () => {
  const { calls, opts } = makeRecorder();
  applyDismiss('r-3', ['c1'], { ...opts, penalty: 0.25 });

  const decayCall = calls.find((c) => c.kind === 'decay');
  assert.ok(decayCall && decayCall.kind === 'decay');
  assert.equal(decayCall.penalty, 0.25);
});

test('applyDismiss: pruneThreshold default 0.05 when not provided', () => {
  const { calls, opts } = makeRecorder();
  applyDismiss('r-4', ['c1'], opts);

  const pruneCall = calls.find((c) => c.kind === 'prune');
  assert.ok(pruneCall && pruneCall.kind === 'prune');
  assert.equal(pruneCall.threshold, 0.05);
});

test('applyDismiss: pruneThreshold override is forwarded to pruneEdgesBelow', () => {
  const { calls, opts } = makeRecorder();
  applyDismiss('r-5', ['c1'], { ...opts, pruneThreshold: 0.01 });

  const pruneCall = calls.find((c) => c.kind === 'prune');
  assert.ok(pruneCall && pruneCall.kind === 'prune');
  assert.equal(pruneCall.threshold, 0.01);
});

test('applyDismiss: pruneEdgesBelow not provided → pruned 0, no prune call', () => {
  const { calls, optsNoPrune } = makeRecorder();
  const result = applyDismiss('r-6', ['c1'], optsNoPrune);

  assert.equal(result.pruned, 0);
  assert.equal(
    calls.filter((c) => c.kind === 'prune').length,
    0,
    'pruneEdgesBelow must not be invoked when undefined',
  );
});

test('applyDismiss: empty conceptIds → markDismissed still called, decayEdges skipped', () => {
  const { calls, opts } = makeRecorder(2);
  const result = applyDismiss('r-7', [], opts);

  // markDismissed must always run (recall_log row needs to record dismissal even with empty subset)
  const markCall = calls.find((c) => c.kind === 'mark');
  assert.ok(markCall && markCall.kind === 'mark');
  assert.deepEqual(markCall.conceptIds, []);

  // decayEdges must NOT run with empty subset (no-op + avoids storage SQL with empty IN clause)
  assert.equal(calls.filter((c) => c.kind === 'decay').length, 0);

  // pruneEdgesBelow still runs (housekeeping is independent of conceptIds)
  assert.equal(result.pruned, 2);
  assert.equal(result.decayed, 0);
});

test('applyDismiss: idempotent — two calls with same decisionId both dispatch (caller-owned accumulation)', () => {
  const { calls, opts } = makeRecorder(1);

  applyDismiss('r-8', ['c1'], opts);
  applyDismiss('r-8', ['c1'], opts);

  // 두 번 호출 → markDismissed 2회 + decayEdges 2회 + pruneEdgesBelow 2회. 누적 약화는 의도적
  // (caller 가 누적 회수를 원할 때만 중복 호출하는 계약 — 헌법 idempotent guard 는 storage T2 책임).
  assert.equal(calls.filter((c) => c.kind === 'mark').length, 2);
  assert.equal(calls.filter((c) => c.kind === 'decay').length, 2);
  assert.equal(calls.filter((c) => c.kind === 'prune').length, 2);

  // 같은 decisionId/conceptIds 라면 mark/decay 인자도 동일.
  const marks = calls.filter((c) => c.kind === 'mark');
  assert.deepEqual(marks[0], marks[1]);
});

test('applyDismiss: 4-원 enum drift guard — DismissResult 는 DecisionAct 를 노출하지 않는다', () => {
  const { opts } = makeRecorder();
  const result: DismissResult = applyDismiss('r-9', ['c1'], opts);

  // result 의 모든 키가 number — DecisionAct 문자열이 섞여있지 않은지 런타임 검증.
  const acts: ReadonlySet<string> = new Set<DecisionAct>([
    'silence',
    'ghost',
    'suggestion',
    'strong',
  ]);
  for (const v of Object.values(result)) {
    assert.equal(typeof v, 'number', 'DismissResult value must be number, not DecisionAct');
    assert.equal(
      acts.has(String(v)),
      false,
      `DismissResult value ${String(v)} must not collide with DecisionAct`,
    );
  }
  assert.deepEqual(Object.keys(result).sort(), ['decayed', 'pruned']);
});

test('applyDismiss: pruneEdgesBelow return value is reflected in result.pruned', () => {
  const recorder = makeRecorder(7);
  const result = applyDismiss('r-10', ['c1'], recorder.opts);
  assert.equal(result.pruned, 7);
});
