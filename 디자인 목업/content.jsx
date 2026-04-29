// content.jsx — bilingual copy + scripted demo conversation data

const COPY = {
  ko: {
    appName: "Synapse",
    tagline: "남긴 건 사라지지 않고, 필요할 때 다시 나온다",
    onboard: {
      hi: "안녕하세요.",
      sub: "그냥 이야기해보세요.\n나머지는 제가 기억할게요.",
      cta: "시작하기",
      hint: "기억은 자동으로 만들어집니다",
    },
    placeholder: "무엇이든 말해보세요…",
    ghostLabel: "그날의 너",
    suggestionLabel: "관련 기억",
    strongLabel: "다시 떠오른 생각",
    hyperLabel: "과거와 현재가 만났습니다",
    days: (n) => `${n}일 전`,
    dismiss: "지금은 됐어요",
    never: "다신 보지 않기",
    expand: "펼쳐 보기",
    collapse: "접기",
    inspector: "기억",
    inspectorSub: "당신이 남긴 흔적",
    captured: "방금 기억됨",
    capturedSub: "이 생각은 당신의 그래프에 연결됐어요",
    humble: "아, 잘못 연결했네요. 미안해요.",
    empty: "아직 기억이 없어요",
    emptySub: "한 번만 이야기하면 시작돼요",
    error: "잠시 길을 잃었어요",
    errorSub: "다시 시도하시겠어요?",
    retry: "다시 시도",
    bridge: "다리",
    why: "왜 떠올랐냐면",
    typing: "생각하는 중",
    sources: "연결된 기억",
    confidence: "확신",
  },
  en: {
    appName: "Synapse",
    tagline: "What you leave doesn't vanish — it returns when you need it",
    onboard: {
      hi: "Hello.",
      sub: "Just talk.\nI'll remember the rest.",
      cta: "Begin",
      hint: "Memories are made automatically",
    },
    placeholder: "Say anything…",
    ghostLabel: "From you, before",
    suggestionLabel: "Related memory",
    strongLabel: "A returning thought",
    hyperLabel: "Past meets present",
    days: (n) => `${n} days ago`,
    dismiss: "Not now",
    never: "Never again",
    expand: "Open",
    collapse: "Close",
    inspector: "Memory",
    inspectorSub: "Traces you've left",
    captured: "Just remembered",
    capturedSub: "Linked into your graph",
    humble: "Ah — I connected the wrong thread. Sorry.",
    empty: "Nothing remembered yet",
    emptySub: "One conversation is all it takes",
    error: "I lost the thread for a moment",
    errorSub: "Try again?",
    retry: "Retry",
    bridge: "bridge",
    why: "Why this surfaced",
    typing: "thinking",
    sources: "linked memories",
    confidence: "confidence",
  },
};

// Scripted demo conversation — runs end-to-end in the demo frame
// Each step has: role, text, kind ('msg' | 'ghost' | 'suggestion' | 'strong' | 'hyper' | 'capture' | 'humble' | 'typing'), delay
const DEMO_KO = [
  { role: "user", text: "요즘 팀 회고가 자꾸 형식적으로 끝나는 것 같아요. 어떻게 하면 더 솔직해질 수 있을까요?", kind: "msg" },
  { role: "system", kind: "capture", text: "팀 회고 · 솔직함 · 침묵의 비용" },
  { role: "ai", kind: "typing" },
  { role: "ai", text: "회고에서 솔직함은 보통 '안전함'의 결과예요. 사람들이 무엇을 두려워하는지 먼저 들어보는 건 어떨까요?", kind: "msg" },
  { role: "system", kind: "hyper",
    days: 124,
    pastConcept: "조용한 산책",
    pastText: "혼자 걸을 때만 진짜 생각이 나온다고 적어두셨어요. 회의실은 진짜 생각이 나오는 공간이 아닐지도 몰라요.",
    bridges: ["혼자만의 시간", "솔직함", "공간이 사고를 만든다"],
    why: "'솔직함'이라는 개념이 124일 전 산책 메모와 연결됐어요"
  },
  { role: "user", text: "와… 그 메모를 까먹고 있었어요. 회의실 밖에서 회고를 해보면 어떨까요?", kind: "msg" },
];

