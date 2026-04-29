// Spacing scale — RN dp (number).
// 진실원: 디자인 목업/synapse-ui.jsx 의 인라인 padding/gap 빈도 분석 (4 의 배수).
//   gap: 4 / 8 / 12 / 16 가 다수.  bubble padding 10·14 는 라운딩으로 sm/md.
// styles.css 에 --space-* 가 정의되어 있지 않아 인라인 값에서 추출.
//   xs=4   → tight gap (icon row, dot cluster)
//   sm=8   → bubble inner gap, 타이포 라인 아래 마진
//   md=12  → bubble padding (10~12), 카드 내부 그룹 간 마진
//   lg=16  → 화면 좌우 패딩 (메시지 리스트, 컴포저)
//   xl=24  → 섹션 간 큰 마진 (Onboarding 본문 ↔ CTA 등)
// (60/28 같은 화면 외곽 패딩은 토큰 미포함 — 화면 단위 결정.)

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export type SpacingToken = keyof typeof spacing;
