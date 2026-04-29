import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colors, fonts, role } from '../index.ts';

test('colors: light and dark themes expose paper/ink/synapse as oklch strings', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const token of ['paper', 'ink', 'synapse'] as const) {
      const value = colors[theme][token];
      assert.equal(typeof value, 'string');
      assert.ok(value.startsWith('oklch'), `${theme}.${token} must start with "oklch", got: ${value}`);
    }
  }
});

test('colors.light.paper matches styles.css :root --paper exactly', () => {
  assert.equal(colors.light.paper, 'oklch(96.5% 0.012 75)');
});

test('colors: synapse accent is identical across light/dark (styles.css does not override --synapse in dark)', () => {
  assert.equal(colors.light.synapse, colors.dark.synapse);
});

test('fonts: serif/sans/mono families match design mockup', () => {
  assert.equal(fonts.serif, 'Source Serif 4');
  assert.equal(fonts.sans, 'Inter');
  assert.equal(fonts.mono, 'JetBrains Mono');
});

test('role mapping: heading/body→serif, ui→sans, meta→mono', () => {
  assert.equal(role.heading, fonts.serif);
  assert.equal(role.body, fonts.serif);
  assert.equal(role.ui, fonts.sans);
  assert.equal(role.meta, fonts.mono);
});
