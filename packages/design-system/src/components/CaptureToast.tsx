// CaptureToast — Sprint 3 신규 컴포넌트.
// 디자인 목업 진실원: synapse-ui.jsx `CaptureToast` (line 144) + screens.jsx `FirstChatScreen` (line 104).
//
// 동작 (디자인 목업 1:1):
//   1) 진입: motion.inkRise (0.4s ease-out) — opacity 0→1, translateY 6→0.
//   2) 노출: 2.4s 동안 정착 (opacity 1).
//   3) 퇴장: motion.ghostBreathe out-fade (0.6s ease-in-out) — opacity 1→0.
//   합계 약 3.4s 후 onDismiss?() 콜백.
//
// 카피:
//   - 메인(label): copy.{ko|en}.firstChat.captured        ("방금 기억됨" / "Just remembered")
//   - 서브(sublabel): copy.{ko|en}.firstChat.capturedSub  ("이 생각은 당신의 그래프에 연결됐어요" / "Linked into your graph")
//   - concepts: 배열 → 목업의 "x · y · z" 표기와 일치하도록 ' · ' 로 join (synapse-ui.jsx 의 capture demo 입력 형식).
//
// props 타입:
//   concepts: Concept[] (≤3, mobile T8 가 호출 시 보장)
//   lang?: 'ko' | 'en' (default 'ko' — 디자인 목업 lang prop 동일)
//   onDismiss?: () => void (out-fade 종료 시 호출, mobile 에서 unmount/clear)
//
// RN/web 호환:
//   - Animated.Value (RN core API) — RN-Web 자동 매핑.
//   - useNativeDriver: true — opacity / transform 만 사용 (RN-Web 에서는 무시되지만 prop 자체는 무해).
//
// 토큰 매핑 (디자인 목업 → design-system):
//   var(--paper-shade)              → colorsHex.light.paper (인라인 deep 변형 — paper 위에 살짝 어두운 띠)
//   var(--synapse), --synapse-glow  → colorsHex.light.synapse (#CB7229) + 0.18 opacity ripple ring
//   var(--ink), --ink-faint         → colorsHex.light.ink + 0.6 alpha (sublabel)
//   var(--mono) / --serif            → fonts.mono / fonts.serif
//   borderRadius 12                 → radius.md
//   margin "4px 16px 8px"           → spacing { xs/sm/lg }
//   padding "8px 12px"              → spacing { sm, md }

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { Concept } from '@synapse/engine';
import { colorsHex } from '../colorsHex.ts';
import { copy, type CopyLang } from '../copy.ts';
import { fonts } from '../fonts.ts';
import { motion } from '../motion.ts';
import { radius } from '../radius.ts';
import { spacing } from '../spacing.ts';

export interface CaptureToastProps {
  concepts: Concept[];
  lang?: CopyLang;
  onDismiss?: () => void;
}

const HOLD_MS = 2400; // 디자인 목업: 진입 후 2.4s 노출.

export function CaptureToast({ concepts, lang = 'ko', onDismiss }: CaptureToastProps) {
  const opacity = useRef(new Animated.Value(motion.inkRise.from.opacity)).current;
  const translateY = useRef(new Animated.Value(motion.inkRise.from.translateY)).current;
  const dismissedRef = useRef(false);

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

    const exit = Animated.timing(opacity, {
      toValue: motion.ghostBreathe.to.opacity,
      duration: motion.ghostBreathe.duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });

    enter.start(() => {
      const t = setTimeout(() => {
        exit.start(() => {
          if (!dismissedRef.current) {
            dismissedRef.current = true;
            onDismiss?.();
          }
        });
      }, HOLD_MS);

      return () => clearTimeout(t);
    });

    return () => {
      enter.stop();
      exit.stop();
    };
    // concepts/lang 가 바뀌면 토스트가 새로 등장 — 의도적 의존성.
  }, [concepts, lang, onDismiss, opacity, translateY]);

  const c = copy[lang].firstChat;
  const labelText = c.captured;
  const sublabelText = c.capturedSub;
  const conceptText = concepts.map((cc) => cc.label).join(' · ');

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLabel={`${labelText}: ${conceptText}`}
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.dot}>
        <View style={styles.dotRing} />
        <View style={styles.dotCore} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{labelText}</Text>
        {conceptText.length > 0 && (
          <Text style={styles.concepts}>{conceptText}</Text>
        )}
        <Text style={styles.sublabel}>{sublabelText}</Text>
      </View>
    </Animated.View>
  );
}

const SYNAPSE = colorsHex.light.synapse;
const INK = colorsHex.light.ink;
// "synapse-mist" 폴백 — 목업의 var(--synapse-mist) 는 paper 위에 synapse 25% 정도의 옅은 안개.
// RN 측 alpha 컬러로 근사: synapse + 0x14 (~8%) 알파 채널.
const SYNAPSE_MIST = `${SYNAPSE}14`;
const SYNAPSE_BORDER = `${SYNAPSE}40`; // ~25% (목업: synapse 25%)
const INK_FAINT = `${INK}99`; // ~60% (목업 --ink-faint 근사)

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: SYNAPSE_MIST,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SYNAPSE_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 22,
    height: 22,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotRing: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SYNAPSE,
    opacity: 0.18,
  },
  dotCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: SYNAPSE,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    color: SYNAPSE,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  concepts: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: INK,
    lineHeight: 18,
    marginTop: 2,
    fontStyle: 'italic',
  },
  sublabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: INK_FAINT,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
