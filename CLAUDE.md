# Synapse

로컬 기반 Memory-Native AI MVP. 사용자의 대화를 자동으로 기억하고, 과거 생각을 현재 맥락에 재등장(Recall) 시키는 시스템.

> 핵심 원칙: 저장은 자동화하고, **기억의 생성과 재등장을 설계한다**. 필요한 순간에만 개입하고, 나머지 시간은 침묵한다.

## 단일 진실원
- **기획서**: `기획서.md` (모든 제품 결정의 출처)
- **디자인 목업**: `디자인 목업/` (iOS 프로토타입, 9 화면, React+Babel)
- **스프린트 로드맵**: 아래 §스프린트 표
- **현재 스프린트**: `docs/sprints/_current.txt`
- **스프린트 dev doc**: `docs/sprints/sprint-N-<slug>.md` (이게 영속 메모리, PM 단독 큐레이션)

## 기술 결정
- 클라이언트: React Native + Expo (TypeScript)
- LLM: 로컬 Gemma (Ollama 또는 llama.cpp 기반 — Sprint 0 에서 확정)
- 그래프 + 벡터 저장: SQLite + sqlite-vec (단일 파일)
- 패키지 매니저: pnpm (모노레포)

## 모노레포 구조
```
Synapse/
├── apps/mobile/                  # RN + Expo (mobile 워커)
├── packages/
│   ├── conversation/             # 대화 루프 (conversation)
│   ├── llm/                      # Gemma 어댑터 (conversation)
│   ├── engine/                   # Memory: Concept, Graph, Recall (engine)
│   ├── orchestrator/             # Attention Control (orchestrator)
│   ├── storage/                  # SQLite + sqlite-vec (storage)
│   ├── design-system/            # 토큰, 컴포넌트, 애니메이션 (designer)
│   └── protocol/                 # 공유 타입 (모든 워커)
├── docs/sprints/                 # 스프린트 dev doc + 템플릿 + _current.txt
│                                 # (Sprint 0~12 의 sprint-N/reports/ 는 역사적 산물, Sprint 13+ 는 생성 안 함)
├── scripts/receipt/              # 스프린트별 receipt 자동 검증
├── e2e/scenarios/                # 종단 테스트 (tester)
├── 디자인 목업/                    # 참조 (read-only)
├── 기획서.md                      # 참조
├── SPRINTS.md                    # 인덱스
└── .claude/agents/               # 7 서브에이전트 (Agent View dispatch 대상, Sprint 13+)
                                  # .claude/commands/ 는 비어있음 — 슬래시커맨드 없음
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

## 스프린트 라이프사이클 (Sprint 13+ 공식 Agent View)

PM 이 `claude agents` 만으로 모든 일을 한다. team-leader 워커 없음. /start /end 슬래시커맨드 없음.

공식 docs: https://docs.claude.com/ko/docs/claude-code/agents-view

### 진입
```bash
cd /Users/kimsemin/Desktop/2026/Synapse
claude agents
```

### 사이클 (PM 관점)
```
1. dev doc 준비
   PM 이 docs/sprints/sprint-N-<slug>.md 스켈레톤 작성 (Goal / Scope /
   Worker Slices §5.5 / Constitution refs). 직전 스프린트의 *Carry-over*
   섹션을 N 의 시작점으로 복사.

2. 워커 dispatch
   `claude agents` 입력에 `@<worker> <slice>` 입력 (예: `@designer ...`).
   슬라이스가 producer-only / consumer-only 인지는 PM 이 §5.5 의존 그래프를 보고 판단.
   producer-only 부터 띄우고 그 동안 PM 은 다른 작업.

3. 모니터링
   peek (Space) 로 빠른 확인, 필요시 attach (Enter).
   `s:blocked` 필터로 needs-input 워커만 보고 즉답.

4. 머지 결정
   워커가 자기 worktree 에 작업 완료 + transcript 4 줄 요약 (슬라이스 결과 /
   Interfaces / Carry-over / Frozen 위반 여부) 남김. PM 이 transcript 확인 후
   main 으로 squash merge. 충돌 시 PM 이 직접 해소.

5. 다음 워커
   1 단계 producer 머지 후 의존 워커 dispatch. 의존 워커의 worktree HEAD =
   머지된 fresh main 보장 (`origin/main` 동기화 필수, 아래 *핵심 약속 3* 참조).

6. dev doc 큐레이션
   모든 워커 완료 후 PM 이 transcript / commit 보고 *Implementation Map* /
   *Carry-over* / *Retrospective* 직접 작성.

7. receipt 검증
   bash scripts/receipt/sprint-N.sh

8. 다음 스프린트
   docs/sprints/_current.txt 갱신, N+1 스켈레톤 작성, git tag sprint-N-closed,
   git push origin main (다음 사이클의 base 갱신).
