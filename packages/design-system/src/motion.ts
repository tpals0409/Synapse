// Motion tokens — Sprint 1 은 `inkRise` 1종만.
// 진실원: 디자인 목업/styles.css `@keyframes ink-rise`, synapse-ui.jsx 사용처.
//
//   @keyframes ink-rise {
//     from { opacity: 0; transform: translateY(6px); }
//     to   { opacity: 1; transform: translateY(0); }
//   }
//   사용: `animation: "ink-rise 0.4s ease-out both"` (synapse-ui.jsx UserBubble/AIBubble).
//
// RN 호환:
//   - duration: number (ms) — Animated.timing / withTiming 에 직접 전달 가능.
//   - easing: 'ease-out' string — RN 코어 Animated 는 Easing 객체를 받지만 string 으로 노출하여
//     소비자가 reanimated / Animated 어느 쪽이든 자기 라이브러리 매핑을 적용하도록 함.
//   - translateY: number (dp) — `from.translateY` 시작값 (목업의 6px 그대로).
//
// 추후 (Sprint 3+): recall-emerge, synapse-pulse, ghost-breathe, thread-draw, node-orbit.
// 추가 시 같은 모양 (`{ duration, easing, ...keyframe-specific }`) 으로 확장.

export const motion = {
  inkRise: {
    duration: 400,
    easing: 'ease-out',
    from: { opacity: 0, translateY: 6 },
    to: { opacity: 1, translateY: 0 },
  },
} as const;

export type MotionToken = keyof typeof motion;
