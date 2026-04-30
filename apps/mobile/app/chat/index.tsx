import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import {
  colorsHex,
  copy,
  motion,
  radius,
  role,
  spacing,
} from '@synapse/design-system';
import {
  CaptureToast,
  EmptyState as DSEmptyState,
  ErrorState as DSErrorState,
  HumbleRetraction,
  type ErrorStateReason,
} from '@synapse/design-system/components';
import type { Message } from '@synapse/protocol';
import type { Concept } from '@synapse/engine';
import {
  listMessages,
  sendStream,
  subscribeError,
} from '../../src/chatStore';
import { subscribe as subscribeConcepts } from '../../src/conceptStore';
// Sprint 8 (T5) — telemetry emit + 만족도 설문 UI control.
// chatStore subscribeError / chatStore.sendStream 흐름 정합 — emit 은 turn 직후 (decide ack 시점).
// Sprint 4 의 recallStore.subscribe 도 turn 마다 push 되므로 그곳에서도 emit 가능 (recall event).
import * as telemetry from '../../src/telemetryStore';
import { subscribe as subscribeRecall } from '../../src/recallStore';

const c = copy.ko;

type DraftMessage = Message & { pending?: boolean };

export default function FirstChat() {
  const [messages, setMessages] = useState<DraftMessage[]>(() => {
    try {
      return listMessages();
    } catch {
      return [];
    }
  });
  const [draft, setDraft] = useState('');
  // Sprint 7 (T6) — error state 가 reason union 으로 박힘. ErrorBanner string → ErrorState reason 라우팅.
  const [errorReason, setErrorReason] = useState<ErrorStateReason | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [capturedConcepts, setCapturedConcepts] = useState<Concept[] | null>(null);
  const listRef = useRef<FlatList<DraftMessage> | null>(null);
  // Sprint 8 (T5) — 만족도 설문 overlay state. turn count 는 user 발화 횟수 (assistant 제외).
  // mid-session: turn === 5 도달 시 overlay mount 1회. end-session: 본 sprint 미구현 (Open Issue).
  const [surveyOpen, setSurveyOpen] = useState<'mid' | 'end' | null>(null);
  const turnCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  useEffect(() => {
    return subscribeConcepts((concepts) => {
      // Sprint 3 dev doc §4: ≤3 concept per turn (engine.extractConcepts 가 이미 절단).
      // 방어적으로 한번 더 절단 — 목업 FirstChatScreen 의 CaptureToast 흐름 1:1.
      setCapturedConcepts(concepts.slice(0, 3));
    });
  }, []);

  // Sprint 7 (T6) — chatStore subscribeError → ErrorState reason 라우팅.
  // conversation T7 의 onError DI 로부터 'llm-failure' / 'storage-failure' / 'network-failure'
  // 분류된 reason 이 도달. 마지막 reason 우선 (덮어쓰기).
  useEffect(() => {
    return subscribeError((reason) => {
      setErrorReason(reason);
    });
  }, []);

  // Sprint 8 (T5) — recall event emit. recallStore.subscribe 가 push 마다 row 전달 →
  // telemetry 'recall' event 로 변환. orchestrator 의 4-원 act (silence/ghost/suggestion/strong)
  // 그대로 boundary 통과. dev doc §4 Architecture Data Flow 의 recall_log 기존 row 활용 정합.
  useEffect(() => {
    return subscribeRecall((row) => {
      telemetry.emit({
        event: 'recall',
        recallLogId: row.id,
        act: row.act,
        ts: Date.now(),
      });
    });
  }, []);

  const retry = useCallback(() => {
    setErrorReason(null);
  }, []);

  const onSubmit = useCallback(async () => {
    const text = draft.trim();
    if (!text || streaming) return;

    setErrorReason(null);
    setDraft('');
    setStreaming(true);

    // Sprint 8 (T5) — turn count 증가 + decision 'send' event emit.
    // mid-session 만족도 설문 trigger 는 turn count *증가 후* 평가 (5 번째 user 발화 직후 mount).
    turnCountRef.current += 1;
    telemetry.emit({
      event: 'decision',
      actor: 'mobile',
      action: 'send',
      ts: Date.now(),
      payload: JSON.stringify({ turn: turnCountRef.current }),
    });
    if (telemetry.shouldShowMidSessionSurvey(turnCountRef.current)) {
      telemetry.markSurveyShown('mid');
      setSurveyOpen('mid');
    }

    const ts0 = Date.now();
    const userId = makeId();
    const placeholderId = makeId();
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content: text, ts: ts0 },
      { id: placeholderId, role: 'assistant', content: '', ts: ts0, pending: true },
    ]);

    let acc = '';
    try {
      for await (const tok of sendStream(text)) {
        acc += tok;
        const next = acc;
        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? { ...m, content: next } : m)),
        );
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === placeholderId ? { ...m, pending: false, ts: Date.now() } : m)),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
      // chatStore.subscribeError 가 reason 분류된 신호를 별도로 전달 → fallback 으로 'llm-failure'.
      setErrorReason((prev) => prev ?? 'llm-failure');
    } finally {
      setStreaming(false);
    }
  }, [draft, streaming]);

  const data = useMemo(() => messages, [messages]);

  return (
    <View style={{ flex: 1, backgroundColor: colorsHex.light.paper }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ChatHeader />
        {/* Sprint 7 (T6) — Empty/Error 라우팅. errorReason 우선 (try/catch 분기 → ErrorState reason),
            그 다음 rows.length === 0 → EmptyState, 마지막 본 화면. ink-rise 모션은 design-system
            EmptyState/ErrorState 가 자체 박음. */}
        {errorReason ? (
          <DSErrorState
            screen="chat"
            reason={errorReason}
            title={c.firstChat.error}
            subtitle={c.firstChat.errorSub}
            retryLabel={c.firstChat.retry}
            onRetry={retry}
          />
        ) : data.length === 0 ? (
          <DSEmptyState
            screen="chat"
            variant="empty"
            title={c.firstChat.empty}
            subtitle={c.firstChat.emptySub}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={data}
            keyExtractor={(m) => m.id}
            renderItem={renderRow}
            contentContainerStyle={{ paddingVertical: spacing.sm }}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              capturedConcepts && capturedConcepts.length > 0 ? (
                <CaptureToast
                  key={capturedConcepts.map((c) => c.id).join('|')}
                  concepts={capturedConcepts}
                  onDismiss={() => setCapturedConcepts(null)}
                />
              ) : null
            }
          />
        )}
        <Composer
          value={draft}
          onChangeText={setDraft}
          onSubmit={onSubmit}
          disabled={streaming}
        />
      </KeyboardAvoidingView>
      {/* Sprint 8 (T5) — 만족도 설문 overlay (chat 화면 위 floating). mid-session 5 turn 도달 시
          mount. 디자인 목업 부재 → mobile inline 카피 (D-S4-design-system-single-copy-file 정합 —
          별도 copy.ts 키 추가 0). 외부 데이터 수집 후 designer T9/T10 분기로 키 추가 검토. */}
      {surveyOpen ? (
        <SatisfactionSurveyOverlay
          marker={surveyOpen}
          onSubmit={(score, comment) => {
            telemetry.emit({
              event: 'satisfaction',
              score,
              comment,
              sessionMarker: surveyOpen,
              ts: Date.now(),
            });
            setSurveyOpen(null);
          }}
          onDismiss={() => setSurveyOpen(null)}
        />
      ) : null}
    </View>
  );
}

