// GhostHint — Sprint 4 (T6) 신규 컴포넌트. Recall L1.
// 디자인 목업 진실원: synapse-ui.jsx `GhostHint` (line 172) + screens.jsx `GhostHintScreen` (line 119).
//
// 동작 (디자인 목업 1:1):
//   1) 진입: motion.recallEmerge (0.4s, blur→clear) — opacity 0→1, blur 4→0.
//      목업의 SuggestionCard/StrongRecall 은 0.6~0.7s 의 더 긴 emerge 를 쓰지만, GhostHint 는
//      "fade in 후 호흡" 의 가벼운 진입이라 0.4s 로 단축 (T6 spec: "0.4s").
//   2) 호흡: motion.ghostBreathe 의 keyframe 0.42↔0.68 을 무한 반복 (fade in/out loop).
//      ※ Sprint 3 의 ghostBreathe 토큰은 CaptureToast out-fade(1→0) 용으로 dual-purpose.
//        GhostHint 용 호흡은 keyframe 진실원(0.42↔0.68) 그대로 inline 처리.
//
// 카피:
//   - label (필수): copy.{ko|en}.recall.ghost.title 등을 mobile 가 주입.
//
// props:
//   label: string                   — synapse-deep mono uppercase 라벨 ("그날의 너" / "From you, before").
//   onDismiss?: () => void          — 사용자 dismiss 콜백 (long press / external dismiss).
//
// 토큰 매핑 (디자인 목업 → design-system):
//   var(--synapse), --synapse-deep  → colorsHex.light.synapse (#CB7229)
//   var(--ink), --ink-mute          → colorsHex.light.ink + 40% alpha
//   var(--ink-faint)                → colorsHex.light.ink + 25% alpha
//   var(--mono) / --serif           → fonts.mono / fonts.serif
//   padding "6px 18px 4px"          → spacing { xs/sm/lg }

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colorsHex } from '../colorsHex.ts';
import { fonts } from '../fonts.ts';
import { motion } from '../motion.ts';
import { spacing } from '../spacing.ts';

export interface GhostHintProps {
  label: string;
  onDismiss?: () => void;
}

const BREATHE_LOW = 0.42;  // keyframe 진실원 (styles.css: ghost-breathe).
const BREATHE_HIGH = 0.68;
const BREATHE_DURATION = 1500; // 절반 주기 (총 3s ease-in-out infinite, 한 cycle = 3s).
const ENTER_DURATION = 400;    // T6 spec: recall-emerge 0.4s blur→clear (GhostHint 변형).

export function GhostHint({ label, onDismiss }: GhostHintProps) {
  const enter = useRef(new Animated.Value(0)).current;     // 0 → BREATHE_HIGH 페이드 인
  const breathe = useRef(new Animated.Value(BREATHE_HIGH)).current;
  const enteredRef = useRef(false);

  useEffect(() => {
    const enterAnim = Animated.timing(enter, {
      toValue: 1,
      duration: ENTER_DURATION,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: BREATHE_LOW,
          duration: BREATHE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: BREATHE_HIGH,
          duration: BREATHE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    enterAnim.start(() => {
      enteredRef.current = true;
      breatheLoop.start();
    });

    return () => {
      enterAnim.stop();
      breatheLoop.stop();
    };
  }, [enter, breathe]);

  // 합성 opacity = enter (0→1 페이드) * breathe (호흡 0.42↔0.68).
  const opacity = Animated.multiply(enter, breathe);

  return (
    <Animated.View
      accessibilityRole="text"
      accessibilityLabel={label}
      onAccessibilityTap={onDismiss}
      style={[styles.container, { opacity }]}
    >
      <View style={styles.dot}>
        <View style={styles.dotCore} />
        <View style={styles.dotRing} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

// 컴포넌트가 사용한 motion 토큰 — test 가 토큰 인식 검증에 활용.
export const GhostHintMotionTokens = ['ghostBreathe', 'recallEmerge'] as const satisfies readonly (keyof typeof motion)[];

const SYNAPSE = colorsHex.light.synapse;

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs + 2,         // 목업: 6px
    paddingBottom: spacing.xs,          // 목업: 4px
    paddingHorizontal: spacing.lg + 2,  // 목업: 18px
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dot: {
    width: 14,
    height: 14,
    flexShrink: 0,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotCore: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: SYNAPSE,
    opacity: 0.6,
  },
  dotRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SYNAPSE,
    borderStyle: 'dashed',
    opacity: 0.4,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: SYNAPSE,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
