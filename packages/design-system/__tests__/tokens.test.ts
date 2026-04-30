import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  colors,
  fonts,
  role,
  OKLCH_LIGHTNESS,
  OKLCH_INVERSION_BAND,
  oklchLightnessSum,
} from '../index.ts';

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

// Sprint 7 (T2) — oklch light/dark 반전 검증 (paper / ink / synapse).
test('OKLCH_LIGHTNESS: light.paper / ink / synapse 가 styles.css :root 와 1:1 (0.965 / 0.22 / 0.64)', () => {
  assert.equal(OKLCH_LIGHTNESS.light.paper, 0.965);
  assert.equal(OKLCH_LIGHTNESS.light.ink, 0.22);
  assert.equal(OKLCH_LIGHTNESS.light.synapse, 0.64);
});

test('OKLCH_LIGHTNESS: dark.paper / ink / synapse 가 styles.css [data-theme="dark"] 와 1:1 (0.20 / 0.94 / 0.64)', () => {
  assert.equal(OKLCH_LIGHTNESS.dark.paper, 0.20);
  assert.equal(OKLCH_LIGHTNESS.dark.ink, 0.94);
  assert.equal(OKLCH_LIGHTNESS.dark.synapse, 0.64);
});

test('OKLCH 반전 정합: paper/ink 의 light.L + dark.L 합이 OKLCH_INVERSION_BAND 안 (≈ 1.16)', () => {
  for (const token of ['paper', 'ink'] as const) {
    const sum = oklchLightnessSum(token);
    assert.ok(
      sum >= OKLCH_INVERSION_BAND.min && sum <= OKLCH_INVERSION_BAND.max,
      `${token} L sum=${sum} out of [${OKLCH_INVERSION_BAND.min}, ${OKLCH_INVERSION_BAND.max}]`,
    );
  }
});

test('OKLCH 반전 정합: synapse 는 light/dark 동일 (재정의 없음, styles.css 정합)', () => {
  assert.equal(OKLCH_LIGHTNESS.light.synapse, OKLCH_LIGHTNESS.dark.synapse);
});

test('oklchLightnessSum: paper 합 ≈ 1.165, ink 합 ≈ 1.16 (디자인 목업 정확값)', () => {
  // 부동소수점 비교 — Number.EPSILON 충분.
  const paperSum = oklchLightnessSum('paper');
  const inkSum = oklchLightnessSum('ink');
  assert.ok(Math.abs(paperSum - 1.165) < 1e-6, `paper sum ${paperSum} != 1.165`);
  assert.ok(Math.abs(inkSum - 1.16) < 1e-6, `ink sum ${inkSum} != 1.16`);
});

test('OKLCH_LIGHTNESS: colors 객체의 oklch 문자열 안의 L% 와 일치 (raw text 정합)', () => {
  // colors.light.paper = 'oklch(96.5% 0.012 75)' → L% / 100 = 0.965.
  // [DIRECTIVE v2026-04-30 D-S7-designer-tokens-test-undefined] PM c안 — 토큰 누락 = 즉시 throw
  // (Sprint 6 D-S6-design-system-mockup-conflict-resolution 1:1 정합 강제, silent 통과 차단).
  function extractL(value: string, tokenLabel: string): number {
    const m = value.match(/oklch\(([0-9.]+)%/);
    if (!m) {
      throw new Error(`missing oklch L%: ${tokenLabel} = ${JSON.stringify(value)}`);
    }
    const cap = m[1];
    if (typeof cap !== 'string') {
      throw new Error(`missing token capture group: ${tokenLabel}`);
    }
    return parseFloat(cap) / 100;
  }
  assert.equal(extractL(colors.light.paper, 'colors.light.paper'), OKLCH_LIGHTNESS.light.paper);
  assert.equal(extractL(colors.dark.paper, 'colors.dark.paper'), OKLCH_LIGHTNESS.dark.paper);
  assert.equal(extractL(colors.light.ink, 'colors.light.ink'), OKLCH_LIGHTNESS.light.ink);
  assert.equal(extractL(colors.dark.ink, 'colors.dark.ink'), OKLCH_LIGHTNESS.dark.ink);
});
