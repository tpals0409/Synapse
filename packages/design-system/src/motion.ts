// Motion tokens — Sprint 1: `inkRise`. Sprint 3: `ghostBreathe` (CaptureToast out-fade).
// Sprint 4 (T6): `synapsePulse` (carry-over 16 정식 노출) + `recallEmerge` + `threadDraw` + `nodeOrbit`.
//
// 진실원: 디자인 목업/styles.css `@keyframes`.
//
//   @keyframes ink-rise        from {opacity:0; translateY:6}  to {opacity:1; translateY:0}
//   @keyframes ghost-breathe   0,100%{opacity:0.42}  50%{opacity:0.68}      (목업: 3s ease-in-out infinite)
//   @keyframes synapse-pulse   0,100%{opacity:0.55, scale:1}  50%{opacity:1, scale:1.18}
//   @keyframes recall-emerge   0%{opacity:0,translateY:12,scale:0.96,blur:4}  60%{blur:0}  100%{opacity:1,translateY:0,scale:1,blur:0}
//   @keyframes thread-draw     from{stroke-dashoffset:80}  to{stroke-dashoffset:0}
//   @keyframes node-orbit      0%{rotate(0)translateX(14px)rotate(0)}  100%{rotate(360)translateX(14px)rotate(-360)}
//
// 목업 사용 빈도 (각 컴포넌트 동작):
//   - GhostHint:    ghost-breathe 3s ease-in-out infinite + recall-emerge 0.4s blur→clear 진입
//   - SuggestionCard: recall-emerge 0.6s cubic-bezier(.2,.7,.3,1) both + synapse-pulse 1 회 (PulseDot)
//   - StrongRecall: recall-emerge 0.7s cubic-bezier(.2,.7,.3,1) both + synapse-pulse 반복 + thread-draw 0.6s
//   - InspectorList: node-orbit 2.4s linear infinite (살짝, density 표시)
//
// RN 호환:
//   - duration: number (ms) — Animated.timing / withTiming 직접 전달.
//   - easing: 'ease-out' / 'ease-in-out' / 'cubic-bezier' string — 소비자가 reanimated/Animated 매핑.
//   - iterations: number | 'infinite' — 반복 의도.
//   - from/to: 키프레임 양끝값. 중간 키프레임은 별도 `mid` 로 표현.

export const motion = {
  inkRise: {
    duration: 400,
    easing: 'ease-out',
    from: { opacity: 0, translateY: 6 },
    to: { opacity: 1, translateY: 0 },
  },
  ghostBreathe: {
    duration: 600,
    easing: 'ease-in-out',
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  // synapse-pulse — pulse dot / corner mark 호흡 (밝기 + 살짝 확대).
  // 목업: synapse-pulse 2s~2.6s ease-in-out infinite (PulseDot/SynapseGlyph).
  // 토큰은 2400ms (PulseDot 2s ↔ SynapseGlyph 2.6s 중앙값).
  synapsePulse: {
    duration: 2400,
    easing: 'ease-in-out',
    iterations: 'infinite' as const,
    from: { opacity: 0.55, scale: 1 },
    mid: { opacity: 1, scale: 1.18 },
    to: { opacity: 0.55, scale: 1 },
  },
  // recall-emerge — 메모리 표면이 떠오르는 듯한 진입 (blur → clear + scale-up).
  // 목업 SuggestionCard: 0.6s, StrongRecall: 0.7s. 토큰 기본 600ms (SuggestionCard 기준).
  recallEmerge: {
    duration: 600,
    easing: 'cubic-bezier(.2,.7,.3,1)',
    from: { opacity: 0, translateY: 12, scale: 0.96, blur: 4 },
    mid: { blur: 0 }, // 60% 지점에서 blur 해제.
    to: { opacity: 1, translateY: 0, scale: 1, blur: 0 },
  },
  // thread-draw — SVG path stroke-dashoffset 그려짐.
  // 목업 StrongRecall corner mark / ring 진입에 사용. 길이 80 의 고정 dasharray.
  threadDraw: {
    duration: 600,
    easing: 'ease-out',
    from: { strokeDashoffset: 80 },
    to: { strokeDashoffset: 0 },
  },
  // node-orbit — 인접 노드들이 중심을 공전하는 회전 (InspectorList 살짝 / EmptyState loading).
  // 목업: 2.4s linear infinite, translateX 14px 회전 반경.
  nodeOrbit: {
    duration: 2400,
    easing: 'linear',
    iterations: 'infinite' as const,
    radius: 14,
    from: { rotate: 0 },
    to: { rotate: 360 },
  },
} as const;

export type MotionToken = keyof typeof motion;
