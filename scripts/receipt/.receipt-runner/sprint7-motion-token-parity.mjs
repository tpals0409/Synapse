// Sprint 7 receipt — motion 토큰 ↔ 디자인 목업 styles.css raw text fs 매칭.
//
// 호출:
//   node --experimental-strip-types sprint7-motion-token-parity.mjs
//   → MOTION_MOCKUP_PARITY (design-system root index export) 의 토큰별로
//      (1) 디자인 목업 styles.css 안에 `@keyframes <keyframeName>` 문자열 존재
//      (2) design-system motion 정의 의 duration / easing / iterations 가
//          MOTION_MOCKUP_PARITY 메타와 정확히 일치 (drift = 0)
//   → exit 0 + stdout: "motion_token_parity_drift=<n>;tokens_checked=<m>;keyframes_found=<k>"
//
// 외부 contract 가드 (carry-over feedback_receipt_external_contract):
//   design-system root index 의 motion / MOTION_MOCKUP_PARITY export 누락 시 첫 import 단계 실패.
//
// 임계 (D-S7-receipt-threshold-recovery): motion_token_parity_drift = 0 (한 건 mismatch 도 fail).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const ds = await import('@synapse/design-system');

if (!ds.motion || typeof ds.motion !== 'object') {
  console.error('design-system.motion 미export from @synapse/design-system root index');
  process.exit(3);
}
if (!Array.isArray(ds.MOTION_MOCKUP_PARITY)) {
  console.error('design-system.MOTION_MOCKUP_PARITY 미export from @synapse/design-system root index');
  process.exit(3);
}

const stylesCss = readFileSync(resolve(ROOT, '디자인 목업/styles.css'), 'utf8');

let drift = 0;
let keyframesFound = 0;
const errors = [];

for (const entry of ds.MOTION_MOCKUP_PARITY) {
  // (1) styles.css 안에 @keyframes <name> 존재.
  const keyframePattern = `@keyframes ${entry.keyframeName}`;
  if (!stylesCss.includes(keyframePattern)) {
    drift += 1;
    errors.push(`token=${entry.token}: '${keyframePattern}' 디자인 목업 styles.css 미존재`);
    continue;
  }
  keyframesFound += 1;

  // (2) motion 정의의 duration / easing / iterations 가 MOTION_MOCKUP_PARITY 와 일치.
  const tok = ds.motion[entry.token];
  if (!tok) {
    drift += 1;
    errors.push(`token=${entry.token}: design-system.motion[${entry.token}] 미정의`);
    continue;
  }
  if (tok.duration !== entry.mockupDuration) {
    drift += 1;
    errors.push(
      `token=${entry.token}: duration drift — motion=${tok.duration} ↔ mockup=${entry.mockupDuration}`,
    );
  }
  if (tok.easing !== entry.mockupEasing) {
    drift += 1;
    errors.push(
      `token=${entry.token}: easing drift — motion='${tok.easing}' ↔ mockup='${entry.mockupEasing}'`,
    );
  }
  // [DIRECTIVE D-S7-tester-motion-token-parity-narrowing] mockupIterations 는 loop 토큰
  // (ghostBreatheLoop / synapsePulse / nodeOrbit) 에만 존재. 'in' guard 로 narrowing —
  // one-shot 토큰 (inkRise / recallEmerge / threadDraw) 는 비교 0회 (receipt 의도 정합).
  // tok.iterations 도 동일 — motion union 안에서 loop 토큰만 박혀있음.
  if ('mockupIterations' in entry) {
    const tokIter = 'iterations' in tok ? tok.iterations : undefined;
    if (tokIter !== entry.mockupIterations) {
      drift += 1;
      errors.push(
        `token=${entry.token}: iterations drift — motion=${String(tokIter)} ↔ mockup=${String(entry.mockupIterations)}`,
      );
    }
  }
}

if (drift > 0) {
  for (const err of errors) console.error(`  ${err}`);
  console.error(`motion_token_parity_drift=${drift} (≠ 0)`);
  process.exit(4);
}

process.stdout.write(
  `motion_token_parity_drift=${drift};tokens_checked=${ds.MOTION_MOCKUP_PARITY.length};keyframes_found=${keyframesFound}`,
);
