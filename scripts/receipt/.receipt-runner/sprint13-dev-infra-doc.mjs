// Sprint 13 receipt — Step 68: dev-infra-doc.
//
// 호출:
//   node --experimental-strip-types sprint13-dev-infra-doc.mjs
//   → docs/dev-infra.md 영속성 + 핵심 raw text 검증.
//   → exit 0 + stdout:
//      "dev_infra_doc_pass=1;dev_infra_token_count=<n>"
//
// 정책 (D-S12-dev-infra-readme — Sprint 10 사용자 시연 first 발견 carry-over 7
// 정합):
//   Sprint 10 마감 시점에 사용자 시연으로 발견된 두 가지 실행 결함을 표준
//   명령 인덱스로 영구 보존:
//     1. dist 정적 export 의 SPA fallback 미설정 — `serve -s` 플래그 의무.
//     2. Ollama CORS — `OLLAMA_ORIGINS` 환경변수 미설정 시 web 빌드에서 CORS 차단.
//
// 검증 토큰 (5종, 모두 매칭 필수):
//   (1) 'serve -s'                     — SPA fallback 플래그 명시
//   (2) 'OLLAMA_ORIGINS'               — CORS 환경변수 명시
//   (3) 'pnpm --filter mobile build'   — Expo web 빌드 명령 명시
//   (4) 'chatStore.web.ts'             — web 분기 store 파일 명시
//   (5) 'D-S12-dev-infra-readme'       — 결정 식별자 명시 (frozen 회귀 가드)
//
// 5종 모두 매칭 = PASS. 1+ 누락 = exit 1 + 누락 토큰 명시.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const DEV_INFRA = resolve(ROOT, 'docs/dev-infra.md');

if (!existsSync(DEV_INFRA)) {
  console.error(
    `docs/dev-infra.md 미존재 — D-S12-dev-infra-readme 영속성 회귀. ` +
      `Sprint 10 사용자 시연 first 발견 carry-over 7 정합 위반.`,
  );
  process.exit(2);
}

const text = readFileSync(DEV_INFRA, 'utf8');

const REQUIRED_TOKENS = [
  'serve -s',
  'OLLAMA_ORIGINS',
  'pnpm --filter mobile build',
  'chatStore.web.ts',
  'D-S12-dev-infra-readme',
];

const missing = [];
let matched = 0;
for (const token of REQUIRED_TOKENS) {
  if (text.includes(token)) {
    matched += 1;
  } else {
    missing.push(token);
  }
}

if (missing.length > 0) {
  console.error(
    `docs/dev-infra.md 핵심 raw text 누락 ${missing.length}/${REQUIRED_TOKENS.length} 건:`,
  );
  for (const m of missing) console.error(`  누락 토큰: ${m}`);
  console.error(
    `→ Sprint 10 사용자 시연 결함 (SPA fallback / Ollama CORS) 표준 명령 인덱스 ` +
      `영속성 회귀. D-S12-dev-infra-readme 정합 보존 의무.`,
  );
  process.exit(3);
}

process.stdout.write(`dev_infra_doc_pass=1;dev_infra_token_count=${matched}`);
