// Sprint 9 receipt — Step 61: spawn-prompt-update.
// (Sprint 11 /end 긴급 통합 수정: c460712 의 .claude/commands → .claude/agents 구조 swap 후속 정합.)
//
// 호출:
//   node --experimental-strip-types sprint9-spawn-prompt-update.mjs
//   → 7 워커 정의 (`.claude/agents/{conversation,designer,engine,mobile,
//     orchestrator,mobile,designer,tester}.md`) raw text 검증:
//      4 종 검증 토큰 모두 8 파일 OR 매칭 (각 토큰 별 ≥ 1 파일 출현):
//        (1) "외부 데이터 독립성 1차 분류 의무"      — 헌법 9 raw text
//        (2) "Dormant code 패턴 valid 4 조건"         — 헌법 10 raw text
//        (3) "Directive 진단 원인 mismatch"           — 헌법 11 raw text
//        (4) "D-S9-no-pakda-term"                     — 헌법 12 (PM frozen) raw text
//   → exit 0 + stdout:
//      "spawn_prompt_update_pass=1;workers_with_constitution=<n>"
//
// dev doc §3 line 52 + §4 line 82~85 정합 — 7 워커 정의 갱신 (단일 작성자
// 시간창 PM, 헌법 #4 강제). 본 fixture 는 메타 정합 가드.
// Sprint 13 commit 7419216 정렬 후 team-leader 폐기. Sprint 15 T1 stale 토큰 정리.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const WORKERS = [
  'conversation',
  'designer',
  'engine',
  'mobile',
  'orchestrator',
  'storage',
  'tester',
];

const REQUIRED_TOKENS = [
  '외부 데이터 독립성 1차 분류 의무',
  'Dormant code 패턴 valid 4 조건',
  'Directive 진단 원인 mismatch',
  'D-S9-no-pakda-term',
];

const missingFiles = [];
const workerTexts = new Map();
for (const w of WORKERS) {
  const p = resolve(ROOT, `.claude/agents/${w}.md`);
  if (!existsSync(p)) {
    missingFiles.push(p);
    continue;
  }
  workerTexts.set(w, readFileSync(p, 'utf8'));
}
if (missingFiles.length > 0) {
  for (const f of missingFiles) console.error(`  워커 정의 미존재: ${f}`);
  process.exit(3);
}

// 각 토큰이 ≥ 1 워커 파일에 등장 (OR 매칭 정합).
const missingTokens = [];
for (const token of REQUIRED_TOKENS) {
  const found = WORKERS.some((w) => workerTexts.get(w).includes(token));
  if (!found) {
    missingTokens.push(token);
  }
}
if (missingTokens.length > 0) {
  for (const t of missingTokens) {
    console.error(`  8 워커 정의 어디에도 토큰 '${t}' 미등장`);
  }
  process.exit(4);
}

// 4 토큰 모두 등장하는 워커 파일 카운트 (메타 보고용).
let workersWithAll = 0;
for (const w of WORKERS) {
  const text = workerTexts.get(w);
  if (REQUIRED_TOKENS.every((t) => text.includes(t))) {
    workersWithAll += 1;
  }
}

process.stdout.write(
  `spawn_prompt_update_pass=1;workers_with_constitution=${workersWithAll}`,
);
