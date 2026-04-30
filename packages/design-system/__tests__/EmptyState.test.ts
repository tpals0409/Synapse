// Sprint 7 (T3) — EmptyState 컴포넌트.
// 디자인 목업 진실원: screens.jsx `EmptyStateScreen` (line 296-336, state="empty"|"loading").
//
// .tsx 컴포넌트는 node --experimental-strip-types 환경에서 직접 import 불가.
// raw text fs 매칭 + motion / copy 정합 검증 (HumbleRetraction.test.ts 패턴 동일).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { copy, motion } from '../index.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EMPTY_PATH = path.resolve(HERE, '../src/components/EmptyState.tsx');

// EmptyState 컴포넌트는 react-native 의존이라 root index 에서 export 되지 않음 (CaptureToast/HumbleRetraction 동일 패턴).
// 단, EMPTY_STATE_SCREENS / EMPTY_STATE_VARIANTS 메타는 RN-free 모듈 (componentsMeta.ts) 진실원으로
// Sprint 7 T3 보강 [DIRECTIVE D-S7-designer-empty-error-constants-export] 에서 추출 + root index 노출.
// raw text 가드는 *진실원* (componentsMeta.ts) 직접 검증.
test('EmptyState: 4 화면 hook (onboarding/chat/inspector/library) + 2 variant (empty/loading) 노출 — raw text 가드', async () => {
  const metaPath = path.resolve(HERE, '../src/componentsMeta.ts');
  const raw = await readFile(metaPath, 'utf8');
  const screensMatch = raw.match(/EMPTY_STATE_SCREENS:\s*readonly EmptyStateScreen\[\]\s*=\s*\[([^\]]*)\]/);
  assert.ok(screensMatch, 'EMPTY_STATE_SCREENS export missing in componentsMeta.ts');
  const screens = [...(screensMatch![1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(screens, ['chat', 'inspector', 'library', 'onboarding']);

  const variantsMatch = raw.match(/EMPTY_STATE_VARIANTS:\s*readonly EmptyStateVariant\[\]\s*=\s*\[([^\]]*)\]/);
  assert.ok(variantsMatch, 'EMPTY_STATE_VARIANTS export missing in componentsMeta.ts');
  const variants = [...(variantsMatch![1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(variants, ['empty', 'loading']);
});

test('EmptyState: title 필수 + subtitle/variant/screen optional prop 시그니처', async () => {
  const raw = await readFile(EMPTY_PATH, 'utf8');
  assert.ok(
    /export interface EmptyStateProps\s*\{[\s\S]*?title:\s*string/.test(raw),
    'EmptyStateProps must declare `title: string` (required)',
  );
  assert.ok(
    /subtitle\?:\s*string/.test(raw),
    'EmptyStateProps must declare `subtitle?: string`',
  );
  assert.ok(
    /variant\?:\s*EmptyStateVariant/.test(raw),
    'EmptyStateProps must declare `variant?: EmptyStateVariant`',
  );
  assert.ok(
    /screen\?:\s*EmptyStateScreen/.test(raw),
    'EmptyStateProps must declare `screen?: EmptyStateScreen`',
  );
});

test('EmptyState: accessibilityLabel = `empty-state-${variant}-${screen ?? "generic"}` (e2e 분기 hook)', async () => {
  const raw = await readFile(EMPTY_PATH, 'utf8');
  assert.ok(
    /accessibilityLabel=\{`empty-state-\$\{variant\}-\$\{screen \?\? 'generic'\}`\}/.test(raw),
    'EmptyState must expose `empty-state-{variant}-{screen}` accessibilityLabel',
  );
});

test('EmptyState: motion.inkRise 사용 (진입 애니메이션) + motion.nodeOrbit 사용 (loading variant)', async () => {
  const raw = await readFile(EMPTY_PATH, 'utf8');
  assert.ok(/motion\.inkRise/.test(raw), 'EmptyState must reference motion.inkRise');
  assert.ok(/motion\.nodeOrbit/.test(raw), 'EmptyState must reference motion.nodeOrbit (loading)');
  assert.equal(motion.inkRise.duration, 400);
  assert.equal(motion.nodeOrbit.duration, 2400);
  assert.equal(motion.nodeOrbit.iterations, 'infinite');
});

test('EmptyState: EmptyStateMotionTokens = ["inkRise","nodeOrbit"] (drift guard)', async () => {
  const raw = await readFile(EMPTY_PATH, 'utf8');
  const m = raw.match(/EmptyStateMotionTokens\s*=\s*\[([^\]]*)\]/);
  assert.ok(m, 'EmptyStateMotionTokens export missing');
  const body = m![1] ?? '';
  const tokens = [...body.matchAll(/'([a-zA-Z]+)'/g)].map((mm) => mm[1] ?? '').sort();
  assert.deepEqual(tokens, ['inkRise', 'nodeOrbit']);
});

test('EmptyState: 디자인 목업 시각 토큰 (serif title 18 + italic subtitle 13.5 + dashed circle border) 박힘', async () => {
  const raw = await readFile(EMPTY_PATH, 'utf8');
  // 목업 screens.jsx L308-309: serif 18 / serif 13.5 italic.
  assert.ok(/fonts\.serif/.test(raw), 'fonts.serif 박힘 (목업 var(--serif))');
  assert.ok(/fontSize:\s*18/.test(raw), 'title fontSize 18 (목업 1:1)');
  assert.ok(/fontSize:\s*13\.5/.test(raw), 'subtitle fontSize 13.5 (목업 1:1)');
  assert.ok(/borderStyle:\s*'dashed'/.test(raw), 'empty 원의 dashed border (목업 1:1)');
  assert.ok(/fontStyle:\s*'italic'/.test(raw), 'subtitle italic (목업 1:1)');
});

test('EmptyState: copy.firstChat.{empty,emptySub} 가 호출자 title/subtitle source 로 사용 가능', () => {
  for (const lang of ['ko', 'en'] as const) {
    assert.ok(copy[lang].firstChat.empty.length > 0, `${lang}.firstChat.empty non-empty`);
    assert.ok(copy[lang].firstChat.emptySub.length > 0, `${lang}.firstChat.emptySub non-empty`);
  }
});

test('EmptyState: RN-only API 만 사용 (web import 안전 — platform-adapter 표준)', async () => {
  const raw = await readFile(EMPTY_PATH, 'utf8');
  // react-native core API 만. 웹 전용 (window/document/Dimensions.web 등) 직접 참조 금지.
  assert.ok(/from 'react-native'/.test(raw), 'must import from react-native');
  assert.ok(!/from 'react-native-web'/.test(raw), 'must NOT import react-native-web directly');
  assert.ok(!/window\./.test(raw), 'must NOT use global window');
  assert.ok(!/document\./.test(raw), 'must NOT use global document');
});
