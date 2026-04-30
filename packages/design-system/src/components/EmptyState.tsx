// EmptyState — Sprint 7 (T3) 신규 컴포넌트.
// 디자인 목업 진실원: screens.jsx `EmptyStateScreen` (line 296-312, state="empty") + `EmptyStateScreen` (line 315-336, state="loading").
//
// 4 화면 (Onboarding / FirstChat / Inspector + Strong/Ghost) 의 `rows.length === 0` 분기에서 mount.
// 화면별 어떤 텍스트를 보여줄지는 호출자가 주입 — props 로 title/subtitle 직접 넘김 (목업과 동일).
//
// 동작 (디자인 목업 1:1):
//   1) 진입: motion.inkRise (0.4s ease-out) — opacity 0→1, translateY 6→0.
//   2) 'empty' variant: 점선 원 + 중앙 SynapseGlyph (비활성).
//   3) 'loading' variant: orbiting nodes (motion.nodeOrbit 2.4s linear infinite, 5 노드 staggered).
//
// props:
//   title: string                 — copy.{ko|en}.firstChat.empty 또는 화면 단위 카피 (필수).
//   subtitle?: string             — copy.{ko|en}.firstChat.emptySub (선택).
//   variant?: 'empty' | 'loading' — 디폴트 'empty'.
//   screen?: 'onboarding' | 'chat' | 'inspector' | 'library' — accessibilityLabel hook (e2e 분기 가드).
//
// accessibilityLabel:
//   - `empty-state-${variant}-${screen ?? 'generic'}`.
//
// 토큰 매핑:
//   var(--ink-faint)              → INK + 0x33 (~20%, 점선 border).
//   var(--ink-mute)               → INK + 0x99 (~60%, 본문 mute).
//   var(--ink)                    → colorsHex.light.ink.
//   var(--synapse) / glow         → colorsHex.light.synapse + opacity 변형.
//   border 1px dashed             → StyleSheet.hairlineWidth + dashed.
//   borderRadius 80/2 = 40        → 직접 (목업 50% of 80px).

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colorsHex } from '../colorsHex.ts';
import { fonts } from '../fonts.ts';
import { motion } from '../motion.ts';
import { spacing } from '../spacing.ts';
// Sprint 7 (T3 보강, [DIRECTIVE D-S7-designer-empty-error-constants-export]) — meta 분리.
// EmptyState 의 string literal arrays / type aliases 는 RN-free 모듈 (componentsMeta.ts) 에 단일 정의.
// 본 파일은 동일 식별자 re-export 로 기존 import 경로 (sub-entry) 호환성 유지.
import {
  EMPTY_STATE_SCREENS as META_EMPTY_STATE_SCREENS,
  EMPTY_STATE_VARIANTS as META_EMPTY_STATE_VARIANTS,
  type EmptyStateScreen as MetaEmptyStateScreen,
  type EmptyStateVariant as MetaEmptyStateVariant,
} from '../componentsMeta.ts';

// raw text fs 매칭 가드 (EmptyState.test.ts) 와 sub-entry 소비자 호환성 위해 동일 식별자 + 동일 시그니처로 재선언.
// 단, 값/타입 진실원은 componentsMeta — drift 시 type alias 비교 (EmptyStateScreen extends MetaEmptyStateScreen) 로 catch.
export type EmptyStateVariant = MetaEmptyStateVariant;
export type EmptyStateScreen = MetaEmptyStateScreen;

export const EMPTY_STATE_VARIANTS: readonly EmptyStateVariant[] = META_EMPTY_STATE_VARIANTS;
export const EMPTY_STATE_SCREENS: readonly EmptyStateScreen[] = META_EMPTY_STATE_SCREENS;

export interface EmptyStateProps {
  title: string;
  subtitle?: string;
  variant?: EmptyStateVariant;
  screen?: EmptyStateScreen;
}

// motion 토큰 노출 — design-system 내 일관 패턴 (HumbleRetraction / SuggestionCard 와 동일).
export const EmptyStateMotionTokens = ['inkRise', 'nodeOrbit'] as const satisfies readonly (keyof typeof motion)[];

const ORBIT_NODES = 5; // 목업 screens.jsx L325: [0, 0.4, 0.8, 1.2, 1.6] stagger 5 노드.

export function EmptyState({
  title,
  subtitle,
  variant = 'empty',
  screen,
}: EmptyStateProps) {
  const opacity = useRef(new Animated.Value(motion.inkRise.from.opacity)).current;
  const translateY = useRef(new Animated.Value(motion.inkRise.from.translateY)).current;
  const orbitProgress = useRef(new Animated.Value(0)).current;

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

    let orbitLoop: Animated.CompositeAnimation | null = null;
    if (variant === 'loading') {
      orbitLoop = Animated.loop(
        Animated.timing(orbitProgress, {
          toValue: 1,
          duration: motion.nodeOrbit.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      orbitLoop.start();
    }
    return () => {
      enter.stop();
      orbitLoop?.stop();
    };
  }, [opacity, translateY, orbitProgress, variant]);

  const orbitRotate = orbitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      accessibilityRole="text"
      accessibilityLabel={`empty-state-${variant}-${screen ?? 'generic'}`}
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      {variant === 'loading' ? (
        <View style={styles.loadingFigure}>
          {/* 중앙 노드 — synapse 호흡 (정적 표시, motion.synapsePulse 는 Sprint 7 Mobile T6 에서 wiring) */}
          <View style={styles.loadingCenterDot} />
          {/* orbiting 노드 5 종 — motion.nodeOrbit 2.4s linear infinite, stagger 무시하고 단일 회전 (RN 단순화) */}
          {Array.from({ length: ORBIT_NODES }).map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.orbitWrap,
                { transform: [{ rotate: orbitRotate }, { rotate: `${(i * 360) / ORBIT_NODES}deg` }] },
              ]}
            >
              <View
                style={[
                  styles.orbitDot,
                  { transform: [{ translateX: motion.nodeOrbit.radius }] },
                ]}
              />
            </Animated.View>
          ))}
        </View>
      ) : (
        // empty variant — 점선 원 + 중앙 비활성 dot.
        <View style={styles.emptyCircle}>
          <View style={styles.emptyDot} />
        </View>
      )}
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
    </Animated.View>
  );
}

const INK = colorsHex.light.ink;
const SYNAPSE = colorsHex.light.synapse;
const INK_FAINT = `${INK}33`; // ~20% (목업 --ink-faint)
const INK_MUTE = `${INK}99`;  // ~60% (목업 --ink-mute)

const FIGURE_SIZE = 80; // 목업 width/height 80.

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.xl + spacing.sm, // 목업 padding 32.
    paddingHorizontal: spacing.xl + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14, // 목업 gap 14.
  },
  emptyCircle: {
    width: FIGURE_SIZE,
    height: FIGURE_SIZE,
    borderRadius: FIGURE_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: INK_FAINT,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: INK_FAINT,
  },
  loadingFigure: {
    width: FIGURE_SIZE,
    height: FIGURE_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCenterDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: SYNAPSE,
  },
  orbitWrap: {
    position: 'absolute',
    width: FIGURE_SIZE,
    height: FIGURE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SYNAPSE,
    opacity: 0.5,
  },
  textBlock: {
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: INK,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.serif,
    fontSize: 13.5,
    color: INK_MUTE,
    marginTop: spacing.xs,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
