// Sprint 8 receipt — T1 (team-leader: PII 처리 정책 frozen) raw text 검증.
//
// 호출:
//   node --experimental-strip-types sprint8-pii-policy.mjs
//   → docs/sprints/sprint-8-pii-policy.md 존재 + 5 종 anonymize 규칙 raw text 박힘:
//        (1) 사용자 식별자 hash (SHA-256)
//        (2) raw 텍스트 격리
//        (3) 임베딩
//        (4) 메타
//        (5) 학습 합의 양식
//   → exit 0 + stdout:
//      "pii_policy_pass=1;pii_policy_marks=<n>"
//
// 디폴트 (dev doc §3 In + §4 Architecture):
//   - 사용자 식별자 → SHA-256 hash (salt = sprint-8-salt)
//   - raw 텍스트 → 격리 (학습 데이터 합의 시에만 별도 채널)
//   - 임베딩 / 메타 / event 통계만 → docs/sprints/sprint-8-data/raw/<session-hash>.json

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const POLICY_PATH = resolve(ROOT, 'docs/sprints/sprint-8-pii-policy.md');
if (!existsSync(POLICY_PATH)) {
  console.error(`docs/sprints/sprint-8-pii-policy.md 미존재 — T1 미완료`);
  process.exit(3);
}

const text = readFileSync(POLICY_PATH, 'utf8');

// 5 종 anonymize 규칙 — PII 정책 파일 §5 (raw text fixture 검증 키워드) 와 1:1 정합.
// (memory feedback_receipt_external_contract — fixture 가 외부 contract 를 가드.)
// 각 항목은 OR 그룹 (alternates) — 그룹 안 적어도 하나의 sub-token 묶음 모두 등장 시 PASS.
const RULES = [
  {
    name: 'Rule 1: 사용자 식별자 hash',
    alternates: [['SHA-256 hash', 'sprint-8-salt']],
  },
  {
    name: 'Rule 2: raw text 격리',
    alternates: [['raw text 격리']],
  },
  {
    name: 'Rule 3: 임베딩 보존',
    alternates: [['임베딩 보존'], ['768d']],
  },
  {
    name: 'Rule 4: 메타 통계 보존',
    alternates: [['메타 통계 보존']],
  },
  {
    name: 'Rule 5: 학습 데이터 합의 양식',
    alternates: [['학습 데이터 합의 양식'], ['opt-in-raw-text']],
  },
];

let marks = 0;
const missing = [];
for (const r of RULES) {
  // alternates 중 하나의 그룹에 속한 모든 token 이 등장하면 PASS.
  const ok = r.alternates.some((group) => group.every((t) => text.includes(t)));
  if (ok) {
    marks += 1;
  } else {
    missing.push(r.name);
  }
}

if (marks < 5) {
  for (const m of missing) console.error(`  pii-policy.md 안에 규칙 '${m}' 미박힘`);
  console.error(`pii-policy: 5 종 중 ${marks} 건 박힘 — T1 미완료`);
  process.exit(4);
}

process.stdout.write(`pii_policy_pass=1;pii_policy_marks=${marks}`);
