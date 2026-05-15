// Sprint 13 receipt — Step 69: web-demo-banner.
//
// 호출:
//   node --experimental-strip-types sprint13-web-demo-banner.mjs
//   → T2 mobile 결과 consume — chat empty state 의 web 분기 demoHint mount 검증.
//   → exit 0 + stdout:
//      "web_demo_banner_present=1;copy_keys_matched=<n>;chat_mount_lines=<n>"
//
// 정책 (Sprint 12 메타 본체 inheritance — designer T1 + mobile T2 결과 consume):
//   디자인 의도: web 빌드의 chat empty state 에서만 demoHint 배너 mount —
//   "이건 웹 데모예요. 진짜 기억은 모바일에서 시작돼요." (ko) /
//   "This is a web demo. Real memories begin in the mobile app." (en).
//   native iOS / Android 빌드는 mount 하지 않음 (실제 Gemma + SQLite 동작이므로
//   데모 안내 불필요).
//
// 검증 항목 4종:
//   (A) packages/design-system/src/copy.ts 안 ko 안 'demoHint' 매칭 ≥ 1.
//   (B) packages/design-system/src/copy.ts 안 en 안 'demoHint' 매칭 ≥ 1.
//   (C) apps/mobile/app/chat/index.tsx 안 동시 매칭 ≥ 1:
//       - "Platform.OS === 'web'"
//       - "demoHint" (참조 패턴: copy.firstChat.demoHint / c.firstChat.demoHint)
//   (D) 디자인 의도 위반 가드 — apps/mobile/app/chat/index.tsx 안에 다음
//       위반 패턴 0건:
//       - "Platform.OS !== 'web'" + 같은 라인 또는 인근 5 라인 안에 "demoHint"
//       - "Platform.OS === 'ios'" + 같은 라인 또는 인근 5 라인 안에 "demoHint"
//       - "Platform.OS === 'android'" + 같은 라인 또는 인근 5 라인 안에 "demoHint"
//
// 4 항목 모두 PASS = exit 0. 1+ 위반 = exit 1.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const COPY_TS = resolve(ROOT, 'packages/design-system/src/copy.ts');
const CHAT_TSX = resolve(ROOT, 'apps/mobile/app/chat/index.tsx');

if (!existsSync(COPY_TS)) {
  console.error(`packages/design-system/src/copy.ts 미존재 — T1 designer 결함.`);
  process.exit(2);
}
if (!existsSync(CHAT_TSX)) {
  console.error(`apps/mobile/app/chat/index.tsx 미존재 — T2 mobile 결함.`);
  process.exit(3);
}

const copyText = readFileSync(COPY_TS, 'utf8');
const chatText = readFileSync(CHAT_TSX, 'utf8');

// (A) (B) ko + en demoHint 매칭. 단순 grep — copy.ts 안에 demoHint 가 ko 와
// en 두 블록 모두에 등장해야 함. 본 구현은 ko 키워드 ('이건 웹 데모예요.')
// + en 키워드 ('This is a web demo.') 1+ 매칭으로 ko/en 양쪽 검증.
const KO_KEY = '이건 웹 데모예요.';
const EN_KEY = 'This is a web demo.';
const koDemoHint = copyText.includes('demoHint') && copyText.includes(KO_KEY);
const enDemoHint = copyText.includes('demoHint') && copyText.includes(EN_KEY);

let copyKeysMatched = 0;
if (koDemoHint) copyKeysMatched += 1;
if (enDemoHint) copyKeysMatched += 1;

if (copyKeysMatched < 2) {
  console.error(
    `copy.ts 안 demoHint ko/en 매칭 부족: ko=${koDemoHint ? 1 : 0}, en=${enDemoHint ? 1 : 0}. ` +
      `T1 designer 결과 회귀.`,
  );
  process.exit(4);
}

// (C) chat/index.tsx 안 Platform.OS === 'web' + demoHint 동시 매칭.
const WEB_OS_RE = /Platform\.OS\s*===\s*['"]web['"]/g;
const DEMO_HINT_RE = /demoHint/g;
const webOsMatches = (chatText.match(WEB_OS_RE) || []).length;
const demoHintMatches = (chatText.match(DEMO_HINT_RE) || []).length;

if (webOsMatches < 1) {
  console.error(`chat/index.tsx 안 "Platform.OS === 'web'" 매칭 0건 — T2 mobile 결함.`);
  process.exit(5);
}
if (demoHintMatches < 1) {
  console.error(`chat/index.tsx 안 "demoHint" 매칭 0건 — T2 mobile 결함.`);
  process.exit(6);
}

// (D) 디자인 의도 위반 가드 — non-web OS 분기로 demoHint mount 한 흔적.
const lines = chatText.split('\n');
const violations = [];
const NON_WEB_PATTERNS = [
  { name: "Platform.OS !== 'web'", re: /Platform\.OS\s*!==\s*['"]web['"]/ },
  { name: "Platform.OS === 'ios'", re: /Platform\.OS\s*===\s*['"]ios['"]/ },
  { name: "Platform.OS === 'android'", re: /Platform\.OS\s*===\s*['"]android['"]/ },
];

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  for (const { name, re } of NON_WEB_PATTERNS) {
    if (re.test(line)) {
      // 인근 ±5 라인 안에 demoHint 등장 시 위반.
      const start = Math.max(0, i - 5);
      const end = Math.min(lines.length - 1, i + 5);
      const window = lines.slice(start, end + 1).join('\n');
      if (window.includes('demoHint')) {
        violations.push(`line ${i + 1}: "${name}" + 인근 demoHint mount`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`디자인 의도 위반 — non-web OS 분기로 demoHint mount:`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    `→ demoHint 는 Platform.OS === 'web' 일 때만 mount 의무 (web 빌드 한정 데모 안내).`,
  );
  process.exit(7);
}

process.stdout.write(
  `web_demo_banner_present=1;copy_keys_matched=${copyKeysMatched};chat_mount_lines=${webOsMatches}`,
);
