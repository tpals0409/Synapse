import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { colorsHex, copy, role, radius } from '@synapse/design-system';

const c = copy.ko;

// 디자인 목업 screens.jsx:30-78 (OnboardingScreen) 1:1.
// 흐름: SynapseGlyph + hi → sub → (synapse-pulse 도트 3 + hint) → CTA + tagline.
export default function Onboarding() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colorsHex.light.paper,
        paddingHorizontal: 28,
        paddingTop: 100,
        paddingBottom: 60,
        justifyContent: 'space-between',
      }}
    >
      <View>
        {/* SynapseGlyph 자리표시 — Sprint 7 polish 에서 정식 SVG 도입.
            Sprint 1 은 ink 색 원형 dot 으로 단순화 (목업 size=42). */}
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: radius.pill,
            backgroundColor: colorsHex.light.ink,
            opacity: 0.92,
          }}
        />
        <Text
          style={{
            fontFamily: role.heading,
            fontSize: 40,
            fontWeight: '600',
            color: colorsHex.light.ink,
            letterSpacing: -1.2,
            lineHeight: 42,
            marginTop: 28,
          }}
        >
          {c.onboarding.hi}
        </Text>
        <Text
          style={{
            fontFamily: role.body,
            fontSize: 19,
            color: colorsHex.light.ink,
            opacity: 0.66,
            letterSpacing: -0.3,
            lineHeight: 27,
            marginTop: 14,
          }}
        >
          {c.onboarding.sub}
        </Text>

        {/* synapse-pulse 도트 3 + hint (목업 line 47-61) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 36 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[0, 1, 2].map((i) => (
              <PulseDot key={i} delay={i * 400} />
            ))}
          </View>
          <Text
            style={{
              fontFamily: role.meta,
              fontSize: 10,
              color: colorsHex.light.ink,
              opacity: 0.45,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {c.onboarding.hint}
          </Text>
        </View>
      </View>

      <View>
        <Link href="/chat" asChild>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => ({
              paddingVertical: 16,
              borderRadius: radius.pill,
              backgroundColor: colorsHex.light.ink,
              opacity: pressed ? 0.85 : 1,
              alignItems: 'center',
            })}
          >
            <Text
              style={{
                fontFamily: role.heading,
                fontSize: 17,
                fontWeight: '600',
                color: colorsHex.light.paper,
                letterSpacing: -0.2,
              }}
            >
              {c.onboarding.cta}
            </Text>
          </Pressable>
        </Link>
        <Text
          style={{
            fontFamily: role.meta,
            fontSize: 9.5,
            color: colorsHex.light.ink,
            opacity: 0.32,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginTop: 14,
          }}
        >
          {c.tagline}
        </Text>
      </View>
    </View>
  );
}

// Sprint 1: motion.synapsePulse 토큰 부재 — 목업 @keyframes synapse-pulse 의도를
// RN Animated 로 직접 재현 (2400ms, opacity 0.4↔1.0, ease-in-out, stagger 400ms).
// Sprint 3+ 에서 motion.synapsePulse 추가 시 이 블록 교체.
function PulseDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [opacity, delay]);
  return (
    <Animated.View
      style={{
        width: 5,
        height: 5,
        borderRadius: radius.pill,
        backgroundColor: colorsHex.light.synapse,
        opacity,
      }}
    />
  );
}
