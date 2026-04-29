// InspectorList — Sprint 4 (T6) 신규 컴포넌트.
// 디자인 목업 진실원: screens.jsx `InspectorScreen` (line 227) — 메모리 피드 / 흔적 리스트.
//
// row 타입: T6 spec 의 `{id, label, decided_at, act}` — protocol `RecallLogRow` 와 일부 겹치지만
//   `RecallLogRow` 는 candidate_ids 만 가지고 표시용 label 이 없으므로, 디스플레이 전용 view 타입
//   (`InspectorRow`) 으로 별도 정의. mobile (T7) 가 RecallLogRow + Concept join 하여 row 를 만든다.
//   protocol 직접 import 회피 — design-system 은 시각/카피 단일 진실원, 데이터 모델은 mobile 책임.
//
// 동작 (디자인 목업 1:1):
//   - 헤더: 스크린 상단의 "기억 / 당신이 남긴 흔적" 큰 헤더 + 통계 (총 기억 수).
//     T6 의 InspectorList 는 *list* 단독이므로 헤더 자체는 mobile 화면이 별도 렌더 (이 컴포넌트는 list 만).
//   - 행: kind label · date · density bar · concept · text quote.
//     본 컴포넌트의 row 는 단순화 — kind 는 act, label 만 보여줌.
//   - node-orbit: 각 행 옆에 살짝 회전하는 dot (act = 'strong' 행만, 강조).
//
// FlatList 호환:
//   - rows props 를 받아 각 row 를 단순 매핑. 본 컴포넌트 자체는 ScrollView 기반으로 작성하되
//     `InspectorListItem` 을 별도 export 하여 mobile (T7) 가 FlatList renderItem 으로 바인딩 가능.
//
// props:
//   rows: InspectorRow[]
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

export interface InspectorRow {
  id: string;
  label: string;
  decided_at: number; // ms epoch
  act: InspectorAct;
}

export interface InspectorListProps {
  rows: InspectorRow[];
}

export const InspectorListMotionTokens = ['nodeOrbit'] as const satisfies readonly (keyof typeof motion)[];

const ACT_LABELS_KO: Record<InspectorAct, string> = {
  silence: '침묵',
  ghost: '힌트',
  suggestion: '제안',
  strong: '회상',
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

export function InspectorListItem({ row }: { row: InspectorRow }) {
  const orbit = useRef(new Animated.Value(0)).current;

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

  const rotate = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.row}>
      <View style={styles.rowMeta}>
        <Text style={styles.kind} numberOfLines={1}>
          {ACT_LABELS_KO[row.act]}
        </Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.date} numberOfLines={1}>
          {formatDate(row.decided_at)}
        </Text>
        <View style={styles.flex} />
        {row.act === 'strong' ? (
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
  label: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: INK,
    letterSpacing: -0.2,
    fontWeight: '600',
  },
});