// Sprint 8 (T5) — 만족도 설문 overlay. chat 화면 floating panel.
//
// 디자인 의도 (디자인 목업 부재 → 디자인 톤 보존):
// - 배경: ink @ 35% alpha (목업 modal/overlay 패턴 정합).
// - 카드: paper 배경 + radius.lg + ink 0.5px border (목업 카드 패턴 정합).
// - 점수 5단: pill 버튼 5개 (1~5).
// - 텍스트: 디자인 목업 부재 → 한국어 inline (외부 사용자 한국어 1차 가정 정합).
//
// 카피 *값* 은 디자인 목업/content.jsx 의 ko/en 1:1 정합이 아닌 상태 — 단일 진실원 헌법
// (D-S4-design-system-single-copy-file) 위반 회피 위해 inline 으로 박음. carry-over 8
// (4 화면 별 Empty/Error 카피) 분기와 같은 *외부 데이터 수집 후 갱신* 패턴.
function SatisfactionSurveyOverlay({
  marker,
  onSubmit,
  onDismiss,
}: {
  marker: 'mid' | 'end';
  onSubmit: (score: 1 | 2 | 3 | 4 | 5, comment?: string) => void;
  onDismiss: () => void;
}) {
  const [score, setScore] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [comment, setComment] = useState('');
  const title = marker === 'mid' ? '잠깐, 어땠어요?' : '오늘 대화는 어땠어요?';
  const subtitle = '1점(아쉬워요) ~ 5점(좋아요)';
  return (
    <View
      pointerEvents="auto"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colorsHex.light.ink,
        opacity: 0.999,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* 배경 dim — ink @ 0.35 alpha 효과를 별도 View 로 (RN 은 backgroundColor alpha 직접 가능). */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
        }}
      />
      <View
        accessibilityRole="alert"
        accessibilityLabel={title}
        style={{
          backgroundColor: colorsHex.light.paper,
          borderRadius: radius.lg,
          borderWidth: 0.5,
          borderColor: colorsHex.light.ink,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          width: '82%',
          maxWidth: 340,
          gap: spacing.sm,
        }}
      >
        <Text
          style={{
            fontFamily: role.heading,
            fontSize: 18,
            fontWeight: '600',
            color: colorsHex.light.ink,
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: role.meta,
            fontSize: 11.5,
            color: colorsHex.light.ink,
            opacity: 0.55,
          }}
        >
          {subtitle}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.xs }}>
          {([1, 2, 3, 4, 5] as const).map((s) => {
            const selected = score === s;
            return (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityLabel={`${s}점`}
                onPress={() => setScore(s)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: radius.pill,
                  borderWidth: 0.5,
                  borderColor: colorsHex.light.ink,
                  backgroundColor: selected ? colorsHex.light.synapse : colorsHex.light.paper,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: role.ui,
                    fontSize: 15,
                    fontWeight: '600',
                    color: selected ? colorsHex.light.paper : colorsHex.light.ink,
                  }}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="자유 코멘트 (선택)"
          placeholderTextColor={colorsHex.light.ink}
          multiline
          style={{
            marginTop: spacing.sm,
            minHeight: 56,
            maxHeight: 120,
            borderWidth: 0.5,
            borderColor: colorsHex.light.ink,
            borderRadius: radius.md,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontFamily: role.body,
            fontSize: 14,
            color: colorsHex.light.ink,
          }}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm, justifyContent: 'flex-end' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음에"
            onPress={onDismiss}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: radius.pill,
              borderWidth: 0.5,
              borderColor: colorsHex.light.ink,
            }}
          >
            <Text style={{ fontFamily: role.ui, fontSize: 13, color: colorsHex.light.ink }}>다음에</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="보내기"
            disabled={score === null}
            onPress={() => {
              if (score === null) return;
              onSubmit(score, comment.trim() ? comment.trim() : undefined);
            }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: radius.pill,
              backgroundColor: score === null ? colorsHex.light.paper : colorsHex.light.synapse,
              borderWidth: score === null ? 0.5 : 0,
              borderColor: colorsHex.light.ink,
              opacity: score === null ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                fontFamily: role.ui,
                fontSize: 13,
                fontWeight: '600',
                color: score === null ? colorsHex.light.ink : colorsHex.light.paper,
              }}
            >
              보내기
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function renderRow({ item }: ListRenderItemInfo<DraftMessage>) {
  if (item.role === 'user') {
    return <UserBubble text={item.content} />;
  }
  // Sprint 6 (T7) — Humble Retraction: assistant 메시지가 retracted=1 일 때 직후 카드 mount.
  // FlatList renderItem 이 single element 요구 → View 로 합성. 디자인 목업 synapse-ui.jsx
  // L425~443 의 HumbleRetraction 카드 1:1 (PM A안 D-S6-design-system-mockup-conflict-resolution).
  if (item.retracted === 1) {
    return (
      <View>
        <AIBubble text={item.content} pending={!!item.pending} />
        <HumbleRetraction text={c.recall.humble} />
      </View>
    );
  }
  return <AIBubble text={item.content} pending={!!item.pending} />;
}