```

### 핵심 약속

**1. dev doc = 영속 메모리** — PM 단독 큐레이션. 워커는 transcript 4 줄만 남긴다. dev doc 의 *Implementation Map* / *Carry-over* / *Retrospective* 는 PM 이 워커 transcript 를 보고 직접 작성. 자동 조립 없음.

**2. Carry-over 자가완결** — N+1 시작 시 PM 은 N + N-1 두 dev doc 만 읽는다. 따라서 N 의 Carry-over 가 부실하면 다음 사이클 단절. PM 이 마감 시 의식적으로 자가완결적으로 작성한다 (외부 참조 없이 N+1 워커들이 시작 가능한 정보 밀도).

**3. origin/main 동기화 의무 (Sprint 13 신규)** — Agent View 의 `isolation: worktree` 메커니즘이 worktree base 로 `origin/main` 을 사용한다. local main 만 진행하고 push 안 하면 worktree 가 stale main 위에 만들어져 모든 producer-consumer 동기화가 깨진다. **Sprint 마감 직후 반드시 `git push origin main`** — Sprint 10/11/12 가 3 연속 no-op close 된 진정한 원인이 이 누락이었음. 다음 사이클 첫 dispatch 전에 `git rev-parse main == git rev-parse origin/main` 1회 확인.

**4. 워크트리 격리** — 각 워커는 `isolation: worktree` (`.claude/agents/<role>.md` frontmatter). `.claude/worktrees/<id>/` 자동 생성. `claude rm <id>` 로 세션 + worktree 동시 정리. 미머지 worktree 는 push 후 정리.

**5. 워커 간 직접 통신 금지** — producer gap 발견 시 PM 에게 needs-input. 다른 워커 코드 / context 에 끼어들지 않는다. PM 이 다음 사이클에서 producer 재dispatch.

**6. 직렬화는 PM 의 결정** — Tier 강제 없음. 의존 그래프 (dev doc §5.5) 보고 PM 이 동시 / 순차 선택. producer-only 워커는 같이 띄워도 안전, consumer 는 producer 머지 후.

### tmux 다중-pane 단일 세션 모드 (옵션, 비-권장)
빠른 prototyping 또는 quota 절약이 필요할 때, 한 세션 안에서 7 페르소나를 슬래시커맨드로 전환하는 옛 패턴도 가능. 단 진짜 병렬성/worktree 격리 미사용 → 공식 Agent View 흐름과 불일치 → Sprint 13+ 권장 아님. Sprint 0~10 dev doc 회고용 이력 참조만.

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

이 표는 PM 의 항해도. PM 이 dev doc 큐레이션 시 N+1 의 Goal 을 도출할 근거. 변경 자유 — 변경 시 N 의 *Carry-over* 에 사유를 기록한다.

## 디자인 톤 (디자인 목업 추출 요약)
- **컨셉**: 따뜻한 종이 저널 / 잉크가 떠오르는 듯한 애니메이션
- **타이포**: Source Serif 4 (헤드/본문), Inter (UI), JetBrains Mono (메타·타임스탬프)
- **팔레트(light, oklch)**: paper `96.5% 0.012 75`, ink `22% 0.018 60`, synapse `64% 0.14 55` (amber)
- **팔레트(dark)**: 잉크 위 종이 → 종이 위 잉크 반전
- **언어**: 한국어 1차, 영어 2차 (`COPY` 동기 유지)
- **애니메이션 의도**: `recall-emerge` (blur→clear), `ink-rise` (위로 떠오름), `synapse-pulse`, `ghost-breathe`, `thread-draw`, `node-orbit`
- **단일 진실원**: `디자인 목업/styles.css`, `디자인 목업/content.jsx` (`COPY`, `DEMO_KO/EN`, `MEMORIES_KO/EN`), `디자인 목업/screens.jsx`, `디자인 목업/synapse-ui.jsx`

## 워커 (`.claude/agents/`, Sprint 13+ 7 서브에이전트)
| Worker | 역할 | dispatch | 담당 |
|---|---|---|---|
| `mobile` | RN + Expo | `@mobile <slice>` (Agent View) 또는 `claude --bg --agent mobile` | `apps/mobile/` |
| `engine` | Memory Engine | `@engine <slice>` | `packages/engine/` |
| `conversation` | 대화 루프 + LLM | `@conversation <slice>` | `packages/conversation/`, `packages/llm/` |
| `orchestrator` | Attention Control | `@orchestrator <slice>` | `packages/orchestrator/` |
| `storage` | SQLite + sqlite-vec | `@storage <slice>` | `packages/storage/` |
| `designer` | 디자인 시스템 | `@designer <slice>` | `packages/design-system/` |
| `tester` | QA + receipt 자동화 | `@tester <slice>` | `**/__tests__/`, `e2e/`, `scripts/receipt/` |

각 정의는 `.claude/agents/<role>.md` 에 있고, frontmatter (name / description / tools / `isolation: worktree`) + 본문 6 섹션 표준 (역할 / 담당 영역 / 작업 규칙 / 인터페이스 / 종료 시 transcript 4 줄 요약 / 공통 헌법 12 항). 모든 워커가 `isolation: worktree` — Agent View dispatch 시 자동 worktree 격리.

`.claude/commands/` 는 비어있다. 슬래시커맨드 없음. PM 이 `claude agents` 에서 직접 dispatch.

## 프로젝트 부트스트랩 (Sprint 0 의 N-1 대용)
Sprint 0 첫 dispatch 시 N-1 dev doc 이 없으므로, 다음을 N-1 carry-over 의 대체로 사용:
- `기획서.md` 전체 — 제품 결정의 출처 (특히 §6 Dual Engine, §7 Core Features, §16 Orchestrator Rule)
- 본 `CLAUDE.md` — 기술 결정, 디자인 톤, 스프린트 로드맵
- `디자인 목업/` — 시각/카피 단일 진실원
- 가정: 코드 베이스가 비어있고, Sprint 0 의 receipt 는 "안녕 → Gemma → SQLite" 종단 흐름.
