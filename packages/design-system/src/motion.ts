// Motion tokens — Sprint 1: `inkRise`. Sprint 3: `ghostBreathe` 추가 (CaptureToast out-fade).
// 진실원: 디자인 목업/styles.css `@keyframes ink-rise`, `@keyframes ghost-breathe`.
//
//   @keyframes ink-rise {
//     from { opacity: 0; transform: translateY(6px); }
//     to   { opacity: 1; transform: translateY(0); }
//   }
//   사용: `animation: "ink-rise 0.4s ease-out both"` (synapse-ui.jsx UserBubble/AIBubble/CaptureToast).
//
//   @keyframes ghost-breathe {
//     0%, 100% { opacity: 0.42; }
//     50%      { opacity: 0.68; }
//   }
//   목업 사용: GhostHint 의 무한 호흡(3s ease-in-out infinite).
//   Sprint 3 차용 — CaptureToast 노출 종료 시 out-fade(0.6s) 페이드 트윈으로 재사용
//     (1 → 0 으로 단방향 처리; keyframe 의 호흡 0.42↔0.68 은 GhostHint 전용).
//
// RN 호환:
//   - duration: number (ms) — Animated.timing / withTiming 에 직접 전달.
//   - easing: 'ease-out' / 'ease-in-out' string — 소비자가 reanimated / Animated 매핑을 적용.
//   - translateY: number (dp) — inkRise from.translateY 시작값 (목업의 6px 그대로).
//
// 추후 (Sprint 3+): recall-emerge, synapse-pulse, thread-draw, node-orbit.

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
} as const;

export type MotionToken = keyof typeof motion;
