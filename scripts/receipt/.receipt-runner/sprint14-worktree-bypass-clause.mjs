// Sprint 14 receipt — Step 71: worktree-bypass-clause.
//
// 호출:
//   node --experimental-strip-types sprint14-worktree-bypass-clause.mjs
//   → .claude/agents/*.md 7 파일 모두에 헌법 #13
//     (D-S14-worktree-bypass-prohibition) 조항이 raw text 로 기록됐는지 검증.
//     Sprint 13 §11 O-S13-tester-worktree-bypass first 사례의 영구 가드.
//   → exit 0 + stdout:
//      "worktree_bypass_clause_count=7;agents_scanned=<n>"
//
// 정책 (메모리 feedback_worker_worktree_bypass):
//   Sprint 13 T3 tester 가 isolation=worktree 무시 후 main repo 에 직접
//   commit. 헌법 #13 신규로 추가됨 — 모든 워커는 자기 worktree 안에서만
//   Edit/Write/Bash commit. 본 fixture 는 그 조항이 7 파일 모두에 박혔는지
//   메타-검증 (조항 자체가 모든 워커에게 visibility 갖도록).
//
// 검증 항목 (각 7 파일에 대해 모두 PASS 시 exit 0):
//   (A) 'D-S14-worktree-bypass-prohibition' 토큰 1+ 매칭.
//   (B) 'pwd' 토큰 1+ 매칭 — 시작 시 worktree path 확인 명령.
//   (C) 'git rev-parse --show-toplevel' 토큰 1+ 매칭 — commit 직전 검증 명령.
//   (D) '절대경로' 토큰 1+ 매칭 — main repo 직접 commit 금지 raw text.
//
// 7 파일 중 1+ 가 위 (A)~(D) 중 1+ 미매칭 = exit 1.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const AGENTS_DIR = resolve(ROOT, '.claude/agents');
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
  { label: 'frozen-id', token: 'D-S14-worktree-bypass-prohibition' },
  { label: 'pwd', token: 'pwd' },
  { label: 'rev-parse-toplevel', token: 'git rev-parse --show-toplevel' },
  { label: 'absolute-path', token: '절대경로' },
];

const failures = [];
let passed = 0;

for (const w of WORKERS) {
  const file = resolve(AGENTS_DIR, `${w}.md`);
  if (!existsSync(file)) {
    failures.push(`.claude/agents/${w}.md 미존재 — 7 워커 정렬 회귀.`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  const missing = [];
  for (const { label, token } of REQUIRED_TOKENS) {
    if (!text.includes(token)) {
      missing.push(`${label}("${token}")`);
    }
  }
  if (missing.length > 0) {
    failures.push(`.claude/agents/${w}.md 안 미매칭: ${missing.join(', ')}`);
  } else {
    passed += 1;
  }
}

if (failures.length > 0) {
  console.error(`헌법 #13 (D-S14-worktree-bypass-prohibition) 조항 회귀:`);
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    `→ 7 파일 모두에 (a) 'D-S14-worktree-bypass-prohibition' frozen ID + ` +
      `(b) 'pwd' + (c) 'git rev-parse --show-toplevel' + (d) '절대경로' raw text ` +
      `기록 의무 (memory: feedback_worker_worktree_bypass).`,
  );
  process.exit(2);
}

if (passed !== 7) {
  console.error(`worktree_bypass_clause_count=${passed} != 7 — 7 워커 정렬 회귀.`);
  process.exit(3);
}

process.stdout.write(
  `worktree_bypass_clause_count=${passed};agents_scanned=${WORKERS.length}`,
);
