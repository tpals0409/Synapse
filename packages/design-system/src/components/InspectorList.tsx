// InspectorList — Sprint 4 (T6) 신규 컴포넌트 + Sprint 5 (T7) source-pill 5+ 종.
// 디자인 목업 진실원: screens.jsx `InspectorScreen` (line 227) — 메모리 피드 / 흔적 리스트.
//
// row 타입: T6 spec 의 `{id, label, decided_at, act}` + Sprint 5 (T7) 의 optional `source`.
//   protocol `RecallLogRow` 와 일부 겹치지만 candidate_ids 만 가지고 표시용 label 이 없으므로,
//   디스플레이 전용 view 타입 (`InspectorRow`) 으로 별도 정의. mobile 가 RecallLogRow +
//   Concept + top candidate.source 를 join 하여 row 를 만든다.
//   [FROZEN v2026-04-29 D-S5-design-system-source-string-union] — protocol 의 RecallSource
//   타입을 직접 import 하지 않고 동일 6-string union (`InspectorSource`) 을 자가 선언.
//   recall.test.ts 가 protocol 정합 가드 책임. design-system peerDep 변경 0 + 데이터 모델
//   mobile 책임 헌법 그대로.
//   [FROZEN v2026-04-29 D-S5-InspectorList-source-field] — `InspectorRow.source?` optional.
//   미설정 시 'semantic' 폴백 (Sprint 4 회귀 0).
//
// 동작 (디자인 목업 1:1):
//   - 헤더: 스크린 상단의 "기억 / 당신이 남긴 흔적" 큰 헤더 + 통계 (총 기억 수).
//     T6 의 InspectorList 는 *list* 단독이므로 헤더 자체는 mobile 화면이 별도 렌더.
//   - 행: source-pill (kind 슬롯 재해석) · date · concept label · source 모션 dot.
//     디자인 목업 InspectorScreen 의 kind 라벨 슬롯 (synapse-deep mono uppercase 9px) 을
//     source 라벨 슬롯으로 1:1 재해석.
//   - source 모션 분기 (Sprint 5 T7):
//       semantic / co_occur / mixed = Sprint 4 그대로 (synapse-deep mono 라벨, dot 0).
//       bridge          = thread-draw 모션 + amber accent (svg dash stroke 그려짐).
//       temporal        = node-orbit 모션 + ink secondary (회전 dot).
//       domain_crossing = synapse-pulse 모션 + amber (호흡 dot).
//   - 폴백: source 미설정 시 'semantic' 시각 (Sprint 4 회귀 0).
//   - act = 'strong' 행은 Sprint 4 의 node-orbit dot 그대로 (source 모션과 별개 슬롯).
//
// FlatList 호환:
//   - rows props 를 받아 각 row 를 단순 매핑. ScrollView 기반 + `InspectorListItem` 별도 export.
//
// 토큰 매핑:
//   var(--paper)                    → colorsHex.light.paper
//   var(--ink), --ink-soft, --ink-mute, --ink-faint → colorsHex.light.ink + alpha
//   var(--rule)                     → ink + 12% alpha (행 분리선)
//   var(--synapse), --synapse-deep  → colorsHex.light.synapse
//   padding "14px 18px"             → spacing { md+2, lg+2 }

import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colorsHex } from '../colorsHex.ts';
import { fonts } from '../fonts.ts';
import { motion } from '../motion.ts';
import { spacing } from '../spacing.ts';

// 디스플레이 전용 — protocol RecallLogRow 와 별개 (mobile 가 join).
// 'silence' / 'ghost' / 'suggestion' / 'strong' — DecisionAct 4-원 슈퍼셋과 동일 string set.
export type InspectorAct = 'silence' | 'ghost' | 'suggestion' | 'strong';

// [FROZEN v2026-04-29 D-S5-design-system-source-string-union]
// protocol RecallSource 와 1:1 — recall.test.ts 가 정합 가드.
export type InspectorSource =
  | 'semantic'
  | 'co_occur'
  | 'mixed'
  | 'bridge'
  | 'temporal'
  | 'domain_crossing';

