// Sprint 6 (T6) — DismissButton 컴포넌트 정합 가드.
//
// recall.test.ts 와 동일 패턴: .tsx 컴포넌트 자체는 node --experimental-strip-types
// 환경에서 import 불가. raw text fs 매칭 + variants/copy 정합 검증.
//
// 검증 대상:
//   - variant union 자가 선언 (D-S5-design-system-source-string-union 정합).
//   - PM HOLD D-S6-design-system-mockup-conflict 비충돌 영역만: variant='reject' 단일.
//   - accessibilityLabel `dismiss-{variant}` 패턴 (e2e 분기 hook).
//   - copy.recall.dismiss 가 호출자 default 라벨 source 로 사용 가능.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { copy } from '../index.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DISMISS_BUTTON_PATH = path.resolve(
  HERE,
  '../src/components/DismissButton.tsx',
);

test('DismissButton: variant union 자가 선언 — Sprint 6 비충돌 영역 = reject 1 종 (PM HOLD 후 unlink 추가 예정)', async () => {
  const raw = await readFile(DISMISS_BUTTON_PATH, 'utf8');
  // type DismissButtonVariant 자가 선언 + 'reject' 박힘.
  assert.ok(
    /export type DismissButtonVariant\s*=\s*'reject'/.test(raw),
    'DismissButton.tsx must declare `export type DismissButtonVariant = \'reject\'`',
  );
  // PM HOLD 결정 전까지 'unlink' 는 union 에 박히면 안 됨.
  assert.ok(
    !/DismissButtonVariant\s*=\s*'reject'\s*\|\s*'unlink'/.test(raw),
    "Sprint 6 비충돌 영역 미준수 — 'unlink' variant 는 PM HOLD D-S6-design-system-mockup-conflict 결정 후 추가",
  );
});

test('DismissButton: DISMISS_BUTTON_VARIANTS 상수가 union 과 동기 (drift guard)', async () => {
  const raw = await readFile(DISMISS_BUTTON_PATH, 'utf8');
  const arrMatch = raw.match(
    /DISMISS_BUTTON_VARIANTS:\s*readonly DismissButtonVariant\[\]\s*=\s*\[([^\]]*)\]/,
  );
  assert.ok(arrMatch, 'DISMISS_BUTTON_VARIANTS export missing');
  const body = arrMatch[1] ?? '';
  const literals = [...body.matchAll(/'([a-z_]+)'/g)].map((m) => m[1] ?? '');
  assert.deepEqual(
    literals.sort(),
    ['reject'],
    'DISMISS_BUTTON_VARIANTS must equal exactly [\'reject\'] in Sprint 6 비충돌 scope',
  );
});

test('DismissButton: accessibilityLabel `dismiss-{variant}` 패턴 박힘 (e2e 분기 hook)', async () => {
  const raw = await readFile(DISMISS_BUTTON_PATH, 'utf8');
  // task subject 의 `accessibilityLabel hooks: dismiss-{unlink|reject}` 정합.
  // 현 sprint 비충돌 영역 = `dismiss-${variant}` 템플릿 박힘 (variant 가 'reject' 1 종).
  assert.ok(
    /accessibilityLabel=\{?`dismiss-\$\{variant\}`/.test(raw),
    'DismissButton.tsx must declare accessibilityLabel=`dismiss-${variant}` template',
  );
});

test('DismissButton: copy.recall.dismiss 가 호출자 default 라벨 source 로 사용 가능 (ko/en 양쪽 비어있지 않음)', () => {
  // DismissButton 자체는 label prop 미지정 시 'Dismiss' fallback (mobile 의 호출자가
  // copy.recall.dismiss 를 직접 주입). 본 테스트는 copy 가 그 source 로 *유효한지* 검증.
  for (const lang of ['ko', 'en'] as const) {
    const v = copy[lang].recall.dismiss;
    assert.equal(typeof v, 'string', `${lang}.recall.dismiss type`);
    assert.ok(v.length > 0, `${lang}.recall.dismiss non-empty`);
  }
});

test('DismissButton: 디자인 목업 SuggestionCard onDismiss 시각 토큰 (sans 11 + ink-mute) 박힘', async () => {
  const raw = await readFile(DISMISS_BUTTON_PATH, 'utf8');
  // 목업 진실원 (synapse-ui.jsx L236-240): fontFamily sans, fontSize 11, color ink-mute,
  // background transparent, padding "2px 0".
  assert.ok(/fonts\.sans/.test(raw), 'fonts.sans (var(--sans)) 박힘');
  assert.ok(/fontSize:\s*11/.test(raw), 'fontSize: 11 (목업 mockup 1:1)');
  assert.ok(
    /backgroundColor:\s*'transparent'/.test(raw),
    "backgroundColor: 'transparent' (목업 mockup 1:1)",
  );
});
