// Sprint 8 receipt — T7 (engine + conversation: LLM-based negation classifier) 3 분기 검증.
//
// 호출:
//   node --experimental-strip-types sprint8-negation-classifier.mjs
//   → 세 분기 중 하나 PASS:
//      (B) LLM 도입 — engine + conversation 양쪽 박음:
//          - packages/engine/src/negationClassifier.ts (classifyNegationWithLLM 빌더)
//          - packages/engine/__tests__/negation-classifier.test.ts
//          - packages/engine/index.ts 에 ClassifyNegationFn re-export
//          - packages/conversation/src/loop.ts 에 classifyNegation 옵션 함수 DI 추기
//          - packages/conversation/index.ts 에 ClassifyNegationFn re-export
//      (A) heuristic 강화 — engine 측 변경 0 + conversation 측 retraction.ts regex
//          alternation 보강 (KO_RETRACTION / EN_RETRACTION) + dev doc §11 frozen 박힘.
//      (C) 보류 frozen — Sprint 8 dev doc §11 안에
//          `[FROZEN v2026-04-30 D-S8-negation-classifier-decision]` + 보류 사유 박힘.
//   → exit 0 + stdout:
//      "negation_classifier_pass=1;branch=<B|A|C>"
//
// 분기 우선순위: B → A → C. 셋 다 부재 시 fail.
//
// [DIRECTIVE v2026-04-30 D-S8-tester-step59-engine-path-verify] — fixture 가 ACK 합의
// (dev doc §7 line 383~) 와 1:1 정합. engine `classifyNegationWithLLM(opts?)` 빌더 +
// conversation `loop.ts` 옵션 함수 DI + 양쪽 root index re-export 모두 verify.
//
// [DIRECTIVE v2026-04-30 D-S8-tester-step57-false-positive 정합] — 주석 line 제외 매칭.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

// TS/JS 본문에서 `// ...` 또는 ` * ...` (JSDoc 본문) line 제외.
function stripTsLineComments(src) {
  return src
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      if (t.startsWith('//')) return false;
      if (t.startsWith('*') && !t.startsWith('*/')) return false;
      if (t.startsWith('/*') || t === '*/') return false;
      return true;
    })
    .join('\n');
}

// ---------- 분기 B: LLM 도입 (ACK 합의 양쪽 박음) ----------
function tryBranchB() {
  const ENGINE_LLM = resolve(ROOT, 'packages/engine/src/negationClassifier.ts');
  const ENGINE_TEST = resolve(ROOT, 'packages/engine/__tests__/negation-classifier.test.ts');
  const ENGINE_ROOT = resolve(ROOT, 'packages/engine/index.ts');
  const CONV_LOOP = resolve(ROOT, 'packages/conversation/src/loop.ts');
  const CONV_ROOT = resolve(ROOT, 'packages/conversation/index.ts');

  if (!existsSync(ENGINE_LLM)) {
    return { ok: false, reason: `${ENGINE_LLM} 미존재 (engine builder 박음 필수)` };
  }
  if (!existsSync(ENGINE_TEST)) {
    return { ok: false, reason: `${ENGINE_TEST} 미존재 (engine 단위 테스트 필수)` };
  }
  if (!existsSync(ENGINE_ROOT)) {
    return { ok: false, reason: `${ENGINE_ROOT} 미존재` };
  }
  if (!existsSync(CONV_LOOP)) {
    return { ok: false, reason: `${CONV_LOOP} 미존재` };
  }
  if (!existsSync(CONV_ROOT)) {
    return { ok: false, reason: `${CONV_ROOT} 미존재` };
  }

  // engine builder 본문에 classifyNegationWithLLM symbol.
  const engineLLMText = stripTsLineComments(readFileSync(ENGINE_LLM, 'utf8'));
  if (!engineLLMText.includes('classifyNegationWithLLM')) {
    return {
      ok: false,
      reason:
        'packages/engine/src/negationClassifier.ts 에 classifyNegationWithLLM symbol 미박힘 (ACK 합의 — engine builder)',
    };
  }

  // conversation loop.ts 본문에 classifyNegation DI hook.
  const convLoopText = stripTsLineComments(readFileSync(CONV_LOOP, 'utf8'));
  if (!convLoopText.includes('classifyNegation')) {
    return {
      ok: false,
      reason:
        'packages/conversation/src/loop.ts 에 classifyNegation 옵션 함수 DI 미박힘 (ACK 합의 — RetractionHookDeps 추기)',
    };
  }

  // engine + conversation 양쪽 root index 에서 ClassifyNegationFn re-export (헌법 6 root index grep).
  const engineRootText = readFileSync(ENGINE_ROOT, 'utf8');
  if (!engineRootText.includes('ClassifyNegationFn') && !engineRootText.includes('classifyNegationWithLLM')) {
    return {
      ok: false,
      reason:
        'packages/engine/index.ts 에 ClassifyNegationFn / classifyNegationWithLLM re-export 미박힘 (헌법 6 root index grep)',
    };
  }
  const convRootText = readFileSync(CONV_ROOT, 'utf8');
  if (!convRootText.includes('ClassifyNegationFn')) {
    return {
      ok: false,
      reason:
        'packages/conversation/index.ts 에 ClassifyNegationFn re-export 미박힘 (헌법 6 root index grep)',
    };
  }

  return { ok: true };
}

