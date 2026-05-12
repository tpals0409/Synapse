// Sprint 7 receipt — T14 (team-leader: consumer-producer-gap 정책 + spawn prompt 갱신) raw text 검증.
// (Sprint 11 /end 긴급 통합 수정: c460712 의 .claude/commands → .claude/agents 구조 swap 후속 정합.)
//
// 호출:
//   node --experimental-strip-types sprint7-contract-gap-policy.mjs
//   → .claude/agents/{team-leader,mobile,engine,conversation,orchestrator,storage,designer,tester}.md 8 파일 안에
//      세 가지 raw text 모두 박힘:
//        (i)   D-S7-consumer-producer-gap-policy
//        (ii)  consumer 슬라이스 시작 시 producer §7 계약 gap 사전 진단 1회 의무 (Sprint 6 retrospective)
//        (iii) root index 변경 보고 직전 grep 검증 1회 의무 (memory feedback_root_index_grep)
//   → 각 파일에 세 패턴 모두 등장 → exit 0 + stdout:
//      "contract_gap_policy_pass=1;files=<n>;policy_marks=<n>"

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const COMMANDS_DIR = resolve(ROOT, '.claude/agents');
const FILES = [
  'team-leader.md',
  'mobile.md',
  'engine.md',
  'conversation.md',
  'orchestrator.md',
  'storage.md',
  'designer.md',
  'tester.md',
];

const PATTERNS = [
  'D-S7-consumer-producer-gap-policy',
  // (ii) consumer 사전 진단 의무 — 'consumer' + '사전 진단' 모두 등장.
  ['consumer', '사전 진단'],
  // (iii) root index grep 의무 — 'root index' + 'grep' 모두 등장.
  ['root index', 'grep'],
];

const errors = [];
let policyMarks = 0;

for (const f of FILES) {
  const p = resolve(COMMANDS_DIR, f);
  if (!existsSync(p)) {
    errors.push(`${f}: 파일 누락`);
    continue;
  }
  const text = readFileSync(p, 'utf8');
  for (const pat of PATTERNS) {
    if (typeof pat === 'string') {
      if (!text.includes(pat)) {
        errors.push(`${f}: '${pat}' 미발견`);
      } else {
        policyMarks += 1;
      }
    } else {
      // 모든 sub-token 등장 검증.
      const allPresent = pat.every((s) => text.includes(s));
      if (!allPresent) {
        errors.push(`${f}: 패턴 [${pat.join(' + ')}] 미발견`);
      } else {
        policyMarks += 1;
      }
    }
  }
}

if (errors.length > 0) {
  for (const err of errors) console.error(`  ${err}`);
  console.error(`contract_gap_policy: ${errors.length} 건 미박힘`);
  process.exit(3);
}

process.stdout.write(
  `contract_gap_policy_pass=1;files=${FILES.length};policy_marks=${policyMarks}`,
);
