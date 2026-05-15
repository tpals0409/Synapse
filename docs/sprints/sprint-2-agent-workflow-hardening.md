# Sprint 2 — Agent Workflow Hardening

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`
>
> **Sprint 2 는 비표준 sprint** — 원래 로드맵의 N+1 (Memory Formation) 를 Sprint 3 으로 시프트하고 워크플로우 부채를 먼저 갚는다. PM 사인오프 2026-04-29. 사유 = Sprint 1 §12 carry-over 10번.

## 1. Goal
Sprint 1 의 (A)/(B') 5중 timing collision 회고를 헌법으로 박아, 결정 직렬화 (HOLD-DECIDE-RESUME) + 메시지 logical clock (Decision-version 태그) + dev doc 단일 작성자 시간창 + /start 정합성 점검 + mobile 환경 사전 조사를 *시스템 수준에서 강제*하여 Sprint 3+ 의 race surface 를 0 으로 만든다.

## 2. Deliverable & Receipt

**Deliverable:**
- `feedback_decision_serialization.md` 의 4 패턴 (HOLD-DECIDE-RESUME / Decision-version 태그 / Source-of-truth 우선순위 / 단일 작성자 시간창) 을 모든 `.claude/commands/<role>.md` frontmatter 에 헌법으로 inject. team-lead 의 spawn prompt 도 동일.
- `/start` 가 `/start` 직후 designer 의 *디자인 목업 ↔ §3 Scope 정합성 점검* 단계 표준화 — `scripts/lint/mockup-scope-parity.sh` (또는 ts) 가 `디자인 목업/screens.jsx` 의 화면 enum 을 추출하고 `docs/sprints/sprint-N-*.md` §3 In 의 화면 표현과 1:1 매칭. 불일치 시 `/start` 가 PM 사인오프 *전* 에 §11 Open Issue 자동 추기.
- `/end` 가 dev doc 의 *FROZEN 미부착 결정 줄* 검출 — `scripts/lint/frozen-flag-audit.sh` 가 §11 Decisions Made 의 각 줄을 검사, PM 사인오프 받은 결정에 `**[FROZEN v<date> <decision-id>]**` prefix 가 없으면 경고. 미부착 줄 0 → exit 0.
- `[DIRECTIVE v<date> <id>]` 태그 lint — `scripts/lint/directive-tag-audit.ts` 가 `.claude/commands/<role>.md` 의 spawn prompt 와 SendMessage 패턴에서 directive 메시지 유형을 검출 시 태그 필수. 위반 시 receipt 단계에서 fail.
- `apps/mobile/devDependencies` 에 `@types/node` 추가 (Sprint 1 carry-over 4번).
- Sprint 1 의 `feedback_decision_serialization.md` 헌법을 `.claude/commands/<role>.md` 의 *모든* role 에 *공통 헌법* 으로 reference (각 role md 가 본 메모리 파일을 import 형식으로 명시).

**Receipt (자동 검증 가능한 형태):**
- `pnpm install` / `pnpm -r test` exit 0 (Sprint 1 53 + Sprint 2 신규 lint 테스트).
- `pnpm --filter @synapse/mobile run build` exit 0 (`@types/node` 추가 후 typecheck 통과).
- `bash scripts/receipt/sprint-2.sh` 시나리오:
  1. Sprint 1 의 8 단계 그대로 통과.
  2. **헌법 inject 검증** — `grep -L "HOLD-DECIDE-RESUME" .claude/commands/*.md` 가 0 hits (모든 role 헌법 박힘).
  3. **목업↔§3 정합성 점검** — `bash scripts/lint/mockup-scope-parity.sh docs/sprints/sprint-1-conversation-loop.md` 가 0 mismatch (Sprint 1 의 단일 화면 ↔ 목업 OnboardingScreen 매칭 검증). Sprint 0 도 dry-run.
  4. **FROZEN flag 감사** — `bash scripts/lint/frozen-flag-audit.sh docs/sprints/sprint-1-conversation-loop.md` 가 PASS (Sprint 1 의 PM 사인오프 결정 모두 마커 박힘 — 본 sprint 가 retrofit).
  5. **directive 태그 lint** — `node scripts/lint/directive-tag-audit.ts` 가 0 violations.
  6. **(A)/(B') 시나리오 회귀 dry-run** — `e2e/scenarios/sprint-2-race-regression.md` 의 시나리오 (mobile 이 PM-A directive 받기 전 dev doc §3 stale 상태에서 작업 시작) 시뮬레이션 → HOLD 메시지가 작업을 차단함을 검증.
- 모든 단계 통과 → exit 0, "✅ Sprint 2 receipt PASSED".

## 3. Scope
**In:**
- **헌법 inject** — `feedback_decision_serialization.md` 의 4 패턴(HOLD-DECIDE-RESUME / Decision-version 태그 / Source-of-truth 우선순위 / 단일 작성자 시간창)을 모든 `.claude/commands/<role>.md` 10 파일(8 role + start + end) frontmatter 또는 본문 *작업 규칙* 섹션에 inject. 본문 길이 압박을 피해 *공통 헌법 reference + 짧은 요약*. spawn prompt 도 동일 헌법을 4 묶음 중 1번 자기 역할 정의에 포함.
- **`scripts/lint/mockup-scope-parity.sh`** — `디자인 목업/screens.jsx` 의 화면 enum (designer 가 명세 제공) ↔ `docs/sprints/sprint-N-*.md` §3 In 의 화면 표현 1:1 매칭. 불일치 0 → exit 0. CLI: `bash scripts/lint/mockup-scope-parity.sh <dev-doc-path>`. 호출자 = `/start` (PM 사인오프 *전*) + `scripts/receipt/sprint-2.sh`.
- **`scripts/lint/frozen-flag-audit.sh`** — dev doc §11 *Decisions Made* 의 각 줄을 검사, PM 사인오프 받은 결정에 `**[FROZEN v<date> <decision-id>]**` prefix 미부착 시 경고. 미부착 0 → exit 0. CLI: `bash scripts/lint/frozen-flag-audit.sh <dev-doc-path>`. 호출자 = `/end` (마감 직전) + `scripts/receipt/sprint-2.sh`.
- **`scripts/lint/directive-tag-audit.ts`** — `.claude/commands/*.md` 의 spawn prompt 와 SendMessage 호출 패턴에서 directive 메시지(워커 행동을 강제하는 명시 지시)를 검출 시 `[DIRECTIVE v<date> <id>]` 태그 필수. 위반 시 stderr 로 줄 단위 보고 + exit 1. 호출자 = `pnpm -r test` + `scripts/receipt/sprint-2.sh`. 검출 패턴은 conservative — false-positive 회피를 위해 *명시 directive keyword* (예: "지시", "강제", "필수", "MUST") + SendMessage 인자에서 시작.
- **mobile `@types/node`** — `apps/mobile/devDependencies` 에 `@types/node@^20` 1 줄 추가, `pnpm install`, typecheck 회귀 검증.
- **Sprint 1 §11 retrofit** — Sprint 1 dev doc §11 Decisions Made 12 줄에 `**[FROZEN v2026-04-29 ...]**` prefix 후처리 (lint 가 통과하도록).
- **`scripts/receipt/sprint-2.sh`** — Sprint 1 8 단계 wrap + 4 신규 단계(헌법 inject 검증 / 목업↔§3 정합성 / FROZEN 감사 / directive 태그 lint) + (A)/(B') 회귀 dry-run.
- **`e2e/scenarios/sprint-2-race-regression.md`** — (A)/(B') 시나리오 시뮬레이션 명세 (스크립트 자동화 아닌 dry-run 검증 — HOLD 메시지가 작업 차단함을 시뮬).
- **공통 헌법 메모리 reference** — 모든 role md 가 `~/.claude/projects/-Users-kimsemin-Desktop-2026-Synapse/memory/feedback_decision_serialization.md` 를 import 형식(경로 명시 + 요약)으로 포함.
- **`/start` 절차 보강** — `.claude/commands/start.md` 에 "PM 사인오프 *전* `mockup-scope-parity.sh` 호출 + 불일치 시 §11 Open Issue 자동 추기" 단계 추가.
- **`/end` 절차 보강** — `.claude/commands/end.md` 에 "마감 직전 `frozen-flag-audit.sh` + receipt sprint-N.sh 호출" 단계 추가.

**Out:**
- **storage / engine / conversation / orchestrator 코드 변경 0** — Sprint 2 는 메타-스프린트. 4 패키지의 src/, schema/, **tests** 모두 *그대로 유지*. role md 의 인터페이스 / 작업 규칙 섹션 갱신만 가능.
- **`apps/mobile` 코드 변경** — `@types/node` devDependencies 추가 외 src/ / app/ 어떤 파일도 건드리지 않음. `chatStore.{ts,web.ts}` adapter 패턴은 *Sprint 3 도입 시점 강제* 로 이연.
- **packages/design-system 코드 변경 0** — designer 는 메모리 + dev doc 명세 산출만. tokens / colorsHex / motion 등 src/ 파일 무수정.
- **로드맵 시프트 자체** — Sprint 1 §12 carry-over #10 에서 PM 사인오프 완료. 본 sprint 는 *수행만*. `SPRINTS.md` / `CLAUDE.md` 업데이트는 `/end` 가 함.
- **Receipt 임계 강화** — Sprint 1 carry-over #8 의 `≥ 2 AND ≥ 5` 회복은 본 sprint receipt 통과 *후* `/end` 가 결정 (Sprint 3 receipt 헌법으로 전파).
- **Open Issues** — Sprint 1 §11 Open Issues 비어있음. 본 sprint 가 추가 발견 시 §11 라이브 갱신.

## 4. Architecture & Data Flow

**핵심 원칙**: Sprint 2 는 *워크플로우* 를 코드화한다. 산출물은 (a) 정적 자료(role md frontmatter / dev doc retrofit), (b) lint 스크립트(시점 검증), (c) receipt 자동화(통합 검증). 런타임 코드(packages/*, apps/mobile/src/) 는 건드리지 않는다.

**4 패턴 → 시점 매핑**:
| 패턴 | 시점 | 강제 메커니즘 |
|---|---|---|
| HOLD-DECIDE-RESUME | PM 결정 진행 *도중* | role md 헌법 + spawn prompt — 모든 에이전트가 HOLD 신호 받으면 dev doc 편집 / SendMessage 발송 동결 |
| Decision-version 태그 | 모든 directive 메시지 + frozen 결정 | `directive-tag-audit.ts` (spawn prompt + SendMessage 패턴) + `frozen-flag-audit.sh` (dev doc §11) |
| Source-of-truth 우선순위 | 워커가 행동 직전 reconcile | role md 헌법 + spawn prompt — 우선순위 = `code > task subject > frozen dev doc > inbox` |
| 단일 작성자 시간창 | dev doc 편집 시 | role md 헌법 + (사회적) — `/start` §5 (한 섹션 한 작성자) |
| 목업 ↔ §3 Scope 정합성 | `/start` 직후 PM 사인오프 *전* | `mockup-scope-parity.sh` — `start.md` 절차에 박음 |

**lint 호출 토폴로지**:
```
/start (start.md)
  └─ mockup-scope-parity.sh <current-dev-doc>
       └─ 입력: 디자인 목업/screens.jsx (designer 가 화면 enum 명세 정의)
       └─ 입력: docs/sprints/sprint-N-*.md §3 In
       └─ 출력: 불일치 0 → exit 0 / 발견 → §11 Open Issue 자동 추기 + exit 1

/end (end.md)
  ├─ frozen-flag-audit.sh <current-dev-doc>
  │    └─ 입력: §11 Decisions Made 줄 단위
  │    └─ 출력: PM 사인오프 결정 중 FROZEN prefix 미부착 0 → exit 0
  └─ scripts/receipt/sprint-N.sh

scripts/receipt/sprint-2.sh
  ├─ Sprint 1 8 단계 (그대로 통과)
  ├─ 헌법 inject — grep -L "HOLD-DECIDE-RESUME" .claude/commands/*.md → 0 hits
  ├─ mockup-scope-parity.sh docs/sprints/sprint-1-conversation-loop.md (dry-run)
  ├─ frozen-flag-audit.sh docs/sprints/sprint-1-conversation-loop.md
  ├─ directive-tag-audit.ts (.claude/commands/*.md)
  └─ (A)/(B') 회귀 dry-run (e2e/scenarios/sprint-2-race-regression.md 검증 항목)

pnpm -r test
  └─ packages/* 단위 테스트 + scripts/lint/__tests__/* (신규, tester 작성)
```

**메시지 태그 포맷 (Decision-version)**:
- frozen 결정 prefix: `**[FROZEN v2026-04-29 D-onboarding-final-A]**` (decision-id 는 자유 명명, sprint 내 unique).
- directive 메시지 prefix: `[DIRECTIVE v2026-04-29 D-mobile-types-node]` (워커가 자기 inbox 메시지가 dev doc / task subject 의 frozen 마커보다 stale 하면 reconcile 요청).

**비대상**: Conflict resolution 자동화(예: file lock 도입), HOLD 신호 자동 발행(예: hook), directive 라우팅 자동화. 모두 *사회적 강제* 로 시작 — Sprint 3+ 에서 자동화 ROI 측정 후 결정.

## 5. File Ownership

| 파일/경로 | 책임 에이전트 | 변경 종류 |
|---|---|---|
| `.claude/commands/team-leader.md` | team-leader | 작업 규칙 + 인터페이스 갱신 (헌법 reference) |
| `.claude/commands/{mobile,engine,conversation,orchestrator,storage,designer,tester}.md` | team-leader | 작업 규칙 갱신 (헌법 reference + 4 패턴 요약) |
| `.claude/commands/start.md` | team-leader | 절차 §보강 (mockup-scope-parity 호출) |
| `.claude/commands/end.md` | team-leader | 절차 §보강 (frozen-flag-audit + receipt 호출) |
| `docs/sprints/sprint-1-conversation-loop.md` §11 | team-leader | Decisions Made 12 줄에 FROZEN prefix retrofit |
| `docs/sprints/sprint-2-agent-workflow-hardening.md` §3-§12 | team-leader (라이브 큐레이션) | §3-§6 채움 + §7-§12 라이브 |
| `scripts/lint/mockup-scope-parity.sh` | tester | 신규 작성 |
| `scripts/lint/frozen-flag-audit.sh` | tester | 신규 작성 |
| `scripts/lint/directive-tag-audit.ts` | tester | 신규 작성 |
| `scripts/lint/__tests__/*` | tester | lint 단위 테스트 (vitest 또는 bash test harness) |
| `scripts/receipt/sprint-2.sh` | tester | 신규 작성 (Sprint 1 wrap + 신규 4 단계) |
| `e2e/scenarios/sprint-2-race-regression.md` | tester | 신규 작성 |
| `apps/mobile/package.json` | mobile | `devDependencies` 에 `@types/node@^20` 1 줄 추가 |
| `apps/mobile/tsconfig.json` | mobile | (선택) `types: ["node", "expo"]` 검증, 변경 불필요 시 그대로 |
| `pnpm-lock.yaml` | mobile (자동) | `pnpm install` 결과 |
| `~/.claude/projects/.../memory/feedback_decision_serialization.md` | team-leader | 기존 메모리, 변경 없음 (모든 role md 가 import) |
| `~/.claude/projects/.../memory/feedback_mockup_truth.md` | designer | lint 자동화 격상 사실 추기 |
| 디자인 목업 화면 enum 명세 (dev doc §7 Interfaces 에 표 첨부) | designer | 신규 작성 (tester 입력) |
| `packages/{protocol,storage,llm,conversation,engine,orchestrator,design-system}/src/` | (없음) | **변경 금지** |
| `apps/mobile/{src,app}/` | (없음) | **변경 금지** (`package.json` 외) |

**단일 작성자 시간창 규칙**: dev doc §3-§6 = team-leader 단독 / §7-§8 = 변경 책임 에이전트 / §9-§12 = `/end`. 충돌 시 후입자 양보 + SendMessage 위임.

## 6. Tasks

| ID | Subject | Owner | Blocks | BlockedBy |
|---|---|---|---|---|
| T1 | designer: 디자인 목업 화면 enum 명세 (`screens.jsx` export 9 화면 식별자/별칭 표) → §7 Interfaces 첨부 | designer | T2 | — |
| T2 | tester: `scripts/lint/mockup-scope-parity.sh` 작성 (T1 enum 명세 입력) + 단위 테스트 | tester | T8 | T1 |
| T3 | team-leader: 4 패턴 헌법을 10 `.claude/commands/*.md` 작업 규칙 + frontmatter 에 inject (메모리 import 형식) | team-leader | T4, T5 | — |
| T4 | tester: `scripts/lint/directive-tag-audit.ts` 작성 (T3 inject 후 spawn prompt / SendMessage 패턴 검증) + 단위 테스트 | tester | T8 | T3 |
| T5 | team-leader: `start.md` / `end.md` 절차 보강 (mockup-scope-parity / frozen-flag-audit / receipt sprint-N.sh 호출) | team-leader | T8 | T3 |
| T6 | team-leader: Sprint 1 §11 Decisions Made 12 줄에 `**[FROZEN v2026-04-29 ...]**` prefix retrofit | team-leader | T7 | — |
| T7 | tester: `scripts/lint/frozen-flag-audit.sh` 작성 + 단위 테스트 (T6 retrofit 통과 검증) | tester | T8 | T6 |
| T8 | tester: `scripts/receipt/sprint-2.sh` 작성 (Sprint 1 8 단계 wrap + 신규 4 단계) | tester | T9 | T2, T4, T5, T7 |
| T9 | tester: `e2e/scenarios/sprint-2-race-regression.md` 작성 + receipt 마지막 단계로 dry-run | tester | T11 | T8 |
| T10 | mobile: `apps/mobile/devDependencies` `@types/node@^20` 추가 + `pnpm install` + typecheck 회귀 + 빌드 검증 | mobile | T11 | — |
| T11 | team-leader: receipt 종단 실행 — `bash scripts/receipt/sprint-2.sh` PASS 확인, dev doc §10 Implementation Map 채움 | team-leader | — | T9, T10 |
| T12 | designer: `feedback_mockup_truth.md` 메모리 갱신 (lint 자동화 격상 사실 추기) | designer | — | T2 |

**의존성 그래프 핵심 경로**: T1 → T2 → T8 → T11 (designer enum → mockup lint → receipt → 종단). T3 (헌법 inject) → T4 (directive lint) + T5 (start/end 보강) → T8. T6 (FROZEN retrofit) → T7 (frozen lint) → T8. T10 (mobile types) 독립 → T11.

**parallel 가능**: T1 ‖ T3 ‖ T6 ‖ T10 (4 진입점). T2 ‖ T4 ‖ T5 ‖ T7 (lint 4 종, T3/T6 종속 후). T9 ‖ T12 (T8 / T2 종속 후).

## 7. Interfaces / Contracts
*(라이브 갱신)*

### 7.1 디자인 목업 화면 enum 명세 (T1 — designer)

**입력 단일 진실원**: `디자인 목업/screens.jsx` 의 `Object.assign(window, {...})` (파일 끝). `PaperFrame` 은 wrapper 컴포넌트로 화면 enum 에서 제외. 실제 화면 컴포넌트 = **10 개**. CLAUDE.md / dev doc 의 "9 화면" 은 `EmptyStateScreen` 의 3 상태(`empty` / `loading` / `error`)를 1 화면으로 셈 — 본 표는 *컴포넌트 export 단위* 로 10 행, `state` 분기는 **별칭** 컬럼에 보조 별칭으로 명시.

**파싱 규약** (tester `mockup-scope-parity.sh` 가 grep 으로 의존):
- 표는 아래 두 마커 사이에서만 검색.
- 컬럼 4 개 고정: `screens.jsx export | 한국어 라벨 | dev doc §3 별칭 | 비고`.
- `dev doc §3 별칭` 컬럼은 `/` 로 구분된 복수 별칭 허용 — `mockup-scope-parity.sh` 는 각 별칭을 OR 매칭으로 §3 In 본문에서 검색.
- 별칭은 **소문자 kebab-case** 표기 (예: `first-chat`). §3 In 의 자유 서술과의 매칭 강건성을 위해.

<!-- mockup-enum-table:start -->
| screens.jsx export | 한국어 라벨 | dev doc §3 별칭 | 비고 |
|---|---|---|---|
| OnboardingScreen | 온보딩 | onboarding | Sprint 1 단일 화면 (목업 #1) |
| FirstChatScreen | 첫 대화 | first-chat / chat / first-conversation | 목업 #2, CaptureToast 포함 |
| GhostHintScreen | Ghost Hint (레벨 1) | ghost-hint / ghost / recall-l1 | 목업 #3, Recall L1 |
| SuggestionScreen | Suggestion (레벨 2) | suggestion / recall-l2 | 목업 #4, Recall L2 |
| StrongRecallScreen | Strong Recall (레벨 3) | strong-recall / strong / recall-l3 | 목업 #5, Recall L3 |
| HyperRecallScreen | Hyper-Recall | hyper-recall / hyper | 목업 #6, Bridge / Temporal / Domain Crossing |
| InspectorScreen | Memory Inspector | inspector / memory-inspector | 목업 #7, 기억 피드 |
| EmptyStateScreen | 빈 / 로딩 / 오류 상태 | empty-state / empty / loading / error / errorstate | 목업 #8, `state` prop 으로 3 상태 분기 (Sprint 7 에서 ErrorState 별도 컴포넌트로 분리 — D-S7-design-system-empty-error-shape; mockup 의 *화면* enum 은 단일, design-system 의 *컴포넌트* 는 EmptyState + ErrorState 2종) |
| HumbleScreen | Humble Retraction | humble / humble-retraction / retraction | 목업 #9, Sprint 6 |
| DemoScreen | 데모 (자동 재생) | demo / auto-demo | 목업 #10, 스크립트 자동 재생 |
<!-- mockup-enum-table:end -->

**단위 카운트 약속**: lint 스크립트는 *export 행 수 = 10* 을 기대. CLAUDE.md / 기획서의 "9 화면" 표현과의 차이는 *EmptyStateScreen 1 컴포넌트 = 3 상태* 라는 본 §7.1 비고에서 흡수. dev doc §3 In 작성자는 컴포넌트 단위(10) 또는 화면 단위(9) 중 일관된 단위로 서술하면 됨 — `mockup-scope-parity.sh` 는 *별칭 매칭* 이므로 셈 단위는 무관.

### 7.2 Lint 3 종 CLI 명세 (T2 / T4 / T7 — tester)

**`scripts/lint/mockup-scope-parity.sh`** (T2)
- CLI: `bash scripts/lint/mockup-scope-parity.sh <target-dev-doc>` — env override `MOCKUP_TABLE_DOC=<path>` (테스트 fixture 용).
- 표 단일 진실원: `docs/sprints/sprint-2-agent-workflow-hardening.md` §7.1 (default). 환경변수로 override 가능.
- 입력: target dev doc 의 §3 (`## 3. Scope` ~ `## 4.`) 의 `**In:**` ~ `**Out:**` 본문.
- 알고리즘: §3 In 본문에서 `[A-Z][a-zA-Z]+(Screen|Chat|Recall|Hint|State|Inspector)` 패턴 + ko 라벨 substring 검출 → 표의 export/ko/alias 와 1:1 매칭. 잡음은 stop-list 로 제외.
- exit 0 = PASS / exit 1 = 위반 / exit 2 = 인자/파일 오류.
- 의존: bash, awk, grep, sed, tr (node 미사용).
- 단위 테스트: `scripts/lint/__tests__/run-tests.sh` 의 `mockup-scope-parity.sh` 섹션 — PASS fixture / FAIL fixture (undefined screen) / Sprint 1 dev doc dry-run.

**`scripts/lint/frozen-flag-audit.sh`** (T7)
- CLI: `bash scripts/lint/frozen-flag-audit.sh <dev-doc-path>`.
- 입력: dev doc §11 (`## 11.` ~ `## 12.`) 의 `**Decisions Made:**` ~ `**Open Issues:**` 본문.
- 알고리즘: 그 사이의 `^- ` bullet 줄 검사 → `^- \*\*\[FROZEN v\d{4}-\d{2}-\d{2} [^]]+\]\*\*` prefix 매칭. 메타 주석 (`*(...)*`) / 빈 줄 skip.
- exit 0 = PASS / exit 1 = 위반 / exit 2 = 인자/파일 오류.
- 의존: bash, awk, grep.
- 단위 테스트: PASS fixture / FAIL fixture (missing FROZEN prefix) / Sprint 1 dev doc dry-run.

**`scripts/lint/directive-tag-audit.ts`** (T4)
- CLI: `node --experimental-strip-types scripts/lint/directive-tag-audit.ts [<file>...]` (또는 `pnpm tsx ...`). 인자 생략 시 `.claude/commands/*.md` 전체.
- 알고리즘 (conservative):
  - `## 공통 헌법` 섹션 본문은 검사 제외 (형식 설명 산문이라 false-positive 폭증 위험).
  - 검출 케이스 (a): 인라인 백틱 또는 fenced 코드블록 안의 `SendMessage` 토큰 + directive 어휘 (`지시` / `강제` / `필수` / `MUST` / `DIRECTIVE`).
  - 검출 케이스 (b): bullet (`^- `) 안의 directive 어휘 + 인라인 코드 + `SendMessage` 토큰.
  - 검출된 줄/단락에 `[(DIRECTIVE|FROZEN) v\d{4}-\d{2}-\d{2} \S+]` 태그 부착 여부 검사.
  - 형식 placeholder (`[DIRECTIVE v<date> <id>]`) 는 정규식의 날짜 형식 요구로 자연 제외.
- exit 0 = PASS / exit 1 = 위반.
- 의존: node 20+ (`--experimental-strip-types`) 또는 tsx.
- 단위 테스트: PASS fixture (single role) / FAIL fixture (untagged directive) / `.claude/commands/*.md` dry-run.

**Lint 단위 테스트 harness** (T2/T4/T7 공통)
- 위치: `scripts/lint/__tests__/run-tests.sh`.
- fixture: `scripts/lint/__tests__/fixtures/{mockup-scope-parity.{table,target.{pass,fail}}.md, frozen-flag-audit.{pass,fail}.md, directive-tag-audit.{pass,fail}.md}`.
- 호출자: `scripts/receipt/sprint-2.sh` step 13 / 개발자 수동 실행.
- 결과: 9/9 케이스 PASS (현재).

## 8. Test Scenarios
*(라이브 갱신)*

### 8.1 Lint 3 종 + receipt — 9 단위 + 6 통합 케이스 (T2/T4/T7/T8 — tester)

| 케이스 | 입력 | 기대 | 검증 위치 |
|---|---|---|---|
| mockup PASS fixture | `mockup-scope-parity.table.md` + `target.pass.md` | exit 0 | run-tests.sh |
| mockup FAIL fixture | 동일 표 + `target.fail.md` (TimeLineScreen 미정의) | exit 1 | run-tests.sh |
| mockup Sprint 1 dry-run | Sprint 2 §7.1 표 + Sprint 1 dev doc | exit 0 | run-tests.sh / receipt step 10 |
| frozen PASS fixture | `frozen-flag-audit.pass.md` (3 bullet 모두 prefix) | exit 0 | run-tests.sh |
| frozen FAIL fixture | `frozen-flag-audit.fail.md` (1 bullet prefix 누락) | exit 1 | run-tests.sh |
| frozen Sprint 1 dry-run | Sprint 1 dev doc (T6 retrofit 후) | exit 0 | run-tests.sh / receipt step 11 |
| directive PASS fixture | `directive-tag-audit.pass.md` (코드블록 + 태그) | exit 0 | run-tests.sh |
| directive FAIL fixture | `directive-tag-audit.fail.md` (인라인 SendMessage + 필수 + 태그 X) | exit 1 | run-tests.sh |
| directive `.claude/commands/*.md` | 10 role md (헌법 inject 후) | exit 0 | run-tests.sh / receipt step 12 |
| receipt 헌법 inject | `.claude/commands/*.md` 10 파일 | 모두 `HOLD-DECIDE-RESUME` 박힘 | receipt step 9 |
| receipt mockup-scope | Sprint 1 dev doc | exit 0 | receipt step 10 |
| receipt frozen | Sprint 1 dev doc | exit 0 | receipt step 11 |
| receipt directive | `.claude/commands/*.md` | exit 0 | receipt step 12 |
| receipt lint harness | `scripts/lint/__tests__/run-tests.sh` | exit 0 (9/9) | receipt step 13 |
| receipt race regression | `e2e/scenarios/sprint-2-race-regression.md` 항목 ≥ 4 | grep 항목 = 5 | receipt step 14 |

**현재 상태**: 9 단위 + 6 통합 = 15 케이스 모두 PASS (메타-스프린트 dev mode `SKIP_SPRINT1_E2E=1`).
Sprint 1 e2e (단계 1-8) 는 Ollama 가동 필요 — `/end` 종단 receipt 실행 시 검증.

## 9. Demo Script

전제: macOS, Ollama UP (`brew services start ollama`), `gemma3:4b` 모델 로드, repo 루트에서 실행.

**Step 1 — 의존성 + 빌드**
```bash
pnpm install                                      # workspace 전체
pnpm -r test                                      # 53 단위 테스트 PASS
pnpm --filter @synapse/mobile run build           # web bundle 969 kB, exit 0
```

**Step 2 — Sprint 2 메타 단계 단독 검증 (Ollama 불요)**
```bash
SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-2.sh
# → step 9-14 PASS, "✅ Sprint 2 receipt PASSED"
```

**Step 3 — 종단 receipt (Ollama UP)**
```bash
bash scripts/receipt/sprint-2.sh
# step 1: pnpm install
# step 2: pnpm -r test (53)
# step 3: mobile build (969 kB)
# step 4: e2e single-shot ("안녕" → reply_len=22)
# step 5: e2e stream ("안녕" → chunks≥1 length≥1, 실측 chunks=10 length=22)
# step 6: latency_ms 적재 (실측 607-608 ms)
# step 7: COPY i18n (ok=6)
# step 8: SQLite rows (user=1 assistant=1)
# step 9: 헌법 inject (10/10)
# step 10: mockup-scope-parity (Sprint 1 dry-run)
# step 11: frozen-flag-audit (Sprint 1 17 결정)
# step 12: directive-tag-audit (10 role md)
# step 13: lint harness (9/9)
# step 14: race-regression (5 항목)
# → "✅ Sprint 2 receipt PASSED"
```

**Step 4 — 4 패턴 헌법 단독 시연**
```bash
# 헌법 박힘 검증 (10 파일)
grep -l "HOLD-DECIDE-RESUME" .claude/commands/*.md | wc -l    # 10
grep -L "HOLD-DECIDE-RESUME" .claude/commands/*.md | wc -l    # 0

# Sprint 1 §11 FROZEN prefix 검증
bash scripts/lint/frozen-flag-audit.sh docs/sprints/sprint-1-conversation-loop.md   # PASS

# Sprint 2 §11 FROZEN prefix 검증
bash scripts/lint/frozen-flag-audit.sh docs/sprints/sprint-2-agent-workflow-hardening.md   # PASS

# 목업 정합성 (Sprint 1 dry-run, dev doc §3 화면 별칭 ↔ Sprint 2 §7.1 표)
bash scripts/lint/mockup-scope-parity.sh docs/sprints/sprint-1-conversation-loop.md   # PASS

# directive 태그 누락 검출
node --experimental-strip-types scripts/lint/directive-tag-audit.ts   # PASS
```

**Step 5 — race-regression dry-run 시뮬**
`e2e/scenarios/sprint-2-race-regression.md` 의 5 항목을 PM/team-lead/워커 역할 분담으로 손으로 시뮬:
1. team-lead → 영향 워커 모두에 `HOLD pending PM [topic]` 발송
2. 워커가 dev doc 편집 / SendMessage 동결 (관찰: 메시지 큐 비어있음)
3. PM RESUME 후 directive 첫 줄 `[DIRECTIVE v<date> <id>]` 부착
4. 워커 inbox 메시지 ↔ dev doc [FROZEN] 마커 reconcile (충돌 시 행동 중단 + reconcile 요청)
5. dev doc 한 섹션 동시 편집 충돌 시 후입자 양보 + SendMessage 위임

## 10. Implementation Map

**Receipt 검증 결과 (2026-04-29, dev mode `SKIP_SPRINT1_E2E=1`)**: ✅ **PASS** (14/14 단계 중 9-14 신규 메타 단계 모두 통과). Sprint 1 e2e 1-8 단계는 Ollama 가동 시점에 `/end` 가 별도 검증.
- step 9 헌법 inject: 10/10 파일에 `HOLD-DECIDE-RESUME` 박힘.
- step 10 mockup-scope-parity (Sprint 1 dev doc dry-run): PASS.
- step 11 frozen-flag-audit (Sprint 1 dev doc): PASS — 17 결정 모두 `**[FROZEN v2026-04-29 D-<id>]**` prefix.
- step 12 directive-tag-audit (10 role md): PASS.
- step 13 lint 단위 테스트 harness: 9/9 PASS (mockup 3 + frozen 3 + directive 3, PASS+FAIL fixture 양쪽).
- step 14 race-regression 항목 검증: 5 ≥ 4, PASS.

**`scripts/lint/`** (T2/T4/T7, tester):
- `mockup-scope-parity.sh` (267 줄, bash + awk) — dev doc §3 In 의 화면 별칭 ↔ §7.1 `<!-- mockup-enum-table:start -->` 표 1:1 매칭. CLI: `bash scripts/lint/mockup-scope-parity.sh <dev-doc-path>`. env override: `MOCKUP_TABLE_DOC` 로 표 위치 변경.
- `frozen-flag-audit.sh` (97 줄, bash) — §11 Decisions Made bullet 의 `**[FROZEN v<date> <id>]**` prefix 검사. PM 사인오프 결정 미부착 0 → exit 0.
- `directive-tag-audit.ts` (171 줄, node `--experimental-strip-types`) — `.claude/commands/*.md` 의 `## 공통 헌법` 섹션 *제외* + SendMessage 인용 + directive 어휘(지시/강제/필수/MUST/DIRECTIVE) 검출 시 `[DIRECTIVE v<date> <id>]` 태그 누락 검사. conservative — SendMessage 인용 안의 directive 어휘 단락만 (false-positive 회피).
- `__tests__/run-tests.sh` + 7 fixture — 9/9 PASS.

**`scripts/receipt/sprint-2.sh`** (T8, tester, 93 줄):
- 1-8: Sprint 1 receipt 그대로 호출. `SKIP_SPRINT1_E2E=1` 환경변수로 Ollama 의존 단계 skip 가능 (메타-스프린트 dev mode).
- 9: 헌법 inject 검증. 10: mockup-scope-parity dry-run on Sprint 1. 11: frozen-flag-audit on Sprint 1. 12: directive-tag-audit on `.claude/commands/*.md`. 13: lint harness. 14: race-regression `^### 항목 ` 갯수 ≥ 4.
- 모든 단계 통과 → "✅ Sprint 2 receipt PASSED" + exit 0.

**`e2e/scenarios/sprint-2-race-regression.md`** (T9, tester, 108 줄):
- 5 항목 (HOLD 발송 / 동결 검증 / RESUME+DIRECTIVE / Reconcile / 단일 작성자 시간창) — `^### 항목 ` 헤더로 식별. dry-run 체크리스트.

**`.claude/commands/*.md`** (T3+T5, team-lead, 10 파일):
- 8 role + start + end 모두 *작업 규칙*/인터페이스 직후 `## 공통 헌법 (Sprint 2+ 적용)` 섹션 추가.
- 메모리 reference: `~/.claude/projects/-Users-kimsemin-Desktop-2026-Synapse/memory/feedback_decision_serialization.md` 1 회씩 (`grep -c` 검증).
- 4 패턴 요약 인라인 (HOLD-DECIDE-RESUME / Decision-version / Source-of-truth / 단일 작성자).
- `start.md`: §출력형식 직후 *공통 헌법* + */start 절차 보강 (Sprint 2+)* — PM 사인오프 *전* `mockup-scope-parity.sh` 호출 + 불일치 시 §11 Open Issue 자동 추기.
- `end.md`: §금지 직후 *공통 헌법* + */end 절차 보강 (Sprint 2+)* — 마감 직전 `frozen-flag-audit.sh` + `scripts/receipt/sprint-N.sh` 호출.

