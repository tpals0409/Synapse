// Sprint 0 minimal token set — paper / ink / synapse, light + dark.
// Single source of truth: 디자인 목업/styles.css (:root 와 [data-theme="dark"]).
// styles.css 의 --synapse 는 dark 테마에서 재정의되지 않으므로 light 값을 유지한다.
//
// Sprint 4 (T6, carry-over 16): motion 의 `synapse-pulse` 정식 노출.
//   — motion.synapsePulse (2400ms / ease-in-out / infinite / opacity 0.55↔1, scale 1↔1.18).
//   — 같은 sprint 에서 recallEmerge / threadDraw / nodeOrbit 도 정식 노출 (motion.ts 참조).
//   — 모두 package entry (index.ts) 의 `motion` export 로 접근.
//
// Sprint 7 (T2): oklch L 분해 메타 (`OKLCH_LIGHTNESS`) 추가 — light/dark 반전 정합 검증용.
//   — 기존 colors export 변경 0 (시그니처 동결).
//   — receipt step `oklch-dark-inversion` 의 입력 = light.L + dark.L 합이 일정 범위 (≈ 1.16, paper/ink).
//   — synapse 는 light/dark 동일 (재정의 없음) → L 합 검증 제외.
//
// [DIRECTIVE v2026-04-30 D-S7-designer-tokens-widen-color-tokens] (Sprint 7, T2 보강) —
// `ColorTokens` wider type alias 추가 + `as const satisfies ColorTokens` 패턴.
//   — mobile T5 themeStore 의 contract gap (TS2322 — light literal 슬롯에 dark 값 할당 불가) 해소.
//   — literal 정확성 (oklch L 합 receipt 입력) 보존: `as const` 가 literal 타입 유지,
//     `satisfies ColorTokens` 가 wider 형태 검증만 추가.
//   — consumer (mobile themeStore / 기타 ThemeProvider) 는 `ColorTokens` 슬롯에 light 또는 dark
//     swap 가능 (cast 0).
//   — TS 4.9+ 표준. 기존 export 식별자 (colors / ThemeName / ColorToken) 변경 0.

// wider type alias — consumer swap 시 light↔dark 한 슬롯에 할당 가능.
// readonly 보존 (immutability 강제), 값은 oklch(...) string.
export type ColorTokens = {
  readonly paper: string;
  readonly ink: string;
  readonly synapse: string;
};

export const colors = {
  light: {
    paper: 'oklch(96.5% 0.012 75)',
    ink: 'oklch(22% 0.018 60)',
    synapse: 'oklch(64% 0.14 55)',
  } as const satisfies ColorTokens,
  dark: {
    paper: 'oklch(20% 0.012 60)',
    ink: 'oklch(94% 0.012 70)',
    synapse: 'oklch(64% 0.14 55)',
  } as const satisfies ColorTokens,
} as const;

export type ThemeName = keyof typeof colors;
export type ColorToken = keyof (typeof colors)['light'];

// Sprint 7 (T2) — oklch L (lightness, 0~1 범위 = % / 100) 분해 메타.
// 디자인 목업 styles.css :root + [data-theme="dark"] 의 L 값 직접 추출.
//
// 반전 정합 검증 모델:
//   paper:   light L = 0.965 ↔ dark L = 0.20 → 합 1.165
//   ink:     light L = 0.22  ↔ dark L = 0.94 → 합 1.16
//   synapse: light L = 0.64  ↔ dark L = 0.64 → 동일 (재정의 없음)
//
// 검증: paper/ink 의 light.L + dark.L 합이 1.10 ~ 1.20 사이 (≈ 1.16, 두 테마가 *서로 보완하는* 위치).
// synapse 는 동일성만 검증 (light === dark).
export const OKLCH_LIGHTNESS = {
  light: {
    paper: 0.965,
    ink: 0.22,
    synapse: 0.64,
  },
  dark: {
    paper: 0.20,
    ink: 0.94,
    synapse: 0.64,
  },
} as const;

// 반전 합의 허용 범위 (디자인 목업 styles.css 기준 ≈ 1.16, ±0.06 유격).
// receipt step `oklch-dark-inversion` fixture 가 이 상수를 import 하여 검증.
export const OKLCH_INVERSION_BAND = {
  min: 1.10,
  max: 1.22,
} as const;

// 헬퍼: 테마 토큰 한 쌍의 L 합 반환 (synapse 처럼 동일 토큰은 light L * 2).
export function oklchLightnessSum(token: ColorToken): number {
  return OKLCH_LIGHTNESS.light[token] + OKLCH_LIGHTNESS.dark[token];
}
