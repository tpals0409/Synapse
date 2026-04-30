// componentsMeta — Sprint 7 (T3 보강, [DIRECTIVE v2026-04-30 D-S7-designer-empty-error-constants-export]).
//
// 목적: EmptyState / ErrorState 컴포넌트의 *string literal enum arrays + type aliases* 를
// **RN-free** 모듈로 분리. root index (`packages/design-system/index.ts`) 가 본 모듈을 re-export 하여
// design-system 자체 노드 환경 (verify-copy.mjs / unit tests / future receipt fixture) 에서도
// 안전하게 import 가능하도록 한다.
//
// 격리 원칙 (Sprint 3 박힌 헌법 + Sprint 7 보강):
//   - 컴포넌트 본체 (.tsx) 는 RN 의존 → root index 미노출 (sub-entry `@synapse/design-system/components` 만).
//   - 컴포넌트 *메타* (string literal arrays + props enum types) 는 RN 의존 0 → root index 노출 가능.
//   - 컴포넌트 .tsx 는 본 모듈에서 import 하여 *동일 진실원* 사용 (drift 0).
//
// mobile T6 / future consumer 사용 패턴:
//   import { ErrorStateReason, ERROR_STATE_REASONS } from '@synapse/design-system';
//   import { ErrorState } from '@synapse/design-system/components';
//
// 디자인 목업 진실원: screens.jsx `EmptyStateScreen` (line 296-360, state="empty"|"loading"|"error").

// ─── EmptyState meta ───────────────────────────────────────────────
export type EmptyStateVariant = 'empty' | 'loading';
export type EmptyStateScreen = 'onboarding' | 'chat' | 'inspector' | 'library';

export const EMPTY_STATE_VARIANTS: readonly EmptyStateVariant[] = ['empty', 'loading'] as const;
export const EMPTY_STATE_SCREENS: readonly EmptyStateScreen[] = [
  'onboarding',
  'chat',
  'inspector',
  'library',
] as const;

// ─── ErrorState meta ───────────────────────────────────────────────
// reason union 단일 진실원 (D-S5-design-system-source-string-union 정합).
// conversation T7 의 OnErrorFn reason 과 raw text 정확 일치 (ErrorState.test.ts 가 가드).
export type ErrorStateReason = 'llm-failure' | 'storage-failure' | 'network-failure';
export type ErrorStateScreen = 'onboarding' | 'chat' | 'inspector' | 'library';

export const ERROR_STATE_REASONS: readonly ErrorStateReason[] = [
  'llm-failure',
  'storage-failure',
  'network-failure',
] as const;
