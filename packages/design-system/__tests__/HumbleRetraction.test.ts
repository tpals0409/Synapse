// Sprint 6 (T6) [FROZEN D-S6-design-system-mockup-conflict-resolution] PM A안 채택.
// HumbleRetraction 컴포넌트 = retracted 메시지 시각 (ChatBubble.retracted prop X / 카드 mount).
//
// recall.test.ts 패턴: .tsx 컴포넌트 자체는 node --experimental-strip-types 환경에서 import 불가.
// raw text fs 매칭 + motion / copy 정합 검증.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { copy, motion } from '../index.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HUMBLE_PATH = path.resolve(HERE, '../src/components/HumbleRetraction.tsx');

test('HumbleRetraction: text prop 시그니처 + accessibilityLabel `humble-retraction` (e2e 분기 hook)', async () => {
  const raw = await readFile(HUMBLE_PATH, 'utf8');
  // text 필수 prop.
  assert.ok(
    /export interface HumbleRetractionProps\s*\{[\s\S]*?text:\s*string/.test(raw),
    'HumbleRetractionProps must declare `text: string` (required)',
  );
  // accessibilityLabel 박힘 (mobile e2e 분기 hook).
  assert.ok(
    /accessibilityLabel="humble-retraction"/.test(raw),
    'HumbleRetraction must expose accessibilityLabel="humble-retraction"',
  );
});

test('HumbleRetraction: motion.inkRise 사용 (디자인 목업 ink-rise 0.4s ease-out 정합)', async () => {
  const raw = await readFile(HUMBLE_PATH, 'utf8');
  assert.ok(/motion\.inkRise/.test(raw), 'HumbleRetraction must reference motion.inkRise');
  // motion.inkRise 토큰이 실제 존재 + 400ms.
  assert.equal(motion.inkRise.duration, 400, 'motion.inkRise.duration = 400 (목업 0.4s)');
  assert.equal(motion.inkRise.easing, 'ease-out');
});

test('HumbleRetraction: HumbleRetractionMotionTokens 노출 = ["inkRise"] (drift guard)', async () => {
  const raw = await readFile(HUMBLE_PATH, 'utf8');
  const m = raw.match(
    /HumbleRetractionMotionTokens\s*=\s*\[([^\]]*)\]/,
  );
  assert.ok(m, 'HumbleRetractionMotionTokens export missing');
  const body = m[1] ?? '';
  const tokens = [...body.matchAll(/'([a-zA-Z]+)'/g)].map((mm) => mm[1] ?? '');
  assert.deepEqual(tokens.sort(), ['inkRise']);
});

test('HumbleRetraction: copy.recall.humble 가 호출자 text prop source 로 사용 가능 (ko/en 비어있지 않음)', () => {
  for (const lang of ['ko', 'en'] as const) {
    const v = copy[lang].recall.humble;
    assert.equal(typeof v, 'string', `${lang}.recall.humble type`);
    assert.ok(v.length > 0, `${lang}.recall.humble non-empty`);
  }
});

test('HumbleRetraction: 디자인 목업 시각 토큰 (serif italic + ink-mute) 박힘', async () => {
  const raw = await readFile(HUMBLE_PATH, 'utf8');
  // 목업 진실원 (synapse-ui.jsx L425-443): serif italic, ink-mute, dashed border, paper-shade bg.
  assert.ok(/fonts\.serif/.test(raw), 'fonts.serif 박힘 (목업 var(--serif))');
  assert.ok(/fontStyle:\s*'italic'/.test(raw), 'fontStyle italic (목업 1:1)');
  assert.ok(/borderStyle:\s*'dashed'/.test(raw), 'borderStyle dashed (목업 0.5px dashed)');
});
