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
} from './InspectorList.tsx';