function ChatHeader() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingTop: 60,
        paddingBottom: 14,
        paddingHorizontal: 18,
        borderBottomWidth: 0.5,
        borderBottomColor: colorsHex.light.ink,
        // borderBottomColor 의 50% opacity 효과를 RN 에서 직접 표현
        // (목업: var(--rule) ≈ ink @ 0.08-0.12 alpha) — RN 은 borderColor 에 alpha 미지원
        // → 별도 hairline View 를 두지 않고, 색만 ink 로 두고 굵기로 거리감.
        backgroundColor: colorsHex.light.paper,
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: radius.pill,
          backgroundColor: colorsHex.light.ink,
          opacity: 0.92,
        }}
      />
      <View style={{ flex: 1 }}>
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
          첫 대화
        </Text>
      </View>
    </View>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <InkRise>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 6 }}>
        <View style={{ maxWidth: '78%' }}>
          <View
            style={{
              backgroundColor: colorsHex.light.ink,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderBottomLeftRadius: 18,
              borderBottomRightRadius: 4,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <Text
              style={{
                color: colorsHex.light.paper,
                fontFamily: role.body,
                fontSize: 15.5,
                lineHeight: 23,
                letterSpacing: -0.1,
              }}
            >
              {text}
            </Text>
          </View>
        </View>
      </View>
    </InkRise>
  );
}

