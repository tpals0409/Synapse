// Bilingual copy — single source of truth: 디자인 목업/content.jsx (`COPY`).
// Sprint 1 화면 (Onboarding + FirstChat) 에 필요한 키를 1:1 import.
// ko/en parity 필수 — 두 객체는 동일한 모양의 트리.
//
// 절대 규칙: 디자인 목업에 없는 카피를 추가하지 않는다. 부족하면 Open Issue 로 carry-over.
//
// 목업과의 키 매핑:
//   COPY.ko.appName           → copy.ko.appName
//   COPY.ko.tagline           → copy.ko.tagline
//   COPY.ko.onboard.{hi,sub,cta,hint}
//                             → copy.ko.onboarding.{hi,sub,cta,hint}
//   COPY.ko.placeholder       → copy.ko.firstChat.placeholder
//   COPY.ko.captured          → copy.ko.firstChat.captured        (FirstChat CaptureToast — Sprint 2 에서 활용)
//   COPY.ko.capturedSub       → copy.ko.firstChat.capturedSub
//   COPY.ko.empty / emptySub  → copy.ko.firstChat.empty / emptySub (메시지 없을 때)
//   COPY.ko.error / errorSub  → copy.ko.firstChat.error / errorSub (스트리밍 실패)
//   COPY.ko.retry             → copy.ko.firstChat.retry
//   COPY.ko.typing            → copy.ko.firstChat.typing           (응답 대기 인디케이터)
//
// Sprint 4 (T6) 추가 — recall.* 영역 (Ghost / Suggestion / Strong / Inspector):
//   COPY.ko.ghostLabel        → copy.ko.recall.ghost.title         ("그날의 너")
//   COPY.ko.suggestionLabel   → copy.ko.recall.suggestion.title    ("관련 기억")
//   COPY.ko.strongLabel       → copy.ko.recall.strong.title        ("다시 떠오른 생각")
//   COPY.ko.inspector         → copy.ko.recall.inspector.title     ("기억")
//   COPY.ko.inspectorSub      → copy.ko.recall.inspector.subtitle  ("당신이 남긴 흔적")
//   subtitle 키 (ghost / suggestion / strong) 는 디자인 목업 화면 ChatHeader 의 한 줄
//     ("Ghost Hint · 레벨 1" / "Suggestion · 레벨 2" / "Strong Recall · 레벨 3")
//     을 카피 단일 진실원 트리로 정규화. en: "ghost hint · level 1" / ...
//
// (Hyper-Recall / Humble Retraction / Bridge / dismiss / never / expand / collapse 등은
//  이후 스프린트 범위 — 의도적 제외.)

export interface OnboardingCopy {
  hi: string;
  sub: string;
  cta: string;
  hint: string;
}

export interface FirstChatCopy {
  placeholder: string;
  captured: string;
  capturedSub: string;
  empty: string;
  emptySub: string;
  error: string;
  errorSub: string;
  retry: string;
  typing: string;
}

export interface RecallSurfaceCopy {
  title: string;
  subtitle: string;
}

export interface RecallCopy {
  ghost: RecallSurfaceCopy;
  suggestion: RecallSurfaceCopy;
  strong: RecallSurfaceCopy;
  inspector: RecallSurfaceCopy;
}

export interface CopyShape {
  appName: string;
  tagline: string;
  onboarding: OnboardingCopy;
  firstChat: FirstChatCopy;
  recall: RecallCopy;
}

export const copy: { ko: CopyShape; en: CopyShape } = {
  ko: {
    appName: 'Synapse',
    tagline: '남긴 건 사라지지 않고, 필요할 때 다시 나온다',
    onboarding: {
      hi: '안녕하세요.',
      sub: '그냥 이야기해보세요.\n나머지는 제가 기억할게요.',
      cta: '시작하기',
      hint: '기억은 자동으로 만들어집니다',
    },
    firstChat: {
      placeholder: '무엇이든 말해보세요…',
      captured: '방금 기억됨',
      capturedSub: '이 생각은 당신의 그래프에 연결됐어요',
      empty: '아직 기억이 없어요',
      emptySub: '한 번만 이야기하면 시작돼요',
      error: '잠시 길을 잃었어요',
      errorSub: '다시 시도하시겠어요?',
      retry: '다시 시도',
      typing: '생각하는 중',
    },
    recall: {
      ghost: { title: '그날의 너', subtitle: 'Ghost Hint · 레벨 1' },
      suggestion: { title: '관련 기억', subtitle: 'Suggestion · 레벨 2' },
      strong: { title: '다시 떠오른 생각', subtitle: 'Strong Recall · 레벨 3' },
      inspector: { title: '기억', subtitle: '당신이 남긴 흔적' },
    },
  },
  en: {
    appName: 'Synapse',
    tagline: "What you leave doesn't vanish — it returns when you need it",
    onboarding: {
      hi: 'Hello.',
      sub: "Just talk.\nI'll remember the rest.",
      cta: 'Begin',
      hint: 'Memories are made automatically',
    },
    firstChat: {
      placeholder: 'Say anything…',
      captured: 'Just remembered',
      capturedSub: 'Linked into your graph',
      empty: 'Nothing remembered yet',
      emptySub: 'One conversation is all it takes',
      error: 'I lost the thread for a moment',
      errorSub: 'Try again?',
      retry: 'Retry',
      typing: 'thinking',
    },
    recall: {
      ghost: { title: 'From you, before', subtitle: 'ghost hint · level 1' },
      suggestion: { title: 'Related memory', subtitle: 'suggestion · level 2' },
      strong: { title: 'A returning thought', subtitle: 'strong recall · level 3' },
      inspector: { title: 'Memory', subtitle: "Traces you've left" },
    },
  },
};

export type CopyLang = keyof typeof copy;
