// Sprint 8 receipt — T11 (team-leader: 5 종 carry-over 7~11 결정 frozen) raw text 검증.
//
// 호출:
//   node --experimental-strip-types sprint8-frozen-decisions-carry-over.mjs
//   → docs/sprints/sprint-8-external-validation.md §11 Decisions Made 안에
//      `[FROZEN v2026-04-30 D-S8-{slug}]` 5 종 raw text 박힘:
//        D-S8-theme-toggle-decision
//        D-S8-empty-error-copy-decision
//        D-S8-concept-dedup-decision
//        D-S8-recall-log-retention-decision
//        D-S8-negation-classifier-decision
//   → exit 0 + stdout:
//      "frozen_decisions_carry_over_pass=1;frozen_decisions_carry_over=<n>"
//
// 정합 (frozen-flag-audit lint 와 동일 prefix 패턴 — `[FROZEN v2026-04-30 D-S8-*]`).
// §11 Decisions Made 섹션 안에 박혀야 함 (§12 Carry-over 외부에 박히면 stale).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const DEV_DOC = resolve(ROOT, 'docs/sprints/sprint-8-external-validation.md');
if (!existsSync(DEV_DOC)) {
  console.error(`Sprint 8 dev doc 미존재 — ${DEV_DOC}`);
  process.exit(3);
}

const text = readFileSync(DEV_DOC, 'utf8');

const REQUIRED_SLUGS = [
  'D-S8-theme-toggle-decision',
  'D-S8-empty-error-copy-decision',
  'D-S8-concept-dedup-decision',
  'D-S8-recall-log-retention-decision',
  'D-S8-negation-classifier-decision',
];

const dec11Idx = text.indexOf('## 11. Decisions Made');
const carry12Idx = text.indexOf('## 12.');
if (dec11Idx < 0) {
  console.error(`§11 Decisions Made 섹션 헤더 미발견`);
  process.exit(4);
}

const decSection = text.slice(dec11Idx, carry12Idx > 0 ? carry12Idx : text.length);

// frozen-flag-audit lint 정합 — `[FROZEN v<date> <slug>]` exact 또는
// `[FROZEN v<date> <slug> = <suffix>]` suffix form 모두 valid (수정자/보류 사유 표시).
// regex 매칭: slug 뒤에 ` ` 또는 `]` 또는 `=` 가 와야 boundary.
let count = 0;
const missing = [];
for (const slug of REQUIRED_SLUGS) {
  const re = new RegExp('\\[FROZEN v2026-04-30 ' + slug + '(\\]| |=)');
  if (re.test(decSection)) {
    count += 1;
  } else {
    missing.push('[FROZEN v2026-04-30 ' + slug + '] (또는 [...= <suffix>])');
  }
}

if (count < 5) {
  for (const m of missing) console.error(`  §11 안에 '${m}' 미박힘`);
  console.error(`frozen-decisions-carry-over: ${count}/5 박힘 — D-S8-receipt-threshold-recovery 미달`);
  process.exit(5);
}

process.stdout.write(
  `frozen_decisions_carry_over_pass=1;frozen_decisions_carry_over=${count}`,
);