function AIBubble({ text, pending }: { text: string; pending: boolean }) {
  return (
    <InkRise>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 16, paddingVertical: 6, gap: 8 }}>
        <View
          style={{
            width: 20,
            height: 20,
            marginTop: 4,
            borderRadius: radius.pill,
            backgroundColor: colorsHex.light.synapse,
            opacity: 0.85,
          }}
        />
        <View style={{ maxWidth: '78%', flexShrink: 1 }}>
          {text.length === 0 && pending ? (
            <TypingDots />
          ) : (
            <Text
              style={{
                color: colorsHex.light.ink,
                fontFamily: role.body,
                fontSize: 15.5,
                lineHeight: 24,
                letterSpacing: -0.1,
                paddingVertical: 8,
              }}
            >
              {text}
            </Text>
          )}
        </View>
      </View>
    </InkRise>
  );
}

function TypingDots() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 12 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: radius.pill,
            backgroundColor: colorsHex.light.ink,
            opacity,
          }}
        />
      ))}
    </View>
  );
}

// motion.inkRise 토큰을 RN Animated 로 매핑.
// duration=400ms, easing='ease-out', from {opacity:0, translateY:6} → to {opacity:1, translateY:0}.
function InkRise({ children }: { children: React.ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.inkRise.duration,
      easing: easingFor(motion.inkRise.easing),
      useNativeDriver: true,
    }).start();
  }, [progress]);
  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [motion.inkRise.from.opacity, motion.inkRise.to.opacity],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [motion.inkRise.from.translateY, motion.inkRise.to.translateY],
  });
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>
  );
}

function easingFor(name: string) {
  switch (name) {
    case 'ease-out':
      return Easing.out(Easing.ease);
    case 'ease-in':
      return Easing.in(Easing.ease);
    case 'ease-in-out':
      return Easing.inOut(Easing.ease);
    default:
      return Easing.linear;
  }
}

function Composer({
  value,
  onChangeText,
  onSubmit,
  disabled,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const hasText = value.trim().length > 0;
  return (
    <View
      style={{
        backgroundColor: colorsHex.light.paper,
        borderTopWidth: 0.5,
        borderTopColor: colorsHex.light.ink,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      <View
        style={{
          flex: 1,
          minHeight: 32,
          maxHeight: 120,
          backgroundColor: colorsHex.light.paper,
          borderRadius: 18,
          borderWidth: 0.5,
          borderColor: colorsHex.light.ink,
          paddingHorizontal: 14,
          paddingVertical: 7,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={c.firstChat.placeholder}
          placeholderTextColor={colorsHex.light.ink}
          multiline
          editable={!disabled}
          onSubmitEditing={onSubmit}
          // RN 0.72+: blurOnSubmit deprecated → submitBehavior. multiline TextInput 의 enter
          // 가 blur 안 하고 send 만 발생하도록 'submit' (D-S7-mobile-blurOnSubmit-deprecated).
          submitBehavior="submit"
          returnKeyType="send"
          style={{
            fontFamily: role.body,
            fontSize: 15,
            color: colorsHex.light.ink,
            letterSpacing: -0.1,
            padding: 0,
            margin: 0,
            minHeight: 22,
          }}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={c.firstChat.placeholder}
        onPress={onSubmit}
        disabled={!hasText || disabled}
        style={({ pressed }) => ({
          width: 32,
          height: 32,
          borderRadius: radius.pill,
          backgroundColor: hasText ? colorsHex.light.synapse : colorsHex.light.paper,
          borderWidth: hasText ? 0 : 0.5,
          borderColor: colorsHex.light.ink,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text
          style={{
            fontFamily: role.ui,
            fontSize: 14,
            fontWeight: '600',
            color: hasText ? colorsHex.light.paper : colorsHex.light.ink,
          }}
        >
          ↑
        </Text>
      </Pressable>
    </View>
  );
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
