import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorsHex } from '../index.ts';

const HEX_RE = /^#[0-9A-F]{6}$/;

test('colorsHex: light and dark themes expose paper/ink/synapse as #RRGGBB', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const token of ['paper', 'ink', 'synapse'] as const) {
      const value = colorsHex[theme][token];
      assert.equal(typeof value, 'string');
      assert.match(value, HEX_RE, `${theme}.${token} must be #RRGGBB uppercase, got: ${value}`);
    }
  }
});

test('colorsHex.light.paper matches Sprint 0 mobile fallback (#F5F0E8)', () => {
  assert.equal(colorsHex.light.paper, '#F5F0E8');
});

test('colorsHex.light.ink matches Sprint 0 mobile fallback (#2A2620)', () => {
  assert.equal(colorsHex.light.ink, '#2A2620');
});

test('colorsHex: synapse accent is identical across light/dark (styles.css does not override --synapse in dark)', () => {
  assert.equal(colorsHex.light.synapse, colorsHex.dark.synapse);
});

test('colorsHex: light and dark expose the same token keys (parity)', () => {
  assert.deepEqual(Object.keys(colorsHex.light).sort(), Object.keys(colorsHex.dark).sort());
});
