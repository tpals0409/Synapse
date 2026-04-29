// Border radius scale — RN dp (number).
// 진실원: 디자인 목업/synapse-ui.jsx borderRadius 인라인 값 빈도 분석.
//   sm=4    → 작은 막대/태그 (header density bar)
//   md=12   → CaptureToast 카드, GhostHint 작은 박스
//   lg=18   → User/AI 메시지 버블 본체 (목업 18 가장 빈번)
//   xl=22   → Hyper-recall 큰 카드 (Sprint 5 까지 안 씀, 일관성 유지용)
//   pill=999 → 둥근 버튼 (CTA), pill 형태 컴포저 입력창
// (asymmetric "18px 18px 4px 18px" 같은 케이스는 토큰화하지 않음 — 화면 단위 결정.)

export const radius = {
  sm: 4,
  md: 12,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