const DEMO_EN = [
  { role: "user", text: "Team retros keep ending in safe, formal answers. How do I get people to be honest?", kind: "msg" },
  { role: "system", kind: "capture", text: "team retro · honesty · cost of silence" },
  { role: "ai", kind: "typing" },
  { role: "ai", text: "Honesty in a retro usually follows safety. What if you started by asking what people are afraid to say?", kind: "msg" },
  { role: "system", kind: "hyper",
    days: 124,
    pastConcept: "a quiet walk",
    pastText: "You wrote that real thoughts only come on solo walks. Maybe a meeting room isn't where honesty lives.",
    bridges: ["solitude", "honesty", "space shapes thinking"],
    why: "The concept 'honesty' connected to a walking note from 124 days ago"
  },
  { role: "user", text: "Oh… I had completely forgotten that. What if we did the retro outside the room?", kind: "msg" },
];

// Inspector feed — what's been "remembered" so far
const MEMORIES_KO = [
  { id: "m1", concept: "조용한 산책", text: "혼자 걸을 때만 진짜 생각이 나온다.", date: "124일 전", links: 7, density: 3, kind: "reflection" },
  { id: "m2", concept: "팀 회고", text: "회고가 형식적으로 끝나는 것 같다. 솔직함이 빠져 있다.", date: "방금 전", links: 4, density: 2, kind: "question" },
  { id: "m3", concept: "글쓰기의 리듬", text: "아침에 쓴 글은 다르다 — 더 단단하다.", date: "8일 전", links: 5, density: 2, kind: "reflection" },
  { id: "m4", concept: "신뢰의 작동 방식", text: "신뢰는 약속을 지키는 빈도가 아니라, 약속하지 않는 것을 지키는 빈도다.", date: "32일 전", links: 11, density: 4, kind: "insight" },
  { id: "m5", concept: "조급함", text: "조급할 때 결정한 건 거의 다 후회했다.", date: "47일 전", links: 6, density: 2, kind: "rule" },
  { id: "m6", concept: "읽고 있는 책: 《타인의 해석》", text: "낯선 사람을 우리가 얼마나 잘못 읽는지에 대한 책.", date: "61일 전", links: 3, density: 1, kind: "source" },
  { id: "m7", concept: "면접 질문", text: "지원자에게 '실패한 결정'을 묻기보다 '바꾸지 않을 결정'을 물어보면 어떨까?", date: "19일 전", links: 4, density: 2, kind: "idea" },
  { id: "m8", concept: "주말의 리듬", text: "토요일 오전은 비워두는 게 가장 생산적이다.", date: "76일 전", links: 4, density: 1, kind: "rule" },
];

const MEMORIES_EN = [
  { id: "m1", concept: "Quiet walks", text: "Real thoughts only come when I walk alone.", date: "124 days ago", links: 7, density: 3, kind: "reflection" },
  { id: "m2", concept: "Team retros", text: "Retros end formal. Honesty is missing.", date: "just now", links: 4, density: 2, kind: "question" },
  { id: "m3", concept: "Rhythm of writing", text: "Morning prose is different — firmer.", date: "8 days ago", links: 5, density: 2, kind: "reflection" },
  { id: "m4", concept: "How trust works", text: "Trust isn't keeping promises — it's keeping the things you didn't promise.", date: "32 days ago", links: 11, density: 4, kind: "insight" },
  { id: "m5", concept: "On hurry", text: "Almost every decision I made in a hurry, I regretted.", date: "47 days ago", links: 6, density: 2, kind: "rule" },
  { id: "m6", concept: "Reading: Talking to Strangers", text: "About how badly we read people we don't know.", date: "61 days ago", links: 3, density: 1, kind: "source" },
  { id: "m7", concept: "Interview question", text: "Instead of 'a decision you regret,' ask 'a decision you wouldn't change.'", date: "19 days ago", links: 4, density: 2, kind: "idea" },
  { id: "m8", concept: "Weekend rhythm", text: "Empty Saturday mornings are the most productive.", date: "76 days ago", links: 4, density: 1, kind: "rule" },
];

Object.assign(window, { COPY, DEMO_KO, DEMO_EN, MEMORIES_KO, MEMORIES_EN });
