// Strong Recall screen (Recall L3) — 디자인 목업 StrongRecallScreen 1:1.
// recallStore subscribe → 가장 최근 act === 'strong' 도착 시 <StrongRecall /> mount.
// snippet 은 lastDecision.candidates[0].label 에서 가져옴 (필수 prop).

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { colorsHex, copy, role, spacing } from '@synapse/design-system';
import { StrongRecall } from '@synapse/design-system/components';
import type { RecallCandidate } from '@synapse/protocol';
import * as recallStore from '../../src/recallStore';

const c = copy.ko;

type Mounted = { candidates: RecallCandidate[] };

export default function StrongRecallScreen() {
  const [mounted, setMounted] = useState<Mounted | null>(() => {
    const last = recallStore.getLast();
    return last && last.act === 'strong' ? { candidates: last.candidates } : null;
  });

  useEffect(() => {
    return recallStore.subscribe((row) => {
      if (row.act === 'strong') {
        const last = recallStore.getLast();
        setMounted({ candidates: last?.candidates ?? [] });
      }
    });
  }, []);

  const snippet = mounted?.candidates[0]?.label ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: colorsHex.light.paper }}>
      <ChatHeader subtitle={c.recall.strong.subtitle} />
      <View style={{ flex: 1, paddingTop: spacing.md }}>
        {mounted && snippet ? (
          <StrongRecall label={c.recall.strong.title} snippet={snippet} />
        ) : (
          <SilentEmpty />
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

function SilentEmpty() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
      <Text
        style={{
          fontFamily: role.meta,
          fontSize: 10,
          color: colorsHex.light.ink,
          opacity: 0.32,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        silence
      </Text>
    </View>
  );
}
