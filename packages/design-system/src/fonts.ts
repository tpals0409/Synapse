// 디자인 목업/styles.css 의 --serif / --sans / --mono 와 1:1.
// Sprint 0 은 family 상수만 노출. Expo Font 로딩은 mobile 에이전트가 Sprint 1+ 에서.

export const fonts = {
  serif: 'Source Serif 4',
  sans: 'Inter',
  mono: 'JetBrains Mono',
} as const;

export const role = {
  heading: fonts.serif,
  body: fonts.serif,
  ui: fonts.sans,
  meta: fonts.mono,
} as const;

export type FontFamily = keyof typeof fonts;
export type FontRole = keyof typeof role;
