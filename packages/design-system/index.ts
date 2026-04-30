export {
  colors,
  OKLCH_LIGHTNESS,
  OKLCH_INVERSION_BAND,
  oklchLightnessSum,
} from './src/tokens.ts';
export type { ThemeName, ColorToken, ColorTokens } from './src/tokens.ts';
export { colorsHex } from './src/colorsHex.ts';
export type { ColorHexTheme, ColorHexToken, ColorTokensHex } from './src/colorsHex.ts';
export { fonts, role } from './src/fonts.ts';
export type { FontFamily, FontRole } from './src/fonts.ts';
export { copy } from './src/copy.ts';
export type {
  CopyLang,
  CopyShape,
  OnboardingCopy,
  FirstChatCopy,
  RecallCopy,
  RecallSurfaceCopy,
} from './src/copy.ts';
export { spacing } from './src/spacing.ts';
export type { SpacingToken } from './src/spacing.ts';
export { radius } from './src/radius.ts';
export type { RadiusToken } from './src/radius.ts';
export { shadow } from './src/shadow.ts';
export type { ShadowToken } from './src/shadow.ts';
export { motion, MOTION_MOCKUP_PARITY } from './src/motion.ts';
export type { MotionToken, MotionMockupParity } from './src/motion.ts';

// Sprint 7 (T3 보강) — [DIRECTIVE v2026-04-30 D-S7-designer-empty-error-constants-export].
// EmptyState/ErrorState 컴포넌트는 RN 의존 → root 미노출 (sub-entry `@synapse/design-system/components` 만).
// 컴포넌트 *메타* (string literal arrays + props enum types) 만 RN-free 라 root 노출 — design-system
// 자체 노드 환경 (verify-copy.mjs / unit tests / future receipt fixture) + future consumer 가 안전 import.
export {
  EMPTY_STATE_VARIANTS,
  EMPTY_STATE_SCREENS,
  ERROR_STATE_REASONS,
} from './src/componentsMeta.ts';
export type {
  EmptyStateVariant,
  EmptyStateScreen,
  ErrorStateReason,
  ErrorStateScreen,
} from './src/componentsMeta.ts';
