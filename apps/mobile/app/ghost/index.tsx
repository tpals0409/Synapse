// Ghost Hint screen (Recall L1) — 디자인 목업 GhostHintScreen 1:1.
// recallStore subscribe → 가장 최근 act === 'ghost' 도착 시 <GhostHint /> mount.
// 미도착 시 침묵 (Empty hint).

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { colorsHex, copy, role, spacing } from '@synapse/design-system';
import { EmptyState, GhostHint } from '@synapse/design-system/components';
import type { RecallLogRow } from '@synapse/protocol';
import * as recallStore from '../../src/recallStore';

const c = copy.ko;

export default function GhostHintScreen() {
  const [row, setRow] = useState<RecallLogRow | null>(() => {
    const last = recallStore.getLast();
    return last && last.act === 'ghost'
      ? { id: 'last', decided_at: Date.now(), act: 'ghost', candidate_ids: [] }
      : null;
  });

  useEffect(() => {
    return recallStore.subscribe((next) => {
      if (next.act === 'ghost') setRow(next);
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colorsHex.light.paper }}>
      <ChatHeader subtitle={c.recall.ghost.subtitle} />
      <View style={{ flex: 1, paddingTop: spacing.lg }}>
        {row ? (
          // ghost-breathe + recall-emerge 모션은 GhostHint 컴포넌트가 자체 박음.
          <GhostHint label={c.recall.ghost.title} />
        ) : (
          <EmptyState
            screen="chat"
            variant="empty"
            title={c.firstChat.empty}
            subtitle={c.firstChat.emptySub}
          />
        )}
      </View>
    </View>
  );
}

function ChatHeader({ subtitle }: { subtitle: string }) {
  return (
    <View
      style={{
        paddingTop: 60,
        paddingBottom: 14,
        paddingHorizontal: 18,
        borderBottomWidth: 0.5,
        borderBottomColor: colorsHex.light.ink,
        backgroundColor: colorsHex.light.paper,
      }}
    >
      <Text
        style={{
          fontFamily: role.heading,
          fontSize: 17,
          fontWeight: '600',
          color: colorsHex.light.ink,
          letterSpacing: -0.2,
        }}
      >
        {c.appName}
      </Text>
      <Text
        style={{
          fontFamily: role.meta,
          fontSize: 10.5,
          color: colorsHex.light.ink,
          opacity: 0.45,
          letterSpacing: 0.2,
          textTransform: 'uppercase',
          marginTop: 1,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}

