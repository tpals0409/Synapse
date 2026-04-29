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
