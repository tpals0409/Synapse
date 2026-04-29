// Shadow tokens — RN-compatible (iOS shadow* + Android elevation).
// 진실원: 디자인 목업/synapse-ui.jsx boxShadow 인라인 값.
//   sm: PulseDot / synapse glyph 의 0 0 10px var(--synapse-glow) — 작은 글로우.
//   md: SynapseGlyph 큰 사이즈의 0 0 14px var(--synapse-glow) — 중간 글로우.
// 웹 boxShadow 는 'inset' / 'spread' 표현이 풍부하지만 RN 은 단순 4-args.
// color 는 colorsHex 와 분리 — synapse 의 글로우는 amber tone 의 hex (#CB7229) 를 사용.
// (목업의 var(--synapse-glow) = oklch(75% 0.13 60) 보다 살짝 옅음.
//  Sprint 1 receipt 가 시각 회귀 자동화 미포함이라, 토큰 단계에선 synapse 와 동일 hex 채택.)

export const shadow = {
  sm: {
    shadowColor: '#CB7229',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 2,
  },
  md: {
    shadowColor: '#CB7229',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 4,
  },
} as const;

export type ShadowToken = keyof typeof shadow;
