// Sprint 15 receipt — Step T2: mobile theme-aware migration.
//
// 호출:
//   node --experimental-strip-types sprint15-mobile-theme-aware.mjs
//   → apps/mobile/app/ + apps/mobile/src/ 안 `colorsHex.light.*` 직접 참조 0건 검증.
//     useTheme() hook 호출 사이트가 6 화면 + sub-components 에 존재하는지 그라운드트루스.
//   → exit 0 + stdout:
//      "hardcoded_light_token_count=0;useTheme_call_sites=<n>;migrated_screens=<n>"
//
// 정책 (D-S14-mobile-theme-aware-pattern 본격 rollout, D-S15-branch T2):
//   Sprint 14 (B1) 의 demoHint 영역 단일 점 마이그레이션을 6 화면 + children 전역으로 확장.
//   `colorsHex.light.X` (design-system 의 light/dark 듀얼 토큰의 light 슬롯 직접 참조) 는
//   themeStore 의 effectiveTheme inversion 을 거치지 못해 다크모드 토글 0 영향.
//   useTheme() 가 반환하는 `colorsHex.X` (single-shape) 로 swap 해야 sf-pulse / ink-rise 등
//   모션의 색상도 theme 추종.
//
// 검증 항목 3종 (모두 PASS 시 exit 0):
//   (A) apps/mobile/app/{,**/}*.{tsx,ts} 안 `colorsHex.light.` 직접 참조 0건.
//   (B) apps/mobile/src/{,**/}*.{tsx,ts} 안 `colorsHex.light.` 직접 참조 0건
//       (themeStore 자체는 `colorsHex[effectiveTheme]` 라우팅이므로 .light. 토큰 표현 불사용).
//   (C) 6 화면 (onboarding/chat/ghost/suggestion/strong/inspector) index.tsx 모두에서
//       useTheme() 호출 사이트 1+ 발견.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const MOBILE_APP = resolve(ROOT, 'apps/mobile/app');
const MOBILE_SRC = resolve(ROOT, 'apps/mobile/src');

if (!existsSync(MOBILE_APP)) {
  console.error(`apps/mobile/app/ 미존재.`);
  process.exit(2);
}
if (!existsSync(MOBILE_SRC)) {
  console.error(`apps/mobile/src/ 미존재.`);
  process.exit(3);
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.expo' || entry === 'dist' || entry.startsWith('.')) continue;
    const p = join(dir, entry);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(p, acc);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      acc.push(p);
    }
  }
  return acc;
}

const FILES = [...walk(MOBILE_APP), ...walk(MOBILE_SRC)];

// (A)+(B) colorsHex.light. 직접 참조 0건.
const HARDCODED_RE = /colorsHex\.light\./g;
let hardcodedCount = 0;
const offenders = [];
for (const file of FILES) {
  const src = readFileSync(file, 'utf8');
  const matches = src.match(HARDCODED_RE);
  if (matches && matches.length > 0) {
    hardcodedCount += matches.length;
    offenders.push(`${file.replace(ROOT + '/', '')}:${matches.length}`);
  }
}
if (hardcodedCount > 0) {
  for (const o of offenders) {
    console.error(`  hardcoded: ${o}`);
  }
  console.error(`apps/mobile/ 안 colorsHex.light.* 직접 참조 ${hardcodedCount} 건 잔존 — D-S15 T2 마이그레이션 회귀.`);
  process.exit(4);
}

// (C) 6 화면 index.tsx 의 useTheme() 호출.
const SCREENS = ['onboarding', 'chat', 'ghost', 'suggestion', 'strong', 'inspector'];
const USETHEME_RE = /useTheme\s*\(/g;
let useThemeCallSites = 0;
let migratedScreens = 0;
for (const screen of SCREENS) {
  const indexPath = resolve(MOBILE_APP, screen, 'index.tsx');
  if (!existsSync(indexPath)) {
    console.error(`apps/mobile/app/${screen}/index.tsx 미존재.`);
    process.exit(5);
  }
  const src = readFileSync(indexPath, 'utf8');
  const matches = src.match(USETHEME_RE);
  if (!matches || matches.length === 0) {
    console.error(`apps/mobile/app/${screen}/index.tsx — useTheme() 호출 0건. T2 마이그레이션 미완.`);
    process.exit(6);
  }
  useThemeCallSites += matches.length;
  migratedScreens++;
}

process.stdout.write(
  `hardcoded_light_token_count=${hardcodedCount};` +
    `useTheme_call_sites=${useThemeCallSites};` +
    `migrated_screens=${migratedScreens}`,
);
