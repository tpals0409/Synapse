// SuggestionCard — Sprint 4 (T6) 신규 컴포넌트. Recall L2.
// 디자인 목업 진실원: synapse-ui.jsx `SuggestionCard` (line 203) + screens.jsx `SuggestionScreen` (line 150).
//
// 동작 (디자인 목업 1:1):
//   1) 진입: motion.recallEmerge (0.6s cubic-bezier(.2,.7,.3,1) both) — opacity 0→1, blur 4→0, translateY 12→0.
//      목업 inline: `animation: "recall-emerge 0.6s cubic-bezier(.2,.7,.3,1) both"`.
//      RN Animated 는 Bezier(.2,.7,.3,1) 를 직접 지원 — Easing.bezier(0.2, 0.7, 0.3, 1).
//   2) PulseDot synapse-pulse — 진입 후 1 회 (목업: `animation: synapse-pulse 2s ease-in-out infinite` 이지만
//      T6 spec 은 "synapse-pulse 1 회" — accent 의 절제된 1 회 펄스로 단축.
//      구현: opacity 0.55 → 1 → 0.55, scale 1 → 1.18 → 1, 2400ms 1 회.
//
// 카피:
//   - label (필수): copy.{ko|en}.recall.suggestion.title ("관련 기억" / "Related memory") — synapse-deep mono uppercase.
//   - snippet (선택): 메모리 본문 — serif italic with quotes.
//
// props:
//   label: string                   — 필수 라벨.
//   snippet?: string                — 선택 본문 (없으면 라벨만).
//   onAccept?: () => void           — Expand 액션 (목업의 expandText 버튼).
//   onDismiss?: () => void          — Dismiss 액션 (목업의 dismissText 버튼).
//
// 토큰 매핑:
//   var(--paper-deep)               → colorsHex.light.paper + 미세 darken (목업: 종이 + 살짝 어둠)
//   var(--synapse), --synapse-deep  → colorsHex.light.synapse (#CB7229)
//   var(--ink), --ink-soft, --ink-mute → colorsHex.light.ink + alpha
//   var(--rule)                     → ink + 12% alpha (얇은 분리선)
//   var(--mono) / --serif           → fonts.mono / fonts.serif
//   margin "8px 16px 8px 44px"      → spacing { sm/lg/xl }
//   borderRadius 14                 → radius.md + 2 (직접 14)
//   padding "10px 12px"             → spacing { sm + 2, md }

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colorsHex } from '../colorsHex.ts';
import { fonts } from '../fonts.ts';
import { motion } from '../motion.ts';
import { spacing } from '../spacing.ts';

export interface SuggestionCardProps {
  label: string;
  snippet?: string;
  onAccept?: () => void;
  onDismiss?: () => void;
}

export const SuggestionCardMotionTokens = ['recallEmerge', 'synapsePulse'] as const satisfies readonly (keyof typeof motion)[];

export function SuggestionCard({ label, snippet, onAccept: _onAccept, onDismiss: _onDismiss }: SuggestionCardProps) {
  const enter = useRef(new Animated.Value(motion.recallEmerge.from.opacity)).current;       // 0
  const translateY = useRef(new Animated.Value(motion.recallEmerge.from.translateY)).current; // 12
  const scale = useRef(new Animated.Value(motion.recallEmerge.from.scale)).current;           // 0.96
  const pulseOpacity = useRef(new Animated.Value(motion.synapsePulse.from.opacity)).current;  // 0.55
  const pulseScale = useRef(new Animated.Value(motion.synapsePulse.from.scale)).current;      // 1

  useEffect(() => {
    const enterAnim = Animated.parallel([
      Animated.timing(enter, {
        toValue: motion.recallEmerge.to.opacity,
        duration: motion.recallEmerge.duration,
        easing: Easing.bezier(0.2, 0.7, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: motion.recallEmerge.to.translateY,
        duration: motion.recallEmerge.duration,
        easing: Easing.bezier(0.2, 0.7, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: motion.recallEmerge.to.scale,
        duration: motion.recallEmerge.duration,
        easing: Easing.bezier(0.2, 0.7, 0.3, 1),
        useNativeDriver: true,
      }),
    ]);

    // synapse-pulse 1 회 — 진입 후 한 cycle (mid → from).
    const pulseOnce = Animated.sequence([
      Animated.parallel([
        Animated.timing(pulseOpacity, {
          toValue: motion.synapsePulse.mid.opacity,
          duration: motion.synapsePulse.duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: motion.synapsePulse.mid.scale,
          duration: motion.synapsePulse.duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(pulseOpacity, {
          toValue: motion.synapsePulse.to.opacity,
          duration: motion.synapsePulse.duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: motion.synapsePulse.to.scale,
          duration: motion.synapsePulse.duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]);

    enterAnim.start(() => pulseOnce.start());

    return () => {
      enterAnim.stop();
      pulseOnce.stop();
    };
  }, [enter, translateY, scale, pulseOpacity, pulseScale]);

  return (
    <Animated.View
      accessibilityRole="text"
      accessibilityLabel={snippet ? `${label}: ${snippet}` : label}
      style={[
        styles.container,
        { opacity: enter, transform: [{ translateY }, { scale }] },
      ]}
    >
      <View style={styles.header}>
        <Animated.View
          style={[
            styles.pulseDot,
            { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
          ]}
        />
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {snippet ? (
        <Text style={styles.snippet} numberOfLines={3}>
          “{snippet}”
        </Text>
      ) : null}
    </Animated.View>
  );
}

const SYNAPSE = colorsHex.light.synapse;
const INK = colorsHex.light.ink;
const INK_SOFT = `${INK}CC`;        // ~80% (목업 --ink-soft 근사)
const RULE = `${INK}1F`;            // ~12% (목업 --rule)
const PAPER_DEEP = `${INK}0A`;      // 종이 위 살짝 어두운 띠 (paper-deep 근사 — alpha 4%)

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xl + 20, // 목업: 44px (avatar 너비 + gap)
    marginRight: spacing.lg,
    paddingVertical: spacing.sm + 2, // 목업: 10px
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    backgroundColor: PAPER_DEEP,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RULE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2, // 목업: 6px
    marginBottom: spacing.xs,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: SYNAPSE,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: SYNAPSE,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  snippet: {
    fontFamily: fonts.serif,
    fontSize: 12.5,
    color: INK_SOFT,
    lineHeight: 18,
    marginTop: 3,
    fontStyle: 'italic',
  },
});
