// Sprint 7 (T3) — ErrorState 컴포넌트.
// 디자인 목업 진실원: screens.jsx `EmptyStateScreen` (line 339-360, state="error").
//
// reason union 자가 선언 (D-S5-design-system-source-string-union 정합) — conversation T7 / mobile T6 가
// 동일 union 을 *consumer 측에서* 박아 사용. drift 발생 시 본 테스트가 catch.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { copy, motion } from '../index.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ERROR_PATH = path.resolve(HERE, '../src/components/ErrorState.tsx');

// ErrorState 컴포넌트는 react-native 의존이라 root index 에서 export 되지 않음 (CaptureToast/HumbleRetraction 동일 패턴).
// 단, ERROR_STATE_REASONS 메타는 RN-free 모듈 (componentsMeta.ts) 진실원으로 Sprint 7 T3 보강에서 추출.
// raw text 가드는 *진실원* (componentsMeta.ts) 직접 검증.
test('ErrorState: reason 3 종 노출 (llm-failure / storage-failure / network-failure) — raw text 가드', async () => {
  const metaPath = path.resolve(HERE, '../src/componentsMeta.ts');
  const raw = await readFile(metaPath, 'utf8');
  const reasonsMatch = raw.match(/ERROR_STATE_REASONS:\s*readonly ErrorStateReason\[\]\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(reasonsMatch, 'ERROR_STATE_REASONS export missing in componentsMeta.ts');
  const reasons = [...(reasonsMatch![1] ?? '').matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(reasons, ['llm-failure', 'network-failure', 'storage-failure']);
});

test('ErrorState: title + reason 필수 prop, subtitle/onRetry/retryLabel/screen optional', async () => {
  const raw = await readFile(ERROR_PATH, 'utf8');
  assert.ok(
    /export interface ErrorStateProps\s*\{[\s\S]*?title:\s*string/.test(raw),
    'ErrorStateProps must declare `title: string` (required)',
  );
  assert.ok(
    /reason:\s*ErrorStateReason/.test(raw),
    'ErrorStateProps must declare `reason: ErrorStateReason` (required)',
  );
  assert.ok(/subtitle\?:\s*string/.test(raw), 'subtitle optional');
  assert.ok(/onRetry\?:\s*\(\)\s*=>\s*void/.test(raw), 'onRetry optional callback');
  assert.ok(/retryLabel\?:\s*string/.test(raw), 'retryLabel optional');
});

test('ErrorState: accessibilityLabel = `error-state-${reason}-${screen ?? "generic"}` (e2e 분기 hook)', async () => {
  const raw = await readFile(ERROR_PATH, 'utf8');
  assert.ok(
    /accessibilityLabel=\{`error-state-\$\{reason\}-\$\{screen \?\? 'generic'\}`\}/.test(raw),
    'ErrorState container must expose `error-state-{reason}-{screen}` accessibilityLabel',
  );
  assert.ok(
    /accessibilityLabel=\{`error-state-retry-\$\{reason\}`\}/.test(raw),
    'retry button must expose `error-state-retry-{reason}` accessibilityLabel',
  );
});

test('ErrorState: motion.inkRise 사용 (진입 애니메이션, 디자인 목업 0.4s ease-out 정합)', async () => {
  const raw = await readFile(ERROR_PATH, 'utf8');
  assert.ok(/motion\.inkRise/.test(raw), 'ErrorState must reference motion.inkRise');
  assert.equal(motion.inkRise.duration, 400);
});

test('ErrorState: ErrorStateMotionTokens = ["inkRise"] (drift guard)', async () => {
  const raw = await readFile(ERROR_PATH, 'utf8');
  const m = raw.match(/ErrorStateMotionTokens\s*=\s*\[([^\]]*)\]/);
  assert.ok(m, 'ErrorStateMotionTokens export missing');
  const body = m![1] ?? '';
  const tokens = [...body.matchAll(/'([a-zA-Z]+)'/g)].map((mm) => mm[1] ?? '');
  assert.deepEqual(tokens.sort(), ['inkRise']);
});

test('ErrorState: 디자인 목업 시각 토큰 (serif title 17 + italic subtitle 13 + pill button) 박힘', async () => {
  const raw = await readFile(ERROR_PATH, 'utf8');
  // 목업 screens.jsx L351-352: serif 17 / serif 13 italic. L354-357: pill button (radius 100).
  assert.ok(/fonts\.serif/.test(raw), 'fonts.serif 박힘 (목업 var(--serif))');
  assert.ok(/fonts\.sans/.test(raw), 'fonts.sans 박힘 (목업 retry button var(--sans))');
  assert.ok(/fontSize:\s*17/.test(raw), 'title fontSize 17 (목업 1:1)');
  assert.ok(/fontSize:\s*13[,\s]/.test(raw), 'subtitle fontSize 13 (목업 1:1)');
  assert.ok(/radius\.pill/.test(raw), 'retry button radius.pill (목업 borderRadius 100)');
  assert.ok(/fontStyle:\s*'italic'/.test(raw), 'subtitle italic (목업 1:1)');
});

test('ErrorState: copy.firstChat.{error,errorSub,retry} 가 호출자 title/subtitle/retryLabel source', () => {
  for (const lang of ['ko', 'en'] as const) {
    assert.ok(copy[lang].firstChat.error.length > 0, `${lang}.firstChat.error non-empty`);
    assert.ok(copy[lang].firstChat.errorSub.length > 0, `${lang}.firstChat.errorSub non-empty`);
    assert.ok(copy[lang].firstChat.retry.length > 0, `${lang}.firstChat.retry non-empty`);
  }
});

test('ErrorState: RN-only API 만 사용 (web import 안전 — platform-adapter 표준)', async () => {
  const raw = await readFile(ERROR_PATH, 'utf8');
  assert.ok(/from 'react-native'/.test(raw), 'must import from react-native');
  assert.ok(!/from 'react-native-web'/.test(raw), 'must NOT import react-native-web directly');
  assert.ok(!/window\./.test(raw), 'must NOT use global window');
  assert.ok(!/document\./.test(raw), 'must NOT use global document');
});

test('ErrorState: reason union 이 conversation T7 의 onError reason 과 *동일* (raw text 정합)', async () => {
  // dev doc §3 conversation T7: `onError?: (reason: 'llm-failure' | 'storage-failure' | 'network-failure') => void`.
  // ErrorStateReason 진실원 = packages/design-system/src/componentsMeta.ts (Sprint 7 T3 보강
  // [DIRECTIVE D-S7-designer-empty-error-constants-export] — RN-free 모듈 분리 후 root index 에서 노출).
  // ErrorState.tsx 는 componentsMeta 에서 alias re-export 만 — *진실원 가드는 componentsMeta 직접 검증*.
  const metaPath = path.resolve(HERE, '../src/componentsMeta.ts');
  const metaRaw = await readFile(metaPath, 'utf8');
  assert.ok(
    /export type ErrorStateReason = 'llm-failure' \| 'storage-failure' \| 'network-failure'/.test(metaRaw),
    'ErrorStateReason (componentsMeta.ts) must declare exact union: llm-failure | storage-failure | network-failure',
  );
  // ErrorState.tsx 는 alias re-export 형태로 동일 식별자 노출 (sub-entry 호환).
  const raw = await readFile(ERROR_PATH, 'utf8');
  assert.ok(
    /export type ErrorStateReason = MetaErrorStateReason/.test(raw),
    'ErrorState.tsx must alias-re-export ErrorStateReason from componentsMeta',
  );
});
