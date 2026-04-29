import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copy } from '../index.ts';

// Recursive key-shape extraction (object structure only, not values).
function shape(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return typeof value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    out[key] = shape((value as Record<string, unknown>)[key]);
  }
  return out;
}

test('copy: ko and en have identical recursive key shape (parity)', () => {
  assert.deepEqual(shape(copy.ko), shape(copy.en));
});

test('copy: top-level langs are exactly { ko, en }', () => {
  assert.deepEqual(Object.keys(copy).sort(), ['en', 'ko']);
});

test('copy: required keys for Sprint 1 screens exist (ko)', () => {
  assert.equal(typeof copy.ko.appName, 'string');
  assert.equal(typeof copy.ko.tagline, 'string');
  assert.equal(typeof copy.ko.onboarding.hi, 'string');
  assert.equal(typeof copy.ko.onboarding.sub, 'string');
  assert.equal(typeof copy.ko.onboarding.cta, 'string');
  assert.equal(typeof copy.ko.onboarding.hint, 'string');
  assert.equal(typeof copy.ko.firstChat.placeholder, 'string');
  assert.equal(typeof copy.ko.firstChat.empty, 'string');
  assert.equal(typeof copy.ko.firstChat.error, 'string');
});

test('copy.ko 1:1 with 디자인 목업/content.jsx COPY (key spot checks)', () => {
  // These constants must mirror 디자인 목업/content.jsx COPY.ko exactly.
  assert.equal(copy.ko.appName, 'Synapse');
  assert.equal(copy.ko.tagline, '남긴 건 사라지지 않고, 필요할 때 다시 나온다');
  assert.equal(copy.ko.onboarding.hi, '안녕하세요.');
  assert.equal(copy.ko.onboarding.sub, '그냥 이야기해보세요.\n나머지는 제가 기억할게요.');
  assert.equal(copy.ko.onboarding.cta, '시작하기');
  assert.equal(copy.ko.onboarding.hint, '기억은 자동으로 만들어집니다');
  assert.equal(copy.ko.firstChat.placeholder, '무엇이든 말해보세요…');
});

test('copy.en 1:1 with 디자인 목업/content.jsx COPY (key spot checks)', () => {
  assert.equal(copy.en.appName, 'Synapse');
  assert.equal(copy.en.onboarding.hi, 'Hello.');
  assert.equal(copy.en.onboarding.sub, "Just talk.\nI'll remember the rest.");
  assert.equal(copy.en.onboarding.cta, 'Begin');
  assert.equal(copy.en.firstChat.placeholder, 'Say anything…');
});

// Sprint 3 — CaptureToast 카피 1:1 (디자인 목업/content.jsx COPY.{ko,en}.captured / capturedSub).
test('copy.{ko,en}.firstChat.captured 1:1 with 디자인 목업 COPY.captured', () => {
  assert.equal(copy.ko.firstChat.captured, '방금 기억됨');
  assert.equal(copy.en.firstChat.captured, 'Just remembered');
});

test('copy.{ko,en}.firstChat.capturedSub 1:1 with 디자인 목업 COPY.capturedSub', () => {
  assert.equal(copy.ko.firstChat.capturedSub, '이 생각은 당신의 그래프에 연결됐어요');
  assert.equal(copy.en.firstChat.capturedSub, 'Linked into your graph');
});
