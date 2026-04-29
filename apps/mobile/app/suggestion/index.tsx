// Suggestion screen (Recall L2) — 디자인 목업 SuggestionScreen 1:1.
// recallStore subscribe → 가장 최근 act === 'suggestion' 도착 시 <SuggestionCard /> mount.
// snippet 은 lastDecision.candidates[0].label 에서 가져옴 (목업의 concept 문구 자리).

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { colorsHex, copy, role, spacing } from '@synapse/design-system';
import { SuggestionCard } from '@synapse/design-system/components';
import type { RecallCandidate } from '@synapse/protocol';
import * as recallStore from '../../src/recallStore';

const c = copy.ko;

type Mounted = { candidates: RecallCandidate[] };

export default function SuggestionScreen() {
  const [mounted, setMounted] = useState<Mounted | null>(() => {
    const last = recallStore.getLast();
    return last && last.act === 'suggestion' ? { candidates: last.candidates } : null;
  });

  useEffect(() => {
    return recallStore.subscribe((row) => {
      if (row.act === 'suggestion') {
        const last = recallStore.getLast();
        setMounted({ candidates: last?.candidates ?? [] });
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colorsHex.light.paper }}>
      <ChatHeader subtitle={c.recall.suggestion.subtitle} />
      <View style={{ flex: 1, paddingTop: spacing.md }}>
        {mounted ? (
          <SuggestionCard
            label={c.recall.suggestion.title}
            snippet={mounted.candidates[0]?.label}
          />
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
