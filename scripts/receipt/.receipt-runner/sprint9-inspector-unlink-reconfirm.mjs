// Sprint 9 receipt — Step 64: inspector-unlink-reconfirm.
//
// 호출:
//   node --experimental-strip-types sprint9-inspector-unlink-reconfirm.mjs
//   → docs/sprints/sprint-9-external-data-and-decisions.md §11 Decisions Made
//      안에:
//        (1) `[FROZEN v2026-04-30 D-S9-inspector-unlink-recheck = A안 reconfirm]`
//            raw text 매칭.
//        (2) Sprint 7 5층위 거절 메커니즘 키워드 (`5층위` OR
//            `DismissButton variant='reject'` OR `5 layer`) ≥ 1건 매칭.
//        (3) Sprint 10 B안 재진입 trigger (`Sprint 10 B안 재진입`) ≥ 1건 매칭.
//   → exit 0 + stdout:
//      "inspector_unlink_reconfirm_pass=1;reject_layer_marks=<n>;sprint10_b_marks=<n>"
//
// 정합 (Sprint 7 D-S7-inspector-unlink-decision A안 reconfirm 영구 보존
// + carry-over 2 재검토 분기 명시).

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

// (1) A안 reconfirm frozen.
const RECHECK_FROZEN =
  '[FROZEN v2026-04-30 D-S9-inspector-unlink-recheck = A안 reconfirm]';
if (!decSection.includes(RECHECK_FROZEN)) {
  console.error(`§11 안에 '${RECHECK_FROZEN}' 미박힘`);
  process.exit(5);
}

// (2) 5층위 거절 메커니즘 키워드 — OR 매칭 ≥ 1.
const REJECT_LAYER_PATTERNS = [
  '5층위',
  "DismissButton variant='reject'",
  '5 layer',
];
let rejectLayerMarks = 0;
for (const pat of REJECT_LAYER_PATTERNS) {
  let idx = 0;
  while ((idx = decSection.indexOf(pat, idx)) !== -1) {
    rejectLayerMarks += 1;
    idx += pat.length;
  }
}
if (rejectLayerMarks < 1) {
  console.error(
    `§11 안에 5층위 거절 메커니즘 키워드 미발견 — ` +
      `(${REJECT_LAYER_PATTERNS.join(' / ')}) 중 ≥ 1 필요`,
  );
  process.exit(6);
}

// (3) Sprint 10 B안 재진입 trigger.
const SPRINT10_B_PATTERN = 'Sprint 10 B안 재진입';
let sprint10BMarks = 0;
let idx = 0;
while ((idx = decSection.indexOf(SPRINT10_B_PATTERN, idx)) !== -1) {
  sprint10BMarks += 1;
  idx += SPRINT10_B_PATTERN.length;
}
if (sprint10BMarks < 1) {
  console.error(`§11 안에 'Sprint 10 B안 재진입' trigger 미박힘 (≥ 1 필요)`);
  process.exit(7);
}

process.stdout.write(
  `inspector_unlink_reconfirm_pass=1;reject_layer_marks=${rejectLayerMarks};sprint10_b_marks=${sprint10BMarks}`,
);
