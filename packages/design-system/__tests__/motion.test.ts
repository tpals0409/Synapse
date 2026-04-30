import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  motion,
  MOTION_MOCKUP_PARITY,
  type MotionMockupParity,
} from '../index.ts';

test('motion.inkRise exists', () => {
  assert.ok(motion.inkRise);
});

test('motion.inkRise.duration is 400ms (mockup synapse-ui.jsx: ink-rise 0.4s)', () => {
  assert.equal(typeof motion.inkRise.duration, 'number');
  assert.equal(motion.inkRise.duration, 400);
});

test('motion.inkRise.easing is "ease-out" (mockup: ease-out)', () => {
  assert.equal(motion.inkRise.easing, 'ease-out');
});

test('motion.inkRise.from matches @keyframes from { opacity: 0; translateY: 6 }', () => {
  assert.equal(motion.inkRise.from.opacity, 0);
  assert.equal(motion.inkRise.from.translateY, 6);
});

test('motion.inkRise.to matches @keyframes to { opacity: 1; translateY: 0 }', () => {
  assert.equal(motion.inkRise.to.opacity, 1);
  assert.equal(motion.inkRise.to.translateY, 0);
});

test('motion: NO css string export (RN compatibility)', () => {
  // duration must be a plain number (ms), not a string like '0.4s'
  assert.equal(typeof motion.inkRise.duration, 'number');
  assert.notEqual(typeof motion.inkRise.duration, 'string');
});

// Sprint 3 — ghostBreathe (CaptureToast out-fade).
test('motion.ghostBreathe exists', () => {
  assert.ok(motion.ghostBreathe);
});

test('motion.ghostBreathe.duration is 600ms (CaptureToast out-fade)', () => {
  assert.equal(typeof motion.ghostBreathe.duration, 'number');
  assert.equal(motion.ghostBreathe.duration, 600);
});

test('motion.ghostBreathe.easing is "ease-in-out" (mockup ghost-breathe)', () => {
  assert.equal(motion.ghostBreathe.easing, 'ease-in-out');
});

test('motion.ghostBreathe.from/to is 1 → 0 (out-fade single direction)', () => {
  assert.equal(motion.ghostBreathe.from.opacity, 1);
  assert.equal(motion.ghostBreathe.to.opacity, 0);
});

// Sprint 4 (T6) — synapse-pulse / recall-emerge / thread-draw / node-orbit 정식 노출.
test('motion.synapsePulse 정식 노출 (carry-over 16): duration / iterations / 키프레임', () => {
  assert.ok(motion.synapsePulse);
  assert.equal(motion.synapsePulse.duration, 2400);
  assert.equal(motion.synapsePulse.easing, 'ease-in-out');
  assert.equal(motion.synapsePulse.iterations, 'infinite');
  // styles.css @keyframes synapse-pulse: 0,100%{opacity:0.55, scale:1}  50%{opacity:1, scale:1.18}
  assert.equal(motion.synapsePulse.from.opacity, 0.55);
  assert.equal(motion.synapsePulse.from.scale, 1);
  assert.equal(motion.synapsePulse.mid.opacity, 1);
  assert.equal(motion.synapsePulse.mid.scale, 1.18);
  assert.equal(motion.synapsePulse.to.opacity, 0.55);
  assert.equal(motion.synapsePulse.to.scale, 1);
});

test('motion.recallEmerge: blur 4→0 with 60% mid blur:0 + scale·translate', () => {
  assert.ok(motion.recallEmerge);
  assert.equal(motion.recallEmerge.duration, 600);
  assert.equal(motion.recallEmerge.easing, 'cubic-bezier(.2,.7,.3,1)');
  assert.equal(motion.recallEmerge.from.opacity, 0);
  assert.equal(motion.recallEmerge.from.translateY, 12);
  assert.equal(motion.recallEmerge.from.scale, 0.96);
  assert.equal(motion.recallEmerge.from.blur, 4);
  assert.equal(motion.recallEmerge.mid.blur, 0);
  assert.equal(motion.recallEmerge.to.opacity, 1);
  assert.equal(motion.recallEmerge.to.translateY, 0);
  assert.equal(motion.recallEmerge.to.scale, 1);
});

test('motion.threadDraw: stroke-dashoffset 80 → 0', () => {
  assert.ok(motion.threadDraw);
  assert.equal(motion.threadDraw.duration, 600);
  assert.equal(motion.threadDraw.from.strokeDashoffset, 80);
  assert.equal(motion.threadDraw.to.strokeDashoffset, 0);
});

test('motion.nodeOrbit: 2.4s linear infinite, radius 14', () => {
  assert.ok(motion.nodeOrbit);
  assert.equal(motion.nodeOrbit.duration, 2400);
  assert.equal(motion.nodeOrbit.easing, 'linear');
  assert.equal(motion.nodeOrbit.iterations, 'infinite');
  assert.equal(motion.nodeOrbit.radius, 14);
  assert.equal(motion.nodeOrbit.from.rotate, 0);
  assert.equal(motion.nodeOrbit.to.rotate, 360);
});

