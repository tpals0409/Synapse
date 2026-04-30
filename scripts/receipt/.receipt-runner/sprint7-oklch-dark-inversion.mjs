// Sprint 7 receipt — oklch light/dark 반전 정합 검증.
//
// 호출:
//   node --experimental-strip-types sprint7-oklch-dark-inversion.mjs
//   → design-system root index export 의 OKLCH_LIGHTNESS + OKLCH_INVERSION_BAND 사용.
//   → 검증:
//      (1) paper / ink: light.L + dark.L 합이 OKLCH_INVERSION_BAND.[min, max] 사이
//      (2) synapse: light.L === dark.L (디자인 목업 styles.css 에서 dark 재정의 없음)
//      (3) 디자인 목업 styles.css 에 :root --paper / [data-theme="dark"] --paper 모두 존재
//   → exit 0 + stdout: "oklch_dark_inversion_pass=1;paper_sum=<f>;ink_sum=<f>;synapse_eq=true"
//
// 외부 contract 가드:
//   design-system root index 의 OKLCH_LIGHTNESS / OKLCH_INVERSION_BAND export 누락 시 첫 import 실패.
//
// 임계 (D-S7-receipt-threshold-recovery): oklch_dark_inversion_pass = 1.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const ds = await import('@synapse/design-system');

if (!ds.OKLCH_LIGHTNESS || !ds.OKLCH_INVERSION_BAND) {
  console.error('design-system.OKLCH_LIGHTNESS / OKLCH_INVERSION_BAND 미export');
  process.exit(3);
}

const { light, dark } = ds.OKLCH_LIGHTNESS;
const { min, max } = ds.OKLCH_INVERSION_BAND;

const paperSum = light.paper + dark.paper;
const inkSum = light.ink + dark.ink;
const synapseEq = light.synapse === dark.synapse;

const errors = [];
if (paperSum < min || paperSum > max) {
  errors.push(`paper_sum=${paperSum.toFixed(3)} out of band [${min}, ${max}]`);
}
if (inkSum < min || inkSum > max) {
  errors.push(`ink_sum=${inkSum.toFixed(3)} out of band [${min}, ${max}]`);
}
if (!synapseEq) {
  errors.push(
    `synapse light/dark 불일치: light=${light.synapse}, dark=${dark.synapse} (목업 dark 재정의 없음)`,
  );
}

// 디자인 목업 styles.css raw text — :root --paper + [data-theme="dark"] --paper 모두 존재.
const stylesCss = readFileSync(resolve(ROOT, '디자인 목업/styles.css'), 'utf8');
const root = stylesCss.indexOf(':root');
const dark2 = stylesCss.indexOf('[data-theme="dark"]');
if (root < 0 || dark2 < 0) {
  errors.push(`styles.css :root or [data-theme="dark"] selector 미존재`);
}
const rootBlock = stylesCss.slice(root, dark2 > root ? dark2 : stylesCss.length);
const darkBlock = dark2 >= 0 ? stylesCss.slice(dark2) : '';
for (const tok of ['--paper', '--ink']) {
  if (!rootBlock.includes(tok)) errors.push(`:root 에 ${tok} 미존재`);
  if (!darkBlock.includes(tok)) errors.push(`[data-theme="dark"] 에 ${tok} 미존재`);
}

if (errors.length > 0) {
  for (const err of errors) console.error(`  ${err}`);
  process.exit(4);
}

process.stdout.write(
  `oklch_dark_inversion_pass=1;paper_sum=${paperSum.toFixed(3)};ink_sum=${inkSum.toFixed(3)};synapse_eq=${synapseEq}`,
);
