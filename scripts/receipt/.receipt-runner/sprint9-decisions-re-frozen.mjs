// Sprint 9 receipt — Step 63: decisions-re-frozen.
//
// 호출:
//   node --experimental-strip-types sprint9-decisions-re-frozen.mjs
//   → docs/sprints/sprint-9-external-data-and-decisions.md §11 Decisions Made
//      안에 5종 보류 재확정 frozen raw text 박힘:
//        D-S9-theme-toggle-decision = 보류
//        D-S9-empty-error-copy-decision = 보류
//        D-S9-concept-dedup-decision = 보류
//        D-S9-recall-log-retention-decision = 보류
//        D-S9-negation-classifier-decision = 보류
//      + Sprint 10 trigger 키워드 (`Sprint 10 재진입 trigger` OR
//        `Sprint 10 활성 경로`) ≥ 5 건 OR 매칭.
//   → exit 0 + stdout:
//      "decisions_re_frozen_pass=1;frozen_decisions_updated=<n>;sprint10_trigger_marks=<n>"
//
// 정합 (frozen-flag-audit lint + sprint8-frozen-decisions-carry-over 패턴):
//   `[FROZEN v2026-04-30 D-S9-{slug} = 보류]` suffix form 매칭.
//   보고 슬러그 뒤 boundary = `]` (= 보류 suffix 의 close).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const DEV_DOC = resolve(ROOT, 'docs/sprints/sprint-9-external-data-and-decisions.md');
if (!existsSync(DEV_DOC)) {
  console.error(`Sprint 9 dev doc 미존재: ${DEV_DOC}`);
  process.exit(3);
}

const text = readFileSync(DEV_DOC, 'utf8');

const dec11Idx = text.indexOf('## 11. Decisions Made');
const carry12Idx = text.indexOf('## 12.');
if (dec11Idx < 0) {
  console.error(`§11 Decisions Made 섹션 헤더 미발견`);
  process.exit(4);
}
const decSection = text.slice(dec11Idx, carry12Idx > 0 ? carry12Idx : text.length);

// 5종 보류 재확정 슬러그.
const REQUIRED_SLUGS = [
  'D-S9-theme-toggle-decision',
  'D-S9-empty-error-copy-decision',
  'D-S9-concept-dedup-decision',
  'D-S9-recall-log-retention-decision',
  'D-S9-negation-classifier-decision',
];

let count = 0;
const missing = [];
for (const slug of REQUIRED_SLUGS) {
  // suffix 'in' 보류 = 매칭 패턴 `[FROZEN v2026-04-30 <slug> = 보류]`.
  const re = new RegExp('\\[FROZEN v2026-04-30 ' + slug + ' = 보류\\]');
  if (re.test(decSection)) {
    count += 1;
  } else {
    missing.push(`[FROZEN v2026-04-30 ${slug} = 보류]`);
  }
}

if (count < 5) {
  for (const m of missing) console.error(`  §11 안에 '${m}' 미박힘`);
  console.error(
    `decisions-re-frozen: ${count}/5 박힘 — D-S9-receipt-threshold-recovery 미달`,
  );
  process.exit(5);
}

// Sprint 10 trigger 키워드 카운트 — `Sprint 10 재진입 trigger` OR
// `Sprint 10 활성 경로` OR 매칭 ≥ 5.
const TRIGGER_PATTERNS = ['Sprint 10 재진입 trigger', 'Sprint 10 활성 경로'];
let triggerMarks = 0;
for (const pat of TRIGGER_PATTERNS) {
  let idx = 0;
  while ((idx = decSection.indexOf(pat, idx)) !== -1) {
    triggerMarks += 1;
    idx += pat.length;
  }
}

if (triggerMarks < 5) {
  console.error(
    `decisions-re-frozen: Sprint 10 trigger 키워드 ${triggerMarks}건 — ≥ 5 미달 ` +
      `('Sprint 10 재진입 trigger' OR 'Sprint 10 활성 경로')`,
  );
  process.exit(6);
}

process.stdout.write(
  `decisions_re_frozen_pass=1;frozen_decisions_updated=${count};sprint10_trigger_marks=${triggerMarks}`,
);
