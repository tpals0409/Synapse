// Motion tokens — Sprint 1: `inkRise`. Sprint 3: `ghostBreathe` (CaptureToast out-fade).
// Sprint 4 (T6): `synapsePulse` (carry-over 16 정식 노출) + `recallEmerge` + `threadDraw` + `nodeOrbit`.
// Sprint 7 (T1): `ghostBreatheLoop` (목업 ghost-breathe @keyframes 1:1, 3s infinite 호흡) +
//                `recallEmergeStrong` (StrongRecall 0.7s 변형) + `recallEmergeHyper` (HyperRecall 0.9s 변형) +
//                기존 토큰 fillMode/iterations 메타 보강 (디자인 목업 inline `both` / `infinite` 1:1).
//                기존 토큰 from/to/duration/easing 변경 0 — 시그니처 동결.
//
// 진실원: 디자인 목업/styles.css `@keyframes` (line 47-87) + synapse-ui.jsx inline `animation:` 사용.
//
//   styles.css @keyframes:
//     line 47-50  synapse-pulse   0,100%{opacity:0.55, scale:1}  50%{opacity:1, scale:1.18}
//     line 55-58  ink-rise        from {opacity:0; translateY:6}  to {opacity:1; translateY:0}
//     line 59-62  ghost-breathe   0,100%{opacity:0.42}  50%{opacity:0.68}
//     line 67-71  recall-emerge   0%{opacity:0,translateY:12,scale:0.96,blur:4}  60%{blur:0}  100%{opacity:1,translateY:0,scale:1,blur:0}
//     line 72-75  thread-draw     from{stroke-dashoffset:80}  to{stroke-dashoffset:0}
//     line 76-79  node-orbit      0%{rotate(0)translateX(14px)rotate(0)}  100%{rotate(360)translateX(14px)rotate(-360)}
//
//   synapse-ui.jsx inline 사용 빈도 (디자인 목업 단일 진실원):
//     L18  SynapseGlyph circle:  synapse-pulse 2.6s ease-in-out infinite
//     L38  PulseDot div:         synapse-pulse 2s   ease-in-out infinite
//     L86  UserBubble row:       ink-rise      0.4s ease-out both
//     L102 AIBubble row:         ink-rise      0.4s ease-out both
//     L150 CaptureToast:         ink-rise      0.5s ease-out both
//     L177 GhostHint:            ghost-breathe 3s   ease-in-out infinite
//     L207 SuggestionCard:       recall-emerge 0.6s cubic-bezier(.2,.7,.3,1) both
//     L253 StrongRecall:         recall-emerge 0.7s cubic-bezier(.2,.7,.3,1) both
//     L299 HyperRecall:          recall-emerge 0.9s cubic-bezier(.2,.7,.3,1) both
//     L413 StrongRecall ring:    synapse-pulse 2s   ease-in-out infinite
//     L430 HumbleRetraction:     ink-rise      0.4s ease-out both
//
// 목업 사용 빈도 (각 컴포넌트 동작):
//   - GhostHint:    ghost-breathe 3s ease-in-out infinite + recall-emerge 0.4s blur→clear 진입
//   - SuggestionCard: recall-emerge 0.6s cubic-bezier(.2,.7,.3,1) both + synapse-pulse 1 회 (PulseDot)
//   - StrongRecall: recall-emerge 0.7s cubic-bezier(.2,.7,.3,1) both + synapse-pulse 반복 + thread-draw 0.6s
//   - InspectorList: node-orbit 2.4s linear infinite (살짝, density 표시)
//
// Sprint 7 (T1) 보강 사유 — Sprint 4 의 `motion.ghostBreathe` (600ms / opacity 1→0) 는 *CaptureToast out-fade*
// 의미였고 (Sprint 3 박힘), 디자인 목업의 `@keyframes ghost-breathe` (3s 호흡, 0.42↔0.68) 와는 *의미 다름*.
// Sprint 7 의 GhostHint 모션 wiring 을 위해 **기존 토큰 변경 0**, 별도 키 `ghostBreatheLoop` 신규 추가.
// 마찬가지로 SuggestionCard/StrongRecall/HyperRecall 의 recall-emerge 진입 시간이 600/700/900ms 로 다르고,
// mobile T6 가 화면별 정확한 wiring 을 하려면 별도 토큰 노출이 안전. base `recallEmerge` (600ms, SuggestionCard) 위에
// `recallEmergeStrong` (700ms, StrongRecall) + `recallEmergeHyper` (900ms, HyperRecall) 변형 추가.
//
// RN 호환:
//   - duration: number (ms) — Animated.timing / withTiming 직접 전달.
//   - easing: 'ease-out' / 'ease-in-out' / 'cubic-bezier' string — 소비자가 reanimated/Animated 매핑.
//   - iterations: number | 'infinite' — 반복 의도.
//   - fillMode: 'both' | 'forwards' | 'none' — 디자인 목업 inline `both` 추적 (RN 은 reset 동작 결정).
//   - from/to: 키프레임 양끝값. 중간 키프레임은 별도 `mid` 로 표현.

