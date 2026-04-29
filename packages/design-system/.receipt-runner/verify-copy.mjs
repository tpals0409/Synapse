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
// 검증 키 (Sprint 1 화면 범위, T4 결정):
//   COPY.ko.onboard.hi    ↔ copy.ko.onboarding.hi       ("안녕하세요.")
//   COPY.ko.onboard.sub   ↔ copy.ko.onboarding.sub      ("그냥 이야기해보세요...")
//   COPY.ko.onboard.cta   ↔ copy.ko.onboarding.cta      ("시작하기")
//   COPY.ko.onboard.hint  ↔ copy.ko.onboarding.hint     ("기억은 자동으로 만들어집니다")
//   COPY.ko.placeholder   ↔ copy.ko.firstChat.placeholder
//   COPY.ko.tagline       ↔ copy.ko.tagline
//
// (T4 가 의도적으로 키 네임스페이스를 정리한 부분 — `onboard.*` → `onboarding.*`,
//  flat `placeholder` → `firstChat.placeholder`. 카피 *값* 만 1:1 비교.)

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
