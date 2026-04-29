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
import { CaptureToast } from '@synapse/design-system/components';
import type { Message } from '@synapse/protocol';
import type { Concept } from '@synapse/engine';
import { listMessages, sendStream } from '../../src/chatStore';
import { subscribe as subscribeConcepts } from '../../src/conceptStore';

const c = copy.ko;

type DraftMessage = Message & { pending?: boolean };

export default function FirstChat() {
  const [messages, setMessages] = useState<DraftMessage[]>(() => listMessages());
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [capturedConcepts, setCapturedConcepts] = useState<Concept[] | null>(null);
  const listRef = useRef<FlatList<DraftMessage> | null>(null);

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

  const onSubmit = useCallback(async () => {
    const text = draft.trim();
    if (!text || streaming) return;

    setError(null);
    setDraft('');
    setStreaming(true);

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
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
      setError(e instanceof Error ? e.message : c.firstChat.error);
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
        {data.length === 0 ? (
          <EmptyState />
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
        {error && <ErrorBanner message={error} />}
        <Composer
          value={draft}
          onChangeText={setDraft}
          onSubmit={onSubmit}
          disabled={streaming}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

function renderRow({ item }: ListRenderItemInfo<DraftMessage>) {
  return item.role === 'user' ? (
    <UserBubble text={item.content} />
  ) : (
    <AIBubble text={item.content} pending={!!item.pending} />
  );
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

function EmptyState() {
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

function ErrorBanner({ message }: { message: string }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colorsHex.light.ink,
        opacity: 0.9,
      }}
    >
      <Text
        style={{
          fontFamily: role.meta,
          fontSize: 10,
          color: colorsHex.light.synapse,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        {c.firstChat.error}
      </Text>
      <Text
        style={{
          fontFamily: role.body,
          fontSize: 13,
          color: colorsHex.light.paper,
          marginTop: 2,
        }}
      >
        {message}
      </Text>
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
          blurOnSubmit={false}
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
