// Sprint 8 receipt — T6 (engine: Concept dedup / alias merge) 분기 검증.
//
// 호출:
//   node --experimental-strip-types sprint8-concept-dedup.mjs
//   → 두 분기 중 하나 PASS:
//      (A) packages/engine/src/dedupConcepts.ts 존재 +
//          packages/engine/__tests__/dedup-concepts.test.ts 존재 +
//          packages/engine/index.ts 가 root index 에서 export
//          (헌법 6 — root index export 의무, fixture root index import 의무).
//      (B) Sprint 8 dev doc §11 Decisions Made 안에
//          `[FROZEN v2026-04-30 D-S8-concept-dedup-decision]` + 보류 사유 박힘.
//   → exit 0 + stdout:
//      "concept_dedup_pass=1;branch=<A|B>"
//
// 분기 우선순위: A (구현) → B (보류 frozen). 둘 다 부재 시 fail.
// 메모리 정합 (feedback_receipt_external_contract): A 분기에서 root index 에서
// 'dedupConcepts' 심볼이 import 가능한지 raw text 검사.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

// ---------- 분기 A: 구현 ----------
function tryBranchA() {
  const SRC = resolve(ROOT, 'packages/engine/src/dedupConcepts.ts');
  const TEST = resolve(ROOT, 'packages/engine/__tests__/dedup-concepts.test.ts');
  const ROOT_INDEX = resolve(ROOT, 'packages/engine/index.ts');

  if (!existsSync(SRC)) {
    return { ok: false, reason: `${SRC} 미존재` };
  }
  if (!existsSync(TEST)) {
    return { ok: false, reason: `${TEST} 미존재` };
  }
  if (!existsSync(ROOT_INDEX)) {
    return { ok: false, reason: `packages/engine/index.ts 미존재` };
  }

  const rootIndexText = readFileSync(ROOT_INDEX, 'utf8');
  // grep 1 회 의무 (memory feedback_root_index_grep).
  if (!rootIndexText.includes('dedupConcepts')) {
    return {
      ok: false,
      reason: 'packages/engine/index.ts 에 dedupConcepts re-export 미박힘 (헌법 6 root index grep)',
    };
  }

  return { ok: true };
}

// ---------- 분기 B: 보류 frozen ----------
function tryBranchB() {
  const DEV_DOC = resolve(ROOT, 'docs/sprints/sprint-8-external-validation.md');
  if (!existsSync(DEV_DOC)) {
    return { ok: false, reason: 'Sprint 8 dev doc 미존재' };
  }
  const text = readFileSync(DEV_DOC, 'utf8');

  const dec11Idx = text.indexOf('## 11. Decisions Made');
  const carry12Idx = text.indexOf('## 12.');
  if (dec11Idx < 0) {
    return { ok: false, reason: '§11 Decisions Made 섹션 헤더 미발견' };
  }
  const decSection = text.slice(dec11Idx, carry12Idx > 0 ? carry12Idx : text.length);

  // frozen-flag-audit lint 정합 — exact 또는 ` = <suffix>` form 모두 valid.
  const FROZEN_RE = new RegExp('\\[FROZEN v2026-04-30 D-S8-concept-dedup-decision(\\]| |=)');
  if (!FROZEN_RE.test(decSection)) {
    return { ok: false, reason: "'[FROZEN ... D-S8-concept-dedup-decision...]' 미박힘" };
  }

  const reasons = ['보류', '신호 부재', '데이터 부족', '미구현'];
  const hasReason = reasons.some((r) => decSection.includes(r));
  if (!hasReason) {
    return { ok: false, reason: '보류 사유 키워드 미박힘' };
  }

  return { ok: true };
}

const a = tryBranchA();
if (a.ok) {
  process.stdout.write(`concept_dedup_pass=1;branch=A`);
  process.exit(0);
}
const b = tryBranchB();
if (b.ok) {
  process.stdout.write(`concept_dedup_pass=1;branch=B`);
  process.exit(0);
}

console.error(`concept-dedup: 두 분기 모두 fail`);
console.error(`  A (구현): ${a.reason}`);
console.error(`  B (보류 frozen): ${b.reason}`);
process.exit(3);
