# Synapse

> **남긴 건 사라지지 않고, 필요할 때 다시 나온다.**
> 사용자의 대화를 자동으로 기억하고, 과거의 생각을 현재 맥락에 재등장시켜주는 로컬 기반 Memory-Native AI.

기억하는 챗봇이 아니라 **생각을 연결해주는 엔진**입니다.

---

## 핵심 아이디어

> 사용자는 정보를 저장하지 않는 것이 아니라,
> **저장해도 다시 찾고 활용할 수 없을 것 같아서 저장하지 않는다.**

문제는 저장이 아니라 **재등장 경험(Recall)**. Synapse 의 원칙:

> **저장은 자동화하고, 기억의 생성과 재등장을 설계한다.**
> 필요한 순간에만 개입하고, 나머지 시간은 침묵한다.

자세한 제품 정의는 [기획서.md](기획서.md), 시각/카피 단일 진실원은 [디자인 목업/](디자인%20목업/) 참조.

---

## 아키텍처 (Dual Engine + Orchestrator)

```
사용자 입력
   ↓
┌──────────────────────────┐    ┌──────────────────────────┐
│  Conversation Engine     │    │  Memory Engine           │
│  - 현재 대화 유지         │ ←→ │  - Concept 추출           │
│  - 빠른 응답              │    │  - Graph RAG              │
│  - 로컬 Gemma            │    │  - Recall 후보 생성       │
└──────────────────────────┘    └──────────────────────────┘
              ↓                              ↓
         ┌───────────────────────────────────────┐
         │        Orchestrator                   │
         │  Trigger / Silence rules              │
         │  "언제, 얼마나" 개입할지 결정         │
         │  (침묵이 디폴트)                      │
         └───────────────────────────────────────┘
              ↓
        ┌──────────────────┐
        │  Storage         │
        │  SQLite + vec    │
        │  단일 파일        │
        └──────────────────┘
```

---

## 기술 스택

- **클라이언트**: React Native + Expo (TypeScript), Expo Router
- **로컬 LLM**: [Ollama](https://ollama.com/) + [Gemma 3 4B](https://ollama.com/library/gemma3) (Q4_K_M)
- **임베딩**: [EmbeddingGemma 308M](https://ai.google.dev/gemma/docs/embeddinggemma) (Sprint 2부터)
- **그래프 + 벡터 저장**: SQLite + [sqlite-vec](https://github.com/asg017/sqlite-vec) (단일 파일)
- **모노레포**: pnpm workspace
- **테스트**: node:test (`--experimental-strip-types`)

---

## 빠른 시작

### 사전 요구

- Node 20+
- pnpm 9+ (`npm i -g pnpm`)
- macOS 권장 (Sprint 7 까지 Android 미검증)
- Ollama: `brew install ollama && brew services start ollama`

### 셋업

```bash
git clone https://github.com/tpals0409/Synapse.git
cd Synapse

# 의존성
pnpm install

# 로컬 Gemma 모델 다운로드 (~4GB)
ollama pull gemma3:4b
ollama pull embeddinggemma

# 단위 테스트
pnpm -r test

# 종단 receipt — 입력 "안녕" → Gemma 응답 → SQLite 적재
bash scripts/receipt/sprint-0.sh

# Expo 개발 서버
pnpm --filter @synapse/mobile start    # Web: w, iOS Simulator: i
```

자세한 Ollama/Gemma 셋업: [docs/setup/gemma.md](docs/setup/gemma.md)

---

## 모노레포 구조

```
Synapse/
├── apps/mobile/                  # RN + Expo 클라이언트
├── packages/
│   ├── conversation/             # 대화 루프
│   ├── llm/                      # Ollama Gemma 어댑터
│   ├── engine/                   # Memory Engine — Concept, Graph, Recall
│   ├── orchestrator/             # Attention Control (Trigger/Silence)
│   ├── storage/                  # SQLite + sqlite-vec
│   ├── design-system/            # 토큰, 컴포넌트, 한/영, 다크/라이트
│   └── protocol/                 # 공유 타입
├── docs/setup/                   # Ollama/Gemma 셋업 가이드
├── scripts/receipt/              # 스프린트별 자동 검증
├── e2e/scenarios/                # 종단 테스트
├── 디자인 목업/                  # 시각/카피 단일 진실원 (read-only)
└── 기획서.md                     # 제품 정의 단일 진실원
```

---

## 디자인 톤

- **컨셉**: 따뜻한 종이 저널 / 잉크가 떠오르는 듯한 애니메이션
- **타이포**: Source Serif 4 (헤드/본문), Inter (UI), JetBrains Mono (메타)
- **팔레트** (oklch, light/dark 토글):
  - paper `oklch(96.5% 0.012 75)` ↔ `oklch(20% 0.012 60)`
  - ink `oklch(22% 0.018 60)` ↔ `oklch(94% 0.012 70)`
  - synapse (amber accent) `oklch(64% 0.14 55)`
- **언어**: 한국어 1차, 영어 2차
- **모션 의도**: `recall-emerge` (blur→clear), `ink-rise`, `synapse-pulse`, `ghost-breathe`, `thread-draw`, `node-orbit`

단일 진실원: [디자인 목업/styles.css](디자인%20목업/styles.css), [디자인 목업/content.jsx](디자인%20목업/content.jsx).

---

## 라이선스

미정. (MVP 단계, 추후 결정.)
