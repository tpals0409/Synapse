// Strong Recall screen (Recall L3) — 디자인 목업 StrongRecallScreen 1:1.
// recallStore subscribe → 가장 최근 act === 'strong' 도착 시 <StrongRecall /> mount.
// snippet 은 lastDecision.candidates[0].label 에서 가져옴 (필수 prop).
//
// Sprint 6 (T7) — DismissButton 노출 + chatStore.dismiss 핸들러 (Suggestion 화면과 동일 패턴).

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { colorsHex, copy, role, spacing } from '@synapse/design-system';
import {
  DismissButton,
  EmptyState,
  StrongRecall,
} from '@synapse/design-system/components';
import type { RecallCandidate } from '@synapse/protocol';
import * as chatStore from '../../src/chatStore';
import * as recallStore from '../../src/recallStore';

const c = copy.ko;

type Mounted = { decisionId: string; candidates: RecallCandidate[] };

export default function StrongRecallScreen() {
  const [mounted, setMounted] = useState<Mounted | null>(() => {
    const detail = recallStore
      .getRecentDetailed(Number.POSITIVE_INFINITY)
      .filter((d) => d.row.act === 'strong')
      .pop();
    return detail ? { decisionId: detail.row.id, candidates: detail.candidates } : null;
  });

  useEffect(() => {
    return recallStore.subscribe((row) => {
      if (row.act === 'strong') {
        const last = recallStore.getLast();
        setMounted({ decisionId: row.id, candidates: last?.candidates ?? [] });
      }
    });
  }, []);

  const snippet = mounted?.candidates[0]?.label ?? '';

  const onDismiss = () => {
    if (!mounted) return;
    void chatStore.dismiss(
      mounted.decisionId,
      mounted.candidates.map((cand) => cand.conceptId),
    );
    setMounted(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colorsHex.light.paper }}>
      <ChatHeader subtitle={c.recall.strong.subtitle} />
      <View style={{ flex: 1, paddingTop: spacing.md }}>
        {mounted && snippet ? (
          <>
            {/* synapse-pulse + recall-emerge + thread-draw 모션은 StrongRecall 컴포넌트가 자체 박음. */}
            <StrongRecall label={c.recall.strong.title} snippet={snippet} />
            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
              <DismissButton onPress={onDismiss} label={c.recall.dismiss} variant="reject" />
            </View>
          </>
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