export interface InspectorRow {
  id: string;
  label: string;
  decided_at: number; // ms epoch
  act: InspectorAct;
  source?: InspectorSource;
}

export interface InspectorListProps {
  rows: InspectorRow[];
}

// Sprint 5 (T7): nodeOrbit (Sprint 4 strong + temporal) + threadDraw (bridge) + synapsePulse (domain_crossing).
// recallEmerge 는 본 컴포넌트의 row 진입 모션이 아니라 mobile screen 단의 모션 — 본 토큰셋에 미포함.
export const InspectorListMotionTokens = [
  'nodeOrbit',
  'threadDraw',
  'synapsePulse',
] as const satisfies readonly (keyof typeof motion)[];

const ACT_LABELS_KO: Record<InspectorAct, string> = {
  silence: '침묵',
  ghost: '힌트',
  suggestion: '제안',
  strong: '회상',
};

// source-pill 카피 — 디자인 목업 InspectorScreen 의 kind 라벨 슬롯과 동일한 시각 슬롯.
// 디자인 목업 content.jsx 에 source 분기 라벨 자체가 없어 verify-copy 검증 대상에서 제외 —
// copy.ts 에 추가하면 "디자인 목업에 없는 카피 추가 금지" 헌법 위반 위험. 컴포넌트 내부
// 상수로만 두고, 노출이 필요하면 향후 mobile 가 카피 prop 으로 override 가능 (현재 미노출).
const SOURCE_LABELS_KO: Record<InspectorSource, string> = {
  semantic: '의미',
  co_occur: '동시',
  mixed: '복합',
  bridge: '다리',
  temporal: '시기',
  domain_crossing: '교차',
};

function formatDate(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return '방금 전';
  const days = Math.floor(diff / 86_400_000);
  if (days >= 1) return `${days}일 전`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours >= 1) return `${hours}시간 전`;
  return `${Math.floor(diff / 60_000)}분 전`;
}

// source 별 visual accent — semantic / co_occur / mixed 는 Sprint 4 그대로 (synapse-deep).
// bridge / domain_crossing = synapse (amber accent), temporal = ink secondary.
function sourceAccent(source: InspectorSource): string {
  switch (source) {
    case 'temporal':
      return INK_MUTE; // ink secondary
    case 'bridge':
    case 'domain_crossing':
      return SYNAPSE; // amber accent
    case 'semantic':
    case 'co_occur':
    case 'mixed':
    default:
      return SYNAPSE_DEEP_HEX; // Sprint 4 그대로
  }
}

