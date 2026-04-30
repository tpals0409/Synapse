// Sprint 1 receipt step 7 — verify: COPY i18n 1:1 매칭.
//
// 호출: node --experimental-strip-types verify-copy.mjs
//   → stdout 한 줄 "ok=<n>" 출력 (검증한 키 개수).
//   → exit 0 일 때만 receipt step 7 통과.
//
// `@synapse/design-system.copy.ko` 와 `디자인 목업/content.jsx` 의 핵심 키
// 1:1 매칭. content.jsx 는 brower 스크립트 (`Object.assign(window, ...)`) 라
// ESM import 막힘 → fs.readFile + raw text 매칭.
//
// 진입점이 design-system 패키지 *안* 에 있는 이유: design-system 외부에서는
// `@synapse/design-system` workspace alias resolve 를 위해 dep 추가가 필요.
// design-system 자기 자신의 카피 진실원 매칭은 자기 패키지에서 검증하는 게 자연스럽고,
// 상대 import (`../index.ts`) 로 self-import 회피.
//
// 검증 키 (Sprint 1 6 + Sprint 3 2 + Sprint 4 5 + Sprint 6 3 + Sprint 7 7 = 23):
//   Sprint 1:
//     COPY.ko.onboard.hi    ↔ copy.ko.onboarding.hi       ("안녕하세요.")
//     COPY.ko.onboard.sub   ↔ copy.ko.onboarding.sub      ("그냥 이야기해보세요...")
//     COPY.ko.onboard.cta   ↔ copy.ko.onboarding.cta      ("시작하기")
//     COPY.ko.onboard.hint  ↔ copy.ko.onboarding.hint     ("기억은 자동으로 만들어집니다")
//     COPY.ko.placeholder   ↔ copy.ko.firstChat.placeholder
//     COPY.ko.tagline       ↔ copy.ko.tagline
//   Sprint 3 (T7 — CaptureToast i18n):
//     COPY.ko.captured      ↔ copy.ko.firstChat.captured     ("방금 기억됨")
//     COPY.ko.capturedSub   ↔ copy.ko.firstChat.capturedSub  ("이 생각은 당신의 그래프에 연결됐어요")
//   Sprint 4 (T6 — Recall L1/L2/L3 + Inspector i18n):
//     COPY.ko.ghostLabel      ↔ copy.ko.recall.ghost.title         ("그날의 너")
//     COPY.ko.suggestionLabel ↔ copy.ko.recall.suggestion.title    ("관련 기억")
//     COPY.ko.strongLabel     ↔ copy.ko.recall.strong.title        ("다시 떠오른 생각")
//     COPY.ko.inspector       ↔ copy.ko.recall.inspector.title     ("기억")
//     COPY.ko.inspectorSub    ↔ copy.ko.recall.inspector.subtitle  ("당신이 남긴 흔적")
//   Sprint 6 (T6 — Dismiss / HumbleRetraction):
//     COPY.ko.dismiss   ↔ copy.ko.recall.dismiss   ("지금은 됐어요" / Suggestion 의 dismissText 진실원)
//     COPY.ko.never     ↔ copy.ko.recall.never     ("다신 보지 않기")
//     COPY.ko.humble    ↔ copy.ko.recall.humble    ("아, 잘못 연결했네요. 미안해요." / HumbleRetraction 본문)
//   Sprint 7 (T4 — Hyper-Recall + 인터랙션 카피):
//     COPY.ko.hyperLabel  ↔ copy.ko.recall.hyper.title    ("과거와 현재가 만났습니다")
//     COPY.ko.expand      ↔ copy.ko.recall.expand         ("펼쳐 보기")
//     COPY.ko.collapse    ↔ copy.ko.recall.collapse       ("접기")
//     COPY.ko.bridge      ↔ copy.ko.recall.bridge         ("다리")
//     COPY.ko.why         ↔ copy.ko.recall.why            ("왜 떠올랐냐면")
//     COPY.ko.sources     ↔ copy.ko.recall.sources        ("연결된 기억")
//     COPY.ko.confidence  ↔ copy.ko.recall.confidence     ("확신")
//
// (T4/T6 가 의도적으로 키 네임스페이스를 정리한 부분 — `onboard.*` → `onboarding.*`,
//  flat `placeholder/captured/capturedSub` → `firstChat.*`,
//  flat `ghostLabel/suggestionLabel/strongLabel/inspector/inspectorSub` → `recall.<surface>.{title,subtitle}`.
//  카피 *값* 만 1:1 비교.)

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ds = await import('../index.ts');
const ko = ds.copy.ko;

