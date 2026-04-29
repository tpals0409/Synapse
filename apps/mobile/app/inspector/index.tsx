// Memory Inspector screen — 디자인 목업 InspectorScreen 1:1.
// recallStore.getRecentDetailed(전체) → InspectorRow[] 변환 → <InspectorList rows={...} /> 메모리 피드.
// 헤더 (제목 + 부제 + 통계) 는 본 화면이 직접 렌더 (designer 의 InspectorList 는 list 단독).
//
// Sprint 5 [FROZEN v2026-04-29 D-S5-recallStore-detailed-getter] —
// `getRecent` (RecallLogRow[]) → `getRecentDetailed` ({row, candidates}[]) 로 전환.
// row-별 top candidate 의 label / source 를 join 하여 InspectorRow 에 채움.
// [FROZEN v2026-04-29 D-S5-InspectorList-source-field] source-pill 5+ 종 시각 활성.

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { colorsHex, copy, role, spacing } from '@synapse/design-system';
import {
  InspectorList,
  type InspectorRow,
} from '@synapse/design-system/components';
import * as recallStore from '../../src/recallStore';
import type { RecallLogDetail } from '../../src/recallStore';

const c = copy.ko;

const RECENT_WINDOW_MS = Number.POSITIVE_INFINITY; // 본 sprint: 전체 세션 표시.

function rowsFromDetail(details: RecallLogDetail[]): InspectorRow[] {
  return details
    .filter(({ row }) => row.act !== 'silence')
    .map(({ row, candidates }) => {
      const top = candidates[0];
      return {
        id: row.id,
        // 라벨 join: top candidate.label 우선 (Sprint 5 의 protocol Concept 단일 출처 + storage label
        // 노출 D-S5-storage-label-expose-A), 비었으면 candidate_ids[0] (cold start 후 in-memory miss),
        // 그것도 비었으면 act 명을 라벨로 (디스플레이 안전 디폴트).
        label: top?.label ?? row.candidate_ids[0] ?? row.act,
        decided_at: row.decided_at,
        act: row.act,
        source: top?.source,
      };
    });
}

export default function InspectorScreen() {
  const [rows, setRows] = useState<InspectorRow[]>(() =>
    rowsFromDetail(recallStore.getRecentDetailed(RECENT_WINDOW_MS)),
  );

  useEffect(() => {
    return recallStore.subscribe(() => {
      setRows(rowsFromDetail(recallStore.getRecentDetailed(RECENT_WINDOW_MS)));
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colorsHex.light.paper }}>
      <Header count={rows.length} />
      <View style={{ flex: 1 }}>
        {rows.length === 0 ? <Empty /> : <InspectorList rows={rows} />}
      </View>
    </View>
  );
}

function Header({ count }: { count: number }) {
  return (
    <View
      style={{
        paddingTop: 60,
        paddingBottom: 14,
        paddingHorizontal: spacing.lg + 2,
        borderBottomWidth: 0.5,
        borderBottomColor: colorsHex.light.ink,
        backgroundColor: colorsHex.light.paper,
      }}
    >
      <Text
        style={{
          fontFamily: role.meta,
          fontSize: 10,
          color: colorsHex.light.ink,
          opacity: 0.45,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {c.appName}
      </Text>
      <Text
        style={{
          fontFamily: role.heading,
          fontSize: 32,
          fontWeight: '600',
          color: colorsHex.light.ink,
          letterSpacing: -0.8,
          lineHeight: 36,
        }}
      >
        {c.recall.inspector.title}
      </Text>
      <Text
        style={{
          fontFamily: role.body,
          fontSize: 13.5,
          color: colorsHex.light.ink,
          opacity: 0.55,
          fontStyle: 'italic',
          marginTop: 4,
        }}
      >
        {c.recall.inspector.subtitle}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 14, marginTop: 14 }}>
        <Text
          style={{
            fontFamily: role.heading,
            fontSize: 24,
            fontWeight: '600',
            color: colorsHex.light.synapse,
            letterSpacing: -0.5,
          }}
        >
          {count}
        </Text>
        <Text
          style={{
            fontFamily: role.meta,
            fontSize: 9.5,
            color: colorsHex.light.ink,
            opacity: 0.45,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          기억
        </Text>
      </View>
    </View>
  );
}

function Empty() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
      <Text
        style={{
          fontFamily: role.body,
          fontSize: 17,
          color: colorsHex.light.ink,
          opacity: 0.55,
          textAlign: 'center',
        }}
      >
        {c.firstChat.empty}
      </Text>
      <Text
        style={{
          fontFamily: role.meta,
          fontSize: 10,
          color: colorsHex.light.ink,
          opacity: 0.32,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          marginTop: spacing.sm,
        }}
      >
        {c.firstChat.emptySub}
      </Text>
    </View>
  );
}
