// ErrorState — Sprint 7 (T3) 신규 컴포넌트.
// 디자인 목업 진실원: screens.jsx `EmptyStateScreen` (line 339-360, state="error").
//
// 4 화면 (Onboarding / FirstChat / Inspector + Strong/Ghost) 의 try/catch 분기에서 mount.
// reason prop 으로 LLM 실패 / storage 실패 / network 실패 분류 (mobile T6 + conversation T7 의 입력).
//
// 동작 (디자인 목업 1:1):
//   1) 진입: motion.inkRise (0.4s ease-out) — opacity 0→1, translateY 6→0.
//   2) 점선 X 아이콘 + 본문 + retry 버튼 (선택, onRetry 주입 시).
//
// reason → 의미 (mobile/conversation 분기 가드):
//   - 'llm-failure':     LLM stream / generate 실패.
//   - 'storage-failure': SQLite read/write 실패 (rows 로드, append).
//   - 'network-failure': 외부 네트워크 (없는 경우 reserved, Sprint 8+).
//
// props:
//   title: string                                              — copy.{ko|en}.firstChat.error 또는 화면 단위.
//   subtitle?: string                                          — copy.{ko|en}.firstChat.errorSub.
//   reason: 'llm-failure' | 'storage-failure' | 'network-failure' (필수).
//   retryLabel?: string                                        — copy.{ko|en}.firstChat.retry.
//   onRetry?: () => void                                       — retry 버튼 콜백 (없으면 버튼 미렌더).
//   screen?: 'onboarding' | 'chat' | 'inspector' | 'library'   — accessibilityLabel hook.
//
// accessibilityLabel:
//   - 컨테이너: `error-state-${reason}-${screen ?? 'generic'}`.
//   - retry 버튼: `error-state-retry-${reason}`.
//
// 토큰 매핑 (목업 → design-system):
//   var(--ink) / paper / ink-faint / ink-mute → colorsHex.light.{ink, paper} + alpha.
//   borderRadius 100 (pill button) → radius.pill.
//   padding "10px 22px" (button)   → spacing { sm+2 / xl-2 } 근사.
//   fontFamily var(--sans)         → fonts.sans.

import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colorsHex } from '../colorsHex.ts';
import { fonts } from '../fonts.ts';
import { motion } from '../motion.ts';
import { radius } from '../radius.ts';
import { spacing } from '../spacing.ts';
// Sprint 7 (T3 보강, [DIRECTIVE D-S7-designer-empty-error-constants-export]) — meta 분리.
// ErrorState 의 reason union + ERROR_STATE_REASONS literal array + screen union 은 RN-free 모듈
// (componentsMeta.ts) 에 단일 정의. 본 파일은 동일 식별자 re-export.
//
// reason 자가 선언 (D-S5-design-system-source-string-union 정합 — protocol 직접 import 회피).
// dev doc §3 conversation T7 / mobile T6 가 동일 union 을 *consumer 측에서* 직접 박아 사용 (drift guard).
import {
  ERROR_STATE_REASONS as META_ERROR_STATE_REASONS,
  type ErrorStateReason as MetaErrorStateReason,
  type ErrorStateScreen as MetaErrorStateScreen,
} from '../componentsMeta.ts';

export type ErrorStateReason = MetaErrorStateReason;
export const ERROR_STATE_REASONS: readonly ErrorStateReason[] = META_ERROR_STATE_REASONS;

export type ErrorStateScreen = MetaErrorStateScreen;

export interface ErrorStateProps {
  title: string;
  subtitle?: string;
  reason: ErrorStateReason;
  retryLabel?: string;
  onRetry?: () => void;
  screen?: ErrorStateScreen;
}

export const ErrorStateMotionTokens = ['inkRise'] as const satisfies readonly (keyof typeof motion)[];

export function ErrorState({
  title,
  subtitle,
  reason,
  retryLabel,
  onRetry,
  screen,
}: ErrorStateProps) {
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
      accessibilityLabel={`error-state-${reason}-${screen ?? 'generic'}`}
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      {/* 점선 X — 목업 svg 36x36 cross + 두 dot. RN 에서는 두 라인 회전으로 근사. */}
      <View style={styles.iconCircle}>
        <View style={styles.iconBox}>
          <View style={[styles.iconBar, styles.iconBarLeft]} />
          <View style={[styles.iconBar, styles.iconBarRight]} />
          <View style={[styles.iconDot, styles.iconDotTL]} />
          <View style={[styles.iconDot, styles.iconDotBR]} />
        </View>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={`error-state-retry-${reason}`}
          style={styles.retryButton}
        >
          <Text style={styles.retryLabel} numberOfLines={1}>
            {retryLabel ?? 'Retry'}
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const INK = colorsHex.light.ink;
const PAPER = colorsHex.light.paper;
const INK_FAINT = `${INK}33`; // ~20% (목업 --ink-faint)
const INK_MUTE = `${INK}99`;  // ~60% (목업 --ink-mute)

const FIGURE_SIZE = 80; // 목업 80x80 원.

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.xl + spacing.sm,
    paddingHorizontal: spacing.xl + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  iconCircle: {
    width: FIGURE_SIZE,
    height: FIGURE_SIZE,
    borderRadius: FIGURE_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: INK_FAINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBar: {
    position: 'absolute',
    width: 22,
    height: StyleSheet.hairlineWidth + 0.5,
    backgroundColor: INK_MUTE,
  },
  iconBarLeft: {
    transform: [{ rotate: '45deg' }],
  },
  iconBarRight: {
    transform: [{ rotate: '-45deg' }],
  },
  iconDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: INK_FAINT,
  },
  iconDotTL: {
    top: 4,
    left: 4,
  },
  iconDotBR: {
    bottom: 4,
    right: 4,
  },
  textBlock: {
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: INK,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: INK_MUTE,
    marginTop: 3, // 목업 marginTop 3.
    fontStyle: 'italic',
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 10, // 목업 padding "10px 22px".
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    backgroundColor: INK,
    alignSelf: 'center',
  },
  retryLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '500',
    color: PAPER,
    letterSpacing: -0.1,
  },
});