export function InspectorListItem({ row }: { row: InspectorRow }) {
  const orbit = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const dash = useRef(new Animated.Value(0)).current;

  const source: InspectorSource = row.source ?? 'semantic';

  // act='strong' 의 Sprint 4 node-orbit dot — source 모션과 별개 슬롯.
  useEffect(() => {
    if (row.act !== 'strong') return;
    const loop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: motion.nodeOrbit.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      orbit.setValue(0);
    };
  }, [row.act, orbit]);

  // source='temporal' 의 node-orbit dot.
  useEffect(() => {
    if (source !== 'temporal') return;
    const loop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: motion.nodeOrbit.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [source, orbit]);

  // source='domain_crossing' 의 synapse-pulse dot.
  useEffect(() => {
    if (source !== 'domain_crossing') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: motion.synapsePulse.duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: motion.synapsePulse.duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(0);
    };
  }, [source, pulse]);

  // source='bridge' 의 thread-draw stroke (단발 진입 모션).
  useEffect(() => {
    if (source !== 'bridge') return;
    Animated.timing(dash, {
      toValue: 1,
      duration: motion.threadDraw.duration,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
    return () => {
      dash.setValue(0);
    };
  }, [source, dash]);

  const rotate = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [
      motion.synapsePulse.from.scale,
      motion.synapsePulse.mid.scale,
    ],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [
      motion.synapsePulse.from.opacity,
      motion.synapsePulse.mid.opacity,
    ],
  });

  // bridge 의 thread-draw — width 14 의 가는 가로 스트로크가 좌→우 그려짐.
  const dashWidth = dash.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 14],
  });

  const accent = sourceAccent(source);
  const showStrongOrbit = row.act === 'strong';
  const showTemporalOrbit = source === 'temporal';
  const showPulse = source === 'domain_crossing';
  const showThread = source === 'bridge';

  return (
    <View style={styles.row}>
      <View style={styles.rowMeta}>
        <Text
          accessibilityLabel={`source-${source}`}
          style={[styles.kind, { color: accent }]}
          numberOfLines={1}
        >
          {SOURCE_LABELS_KO[source]}
        </Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.actLabel} numberOfLines={1}>
          {ACT_LABELS_KO[row.act]}
        </Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.date} numberOfLines={1}>
          {formatDate(row.decided_at)}
        </Text>
        <View style={styles.flex} />

        {/* source-pill 모션 슬롯 — 4 분기 중 하나만 활성 */}
        {showThread ? (
          <View
            accessibilityLabel="motion-thread-draw"
            style={styles.threadWrap}
          >
            <Animated.View
              style={[
                styles.threadLine,
                { width: dashWidth, backgroundColor: SYNAPSE },
              ]}
            />
          </View>
        ) : null}
        {showTemporalOrbit ? (
          <Animated.View
            accessibilityLabel="motion-node-orbit"
            style={[styles.orbitWrap, { transform: [{ rotate }] }]}
          >
            <View style={[styles.orbitNode, { backgroundColor: INK_MUTE }]} />
          </Animated.View>
        ) : null}
        {showPulse ? (
          <Animated.View
            accessibilityLabel="motion-synapse-pulse"
            style={[
              styles.pulseWrap,
              {
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          >
            <View style={[styles.pulseNode, { backgroundColor: SYNAPSE }]} />
          </Animated.View>
        ) : null}
        {showStrongOrbit && !showTemporalOrbit ? (
          <Animated.View
            style={[styles.orbitWrap, { transform: [{ rotate }] }]}
          >
            <View style={styles.orbitNode} />
          </Animated.View>
        ) : null}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {row.label}
      </Text>
    </View>
  );
}

export function InspectorList({ rows }: InspectorListProps) {
  return (
    <ScrollView
      accessibilityRole="list"
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {rows.map((row) => (
        <InspectorListItem key={row.id} row={row} />
      ))}
    </ScrollView>
  );
}

const SYNAPSE = colorsHex.light.synapse;
// synapse-deep — 디자인 목업 styles.css 의 oklch(52% 0.15 50). hex 폴백 미존재라
// synapse 로 폴백하되 컴포넌트 내부 상수로 격리 (colorsHex 추가 X — Sprint 4 동결).
const SYNAPSE_DEEP_HEX = SYNAPSE;
const INK = colorsHex.light.ink;
const PAPER = colorsHex.light.paper;
const INK_MUTE = `${INK}99`; // ~60%
const INK_FAINT = `${INK}66`; // ~40%
const RULE = `${INK}1F`;     // ~12%

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAPER,
  },
  content: {
    paddingVertical: spacing.sm,
  },
  row: {
    paddingVertical: spacing.md + 2, // 목업: 14px
    paddingHorizontal: spacing.lg + 2, // 목업: 18px
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RULE,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  kind: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: SYNAPSE,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  actLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: INK_MUTE,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dot: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: INK_FAINT,
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: INK_MUTE,
  },
  flex: { flex: 1 },
  orbitWrap: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  orbitNode: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: SYNAPSE,
    opacity: 0.6,
  },
  pulseWrap: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseNode: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SYNAPSE,
  },
  threadWrap: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  threadLine: {
    height: 1,
    backgroundColor: SYNAPSE,
  },
  label: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: INK,
    letterSpacing: -0.2,
    fontWeight: '600',
  },
});