// ---------- 분기 A: heuristic 강화 (ACK 합의 — conversation/retraction.ts regex 보강) ----------
function tryBranchA() {
  const RETRACTION = resolve(ROOT, 'packages/conversation/src/retraction.ts');
  if (!existsSync(RETRACTION)) {
    return { ok: false, reason: `${RETRACTION} 미존재 (heuristic 강화 채택 시 retraction.ts 필수)` };
  }

  const txt = stripTsLineComments(readFileSync(RETRACTION, 'utf8'));
  // KO_RETRACTION / EN_RETRACTION regex alternation 박힘 (Sprint 6 그대로 보존).
  const hasKoRegex = txt.includes('KO_RETRACTION');
  const hasEnRegex = txt.includes('EN_RETRACTION');
  if (!hasKoRegex || !hasEnRegex) {
    return {
      ok: false,
      reason: 'KO_RETRACTION / EN_RETRACTION regex symbol 미박힘 (Sprint 6 retraction 패턴 부재)',
    };
  }

  // dev doc §11 안에 heuristic 강화 결정 frozen + 사유.
  const DEV_DOC = resolve(ROOT, 'docs/sprints/sprint-8-external-validation.md');
  if (!existsSync(DEV_DOC)) return { ok: false, reason: 'Sprint 8 dev doc 미존재' };
  const text = readFileSync(DEV_DOC, 'utf8');
  const dec11Idx = text.indexOf('## 11. Decisions Made');
  const carry12Idx = text.indexOf('## 12.');
  if (dec11Idx < 0) return { ok: false, reason: '§11 Decisions Made 섹션 헤더 미발견' };
  const decSection = text.slice(dec11Idx, carry12Idx > 0 ? carry12Idx : text.length);

  // 분기 A 는 *명시적 heuristic 강화 채택 suffix* 만 PASS (보류 suffix 는 분기 C 영역).
  // suffix form: `[FROZEN ... -decision = heuristic 강화]` OR `... = 강화 채택]` OR `... = A안]`.
  // suffix 부재 (`...-decision]` exact) 는 모호 — 보류 분기 C 와 충돌. PM 의사 명시 강제.
  const A_SUFFIX_RE = new RegExp(
    '\\[FROZEN v2026-04-30 D-S8-negation-classifier-decision\\s*=\\s*(?:heuristic|강화|A안)',
  );
  if (!A_SUFFIX_RE.test(decSection)) {
    return {
      ok: false,
      reason:
        '[FROZEN ... D-S8-negation-classifier-decision = heuristic 강화 / 강화 / A안] 명시 suffix 미박힘 (보류 suffix 는 분기 C 영역)',
    };
  }
  return { ok: true };
}

// ---------- 분기 C: 보류 frozen ----------
function tryBranchC() {
  const DEV_DOC = resolve(ROOT, 'docs/sprints/sprint-8-external-validation.md');
  if (!existsSync(DEV_DOC)) return { ok: false, reason: 'Sprint 8 dev doc 미존재' };
  const text = readFileSync(DEV_DOC, 'utf8');

  const dec11Idx = text.indexOf('## 11. Decisions Made');
  const carry12Idx = text.indexOf('## 12.');
  if (dec11Idx < 0) return { ok: false, reason: '§11 Decisions Made 섹션 헤더 미발견' };
  const decSection = text.slice(dec11Idx, carry12Idx > 0 ? carry12Idx : text.length);

  const FROZEN_RE = new RegExp('\\[FROZEN v2026-04-30 D-S8-negation-classifier-decision(\\]| |=)');
  if (!FROZEN_RE.test(decSection)) return { ok: false, reason: '[FROZEN ... D-S8-negation-classifier-decision...] 미박힘' };

  const reasons = ['보류', '신호 부재', '데이터 부족', '미구현'];
  const hasReason = reasons.some((r) => decSection.includes(r));
  if (!hasReason) return { ok: false, reason: '보류 사유 키워드 미박힘' };

  return { ok: true };
}

// 우선순위: B (LLM 도입 — engine + conversation 양쪽 코드) → C (보류 frozen — 명시 보류 suffix)
//          → A (heuristic 강화 — 명시 강화 suffix). 명시 suffix 충돌 회피.
const b = tryBranchB();
if (b.ok) {
  process.stdout.write(`negation_classifier_pass=1;branch=B`);
  process.exit(0);
}
const c = tryBranchC();
if (c.ok) {
  process.stdout.write(`negation_classifier_pass=1;branch=C`);
  process.exit(0);
}
const a = tryBranchA();
if (a.ok) {
  process.stdout.write(`negation_classifier_pass=1;branch=A`);
  process.exit(0);
}

console.error(`negation-classifier: 세 분기 모두 fail`);
console.error(`  B (LLM 도입 — engine + conversation 양쪽): ${b.reason}`);
console.error(`  A (heuristic 강화 — conversation/retraction.ts): ${a.reason}`);
console.error(`  C (보류 frozen): ${c.reason}`);
process.exit(3);
