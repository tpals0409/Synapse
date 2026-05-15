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
// Sprint 6 (T6) 추가 — Failure & Hygiene (Dismiss / HumbleRetraction):
//   COPY.ko.dismiss   → copy.ko.recall.dismiss   ("지금은 됐어요" / "Not now")
//   COPY.ko.never     → copy.ko.recall.never     ("다신 보지 않기" / "Never again")
//   COPY.ko.humble    → copy.ko.recall.humble    ("아, 잘못 연결했네요. 미안해요." / "Ah — I connected the wrong thread. Sorry.")
//   카피 *값* 은 디자인 목업/content.jsx 의 ko/en 와 1:1 일치.
//   디자인 목업 SuggestionCard (synapse-ui.jsx L203) 의 dismissText 진실원이 dismiss.
//   디자인 목업 HumbleRetraction (synapse-ui.jsx L425) 의 사과 본문 진실원이 humble.
//
// Sprint 6 (T6) 보류 키 (PM HOLD D-S6-design-system-mockup-conflict 결정 후 적용 예정):
//   - copy.{ko,en}.recall.unlink     — 디자인 목업 InspectorScreen 에 unlink 슬롯 부재.
//   - copy.{ko,en}.recall.retracted  — 디자인 목업 메시지 버블에 retracted 라벨 부재.
//   목업 단일 진실원 헌법 (D-S4-design-system-single-copy-file) 정합 보장 위해 PM 결정 대기.
//
// Sprint 7 (T4) 추가 — Hyper-Recall + 인터랙션 키 (디자인 목업 content.jsx 에 *이미 존재*, Sprint 7 에서 정규화 노출):
//   COPY.ko.hyperLabel    → copy.ko.recall.hyper.title    ("과거와 현재가 만났습니다" / "Past meets present")
//   COPY.ko.expand        → copy.ko.recall.expand         ("펼쳐 보기" / "Open")
//   COPY.ko.collapse      → copy.ko.recall.collapse       ("접기" / "Close")
//   COPY.ko.bridge        → copy.ko.recall.bridge         ("다리" / "bridge")
//   COPY.ko.why           → copy.ko.recall.why            ("왜 떠올랐냐면" / "Why this surfaced")
//   COPY.ko.sources       → copy.ko.recall.sources        ("연결된 기억" / "linked memories")
//   COPY.ko.confidence    → copy.ko.recall.confidence     ("확신" / "confidence")
//
// **theme-toggle 카피는 디자인 목업 content.jsx 부재** → 카피 키 추가 0.
//   목업 우선 헌법 (`feedback_mockup_truth.md`) + D-S4-design-system-single-copy-file 준수.
//   mobile T5 의 themeStore UI 토글 라벨은 mobile 화면 단위 결정 (시스템 자동 디폴트).
//   carry-over: 외부 사용자 테스트 후 토글 UI 가 필요해지면 디자인 목업 갱신 후 키 추가.
//
// **Empty/Error 4 화면 카피는 firstChat.* 재사용**:
//   디자인 목업 content.jsx 의 empty/emptySub/error/errorSub/retry 는 1 세트만 존재.
//   → EmptyState/ErrorState 컴포넌트가 호출자가 주입한 text/subtext 를 받음 (props).
//   → 4 화면 (Onboarding/FirstChat/Inspector + Strong/Ghost) 이 동일 키 재사용 OR 화면별 직접 주입.
//   → 키 추가 0. 컴포넌트 prop interface 로 유연성 확보.
//
// Sprint 13 (T1) 추가 — `firstChat.demoHint`:
//   web 데모 환경 (모바일 앱이 아닌 브라우저 미리보기) 에서 빈 화면일 때
//   "여긴 데모이고 진짜 기억은 모바일에서 시작된다" 는 1 줄 안내.
//   → mobile T2 가 web 분기에서만 mount, 네이티브 분기에서는 미사용.
//   → 디자인 목업 content.jsx 부재 키 — web 데모 한정 신호라 목업 단일 진실원 (D-S4) 영향권 *밖*.
//     verify-copy 는 content.jsx 매칭 *제외* + ko self-consistency 1 건만 추가 (ok 23→24).
//   → 디자인 톤: 따뜻한 종이 저널 / 잉크가 떠오르는 안내 — "이건 웹 데모예요. 진짜 기억은 모바일에서 시작돼요."

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
  // Sprint 13 (T1) — web demo only. 디자인 목업 content.jsx 부재 키 — D-S4 영향권 밖.
  // mobile T2 가 web 분기 EmptyState 위에 1 줄로 mount.
  demoHint: string;
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
  // Sprint 6 (T6) — Failure & Hygiene 액션/사과 카피.
  // 디자인 목업/content.jsx COPY.{dismiss,never,humble} 1:1.
  dismiss: string;
  never: string;
  humble: string;
  // Sprint 7 (T4) — Hyper-Recall + 인터랙션 카피.
  // 디자인 목업/content.jsx COPY.{hyperLabel, expand, collapse, bridge, why, sources, confidence} 1:1.
  // hyper 는 ChatHeader 의 한 줄 (목업 ChatHeader 형식 정합) 을 포함.
  hyper: RecallSurfaceCopy;
  expand: string;
  collapse: string;
  bridge: string;
  why: string;
  sources: string;
  confidence: string;
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
      // Sprint 13 (T1) — web 데모 안내 1 줄.
      demoHint: '이건 웹 데모예요. 진짜 기억은 모바일에서 시작돼요.',
    },
    recall: {
      ghost: { title: '그날의 너', subtitle: 'Ghost Hint · 레벨 1' },
      suggestion: { title: '관련 기억', subtitle: 'Suggestion · 레벨 2' },
      strong: { title: '다시 떠오른 생각', subtitle: 'Strong Recall · 레벨 3' },
      inspector: { title: '기억', subtitle: '당신이 남긴 흔적' },
      dismiss: '지금은 됐어요',
      never: '다신 보지 않기',
      humble: '아, 잘못 연결했네요. 미안해요.',
      // Sprint 7 (T4) — content.jsx COPY.hyperLabel + Hyper-Recall ChatHeader 정규화.
      hyper: { title: '과거와 현재가 만났습니다', subtitle: 'Hyper-Recall · 레벨 4' },
      expand: '펼쳐 보기',
      collapse: '접기',
      bridge: '다리',
      why: '왜 떠올랐냐면',
      sources: '연결된 기억',
      confidence: '확신',
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
      // Sprint 13 (T1) — web demo hint, parity with ko.
      demoHint: 'This is a web demo. Real memories begin in the mobile app.',
    },
    recall: {
      ghost: { title: 'From you, before', subtitle: 'ghost hint · level 1' },
      suggestion: { title: 'Related memory', subtitle: 'suggestion · level 2' },
      strong: { title: 'A returning thought', subtitle: 'strong recall · level 3' },
      inspector: { title: 'Memory', subtitle: "Traces you've left" },
      dismiss: 'Not now',
      never: 'Never again',
      humble: 'Ah — I connected the wrong thread. Sorry.',
      // Sprint 7 (T4) — content.jsx COPY 영문 1:1.
      hyper: { title: 'Past meets present', subtitle: 'hyper-recall · level 4' },
      expand: 'Open',
      collapse: 'Close',
      bridge: 'bridge',
      why: 'Why this surfaced',
      sources: 'linked memories',
      confidence: 'confidence',
    },
  },
};

export type CopyLang = keyof typeof copy;
