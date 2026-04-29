// Sprint 4 (T6) — Recall surface 컴포넌트의 motion 토큰 인식 + 카피 매핑 정합성.
//
// 본 테스트는 .tsx 컴포넌트 자체를 import 하지 *못한다* (node --experimental-strip-types
// 는 .tsx 미지원). 대신 컴포넌트별 motion 토큰 사용 명세를 *데이터*로 표현하고,
// motion 객체와 copy 객체가 그 명세를 지원하는지를 검증한다.
//
// 4 컴포넌트 (mobile T7 가 mount 검증):
//   - GhostHint     → motion.ghostBreathe + motion.recallEmerge,    copy.recall.ghost
//   - SuggestionCard → motion.recallEmerge + motion.synapsePulse,    copy.recall.suggestion
//   - StrongRecall  → motion.recallEmerge + motion.threadDraw + motion.synapsePulse, copy.recall.strong
//   - InspectorList → motion.nodeOrbit,                              copy.recall.inspector
//
// 컴포넌트 코드의 `*MotionTokens` 상수는 mobile T7 가 import 시점에 동일 토큰 셋을
// runtime check 하도록 export — 본 파일은 명세의 *기대값* 을 동결.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motion, copy } from '../index.ts';

type RecallSurface = 'ghost' | 'suggestion' | 'strong' | 'inspector';

const SURFACE_MOTION_TOKENS: Record<RecallSurface, ReadonlyArray<keyof typeof motion>> = {
  ghost: ['ghostBreathe', 'recallEmerge'],
  suggestion: ['recallEmerge', 'synapsePulse'],
  strong: ['recallEmerge', 'threadDraw', 'synapsePulse'],
  inspector: ['nodeOrbit'],
};

test('각 recall surface 가 사용하는 motion 토큰이 motion 객체에 모두 존재', () => {
  for (const [surface, tokens] of Object.entries(SURFACE_MOTION_TOKENS)) {
    for (const token of tokens) {
      assert.ok(motion[token], `surface ${surface} requires motion.${token}`);
      assert.equal(typeof motion[token].duration, 'number');
    }
  }
});

test('각 recall surface 의 copy.{ko,en}.recall.<surface> 가 존재 + title/subtitle 채워짐', () => {
  for (const surface of Object.keys(SURFACE_MOTION_TOKENS) as RecallSurface[]) {
    for (const lang of ['ko', 'en'] as const) {
      const v = copy[lang].recall[surface];
      assert.ok(v, `${lang}.recall.${surface} missing`);
      assert.ok(v.title.length > 0, `${lang}.recall.${surface}.title empty`);
      assert.ok(v.subtitle.length > 0, `${lang}.recall.${surface}.subtitle empty`);
    }
  }
});

test('synapse-pulse 사용 surface (suggestion / strong) 가 keyframe 진실원 (0.55↔1, 1↔1.18) 과 일관', () => {
  // T6 spec: SuggestionCard 는 1 회, StrongRecall 은 반복.
  const tokens = motion.synapsePulse;
  assert.equal(tokens.from.opacity, 0.55);
  assert.equal(tokens.mid.opacity, 1);
  assert.equal(tokens.from.scale, 1);
  assert.equal(tokens.mid.scale, 1.18);
});

test('thread-draw 사용 surface (strong) 의 stroke-dashoffset 키프레임 80 → 0 일관', () => {
  assert.equal(motion.threadDraw.from.strokeDashoffset, 80);
  assert.equal(motion.threadDraw.to.strokeDashoffset, 0);
});

test('node-orbit 사용 surface (inspector) 의 회전 0 → 360 일관 + radius 14', () => {
  assert.equal(motion.nodeOrbit.from.rotate, 0);
  assert.equal(motion.nodeOrbit.to.rotate, 360);
  assert.equal(motion.nodeOrbit.radius, 14);
});

test('recall surface 4 종 모두 surface map 에 등록 (drift guard)', () => {
  const surfaces = Object.keys(SURFACE_MOTION_TOKENS).sort();
  assert.deepEqual(surfaces, ['ghost', 'inspector', 'strong', 'suggestion']);
});
