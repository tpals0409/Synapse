// Sprint 0 minimal token set — paper / ink / synapse, light + dark.
// Single source of truth: 디자인 목업/styles.css (:root 와 [data-theme="dark"]).
// styles.css 의 --synapse 는 dark 테마에서 재정의되지 않으므로 light 값을 유지한다.

export const colors = {
  light: {
    paper: 'oklch(96.5% 0.012 75)',
    ink: 'oklch(22% 0.018 60)',
    synapse: 'oklch(64% 0.14 55)',
  },
  dark: {
    paper: 'oklch(20% 0.012 60)',
    ink: 'oklch(94% 0.012 70)',
    synapse: 'oklch(64% 0.14 55)',
  },
} as const;

export type ThemeName = keyof typeof colors;
export type ColorToken = keyof (typeof colors)['light'];