test('motion: 신규 토큰 모두 number duration (RN 호환, NO css string)', () => {
  for (const token of ['synapsePulse', 'recallEmerge', 'threadDraw', 'nodeOrbit'] as const) {
    assert.equal(typeof motion[token].duration, 'number', `${token}.duration must be number`);
  }
});

// Sprint 7 (T1) — ghost-breathe 호흡 패턴 신규 (목업 @keyframes 1:1).
test('motion.ghostBreatheLoop 신규 (Sprint 7): 목업 ghost-breathe 3s ease-in-out infinite + 0.42↔0.68 호흡', () => {
  assert.ok(motion.ghostBreatheLoop);
  assert.equal(motion.ghostBreatheLoop.duration, 3000);
  assert.equal(motion.ghostBreatheLoop.easing, 'ease-in-out');
  assert.equal(motion.ghostBreatheLoop.iterations, 'infinite');
  // styles.css @keyframes ghost-breathe: 0,100%{opacity:0.42}  50%{opacity:0.68}
  assert.equal(motion.ghostBreatheLoop.from.opacity, 0.42);
  assert.equal(motion.ghostBreatheLoop.mid.opacity, 0.68);
  assert.equal(motion.ghostBreatheLoop.to.opacity, 0.42);
});

test('motion.ghostBreathe (Sprint 3, CaptureToast out-fade) 동결 — Sprint 7 변경 0', () => {
  // 기존 토큰 변경 0 검증 — Sprint 3 의 의미 (out-fade) 그대로.
  assert.equal(motion.ghostBreathe.duration, 600);
  assert.equal(motion.ghostBreathe.from.opacity, 1);
  assert.equal(motion.ghostBreathe.to.opacity, 0);
});

// Sprint 7 (T1) — recall-emerge duration 변형 (StrongRecall 0.7s, HyperRecall 0.9s).
test('motion.recallEmergeStrong 신규 (Sprint 7): StrongRecall 700ms 변형, 키프레임은 base 와 동일', () => {
  assert.ok(motion.recallEmergeStrong);
  assert.equal(motion.recallEmergeStrong.duration, 700);
  assert.equal(motion.recallEmergeStrong.easing, 'cubic-bezier(.2,.7,.3,1)');
  assert.equal(motion.recallEmergeStrong.fillMode, 'both');
  assert.equal(motion.recallEmergeStrong.from.blur, 4);
  assert.equal(motion.recallEmergeStrong.mid.blur, 0);
  assert.equal(motion.recallEmergeStrong.to.blur, 0);
});

test('motion.recallEmergeHyper 신규 (Sprint 7): HyperRecall 900ms 변형', () => {
  assert.ok(motion.recallEmergeHyper);
  assert.equal(motion.recallEmergeHyper.duration, 900);
  assert.equal(motion.recallEmergeHyper.easing, 'cubic-bezier(.2,.7,.3,1)');
  assert.equal(motion.recallEmergeHyper.fillMode, 'both');
});

// Sprint 7 (T1) — fillMode 메타 보강 (목업 inline `both` 추적).
test('motion.inkRise.fillMode === "both" (목업 synapse-ui.jsx L86/L102/L430 inline `both` 1:1)', () => {
  assert.equal(motion.inkRise.fillMode, 'both');
});

test('motion.recallEmerge.fillMode === "both" (목업 SuggestionCard L207 inline `both` 1:1)', () => {
  assert.equal(motion.recallEmerge.fillMode, 'both');
});

// Sprint 7 (T1) — receipt motion-token-parity fixture 의 입력원 검증.
test('MOTION_MOCKUP_PARITY: 8 항목 (inkRise + ghostBreatheLoop + synapsePulse + recallEmerge×3 + threadDraw + nodeOrbit)', () => {
  assert.equal(MOTION_MOCKUP_PARITY.length, 8);
  const tokens = MOTION_MOCKUP_PARITY.map((p: MotionMockupParity) => p.token).sort();
  assert.deepEqual(tokens, [
    'ghostBreatheLoop',
    'inkRise',
    'nodeOrbit',
    'recallEmerge',
    'recallEmergeHyper',
    'recallEmergeStrong',
    'synapsePulse',
    'threadDraw',
  ]);
});

test('MOTION_MOCKUP_PARITY: 각 항목의 mockupDuration 이 motion[token].duration 과 1:1 일치', () => {
  for (const p of MOTION_MOCKUP_PARITY) {
    // p.token 은 MOTION_MOCKUP_PARITY 의 `as const` 로 union literal 이지만,
    // 명시 keyof 가드로 future drift 방지 (D-S7-designer-motion-test-export 정합).
    const tokenValue = motion[p.token as keyof typeof motion];
    assert.equal(tokenValue.duration, p.mockupDuration, `${p.token}.duration mismatch`);
    assert.equal(tokenValue.easing, p.mockupEasing, `${p.token}.easing mismatch`);
  }
});

test('MOTION_MOCKUP_PARITY: keyframeName 은 styles.css @keyframes 식별자 (kebab-case)', () => {
  for (const p of MOTION_MOCKUP_PARITY) {
    assert.match(p.keyframeName, /^[a-z]+(-[a-z]+)*$/, `${p.token} keyframeName must be kebab-case`);
  }
});
