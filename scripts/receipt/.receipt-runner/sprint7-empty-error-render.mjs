// Sprint 7 receipt — EmptyState + ErrorState 4 화면 mocked render 정합 검증.
//
// 호출:
//   node --experimental-strip-types sprint7-empty-error-render.mjs
//   → design-system 의 EmptyState / ErrorState 는 RN 컴포넌트라 node 환경에서 import 불가능.
//      대신 *raw text fs* 검증으로 components subpath 의 export 시그니처 + 디자인 목업 정합 가드.
//   → 검증:
//      (1) packages/design-system/src/components/index.ts raw text — EmptyState / ErrorState
//          함수 + 메타 (EMPTY_STATE_VARIANTS / EMPTY_STATE_SCREENS / ERROR_STATE_REASONS /
//          EmptyStateMotionTokens / ErrorStateMotionTokens) 모두 export.
//      (2) EmptyState.tsx / ErrorState.tsx raw text — variant / screen / reason union 박힘.
//      (3) ERROR_STATE_REASONS union (raw text) ↔ conversation OnErrorFn reason union 정합
//          (drift guard, dev doc §3 D-S5-design-system-source-string-union 정합).
//      (4) 디자인 목업 screens.jsx 의 EmptyStateScreen 3 variants raw text 존재.
//   → exit 0 + stdout: "empty_error_render_pass=1;empty_screens=<n>;error_reasons=<m>"

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const COMP_INDEX = resolve(ROOT, 'packages/design-system/src/components/index.ts');
const EMPTY_TSX = resolve(ROOT, 'packages/design-system/src/components/EmptyState.tsx');
const ERROR_TSX = resolve(ROOT, 'packages/design-system/src/components/ErrorState.tsx');
const SCREENS_JSX = resolve(ROOT, '디자인 목업/screens.jsx');

for (const p of [COMP_INDEX, EMPTY_TSX, ERROR_TSX, SCREENS_JSX]) {
  if (!existsSync(p)) {
    console.error(`required file 미존재: ${p}`);
    process.exit(3);
  }
}

const compIndex = readFileSync(COMP_INDEX, 'utf8');
const emptyTsx = readFileSync(EMPTY_TSX, 'utf8');
const errorTsx = readFileSync(ERROR_TSX, 'utf8');
const screensJsx = readFileSync(SCREENS_JSX, 'utf8');

// (1) components/index.ts raw text — Empty/Error export 토큰 모두 등장.
const indexExports = [
  'EmptyState',
  'EmptyStateMotionTokens',
  'ErrorState',
  'ErrorStateMotionTokens',
];
const errors = [];
for (const tok of indexExports) {
  if (!compIndex.includes(tok)) {
    errors.push(`components/index.ts: '${tok}' export 미발견`);
  }
}

// (2) EmptyState.tsx — variant + screen union 박힘.
const emptyVariants = ['empty', 'loading'];
const emptyScreens = ['onboarding', 'chat', 'inspector', 'library'];
let emptyVarsHit = 0;
for (const v of emptyVariants) {
  if (emptyTsx.includes(`'${v}'`)) emptyVarsHit += 1;
}
let emptyScrHit = 0;
for (const s of emptyScreens) {
  if (emptyTsx.includes(`'${s}'`)) emptyScrHit += 1;
}
if (emptyVarsHit < emptyVariants.length) {
  errors.push(`EmptyState.tsx: variant union ${emptyVarsHit}/${emptyVariants.length}`);
}
if (emptyScrHit < emptyScreens.length) {
  errors.push(`EmptyState.tsx: screen union ${emptyScrHit}/${emptyScreens.length}`);
}

// (3) ErrorState.tsx — reason union 박힘 + ErrorStateReason export.
const reasons = ['llm-failure', 'storage-failure', 'network-failure'];
let reasonHit = 0;
for (const r of reasons) {
  if (errorTsx.includes(`'${r}'`)) reasonHit += 1;
}
if (reasonHit < reasons.length) {
  errors.push(`ErrorState.tsx: reason union ${reasonHit}/${reasons.length}`);
}
if (!errorTsx.includes('ErrorStateReason')) {
  errors.push(`ErrorState.tsx: ErrorStateReason 타입 export 미발견`);
}

// (3-cont) conversation OnErrorFn reason union 정합 — drift guard.
const LOOP_TS = resolve(ROOT, 'packages/conversation/src/loop.ts');
if (!existsSync(LOOP_TS)) {
  errors.push(`conversation loop.ts 누락: ${LOOP_TS}`);
} else {
  const loopTs = readFileSync(LOOP_TS, 'utf8');
  for (const r of reasons) {
    if (!loopTs.includes(`'${r}'`)) {
      errors.push(`conversation loop.ts: OnErrorFn reason '${r}' 미발견 — union drift`);
    }
  }
}

// (4) 디자인 목업 screens.jsx EmptyStateScreen 3 variants — state === 'empty' / 'loading' / 'error'.
for (const need of ['EmptyStateScreen', 'state === "empty"', 'state === "loading"']) {
  if (!screensJsx.includes(need)) {
    errors.push(`디자인 목업 screens.jsx 에 '${need}' 미존재`);
  }
}
// error variant 는 'state = "empty"' 디폴트 + fallthrough — 'error' 코멘트 + c.error 사용.
if (!screensJsx.includes('// error') || !screensJsx.includes('c.error')) {
  errors.push(`디자인 목업 screens.jsx 에 error variant 본문 미존재`);
}

if (errors.length > 0) {
  for (const err of errors) console.error(`  ${err}`);
  process.exit(4);
}

process.stdout.write(
  `empty_error_render_pass=1;empty_screens=${emptyScreens.length};error_reasons=${reasons.length}`,
);
