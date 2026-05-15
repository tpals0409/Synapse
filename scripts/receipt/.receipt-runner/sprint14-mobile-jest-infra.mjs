// Sprint 14 receipt — Step 70: mobile-jest-infra.
//
// 호출:
//   node --experimental-strip-types sprint14-mobile-jest-infra.mjs
//   → apps/mobile/ 안 Jest 인프라 자산 존재 + package.json scripts.test 가
//     실제 jest 호출 검증. RN 컴포넌트 테스트 회귀 가드.
//   → exit 0 + stdout:
//      "mobile_jest_config_present=1;test_files_count=<n>;test_script=<token>"
//
// 정책 (D-S14-receipt-threshold-recovery):
//   Sprint 13 T3 tester 가 mobile RN 테스트 자산 추가 흐름 — Sprint 14 에서는
//   기본 인프라 (jest.config.js / jest.setup.ts / package.json scripts.test /
//   __tests__ 디렉토리 안 test 파일 1+) 가 모두 갖춰졌는지 메타 검증.
//   "echo skip" 류의 빈 stub script 는 fail 처리.
//
// 검증 항목 4종 (모두 PASS 시 exit 0):
//   (A) apps/mobile/jest.config.js 파일 존재.
//   (B) apps/mobile/jest.setup.ts 파일 존재.
//   (C) apps/mobile/package.json 의 scripts.test 가 'jest' 또는 'expo jest'
//       토큰 매칭. "echo skip" / 빈 문자열 등은 fail.
//   (D) apps/mobile/app/chat/__tests__/*.test.tsx 또는
//       apps/mobile/__tests__/*.test.tsx 패턴 1건 이상 존재.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const MOBILE_DIR = resolve(ROOT, 'apps/mobile');
const JEST_CONFIG = resolve(MOBILE_DIR, 'jest.config.js');
const JEST_SETUP = resolve(MOBILE_DIR, 'jest.setup.ts');
const PKG_JSON = resolve(MOBILE_DIR, 'package.json');

if (!existsSync(MOBILE_DIR)) {
  console.error(`apps/mobile/ 디렉토리 미존재`);
  process.exit(2);
}

// (A) jest.config.js
if (!existsSync(JEST_CONFIG)) {
  console.error(`apps/mobile/jest.config.js 미존재 — Jest 설정 회귀.`);
  process.exit(3);
}

// (B) jest.setup.ts
if (!existsSync(JEST_SETUP)) {
  console.error(`apps/mobile/jest.setup.ts 미존재 — Jest 셋업 회귀.`);
  process.exit(4);
}

// (C) package.json scripts.test
if (!existsSync(PKG_JSON)) {
  console.error(`apps/mobile/package.json 미존재`);
  process.exit(5);
}
const pkg = JSON.parse(readFileSync(PKG_JSON, 'utf8'));
const testScript = (pkg.scripts && pkg.scripts.test) || '';
const JEST_TOKEN_RE = /\b(jest|expo\s+jest)\b/;
if (!JEST_TOKEN_RE.test(testScript)) {
  console.error(
    `apps/mobile/package.json scripts.test="${testScript}" — 'jest' 또는 ` +
      `'expo jest' 토큰 미매칭. RN 테스트 인프라 회귀.`,
  );
  process.exit(6);
}
const SKIP_STUB_RE = /^(echo\s+skip|true|noop)$/i;
if (SKIP_STUB_RE.test(testScript.trim())) {
  console.error(
    `apps/mobile/package.json scripts.test="${testScript}" — stub script. 실제 jest 호출 의무.`,
  );
  process.exit(7);
}

// (D) __tests__/*.test.tsx 파일 1+ 존재.
// 후보 디렉토리: apps/mobile/app/chat/__tests__/, apps/mobile/__tests__/, 그 외 재귀.
function findTestFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.expo' || entry.startsWith('.')) continue;
    const p = join(dir, entry);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      findTestFiles(p, acc);
    } else if (/\.test\.tsx?$/.test(entry)) {
      acc.push(p);
    }
  }
  return acc;
}

const testFiles = findTestFiles(MOBILE_DIR);
if (testFiles.length < 1) {
  console.error(
    `apps/mobile/ 안 *.test.tsx / *.test.ts 파일 0건 — RN 컴포넌트 테스트 회귀.`,
  );
  process.exit(8);
}

const testScriptToken = testScript.includes('expo jest') ? 'expo-jest' : 'jest';
process.stdout.write(
  `mobile_jest_config_present=1;test_files_count=${testFiles.length};test_script=${testScriptToken}`,
);
