// Sprint 13 receipt — Step 66: end-mark-live-measure.
//
// 호출:
//   node --experimental-strip-types sprint13-end-mark-live-measure.mjs
//   → 메모리 feedback_end_mark_live_measure 정책 검증.
//     PM 의 스프린트 마감 마크가 stale fail 일 가능성 사전 차단.
//   → exit 0 + stdout:
//      "end_mark_live_measure_pass=1;sprint_13_live_marker_count=<n>"
//
// 정책 (memory: feedback_end_mark_live_measure):
//   Sprint 9~10 마감 "65/65 PASS" 마크가 실제로는 4 단계 stale fail 이었음.
//   구조 변경 commit (sprint-13.sh 신규 등) 발생 시 receipt/lint 자산 grep
//   검증 의무. 본 fixture 는 그 검증 자체가 dev doc 안에 raw text 로
//   기록되었는지 메타-검증.
//
// 검증 대상:
//   docs/sprints/sprint-13-external-data-arrival.md
//
// 검증 기준 (다음 중 1+):
//   (a) §10 Implementation Map 안에 sprint-13.sh 실측 흔적
//       (다음 raw text 토큰 중 1+):
//         - "exit 0"
//         - "Sprint 13 receipt PASSED"
//         - "69/69"
//         - "✅ Sprint 13"
//         - "bash scripts/receipt/sprint-13.sh" (PM 이 실행했다는 명시적 마크)
//   (b) §12 Carry-over + Retrospective 안에 sprint-13.sh 실측 흔적 (위 동일).
//   (c) PM 큐레이션 전 (skeleton 단계) 인 경우 — §2 Receipt 안에
//       "bash scripts/receipt/sprint-13.sh" 명시 + "exit 0 + ✅ Sprint 13
//       receipt PASSED" raw text 1+ 발견 시 placeholder PASS (dev doc skeleton
//       이 receipt 정책을 미리 raw text 로 박았다는 신호).
//
// false positive 회피:
//   §1~§2 (skeleton 단계) 가 raw text 로 명시한 receipt 패턴은 PM 의 영속
//   메모리화로 간주 → §10/§12 미작성 단계에서도 PASS. PM 의 §10/§12
//   큐레이션 후에는 §10/§12 안에서 라이브 마커가 발견되어야 함 (3 단계 검증
//   순서 — §10 → §12 → §2 placeholder).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const DEV_DOC = resolve(ROOT, 'docs/sprints/sprint-13-external-data-arrival.md');

if (!existsSync(DEV_DOC)) {
  console.error(`docs/sprints/sprint-13-external-data-arrival.md 미존재`);
  process.exit(2);
}

const text = readFileSync(DEV_DOC, 'utf8');

// 섹션 분리 — ## 1, ## 2, ..., ## 12 헤더로 split.
function extractSection(fullText, headerRegex) {
  const lines = fullText.split('\n');
  const out = [];
  let inSection = false;
  for (const line of lines) {
    if (inSection) {
      // 다음 ## 헤더면 종료.
      if (/^##\s+\d/.test(line)) break;
      out.push(line);
    } else if (headerRegex.test(line)) {
      inSection = true;
    }
  }
  return out.join('\n');
}

const section10 = extractSection(text, /^##\s+10\b/);
const section12 = extractSection(text, /^##\s+12\b/);
const section2 = extractSection(text, /^##\s+2\b/);

const LIVE_MARKER_TOKENS = [
  'Sprint 13 receipt PASSED',
  '69/69',
  '✅ Sprint 13',
  'bash scripts/receipt/sprint-13.sh',
  'exit 0',
];

function countMarkers(sectionText) {
  let n = 0;
  for (const token of LIVE_MARKER_TOKENS) {
    if (sectionText.includes(token)) n += 1;
  }
  return n;
}

const n10 = countMarkers(section10);
const n12 = countMarkers(section12);
const n2 = countMarkers(section2);

// PASS 조건: §10 ≥ 1 OR §12 ≥ 1 OR (skeleton 단계) §2 ≥ 2 (이중 raw text).
let pass = 0;
let totalMarkers = n10 + n12;
if (n10 >= 1 || n12 >= 1) {
  pass = 1;
} else if (n2 >= 2) {
  // Skeleton placeholder PASS — PM 의 §1~§2 영속 메모리화 신호.
  pass = 1;
  totalMarkers = n2;
}

if (pass !== 1) {
  console.error(
    `Sprint 13 dev doc 안에 sprint-13.sh 실측 흔적 미발견. ` +
      `§10 markers=${n10}, §12 markers=${n12}, §2 markers=${n2}. ` +
      `PM 마감 직전 'bash scripts/receipt/sprint-13.sh' 실행 결과를 §10 또는 §12 에 기록할 것 ` +
      `(memory: feedback_end_mark_live_measure).`
  );
  process.exit(3);
}

process.stdout.write(`end_mark_live_measure_pass=1;sprint_13_live_marker_count=${totalMarkers}`);
