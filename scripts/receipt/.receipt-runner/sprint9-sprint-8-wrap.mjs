// Sprint 9 receipt — Step 65: sprint-8-wrap.
//
// 호출:
//   node --experimental-strip-types sprint9-sprint-8-wrap.mjs
//   → Sprint 8 receipt 메타 정합:
//      (1) scripts/receipt/sprint-8.sh 존재 + executable.
//      (2) Sprint 8 신규 fixture 7 종 모두 존재 (sprint-8.sh pre-check 와 정합):
//          external-data-index / frozen-decisions-carry-over / pii-policy /
//          recall-log-retention / concept-dedup / negation-classifier / sprint-7-wrap.
//      (3) sprint-8.sh 안에 60단계 footer raw text "Sprint 8 receipt PASSED".
//      (4) sprint-9.sh 의 step 1 이 sprint-8.sh wrap — sprint-9.sh 안에 raw text
//          "scripts/receipt/sprint-8.sh" 박힘.
//   → exit 0 + stdout:
//      "sprint_8_wrap_pass=1;sprint_8_fixtures=<n>"
//
// Sprint 8 60단계 자체의 PASS 는 sprint-9.sh step 1 (bash sprint-8.sh) 가 보장.
// 본 fixture 는 메타 정합 + wrap 구조 보존 가드 (Sprint 4: 32 + 5: 8 + 6: 6 +
// 7: 7 + 8: 7 = 60 단계 누적).

import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const S8_SH = resolve(ROOT, 'scripts/receipt/sprint-8.sh');
const S9_SH = resolve(ROOT, 'scripts/receipt/sprint-9.sh');

if (!existsSync(S8_SH)) {
  console.error(`scripts/receipt/sprint-8.sh 미존재`);
  process.exit(3);
}
if (!existsSync(S9_SH)) {
  console.error(`scripts/receipt/sprint-9.sh 미존재`);
  process.exit(4);
}

// (1) executable 검증
const s8Mode = statSync(S8_SH).mode;
if ((s8Mode & 0o111) === 0) {
  console.error(`sprint-8.sh 가 executable 이 아님`);
  process.exit(5);
}

// (2) Sprint 8 신규 fixture 7 종 모두 존재
const RUNNER = resolve(ROOT, 'scripts/receipt/.receipt-runner');
const S8_FIXTURES = [
  'sprint8-external-data-index.mjs',
  'sprint8-frozen-decisions-carry-over.mjs',
  'sprint8-pii-policy.mjs',
  'sprint8-recall-log-retention.mjs',
  'sprint8-concept-dedup.mjs',
  'sprint8-negation-classifier.mjs',
  'sprint8-sprint-7-wrap.mjs',
];
const missing = [];
for (const f of S8_FIXTURES) {
  if (!existsSync(resolve(RUNNER, f))) missing.push(f);
}
if (missing.length > 0) {
  for (const m of missing) console.error(`  Sprint 8 fixture 누락: ${m}`);
  process.exit(6);
}

// (3) sprint-8.sh 안에 footer raw text
const s8Text = readFileSync(S8_SH, 'utf8');
if (!s8Text.includes('Sprint 8 receipt PASSED')) {
  console.error(`sprint-8.sh 에 'Sprint 8 receipt PASSED' footer raw text 미박힘`);
  process.exit(7);
}

// (4) sprint-9.sh 의 step 1 이 sprint-8.sh wrap
const s9Text = readFileSync(S9_SH, 'utf8');
if (!s9Text.includes('scripts/receipt/sprint-8.sh')) {
  console.error(`sprint-9.sh 가 scripts/receipt/sprint-8.sh wrap raw text 미박힘`);
  process.exit(8);
}

process.stdout.write(`sprint_8_wrap_pass=1;sprint_8_fixtures=${S8_FIXTURES.length}`);