// content.jsx 는 design-system 패키지 위치 기준으로 ../../../ + "디자인 목업".
const here = path.dirname(fileURLToPath(import.meta.url));
const contentPath = path.resolve(here, '../../..', '디자인 목업/content.jsx');
const raw = await readFile(contentPath, 'utf8');

// ko 블록만 잘라서 매칭 (en 블록과 충돌 방지).
const koBlockMatch = raw.match(/ko:\s*\{([\s\S]*?)\n  \},\n  en:/);
if (!koBlockMatch) {
  console.error('content.jsx: ko: { ... } block not found');
  process.exit(2);
}
const koBlock = koBlockMatch[1];

// 핵심 키 + 기대값 — design-system.copy.ko 에서 직접 가져옴
// (값 변경은 design-system test (copy.test.ts) 가 먼저 잡으므로 receipt 는 일관성 검사).
const checks = [
  ['onboard.hi', ko.onboarding.hi],
  ['onboard.sub', ko.onboarding.sub],
  ['onboard.cta', ko.onboarding.cta],
  ['onboard.hint', ko.onboarding.hint],
  ['placeholder', ko.firstChat.placeholder],
  ['tagline', ko.tagline],
  ['captured', ko.firstChat.captured],
  ['capturedSub', ko.firstChat.capturedSub],
  // Sprint 4 (T6) — Recall surfaces.
  ['ghostLabel', ko.recall.ghost.title],
  ['suggestionLabel', ko.recall.suggestion.title],
  ['strongLabel', ko.recall.strong.title],
  ['inspector', ko.recall.inspector.title],
  ['inspectorSub', ko.recall.inspector.subtitle],
  // Sprint 6 (T6) — Failure & Hygiene 카피.
  ['dismiss', ko.recall.dismiss],
  ['never', ko.recall.never],
  ['humble', ko.recall.humble],
  // Sprint 7 (T4) — Hyper-Recall + 인터랙션 카피 (디자인 목업 content.jsx 미매핑 키 정규화).
  ['hyperLabel', ko.recall.hyper.title],
  ['expand', ko.recall.expand],
  ['collapse', ko.recall.collapse],
  ['bridge', ko.recall.bridge],
  ['why', ko.recall.why],
  ['sources', ko.recall.sources],
  ['confidence', ko.recall.confidence],
];

let okCount = 0;
const failures = [];

for (const [contentPathExpr, expected] of checks) {
  // koBlock 내 escape 형태 또는 raw 문자열로 expected 가 등장하는지.
  const present =
    koBlock.includes(`"${expected}"`) ||
    koBlock.includes(`'${expected}'`) ||
    // sub 처럼 \n 이 들어간 값은 JS literal 에서 `\n` escape 시퀀스
    koBlock.includes(JSON.stringify(expected).slice(1, -1));
  if (present) {
    okCount += 1;
  } else {
    failures.push(
      `${contentPathExpr}: expected ${JSON.stringify(expected)} not found in content.jsx ko block`,
    );
  }
}

if (failures.length > 0) {
  console.error('COPY i18n mismatch:');
  for (const f of failures) console.error('  -', f);
  process.exit(3);
}

process.stdout.write(`ok=${okCount}`);
