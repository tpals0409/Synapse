// DismissButton — Sprint 6 (T6) 신규 컴포넌트. Failure & Hygiene 의 거절 버튼.
// 디자인 목업 진실원: synapse-ui.jsx `SuggestionCard` (line 203-244) 의 onDismiss/dismissText 버튼.
//
// **PM HOLD D-S6-design-system-mockup-conflict**:
//   본 컴포넌트는 *비충돌* 영역만 구현 — variant='reject' (Suggestion/Strong 거절) 1 개.
//   - variant='reject': 디자인 목업 SuggestionCard L236-240 의 onClick 버튼 1:1.
//     ("var(--ink-mute)" + sans 11 + transparent bg + padding "2px 0", marginLeft auto)
//   - variant='unlink' (Inspector unlink 슬롯): 디자인 목업 InspectorScreen 부재 → PM 결정 후 추가.
//   - 본 컴포넌트는 *string union* 으로 variant 타입을 노출 — 향후 'unlink' 추가 시 raw text drift guard 가
//     자가 선언 패턴 (D-S5-design-system-source-string-union) 을 준수.
//
// 카피:
//   - label (선택): copy.{ko|en}.recall.dismiss ("지금은 됐어요" / "Not now") — 미지정 시 dismiss 텍스트 자동.
//   - 호출자가 라벨 직접 주입 가능 (e.g. recall.never 로 바꿀 수 있음).
//
// props:
//   onPress: () => void              — 거절 콜백 (필수).
//   label?: string                   — 버튼 라벨 (선택, 미지정 시 'Dismiss').
//   variant?: 'reject'               — 현 sprint 1 종. 'unlink' 는 PM 결정 후 추가.
//
// accessibilityLabel:
//   - `dismiss-reject` (e2e 분기 가드 — task subject 의 `dismiss-{unlink|reject}` 패턴 정합).
//
// 토큰 매핑:
//   var(--ink-mute)  → colorsHex.light.ink + alpha (~60%, INK_MUTE)
//   var(--sans)      → fonts.sans
//   fontSize 11      → 직접 11
//   padding 2px 0    → spacing.xxs (2dp 직접)
//   letterSpacing 0.1 → 0.1

import { Pressable, StyleSheet, Text } from 'react-native';
import { colorsHex } from '../colorsHex.ts';
import { fonts } from '../fonts.ts';

// variant 자가 선언 (D-S5-design-system-source-string-union 정합 — protocol 직접 import 회피).
// 'unlink' 는 PM HOLD D-S6-design-system-mockup-conflict 결정 후 추가 예정.
export type DismissButtonVariant = 'reject';
export const DISMISS_BUTTON_VARIANTS: readonly DismissButtonVariant[] = ['reject'] as const;

export interface DismissButtonProps {
  onPress: () => void;
  label?: string;
  variant?: DismissButtonVariant;
}

export function DismissButton({
  onPress,
  label,
  variant = 'reject',
}: DismissButtonProps) {
  const text = label ?? 'Dismiss';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`dismiss-${variant}`}
      style={styles.container}
    >
      <Text style={styles.label} numberOfLines={1}>
        {text}
      </Text>
    </Pressable>
  );
}

const INK = colorsHex.light.ink;
const INK_MUTE = `${INK}99`; // ~60% (목업 --ink-mute 근사)

const styles = StyleSheet.create({
  container: {
    paddingVertical: 2,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: INK_MUTE,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
});
