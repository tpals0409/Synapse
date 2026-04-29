// StrongRecall — Sprint 4 (T6) 신규 컴포넌트. Recall L3.
// 디자인 목업 진실원: synapse-ui.jsx `StrongRecall` (line 250) + screens.jsx `StrongRecallScreen` (line 175).
//
// 동작 (디자인 목업 1:1):
//   1) 진입: motion.recallEmerge (0.7s cubic-bezier(.2,.7,.3,1) both) — opacity 0→1, blur 4→0, translateY 12→0.
//      목업은 0.7s, T6 spec 은 "thread-draw 0.6s + synapse-pulse 반복" 으로 해당 1 차 진입을
//      thread-draw 600ms 와 일치시키는 것이 자연스럽다 — recallEmerge.duration (600ms) 그대로 사용.
//   2) thread-draw 0.6s: corner mark 의 outer ring SVG stroke 가 그려지는 표현.
//      RN 측에서 SVG 미사용 → 동일 의미를 outer ring 의 scale + opacity 진입으로 근사
//      (0.6 → 1 / opacity 0 → 0.5).
//   3) corner mark synapse-pulse 반복 — opacity 0.55↔1, scale 1↔1.18 무한.
//
// 카피:
//   - label (필수): copy.{ko|en}.recall.strong.title ("다시 떠오른 생각" / "A returning thought").
//   - snippet (필수): 메모리 본문 — serif quote.
//
// props:
//   label: string                   — 필수.
//   snippet: string                 — 필수 (Strong Recall 은 본문이 핵심).
//   onContinue?: () => void         — 사용자 수용 (대화 계속) 콜백.
//   onDismiss?: () => void          — 거절 콜백.
//
// 토큰 매핑:
//   var(--synapse-mist), --paper-deep → linear-gradient — RN 은 단색 백그라운드로 단순화.
//                                       paper + synapse 6% alpha (mist 근사).
//   var(--synapse) 30%/6%/12% mix    → 보더 / 글로우.
//   var(--ink), --ink-mute            → ink + alpha.
//   borderRadius 18                   → radius.lg.

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colorsHex } from '../colorsHex.ts';
import { fonts } from '../fonts.ts';
import { motion } from '../motion.ts';
import { radius } from '../radius.ts';
import { spacing } from '../spacing.ts';

export interface StrongRecallProps {
  label: string;
  snippet: string;
  onContinue?: () => void;
  onDismiss?: () => void;
}

export const StrongRecallMotionTokens = ['recallEmerge', 'threadDraw', 'synapsePulse'] as const satisfies readonly (keyof typeof motion)[];

export function StrongRecall({ label, snippet, onContinue: _onContinue, onDismiss: _onDismiss }: StrongRecallProps) {
  const enter = useRef(new Animated.Value(motion.recallEmerge.from.opacity)).current;       // 0
  const translateY = useRef(new Animated.Value(motion.recallEmerge.from.translateY)).current; // 12
  const scale = useRef(new Animated.Value(motion.recallEmerge.from.scale)).current;           // 0.96

  // thread-draw 근사: outer ring scale 0.6 → 1 + opacity 0 → 0.5 (목업 outer circle opacity 0.5).
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  // synapse-pulse 반복: corner mark 안쪽 dot.
  const pulseOpacity = useRef(new Animated.Value(motion.synapsePulse.from.opacity)).current; // 0.55
  const pulseScale = useRef(new Animated.Value(motion.synapsePulse.from.scale)).current;     // 1

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

    const ringDraw = Animated.parallel([
      Animated.timing(ringScale, {
        toValue: 1,
        duration: motion.threadDraw.duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 0.5,
        duration: motion.threadDraw.duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    const pulseLoop = Animated.loop(
      Animated.sequence([
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
      ]),
    );

    Animated.parallel([enterAnim, ringDraw]).start(() => pulseLoop.start());

    return () => {
      enterAnim.stop();
      ringDraw.stop();
      pulseLoop.stop();
    };
  }, [enter, translateY, scale, ringScale, ringOpacity, pulseOpacity, pulseScale]);

  return (
    <Animated.View
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${snippet}`}
      style={[
        styles.container,
        { opacity: enter, transform: [{ translateY }, { scale }] },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.cornerMark}>
          <Animated.View
            style={[
              styles.cornerRing,
              { opacity: ringOpacity, transform: [{ scale: ringScale }] },
            ]}
          />
          <Animated.View
            style={[
              styles.cornerCore,
              { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
            ]}
          />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.quoteWrap}>
        <View style={styles.quoteBar} />
        <Text style={styles.quote} numberOfLines={6}>
          {snippet}
        </Text>
      </View>
    </Animated.View>
  );
}

const SYNAPSE = colorsHex.light.synapse;
const INK = colorsHex.light.ink;
const PAPER = colorsHex.light.paper;
const SYNAPSE_BORDER = `${SYNAPSE}4D`; // ~30%

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm + 2, // 목업: 10px
    marginHorizontal: spacing.lg,
    paddingTop: spacing.md + 2,
    paddingHorizontal: spacing.md + 2,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: PAPER,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SYNAPSE_BORDER,
    // RN shadow: synapse 글로우 6% (목업 box-shadow 0 0 0 6px synapse 6%).
    shadowColor: SYNAPSE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: spacing.xs + 2, // 목업: 6px
  },
  cornerMark: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SYNAPSE,
  },
  cornerCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SYNAPSE,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: SYNAPSE,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  quoteWrap: {
    flexDirection: 'row',
  },
  quoteBar: {
    width: 2,
    backgroundColor: SYNAPSE,
    marginRight: spacing.sm + 2, // 목업: 10px
  },
  quote: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 14.5,
    color: INK,
    lineHeight: 22,
    fontStyle: 'italic',
    letterSpacing: -0.1,
  },
});
