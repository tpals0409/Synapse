import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motion } from '../index.ts';

test('motion.inkRise exists', () => {
  assert.ok(motion.inkRise);
});

test('motion.inkRise.duration is 400ms (mockup synapse-ui.jsx: ink-rise 0.4s)', () => {
  assert.equal(typeof motion.inkRise.duration, 'number');
  assert.equal(motion.inkRise.duration, 400);
});

test('motion.inkRise.easing is "ease-out" (mockup: ease-out)', () => {
  assert.equal(motion.inkRise.easing, 'ease-out');
});

test('motion.inkRise.from matches @keyframes from { opacity: 0; translateY: 6 }', () => {
  assert.equal(motion.inkRise.from.opacity, 0);
  assert.equal(motion.inkRise.from.translateY, 6);
});

test('motion.inkRise.to matches @keyframes to { opacity: 1; translateY: 0 }', () => {
  assert.equal(motion.inkRise.to.opacity, 1);
  assert.equal(motion.inkRise.to.translateY, 0);
});

test('motion: NO css string export (RN compatibility)', () => {
  // duration must be a plain number (ms), not a string like '0.4s'
  assert.equal(typeof motion.inkRise.duration, 'number');
  assert.notEqual(typeof motion.inkRise.duration, 'string');
});

// Sprint 3 — ghostBreathe (CaptureToast out-fade).
test('motion.ghostBreathe exists', () => {
  assert.ok(motion.ghostBreathe);
});

test('motion.ghostBreathe.duration is 600ms (CaptureToast out-fade)', () => {
  assert.equal(typeof motion.ghostBreathe.duration, 'number');
  assert.equal(motion.ghostBreathe.duration, 600);
});

test('motion.ghostBreathe.easing is "ease-in-out" (mockup ghost-breathe)', () => {
  assert.equal(motion.ghostBreathe.easing, 'ease-in-out');
});

test('motion.ghostBreathe.from/to is 1 → 0 (out-fade single direction)', () => {
  assert.equal(motion.ghostBreathe.from.opacity, 1);
  assert.equal(motion.ghostBreathe.to.opacity, 0);
});

// Sprint 4 (T6) — synapse-pulse / recall-emerge / thread-draw / node-orbit 정식 노출.
test('motion.synapsePulse 정식 노출 (carry-over 16): duration / iterations / 키프레임', () => {
  assert.ok(motion.synapsePulse);
  assert.equal(motion.synapsePulse.duration, 2400);
  assert.equal(motion.synapsePulse.easing, 'ease-in-out');
  assert.equal(motion.synapsePulse.iterations, 'infinite');
  // styles.css @keyframes synapse-pulse: 0,100%{opacity:0.55, scale:1}  50%{opacity:1, scale:1.18}
  assert.equal(motion.synapsePulse.from.opacity, 0.55);
  assert.equal(motion.synapsePulse.from.scale, 1);
  assert.equal(motion.synapsePulse.mid.opacity, 1);
  assert.equal(motion.synapsePulse.mid.scale, 1.18);
  assert.equal(motion.synapsePulse.to.opacity, 0.55);
  assert.equal(motion.synapsePulse.to.scale, 1);
});

test('motion.recallEmerge: blur 4→0 with 60% mid blur:0 + scale·translate', () => {
  assert.ok(motion.recallEmerge);
  assert.equal(motion.recallEmerge.duration, 600);
  assert.equal(motion.recallEmerge.easing, 'cubic-bezier(.2,.7,.3,1)');
  assert.equal(motion.recallEmerge.from.opacity, 0);
  assert.equal(motion.recallEmerge.from.translateY, 12);
  assert.equal(motion.recallEmerge.from.scale, 0.96);
  assert.equal(motion.recallEmerge.from.blur, 4);
  assert.equal(motion.recallEmerge.mid.blur, 0);
  assert.equal(motion.recallEmerge.to.opacity, 1);
  assert.equal(motion.recallEmerge.to.translateY, 0);
  assert.equal(motion.recallEmerge.to.scale, 1);
});

test('motion.threadDraw: stroke-dashoffset 80 → 0', () => {
  assert.ok(motion.threadDraw);
  assert.equal(motion.threadDraw.duration, 600);
  assert.equal(motion.threadDraw.from.strokeDashoffset, 80);
  assert.equal(motion.threadDraw.to.strokeDashoffset, 0);
});

test('motion.nodeOrbit: 2.4s linear infinite, radius 14', () => {
  assert.ok(motion.nodeOrbit);
  assert.equal(motion.nodeOrbit.duration, 2400);
  assert.equal(motion.nodeOrbit.easing, 'linear');
  assert.equal(motion.nodeOrbit.iterations, 'infinite');
  assert.equal(motion.nodeOrbit.radius, 14);
  assert.equal(motion.nodeOrbit.from.rotate, 0);
  assert.equal(motion.nodeOrbit.to.rotate, 360);
});

test('motion: 신규 토큰 모두 number duration (RN 호환, NO css string)', () => {
  for (const token of ['synapsePulse', 'recallEmerge', 'threadDraw', 'nodeOrbit'] as const) {
    assert.equal(typeof motion[token].duration, 'number', `${token}.duration must be number`);
  }
});
