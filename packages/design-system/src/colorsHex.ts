// RN/oklch 호환성 부채 해소 — Sprint 0 carry-over.
// 진실원: 디자인 목업/styles.css (:root, [data-theme="dark"]) 의 oklch.
// RN(Hermes/iOS<16/Android)는 oklch() 미지원 → 동일 시각 매핑의 hex 를 dual export.
//
// 매핑 출처:
//   light.paper / light.ink — Sprint 0 mobile 폴백으로 검증된 hex (#F5F0E8 / #2A2620).
//     oklch 정확 변환은 #F8F2EB / #211912 이지만, 사용자 시각 검증을 거친 폴백을 진실로 채택.
//   synapse — oklch(64% 0.14 55) 의 정확한 sRGB 변환 (#CB7229). 신규 토큰이라 폴백 없음.
//   dark.paper / dark.ink — styles.css [data-theme="dark"] 의 oklch 정확 변환.
//   dark.synapse — styles.css 가 [data-theme="dark"] 에서 --synapse 를 재정의하지 않으므로
//                  light 와 동일 (carry-over §3 절대 규칙).

export const colorsHex = {
  light: {
    paper: '#F5F0E8',
    ink: '#2A2620',
    synapse: '#CB7229',
  },
  dark: {
    paper: '#1A1511',
    ink: '#F1EAE3',
    synapse: '#CB7229',
  },
} as const;

export type ColorHexTheme = keyof typeof colorsHex;
export type ColorHexToken = keyof (typeof colorsHex)['light'];
