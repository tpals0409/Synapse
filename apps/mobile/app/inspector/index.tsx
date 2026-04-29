// Memory Inspector screen — 디자인 목업 InspectorScreen 1:1.
// recallStore.getRecent(전체) → InspectorRow[] 변환 → <InspectorList rows={...} /> 메모리 피드.
// 헤더 (제목 + 부제 + 통계) 는 본 화면이 직접 렌더 (designer 의 InspectorList 는 list 단독).

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { colorsHex, copy, role, spacing } from '@synapse/design-system';
import {
  InspectorList,
  type InspectorRow,
} from '@synapse/design-system/components';
import type { RecallLogRow } from '@synapse/protocol';
import * as recallStore from '../../src/recallStore';

const c = copy.ko;

const RECENT_WINDOW_MS = Number.POSITIVE_INFINITY; // 본 sprint: 전체 세션 표시.

function rowsFromLog(logs: RecallLogRow[]): InspectorRow[] {
  return logs
    .filter((r) => r.act !== 'silence')
    .map((r) => ({
      id: r.id,
      // 라벨 join: Concept lookup 은 Sprint 5+ 의 graph 페어. 본 sprint 는 candidate_ids[0] 를
      // 그대로 사용하거나, 비었으면 act 명을 라벨로 (디스플레이 안전 디폴트).
      label: r.candidate_ids[0] ?? r.act,
      decided_at: r.decided_at,
      act: r.act,
    }));
}

export default function InspectorScreen() {
  const [rows, setRows] = useState<InspectorRow[]>(() =>
    rowsFromLog(recallStore.getRecent(RECENT_WINDOW_MS)),
  );

  useEffect(() => {
    return recallStore.subscribe(() => {
      setRows(rowsFromLog(recallStore.getRecent(RECENT_WINDOW_MS)));
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
