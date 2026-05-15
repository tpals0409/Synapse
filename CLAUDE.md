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
│   └── sprint-N/reports/         # 워커별 슬라이스 리포트 (Sprint 11+, /end 가 dev doc 으로 통합)
├── scripts/receipt/              # 스프린트별 receipt 자동 검증
├── e2e/scenarios/                # 종단 테스트 (tester)
├── 디자인 목업/                    # 참조 (read-only)
├── 기획서.md                      # 참조
├── SPRINTS.md                    # 인덱스
├── .claude/agents/               # 8 서브에이전트 (Agent View dispatch 대상, Sprint 11+)
└── .claude/commands/             # /start + /end 슬래시커맨드 (team-leader 세션에서 PM 입력)
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

## 스프린트 라이프사이클 (Sprint 11+ Agent View 단계별 dispatch)

전체 그림: PM 이 team-leader 세션에 **foreground** attach → team-leader 가 워커를 **Tier 1 → 2 → 3 순차** 백그라운드 dispatch → 각 Tier 완료 후 team-leader 가 main 으로 squash merge → 다음 Tier 시작 → 모든 Tier 끝나면 /end 가 리포트 수확 + dev doc 마감.

**진입점**:
```bash
cd /Users/kimsemin/Desktop/2026/Synapse
claude --agent team-leader                       # foreground attach (--bg 금지)
```

**사이클**:
```
1. team-leader 세션 안: PM: /start
2. team-leader: N + N-1 읽기 → 워커 슬라이스 + Tier 분류 보고 → PM 사인오프 게이트
3. team-leader: Tier 1 (producer-only) 워커 자동 dispatch
        ↓ claude --bg --agent <worker> "<sed 추출 슬라이스>"
   PM: $ claude agents (다른 터미널 또는 ← 키) — 모니터링 + needs-input 즉답
4. 모든 Tier 1 Completed 후 PM 신호 → team-leader: squash merge → worktree 제거
5. team-leader: Tier 2 (의존 + 자체 export) 워커 dispatch (위와 동일 패턴)
6. 모든 Tier 2 Completed 후 PM 신호 → team-leader: squash merge → worktree 제거
7. team-leader: Tier 3 (소비자만) 워커 dispatch
8. 모든 Tier 3 Completed 후 PM: /end
9. /end: Tier 3 잔여 머지 → 리포트 일괄 수확 → dev doc 조립 (Implementation Map / Carry-over / Retrospective) → receipt → N+1 스켈레톤 → git tag
10. /clear → 진입점 명령 → /start (다음 사이클)
```

**Tier 분류 (dev doc §5 File Ownership 의 Tier 컬럼 + §5.5 Worker Slices 의 Tier 필드)**:
- **Tier 1 (producer-only)**: 다른 워커가 의존하는 영향력 있는 변경 — protocol 타입, storage 마이그레이션, design tokens breaking. Tier 1 워커끼리는 동시 dispatch 안전.
- **Tier 2 (의존 + 자체 export)**: Tier 1 결과를 import 하면서 자기도 새 export — engine / conversation / orchestrator.
- **Tier 3 (소비자만)**: 모든 producer 의 결과를 consume — mobile UI, tester e2e.

이 순차 dispatch 로 헌법 5 (Consumer 사전 진단) / 헌법 6 (Root index grep) 의 grep 기준점이 자동으로 최신 main 보장 — Tier N 워커의 worktree HEAD = 직전 Tier 머지 후 main 상태.

**핵심 약속 1 — dev doc = 영속 메모리**: 메인 dev doc 은 team-leader 단독 소유. 워커는 자기 `reports/<self>.md` 만 작성. `/end` 가 N 개 리포트를 dev doc 의 *Implementation Map* / *Carry-over* / *Retrospective* 로 조립.

**핵심 약속 2 — Carry-over 자가완결**: `/end` 의 *Carry-over* 가 부실하면 다음 사이클이 단절됨. `/start` 는 N + N-1 두 문서만 읽으므로 N-1 의 carry-over 는 *반드시* 자가완결적이어야 한다. 워커 리포트 §4 가 일차 자료.