export const motion = {
  inkRise: {
    duration: 400,
    easing: 'ease-out',
    fillMode: 'both' as const, // 목업 synapse-ui.jsx L86/L102/L430: `ink-rise 0.4s ease-out both`.
    from: { opacity: 0, translateY: 6 },
    to: { opacity: 1, translateY: 0 },
  },
  ghostBreathe: {
    duration: 600,
    easing: 'ease-in-out',
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  // Sprint 7 (T1) 신규 — ghost-breathe @keyframes 1:1 (호흡 패턴).
  // 디자인 목업 styles.css L59-62 + synapse-ui.jsx L177 (GhostHint 3s ease-in-out infinite).
  // 기존 motion.ghostBreathe (CaptureToast out-fade) 와 *의미 다름* — 변경 0, 별도 키.
  // mid 50% 지점 0.68, 양 끝(0%,100%) 0.42 의 호흡 사이클.
  ghostBreatheLoop: {
    duration: 3000,
    easing: 'ease-in-out',
    iterations: 'infinite' as const,
    from: { opacity: 0.42 },
    mid: { opacity: 0.68 },
    to: { opacity: 0.42 },
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
  // 목업 SuggestionCard: 0.6s, StrongRecall: 0.7s, HyperRecall: 0.9s.
  // 토큰 기본 600ms (SuggestionCard 기준).
  recallEmerge: {
    duration: 600,
    easing: 'cubic-bezier(.2,.7,.3,1)',
    fillMode: 'both' as const, // 목업 synapse-ui.jsx L207: `recall-emerge 0.6s ... both`.
    from: { opacity: 0, translateY: 12, scale: 0.96, blur: 4 },
    mid: { blur: 0 }, // 60% 지점에서 blur 해제.
    to: { opacity: 1, translateY: 0, scale: 1, blur: 0 },
  },
  // Sprint 7 (T1) 신규 — recall-emerge 0.7s 변형 (StrongRecall).
  // 디자인 목업 synapse-ui.jsx L253: `recall-emerge 0.7s cubic-bezier(.2,.7,.3,1) both`.
  // 키프레임은 base recallEmerge 와 동일, duration 만 700ms.
  recallEmergeStrong: {
    duration: 700,
    easing: 'cubic-bezier(.2,.7,.3,1)',
    fillMode: 'both' as const,
    from: { opacity: 0, translateY: 12, scale: 0.96, blur: 4 },
    mid: { blur: 0 },
    to: { opacity: 1, translateY: 0, scale: 1, blur: 0 },
  },
  // Sprint 7 (T1) 신규 — recall-emerge 0.9s 변형 (HyperRecall).
  // 디자인 목업 synapse-ui.jsx L299: `recall-emerge 0.9s cubic-bezier(.2,.7,.3,1) both`.
  recallEmergeHyper: {
    duration: 900,
    easing: 'cubic-bezier(.2,.7,.3,1)',
    fillMode: 'both' as const,
    from: { opacity: 0, translateY: 12, scale: 0.96, blur: 4 },
    mid: { blur: 0 },
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

// Sprint 7 (T1) — receipt step `motion-token-parity` 의 raw text fs 매칭 입력.
// 디자인 목업 styles.css 의 정수 값 / easing 토큰을 *코드 안에* 명시 노출 → tester T12 fixture 가
// design-system motion 정의 ↔ styles.css raw 두 곳에서 같은 정수를 grep 하여 drift 0 검증.
//
// 형태: { keyframeName: 'styles.css @keyframes 이름', mockupDuration: ms, mockupEasing: 'css ease string', mockupIterations?: 'infinite' | number }.
// (mockupDuration 은 styles.css `@keyframes` 자체에는 없고 inline `animation:` 사용에서 추출한 *대표값*.)
export const MOTION_MOCKUP_PARITY = [
  { token: 'inkRise',           keyframeName: 'ink-rise',       mockupDuration: 400,  mockupEasing: 'ease-out' },
  { token: 'ghostBreatheLoop',  keyframeName: 'ghost-breathe',  mockupDuration: 3000, mockupEasing: 'ease-in-out', mockupIterations: 'infinite' },
  { token: 'synapsePulse',      keyframeName: 'synapse-pulse',  mockupDuration: 2400, mockupEasing: 'ease-in-out', mockupIterations: 'infinite' },
  { token: 'recallEmerge',      keyframeName: 'recall-emerge',  mockupDuration: 600,  mockupEasing: 'cubic-bezier(.2,.7,.3,1)' },
  { token: 'recallEmergeStrong', keyframeName: 'recall-emerge', mockupDuration: 700,  mockupEasing: 'cubic-bezier(.2,.7,.3,1)' },
  { token: 'recallEmergeHyper', keyframeName: 'recall-emerge',  mockupDuration: 900,  mockupEasing: 'cubic-bezier(.2,.7,.3,1)' },
  { token: 'threadDraw',        keyframeName: 'thread-draw',    mockupDuration: 600,  mockupEasing: 'ease-out' },
  { token: 'nodeOrbit',         keyframeName: 'node-orbit',     mockupDuration: 2400, mockupEasing: 'linear', mockupIterations: 'infinite' },
] as const;

export type MotionMockupParity = typeof MOTION_MOCKUP_PARITY[number];
