// design-system 컴포넌트 sub-entry.
// 본 entry 는 react-native 의존이라 design-system 의 node test 에서는 import 되지 않는다.
// mobile (RN+Expo) 가 `@synapse/design-system/components` 로 import.
export { CaptureToast } from './CaptureToast.tsx';
export type { CaptureToastProps } from './CaptureToast.tsx';

// Sprint 4 (T6) — Recall L1/L2/L3 + Inspector.
export { GhostHint, GhostHintMotionTokens } from './GhostHint.tsx';
export type { GhostHintProps } from './GhostHint.tsx';

export { SuggestionCard, SuggestionCardMotionTokens } from './SuggestionCard.tsx';
export type { SuggestionCardProps } from './SuggestionCard.tsx';

export { StrongRecall, StrongRecallMotionTokens } from './StrongRecall.tsx';
export type { StrongRecallProps } from './StrongRecall.tsx';

export {
  InspectorList,
  InspectorListItem,
  InspectorListMotionTokens,
} from './InspectorList.tsx';
export type {
  InspectorListProps,
  InspectorRow,
  InspectorAct,
  InspectorSource,
} from './InspectorList.tsx';

// Sprint 6 (T6) — Dismiss / HumbleRetraction.
export { DismissButton, DISMISS_BUTTON_VARIANTS } from './DismissButton.tsx';
export type { DismissButtonProps, DismissButtonVariant } from './DismissButton.tsx';

// Sprint 6 (T6) [FROZEN D-S6-design-system-mockup-conflict-resolution] PM A안 채택 —
// retracted 메시지 시각 = ChatBubble.retracted prop 신설 X / HumbleRetraction 카드 mount.
// 디자인 목업 synapse-ui.jsx L425-443 1:1.
export { HumbleRetraction, HumbleRetractionMotionTokens } from './HumbleRetraction.tsx';
export type { HumbleRetractionProps } from './HumbleRetraction.tsx';

// Sprint 7 (T3) — Empty / Error 4 화면 공통 컴포넌트.
// 디자인 목업 진실원: screens.jsx `EmptyStateScreen` (line 296-360, state="empty"|"loading"|"error").
// reason union 은 자가 선언 (D-S5 정합) — conversation T7 / mobile T6 가 동일 union 을 consumer 측에서 직접 박음.
export {
  EmptyState,
  EmptyStateMotionTokens,
  EMPTY_STATE_VARIANTS,
  EMPTY_STATE_SCREENS,
} from './EmptyState.tsx';
export type {
  EmptyStateProps,
  EmptyStateVariant,
  EmptyStateScreen,
} from './EmptyState.tsx';

export {
  ErrorState,
  ErrorStateMotionTokens,
  ERROR_STATE_REASONS,
} from './ErrorState.tsx';
export type {
  ErrorStateProps,
  ErrorStateReason,
  ErrorStateScreen,
} from './ErrorState.tsx';
