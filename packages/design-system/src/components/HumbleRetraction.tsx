// HumbleRetraction — Sprint 6 (T6) 신규 컴포넌트. Failure & Hygiene 의 AI 사과 카드.
// 디자인 목업 진실원: synapse-ui.jsx `HumbleRetraction` (line 425-443) + screens.jsx `HumbleRetractionScreen` (lang demo).
//
// **[FROZEN v2026-04-29 D-S6-design-system-mockup-conflict-resolution] PM A안 채택**:
//   - ChatBubble.retracted prop 신설 X — retraction 시각 = 본 별도 컴포넌트 mount.
//   - mobile chat 화면이 `messages.retracted === 1` 메시지 직후 본 카드 mount (디자인 목업 1:1).
//   - 라벨/취소선 X — AI 가 "잘못 연결했다" 사과하는 카드 형식.
//
// 동작 (디자인 목업 1:1):
//   1) 진입: motion.inkRise (0.4s ease-out) — opacity 0→1, translateY 6→0 (목업 ink-rise 0.4s).
//      목업 inline: `animation: "ink-rise 0.4s ease-out both"`.
//   2) 노출 정착 (계속 mount).
//
// 카피:
//   - text (필수, 호출자 주입): copy.{ko|en}.recall.humble
//     ko: "아, 잘못 연결했네요. 미안해요."
//     en: "Ah — I connected the wrong thread. Sorry."
//
// props:
//   text: string                    — 사과 본문 (필수). 호출자가 copy.recall.humble 주입.
//
// accessibilityLabel:
//   - `humble-retraction` (e2e 분기 hook — task subject 의 retracted 시각 e2e 정합).
//
// 토큰 매핑 (디자인 목업 → design-system):
//   var(--paper-shade)              → INK + 0x0A (~4% alpha) 종이 위 살짝 어두운 띠 근사.
//   var(--ink-faint)                → INK + 0x33 (~20%) (목업 dashed border 색).
//   var(--ink-mute)                 → INK + 0x99 (~60%) (X 아이콘 stroke + 사과 텍스트 색).
//   var(--serif)                    → fonts.serif (사과 본문은 serif italic — 목업 1:1).
//   borderRadius 12                 → radius.md.
//   margin "4px 16px 8px 44px"      → spacing { xs / lg / sm / xl+lg }.
//   padding "8px 12px"              → spacing { sm / md }.

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colorsHex } from '../colorsHex.ts';
import { fonts } from '../fonts.ts';
import { motion } from '../motion.ts';
import { radius } from '../radius.ts';
import { spacing } from '../spacing.ts';

export interface HumbleRetractionProps {
  text: string;
}

export const HumbleRetractionMotionTokens = ['inkRise'] as const satisfies readonly (keyof typeof motion)[];

export function HumbleRetraction({ text }: HumbleRetractionProps) {
  const opacity = useRef(new Animated.Value(motion.inkRise.from.opacity)).current;
  const translateY = useRef(new Animated.Value(motion.inkRise.from.translateY)).current;

  useEffect(() => {
    const enter = Animated.parallel([
      Animated.timing(opacity, {
        toValue: motion.inkRise.to.opacity,
        duration: motion.inkRise.duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: motion.inkRise.to.translateY,
        duration: motion.inkRise.duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    enter.start();
    return () => {
      enter.stop();
    };
  }, [opacity, translateY]);

  return (
    <Animated.View
      accessibilityRole="text"
      accessibilityLabel="humble-retraction"
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      {/* X 아이콘 — 목업 svg 14x14, 두 cross line. RN 에서는 두 View 회전으로 근사. */}
      <View style={styles.iconWrap}>
        <View style={[styles.iconBar, styles.iconBarLeft]} />
        <View style={[styles.iconBar, styles.iconBarRight]} />
      </View>
      <Text style={styles.text} numberOfLines={3}>
        {text}
      </Text>
    </Animated.View>
  );
}

const INK = colorsHex.light.ink;
const PAPER_SHADE = `${INK}0A`;       // ~4% (목업 --paper-shade 근사)
const INK_FAINT = `${INK}33`;         // ~20% (목업 dashed border)
const INK_MUTE = `${INK}99`;          // ~60% (목업 X 아이콘 + 사과 텍스트)

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
    marginRight: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xl + 20, // 목업: 44px (avatar 너비 + gap, AIBubble 정합).
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: PAPER_SHADE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: INK_FAINT,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 14,
    height: 14,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBar: {
    position: 'absolute',
    width: 12,
    height: 1,
    backgroundColor: INK_MUTE,
  },
  iconBarLeft: {
    transform: [{ rotate: '45deg' }],
  },
  iconBarRight: {
    transform: [{ rotate: '-45deg' }],
  },
  text: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 12.5,
    color: INK_MUTE,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
