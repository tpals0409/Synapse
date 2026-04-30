// Sprint 8 receipt — Sprint 7 53 단계 wrap 메타 정합 검증.
//
// 호출:
//   node --experimental-strip-types sprint8-sprint-7-wrap.mjs
//   → Sprint 7 receipt 메타 정합:
//      (1) scripts/receipt/sprint-7.sh 존재 + executable.
//      (2) Sprint 7 신규 fixture 6 종 모두 존재 (sprint-7.sh pre-check 와 정합):
//          motion-token-parity / oklch-dark-inversion / empty-error-render /
//          full-journey / inspector-unlink-decision / contract-gap-policy.
//      (3) sprint-7.sh 안에 53 단계 footer raw text "Sprint 7 receipt PASSED".
//      (4) sprint-8.sh 의 step 1 이 sprint-7.sh 호출 — sprint-8.sh 안에 raw text
//          "scripts/receipt/sprint-7.sh" 박힘.
//   → exit 0 + stdout:
//      "sprint_7_wrap_pass=1;sprint_7_fixtures=<n>"
//
// Sprint 7 53 단계 자체의 PASS 는 sprint-8.sh step 1 (bash sprint-7.sh) 가 보장.
// 본 fixture 는 메타 정합 + wrap 구조 보존 가드.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const S7_SH = resolve(ROOT, 'scripts/receipt/sprint-7.sh');
const S8_SH = resolve(ROOT, 'scripts/receipt/sprint-8.sh');

if (!existsSync(S7_SH)) {
  console.error(`scripts/receipt/sprint-7.sh 미존재`);
  process.exit(3);
}
if (!existsSync(S8_SH)) {
  console.error(`scripts/receipt/sprint-8.sh 미존재`);
  process.exit(4);
}

// (1) executable 검증
const s7Mode = statSync(S7_SH).mode;
if ((s7Mode & 0o111) === 0) {
  console.error(`sprint-7.sh 가 executable 이 아님`);
  process.exit(5);
}

// (2) Sprint 7 신규 fixture 6 종 모두 존재
const RUNNER = resolve(ROOT, 'scripts/receipt/.receipt-runner');
const S7_FIXTURES = [
  'sprint7-motion-token-parity.mjs',
  'sprint7-oklch-dark-inversion.mjs',
  'sprint7-empty-error-render.mjs',
  'sprint7-full-journey.mjs',
  'sprint7-inspector-unlink-decision.mjs',
  'sprint7-contract-gap-policy.mjs',
];
const missing = [];
for (const f of S7_FIXTURES) {
  if (!existsSync(resolve(RUNNER, f))) missing.push(f);
}
if (missing.length > 0) {
  for (const m of missing) console.error(`  Sprint 7 fixture 누락: ${m}`);
  process.exit(6);
}

// (3) sprint-7.sh 안에 footer raw text
const s7Text = readFileSync(S7_SH, 'utf8');
if (!s7Text.includes('Sprint 7 receipt PASSED')) {
  console.error(`sprint-7.sh 에 'Sprint 7 receipt PASSED' footer raw text 미박힘`);
  process.exit(7);
}

// (4) sprint-8.sh 의 step 1 이 sprint-7.sh wrap
const s8Text = readFileSync(S8_SH, 'utf8');
if (!s8Text.includes('scripts/receipt/sprint-7.sh')) {
  console.error(`sprint-8.sh 가 scripts/receipt/sprint-7.sh wrap raw text 미박힘`);
  process.exit(8);
}

process.stdout.write(`sprint_7_wrap_pass=1;sprint_7_fixtures=${S7_FIXTURES.length}`);
