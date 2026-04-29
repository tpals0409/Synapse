import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spacing, radius, shadow } from '../index.ts';

test('spacing: xs/sm/md/lg/xl exist as numbers (RN dp)', () => {
  for (const key of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
    assert.equal(typeof spacing[key], 'number', `spacing.${key} must be number`);
  }
});

test('spacing: scale is monotonic ascending', () => {
  assert.ok(spacing.xs < spacing.sm);
  assert.ok(spacing.sm < spacing.md);
  assert.ok(spacing.md < spacing.lg);
  assert.ok(spacing.lg < spacing.xl);
});

test('spacing: every step is multiple of 4 (4dp grid)', () => {
  for (const key of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
    assert.equal(spacing[key] % 4, 0, `spacing.${key}=${spacing[key]} must be multiple of 4`);
  }
});

test('radius: sm/md/lg/xl/pill exist as numbers', () => {
  for (const key of ['sm', 'md', 'lg', 'xl', 'pill'] as const) {
    assert.equal(typeof radius[key], 'number', `radius.${key} must be number`);
  }
});

test('radius: pill is large enough to fully round any reasonable component', () => {
  assert.ok(radius.pill >= 999, 'radius.pill must be >= 999 to guarantee fully rounded');
});

test('radius: lg=18 matches mockup user/ai bubble most-frequent value', () => {
  assert.equal(radius.lg, 18);
});

test('shadow: sm/md exist as RN shadow style objects', () => {
  for (const key of ['sm', 'md'] as const) {
    const s = shadow[key];
    assert.equal(typeof s.shadowColor, 'string');
    assert.equal(typeof s.shadowOpacity, 'number');
    assert.equal(typeof s.shadowRadius, 'number');
    assert.equal(typeof s.elevation, 'number');
    assert.equal(typeof s.shadowOffset.width, 'number');
    assert.equal(typeof s.shadowOffset.height, 'number');
  }
});

test('shadow: NO css string export (RN-compatible only)', () => {
  // shadow tokens must never be CSS strings like '0 0 10px ...' — RN cannot parse those.
  for (const key of ['sm', 'md'] as const) {
    assert.equal(typeof shadow[key], 'object');
  }
});