**핵심 약속 3 — Worktree 격리 + Tier 순차 dispatch**: Agent View 가 워커 dispatch 시 자동으로 `.claude/worktrees/<id>/` 격리. 워커 간 코드 충돌 차단. Tier 단계별 dispatch 로 producer-consumer 동기화 보장 — Tier N 워커는 직전 Tier 완료된 main 위에서 시작. team-leader 만 메인 디렉토리에서 작업하며 **foreground 세션** 유지 (백그라운드 dispatch 금지).

**핵심 약속 4 — 워커 간 직접 통신 금지**: 워커가 다른 워커의 코드 / 컨텍스트에 끼어들지 않음. producer gap 발견 시 즉시 작업 중단 + 자기 리포트 §5 에 기록 + 세션 종료. team-leader 가 다음 Tier 또는 /end 에서 흡수해 producer 재dispatch.

### tmux 다중-pane 단일 세션 모드 (옵션, 비-권장)
빠른 prototyping 또는 quota 절약이 필요할 때, 한 세션 안에서 8 페르소나를 슬래시커맨드로 전환하는 옛 패턴도 가능. 단 진짜 병렬성/worktree 격리/리포트 디렉토리 미사용 → /start /end 흐름과 불일치 → Sprint 11+ 권장 흐름 아님. Sprint 0~10 dev doc 회고용 이력 참조만.

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

## 에이전트 (`.claude/agents/`, Sprint 11+ 서브에이전트)
| Agent | 역할 | dispatch 방식 | 담당 |
|---|---|---|---|
| `team-leader` | 오케스트레이터, /start·/end 실행 | `claude --agent team-leader` (PM attach) | `docs/sprints/`, `SPRINTS.md`, `CLAUDE.md` |
| `mobile` | RN + Expo | `claude --bg --agent mobile` | `apps/mobile/` |
| `engine` | Memory Engine | `claude --bg --agent engine` | `packages/engine/` |
| `conversation` | 대화 루프 + LLM | `claude --bg --agent conversation` | `packages/conversation/`, `packages/llm/` |
| `orchestrator` | Attention Control | `claude --bg --agent orchestrator` | `packages/orchestrator/` |
| `storage` | SQLite + sqlite-vec | `claude --bg --agent storage` | `packages/storage/` |
| `designer` | 디자인 시스템 | `claude --bg --agent designer` | `packages/design-system/` |
| `tester` | QA + receipt 자동화 | `claude --bg --agent tester` | `**/__tests__/`, `e2e/`, `scripts/receipt/` |

각 정의는 `.claude/agents/<role>.md` 에 있고, frontmatter (name / description / tools / isolation) + 본문 5 섹션 표준 (역할 / 담당 영역 / 작업 규칙 / 인터페이스 / 리포트 작성 의무 / 공통 헌법). 워커는 모두 `isolation: worktree` — Agent View dispatch 시 자동 worktree 격리. team-leader 만 메인 디렉토리에서 작동.

슬래시커맨드는 `.claude/commands/` 의 `/start` 와 `/end` 두 개만 존재 — team-leader 세션 안에서 PM 이 입력하는 명령.

## 프로젝트 부트스트랩 (Sprint 0 의 N-1 대용)
첫 `/start` 호출 시 N-1 dev doc 이 없으므로, 다음을 N-1 carry-over 의 대체로 사용:
- `기획서.md` 전체 — 제품 결정의 출처 (특히 §6 Dual Engine, §7 Core Features, §16 Orchestrator Rule)
- 본 `CLAUDE.md` — 기술 결정, 디자인 톤, 스프린트 로드맵
- `디자인 목업/` — 시각/카피 단일 진실원
- 가정: 코드 베이스가 비어있고, Sprint 0 의 receipt 는 "안녕 → Gemma → SQLite" 종단 흐름.
