import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decayScore, DEFAULT_HALF_LIFE_MS } from '../index.ts';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

test('forgetting/decayScore: ageMs=0 returns score unchanged', () => {
  assert.equal(decayScore(1.0, 0, DAY), 1.0);
  assert.equal(decayScore(0.85, 0, 7 * DAY), 0.85);
});

test('forgetting/decayScore: ageMs=halfLifeMs returns score*0.5 exactly (D-S6-forgetting-policy 지수 감쇠)', () => {
  assert.equal(decayScore(1.0, DAY, DAY), 0.5);
  assert.equal(decayScore(0.8, 7 * DAY, 7 * DAY), 0.4);
  assert.equal(decayScore(1.0, 30 * DAY, 30 * DAY), 0.5);
});

test('forgetting/decayScore: ageMs=2*halfLifeMs returns score*0.25', () => {
  assert.equal(decayScore(1.0, 2 * DAY, DAY), 0.25);
  assert.equal(decayScore(1.0, 14 * DAY, 7 * DAY), 0.25);
});

test('forgetting/decayScore: monotonic decreasing as ageMs increases', () => {
  const halfLife = 7 * DAY;
  const scores = [0, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY].map((age) =>
    decayScore(1.0, age, halfLife),
  );
  for (let i = 1; i < scores.length; i++) {
    assert.ok(
      scores[i]! < scores[i - 1]!,
      `decay must be monotonic decreasing: scores[${i}]=${scores[i]} < scores[${i - 1}]=${scores[i - 1]}`,
    );
  }
});

test('forgetting/decayScore: negative ageMs (future last_used_at) returns score unchanged (clamp)', () => {
  assert.equal(decayScore(0.9, -1, DAY), 0.9);
  assert.equal(decayScore(0.5, -7 * DAY, 7 * DAY), 0.5);
});

test('forgetting/decayScore: halfLifeMs <= 0 returns score unchanged (degenerate guard)', () => {
  assert.equal(decayScore(1.0, DAY, 0), 1.0);
  assert.equal(decayScore(1.0, DAY, -1), 1.0);
});

test('forgetting/decayScore: default halfLifeMs = 7 days when omitted (DEFAULT_HALF_LIFE_MS)', () => {
  assert.equal(DEFAULT_HALF_LIFE_MS, 7 * DAY);
  assert.equal(decayScore(1.0, 7 * DAY), 0.5);
  assert.equal(decayScore(1.0, 14 * DAY), 0.25);
});

test('forgetting/decayScore: smooth (continuous) — small ageMs delta produces small score delta', () => {
  const halfLife = 7 * DAY;
  const a = decayScore(1.0, 1 * DAY, halfLife);
  const b = decayScore(1.0, 1 * DAY + HOUR, halfLife);
  // 1 hour into a 7-day half-life should change score by < 1%
  assert.ok(Math.abs(a - b) < 0.01, `expected smooth: |${a} - ${b}| < 0.01`);
});