**Sprint 1 dev doc retrofit** (T6, team-lead):
- §11 Decisions Made 17 결정 모두 `**[FROZEN v2026-04-29 D-<id>]**` prefix 부착. decision-id naming = `D-<task-id>-<short-slug>` (예: `D-T1-colorsHex`, `D-T10-onboarding-A`).

**`apps/mobile/package.json`** (T10, mobile):
- `devDependencies` 에 `"@types/node": "^20.0.0"` 1 줄 추가. `pnpm install` 후 lockfile 자동 갱신. `pnpm --filter @synapse/mobile run build` exit 0 (회귀 없음). `tsconfig.json` 의 `"types": ["node", "expo"]` 그대로.

**메모리 영속화**:
- `feedback_decision_serialization.md` (Sprint 1 신규, Sprint 2 가 헌법 inject 의 단일 진실원으로 활용).
- `feedback_mockup_truth.md` (T12, designer 갱신 — Sprint 2 부터 lint 자동화 사실 추기).

**docs/**:
- `sprints/sprint-2-agent-workflow-hardening.md` — 본 문서 (라이브 갱신 + 마감).
- `sprints/sprint-1-conversation-loop.md` — §11 retrofit (FROZEN prefix 17 줄).
- `sprints/_current.txt` — `/end` 시 `3` 으로 갱신 예정.

**비변경 (검증)**:
- `packages/{protocol,storage,llm,conversation,engine,orchestrator,design-system}/src/` — 0 byte 변경.
- `apps/mobile/{src,app,components}/` — 0 byte 변경.
- 메타-스프린트 약속 그대로 지킴.

## 11. Decisions Made / Open Issues
**Decisions Made:**
- **[FROZEN v2026-04-29 D-S2-constitution-placement]** **헌법 inject 위치 = role md 본문 끝 `## 공통 헌법 (Sprint 2+ 적용)` 섹션 (frontmatter 외)**. 이유: (1) frontmatter YAML 에 markdown 4 패턴 + 메모리 reference 박으면 가독성/길이 압박. (2) `grep "HOLD-DECIDE-RESUME" .claude/commands/*.md` 검증은 본문 위치 무관. (3) start.md / end.md 도 동일 형식이라 일관성. (team-lead 결정.)
- **[FROZEN v2026-04-29 D-S2-directive-conservative]** **`directive-tag-audit.ts` 검출 패턴 = conservative — `## 공통 헌법` 섹션 제외 + SendMessage 인용 + directive 어휘(지시/강제/필수/MUST/DIRECTIVE) 가 *같은 줄/단락*** **에 있을 때만 검출.** false-positive 폭증 방지. 워커가 SendMessage 호출을 자유 산문으로 묘사하는 케이스는 미검출 — 합의된 보수성. Sprint 3+ 에서 false-negative 사례 발견 시 강화 후보 (carry-over 후보). (tester 결정 + team-lead 승인.)
- **[FROZEN v2026-04-29 D-S2-receipt-skip-flag]** **Sprint 2 receipt 의 Sprint 1 e2e 단계(1-8) 는 `SKIP_SPRINT1_E2E=1` 환경변수로 skip 가능 (메타-스프린트 dev mode).** Sprint 2 는 Ollama 의존 코드 변경 0 — 메타 단계(9-14) 만으로 자체 검증 충분. /end 가 Ollama 가동 후 1-8 까지 종단 검증. (tester 결정.)
- **[FROZEN v2026-04-29 D-S2-mockup-table-source]** **mockup-scope-parity 의 표 단일 진실원 = Sprint 2 dev doc §7.1 `<!-- mockup-enum-table:start -->` 블록 (디자인 목업/screens.jsx 직접 파싱 미채택).** 이유: (1) `screens.jsx` 는 React 컴포넌트라 정규식 추출 깨지기 쉬움, (2) designer 가 명시적으로 enum + 한국어 라벨 + 별칭을 정의하는 게 의도 보존, (3) env override `MOCKUP_TABLE_DOC` 로 다음 스프린트 표 위치 가능. designer enum 갯수 = 10 (목업 9 + DemoScreen). (designer + tester 합의.)
- **[FROZEN v2026-04-29 D-S2-decision-id-naming]** **decision-id 명명 규칙 = `D-<task-id>-<short-slug>`** (예: `D-T1-colorsHex`, `D-T10-onboarding-A`, `D-S2-constitution-placement`). sprint 내 unique. Sprint 2 자체의 결정은 `D-S2-<slug>`. (team-lead 결정, Sprint 1 retrofit 시 적용.)

**Open Issues:**
- *(없음. 본 sprint 의 모든 deliverable 통과.)*

## 12. Carry-over + Retrospective

**Carry-over (Sprint 3 가 반드시 알아야 할 것):**

### Sprint 3 즉시 적용
1. **모든 워커는 spawn prompt 0번 묶음에 4 패턴 헌법 박힘** (Sprint 2 가 헌법 inject 완료). `/start` 가 워커 spawn 시 자동 — 별도 작업 불필요. spawn prompt 작성 시 첫 번째 묶음(자기 역할 정의) 직전에 *공통 헌법* 블록 + 메모리 reference (`feedback_decision_serialization.md`).
2. **PM 결정 분기 직전 HOLD 1줄 발송 표준화** — team-lead 가 PM 결정 위임 *직전* 영향 워커 모두에 `HOLD pending PM [topic]` 발송. PM 답 받기 전 dev doc / SendMessage 동결. RESUME 직후 directive 첫 줄 `[DIRECTIVE v<date> <id>]` 박음.
3. **dev doc §11 PM 사인오프 결정에 `**[FROZEN v<date> <id>]**` prefix 박는다** — `/end` 가 `frozen-flag-audit.sh` 로 검증, 미부착 시 dev doc 마감 차단. decision-id 명명 = `D-<task-id>-<short-slug>` (Sprint 2 결정 D-S2-decision-id-naming).
4. **Sprint 3 §3 In 작성 직후 PM 사인오프 *전*에 `mockup-scope-parity.sh docs/sprints/sprint-3-*.md` 호출** — `/start` 절차 보강이 자동 호출. 불일치 시 §11 Open Issue 자동 추기. 단일 진실원 표는 Sprint 2 §7.1 (env override `MOCKUP_TABLE_DOC` 로 Sprint 3 dev doc 으로 이동시킬지 결정).

### Sprint 3 platform adapter 강제 (Sprint 1 carry-over 1번 그대로 살아있음 — 본 sprint 비대상이라 deferred)
5. **Storage 소비자 platform-adapter 패턴 강제** — Sprint 3 Memory Formation 도입 시 mobile 에서 `@synapse/storage` / `@synapse/engine` 등 native-only 모듈을 (간접적으로라도) 끌어들이는 모든 모듈은 `<feature>.{ts,web.ts}` 어댑터 짝 필수. 예: `apps/mobile/src/conceptStore.{ts,web.ts}` / `graphStore.{ts,web.ts}`. 위반 시 web bundle 빌드 실패로 receipt step 3 가 잡음.

### Sprint 7+ Polish 위임 (Sprint 1 carry-over 그대로 살아있음)
6. **synapse-pulse 토큰 미존재** — Sprint 3+ 에서 `motion.synapsePulse` 추가. 현재 Onboarding `app/onboarding/index.tsx` `PulseDot` 인라인.
7. **SynapseGlyph 자리표시** — Sprint 7 polish 에서 `react-native-svg` 도입.
8. **chatStore `@synapse/*` LSP 진단 노이즈** — Sprint 7 polish (혹은 더 일찍) `tsconfig.json` path mapping.

### 측정 후 회복 (Sprint 1 carry-over 8 — 본 sprint 통과 후 Sprint 3 receipt 헌법 강화 결정 보류)
9. **Receipt `chunks/length` 임계** — Sprint 1: 실측 `chunks=10 length=22 ms=594`, Sprint 2 종단 검증: `chunks=10 length=22 ms=608` (안정). 헌법 강화 (`≥ 2 AND ≥ 5`) 는 Sprint 3 receipt 가 통과하면 회복. 본 sprint 는 측정만 — receipt 코드 미수정.

### Sprint 2 신규 carry-over
10. **`directive-tag-audit.ts` 검출 패턴은 conservative** — `## 공통 헌법` 섹션 제외 + SendMessage 인용 + directive 어휘 단락만. 워커가 SendMessage 호출을 자유 산문으로 묘사하는 케이스 (예: "tester 에게 X 를 강제로 요청하라") 는 미검출. Sprint 3+ 에서 false-negative 사례 발견 시 강화 후보. 강화 시 `D-S2-directive-conservative` 결정의 trade-off 재평가.
11. **mockup 표 단일 진실원 = Sprint 2 §7.1** — Sprint 3 dev doc §3 In 의 화면 별칭 추출은 Sprint 2 §7.1 의 `<!-- mockup-enum-table:start -->` 표를 *그대로* 참조 (env override 미설정 시). 만약 Sprint 3 가 신규 화면을 추가하면 Sprint 2 §7.1 표를 *그 sprint 의 dev doc 으로 옮기지 말고* — Sprint 2 표를 *확장* 하거나 designer 가 Sprint 3 §7.1 에 새 표를 만들고 `MOCKUP_TABLE_DOC` 으로 참조 변경 (둘 중 designer 결정).
12. **메타-스프린트 dev mode skip flag** — `SKIP_SPRINT1_E2E=1` 패턴이 Sprint 2 receipt 에 도입됨. Sprint 3+ 가 Ollama 의존 단계 없을 가능성은 *낮음* (Concept 추출이 LLM 호출 의존) — Sprint 3 receipt 작성 시 skip flag 도입 여부 재평가.

### TaskList API 휘발성 (Sprint 1 회고 그대로 살아있음)
13. **TaskList API 가 sprint 도중 비어지는 케이스 재발생** — Sprint 2 종료 시점 (T11/T12 완료 직후) `TaskList` 호출이 "No tasks found" 반환. 작업 추적은 dev doc + 워커 보고 메시지에 의존하므로 큰 영향은 없었지만, Sprint 3 시작 시점에서도 동일 가능. 재발 시 워커 보고 + 파일 검증 fallback 으로 진행.

### 가정 보존
- Sprint 0 / Sprint 1 의 모든 다른 가정은 직전 스프린트 그대로 유지.
- DecisionAct enum / Concept / GraphEdge / RecallReason / RecallCandidate 모두 Sprint 3 에서 *처음으로 사용*. 시그니처는 engine 메모리 (`decision_orchestrator_enum.md`) + `packages/engine/src/types.ts` 동결.

**Retrospective:**

*잘 된 것*:
- **종단 receipt 14/14 PASS** — Sprint 1 e2e (chunks=10 length=22 ms=608) + Sprint 2 메타 (헌법 inject 10/10, lint 3 종 9/9, race-regression 5/5) 한 번에 통과. 메타-스프린트 약속(코드 변경 0) 그대로 지킴.
- **헌법 inject 의 단일 작성자 시간창** — team-lead 가 10 파일을 한 번에 inject, 워커는 dev doc 편집 동결. (A)/(B') 회귀 0.
- **/start 직후 정합성 점검 자동화** — designer 가 §7.1 enum 표 박고 → tester 가 mockup-scope-parity.sh 자동화 → /start 절차에 박음. Sprint 3 부터는 `/start` 가 PM 사인오프 *전* 자동 호출. Sprint 1 (A)/(B') 5중 timing collision 의 root cause 가 시스템 수준에서 봉쇄됨.
- **워크플로우 부채 → ROI** — Sprint 3+ Memory Formation / Recall / Hyper-Recall 처럼 결정 surface 가 큰 단계에서 race ripple 비용이 지수적이라는 PM 판단이 옳았음. 본 sprint 의 13 task 가 *모든* 후속 sprint 의 인프라.
- **단일 작성자 시간창 자체 적용** — `/end` 진입 시 team-lead 가 4 워커에 HOLD 발송 → dev doc §9-§12 마감 동안 충돌 0. 헌법이 자기 자신을 검증.

*아팠던 것*:
- **TaskList API 휘발성 재발생** — Sprint 1 회고에서 언급된 휘발성이 Sprint 2 종료 시점에서도 재발 (T11/T12 완료 직후 "No tasks found"). dev doc + 워커 보고로 fallback 가능했지만 root cause 미해결. Sprint 3+ carry-over 13.
- **directive-tag-audit conservative 보수성** — false-positive 회피를 위해 SendMessage 인용 + directive 어휘 단락만 검출. 자유 산문 케이스 미검출 — 합의된 보수성이지만 false-negative 표면이 남음. Sprint 3+ 에서 발견 시 강화 결정.
- **`screens.jsx` 직접 파싱 미채택** — designer 가 enum 명세를 *직접 작성* 하는 방식 (DemoScreen 추가). 목업 파일 자체의 변경에 lint 가 자동 동기화되지 않음 — designer 의 명시적 갱신 필요. Sprint 3+ 가 새 화면 추가 시 designer 가 Sprint 2 §7.1 표 (또는 자기 dev doc §7.1) 갱신.
- **mobile typescript 진단 노이즈** (Sprint 1 carry-over 5 그대로) — chatStore 의 `@synapse/*` 모듈 resolve 실패가 Sprint 2 동안에도 노출됨. 빌드/런타임/receipt 무관이지만 LSP UX 저하. Sprint 7 (혹은 더 일찍).

*다음에 다르게 할 것*:
- **Sprint 3 부터 4 패턴 헌법이 자동 적용** — 별도 sprint 없이 모든 sprint 가 본 sprint 의 인프라를 누림. 위반 시 receipt 가 잡음.
- **PM 결정 분기 진입 *직전* HOLD 1줄 표준화** — team-lead 의 의식적 행동을 *명시적 워크플로우 단계*로. carry-over 2번이 헌법 4 패턴 1번 (HOLD-DECIDE-RESUME) 의 *시점* 명시.
- **Sprint 3 receipt 작성 시 skip flag 패턴 재사용** — Ollama 의존 단계가 길어지면 dev mode 분리 (carry-over 12).
- **directive-tag-audit 강화 시점 = Sprint 3+ false-negative 발견 시** — 본 sprint 가 conservative 로 시작한 약속을 Sprint 3 가 그대로 받음. 발견되면 `D-S2-directive-conservative` trade-off 재평가.
