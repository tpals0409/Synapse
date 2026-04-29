# Synapse

로컬 기반 Memory-Native AI MVP. 사용자의 대화를 자동으로 기억하고, 과거 생각을 현재 맥락에 재등장(Recall) 시키는 시스템.

> 핵심 원칙: 저장은 자동화하고, **기억의 생성과 재등장을 설계한다**. 필요한 순간에만 개입하고, 나머지 시간은 침묵한다.

## 단일 진실원
- **기획서**: `기획서.md` (모든 제품 결정의 출처)
- **디자인 목업**: `디자인 목업/` (iOS 프로토타입, 9 화면, React+Babel)
- **스프린트 로드맵**: 아래 §스프린트 표
- **현재 스프린트**: `docs/sprints/_current.txt`
- **스프린트 dev doc**: `docs/sprints/sprint-N-<slug>.md` (이게 영속 메모리)

## 기술 결정
- 클라이언트: React Native + Expo (TypeScript)
- LLM: 로컬 Gemma (Ollama 또는 llama.cpp 기반 — Sprint 0 에서 확정)
- 그래프 + 벡터 저장: SQLite + sqlite-vec (단일 파일)
- 패키지 매니저: pnpm (모노레포)

## 모노레포 구조
```
Synapse/
├── apps/mobile/                  # RN + Expo (mobile 에이전트)
├── packages/
│   ├── conversation/             # 대화 루프 (conversation)
│   ├── llm/                      # Gemma 어댑터 (conversation)
│   ├── engine/                   # Memory: Concept, Graph, Recall (engine)
│   ├── orchestrator/             # Attention Control (orchestrator)
│   ├── storage/                  # SQLite + sqlite-vec (storage)
│   ├── design-system/            # 토큰, 컴포넌트, 애니메이션 (designer)
│   └── protocol/                 # 공유 타입 (모든 에이전트)
├── docs/sprints/                 # 스프린트 dev doc + 템플릿 + _current.txt
├── scripts/receipt/              # 스프린트별 receipt 자동 검증
├── e2e/scenarios/                # 종단 테스트 (tester)
├── 디자인 목업/                    # 참조 (read-only)
├── 기획서.md                      # 참조
├── SPRINTS.md                    # 인덱스
└── .claude/commands/             # 8 에이전트 + /start + /end
```

## 명령어
```bash
pnpm install                       # 의존성
pnpm --filter mobile start         # Expo 개발 서버
pnpm test                          # 전체 테스트
pnpm --filter <pkg> test           # 패키지 단위 테스트
pnpm --filter mobile build         # 모바일 빌드
bash scripts/receipt/sprint-N.sh   # 스프린트 N receipt 검증
```

## 스프린트 라이프사이클
1. **`/start`** → team-leader 가 N + N-1 dev doc 만 읽고 컨텍스트 복원, PM 사인오프 후 팀 부트
2. **작업** → 각 에이전트가 자기 슬라이스 구현, dev doc 라이브 갱신 (`Interfaces`, `Test Scenarios` 등)
3. **`/end`** → Receipt 검증 + dev doc 마감(`Implementation Map`, `Carry-over`, `Retrospective`) + N+1 스켈레톤 자동 생성 + git tag
4. **`/clear`** → 컨텍스트 리셋
5. **`/start`** → 다음 사이클

**핵심 약속**: dev doc 이 영속 메모리. `/end` 의 *Carry-over* 가 부실하면 다음 사이클이 단절됨. `/start` 는 N + N-1 두 문서만 읽으므로 N-1 의 carry-over 는 *반드시* 자가완결적이어야 한다.

## 스프린트 로드맵 (high-level)
| # | Title | Goal |
|---|---|---|
| 0 | Scaffolding | 모노레포 + RN+Expo + 로컬 Gemma + sqlite-vec |
| 1 | Conversation Loop | Onboarding/FirstChat + 스트리밍 + 영속화 |
| 2 | Memory Formation | Concept 추출 + 임베딩 + Graph + CaptureToast |
| 3 | Recall L1~L3 | Ghost / Suggestion / Strong + Inspector |
| 4 | Orchestrator | Trigger / Silence rules (Attention Control) |
| 5 | Hyper-Recall | Bridge / Temporal / Domain Crossing |
| 6 | Failure & Hygiene | Dismiss/Unlink, Humble Retraction, Forgetting |
| 7 | Polish | 애니메이션, 테마, 한/영, Empty/Error, 사용자 테스트 |

이 표는 PM 의 항해도. `/end` 가 N+1 의 Goal 을 도출할 근거. 변경 자유 — 변경 시 N 의 *Carry-over* 에 사유를 기록한다.

## 디자인 톤 (디자인 목업 추출 요약)
- **컨셉**: 따뜻한 종이 저널 / 잉크가 떠오르는 듯한 애니메이션
- **타이포**: Source Serif 4 (헤드/본문), Inter (UI), JetBrains Mono (메타·타임스탬프)
- **팔레트(light, oklch)**: paper `96.5% 0.012 75`, ink `22% 0.018 60`, synapse `64% 0.14 55` (amber)
- **팔레트(dark)**: 잉크 위 종이 → 종이 위 잉크 반전
- **언어**: 한국어 1차, 영어 2차 (`COPY` 동기 유지)
- **애니메이션 의도**: `recall-emerge` (blur→clear), `ink-rise` (위로 떠오름), `synapse-pulse`, `ghost-breathe`, `thread-draw`, `node-orbit`
- **단일 진실원**: `디자인 목업/styles.css`, `디자인 목업/content.jsx` (`COPY`, `DEMO_KO/EN`, `MEMORIES_KO/EN`), `디자인 목업/screens.jsx`, `디자인 목업/synapse-ui.jsx`

## 에이전트 (`.claude/commands/`)
| Agent | 역할 | 담당 |
|---|---|---|
| `team-leader` | 조율, /start ·/end 실행 | `docs/sprints/`, `SPRINTS.md`, `CLAUDE.md` |
| `mobile` | RN + Expo | `apps/mobile/` |
| `engine` | Memory Engine | `packages/engine/` |
| `conversation` | 대화 루프 + LLM | `packages/conversation/`, `packages/llm/` |
| `orchestrator` | Attention Control | `packages/orchestrator/` |
| `storage` | SQLite + sqlite-vec | `packages/storage/` |
| `designer` | 디자인 시스템 | `packages/design-system/` |
| `tester` | QA + receipt 자동화 | `**/__tests__/`, `e2e/`, `scripts/receipt/` |

각 정의는 `.claude/commands/<role>.md` 에 있고, frontmatter + 4 섹션 표준(역할/담당/규칙/인터페이스).

## 프로젝트 부트스트랩 (Sprint 0 의 N-1 대용)
첫 `/start` 호출 시 N-1 dev doc 이 없으므로, 다음을 N-1 carry-over 의 대체로 사용:
- `기획서.md` 전체 — 제품 결정의 출처 (특히 §6 Dual Engine, §7 Core Features, §16 Orchestrator Rule)
- 본 `CLAUDE.md` — 기술 결정, 디자인 톤, 스프린트 로드맵
- `디자인 목업/` — 시각/카피 단일 진실원
- 가정: 코드 베이스가 비어있고, Sprint 0 의 receipt 는 "안녕 → Gemma → SQLite" 종단 흐름.
