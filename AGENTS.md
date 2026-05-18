# AGENTS.md — Project Rules for AI Coding Agents

This file defines the rules, workflow, and artifact contracts for projects built
with **leo-agile-builder**. `CLAUDE.md`, `CODEX.md`, role prompts, and command
adapters must defer to this file when contracts overlap.

---

## 1. Operating Principles

Agents must apply these four principles on every sprint:

1. **Think before coding.** State assumptions. Surface ambiguity. Ask when the
   next step would otherwise invent scope.
2. **Simplicity first.** Build the smallest thing that satisfies the approved
   success criteria. Do not add speculative abstractions or features.
3. **Surgical changes.** Touch only files required by the sprint. Mention
   unrelated cleanup; do not perform it.
4. **Goal-driven execution.** Convert work into verifiable criteria, implement
   against them, and record the checks that were run.

See `docs/PRINCIPLES.md` for examples.

---

## 2. Project Rules

### Rule 1. Domain-Driven Organization

Organize code by domain first, then by layer. The default layers are:

| Layer | Responsibility |
|---|---|
| `domain` | Entities, value objects, aggregates, domain services. Pure business logic, no I/O. |
| `application` | Use cases and application services. Orchestrates domain objects and uses interfaces for infrastructure. |
| `infrastructure` | Persistence, external APIs, framework bindings, and implementations of application interfaces. |
| `interfaces` | HTTP, CLI, UI, or other external entry points. |

Domain terms belong in `docs/glossary.md`. PM proposes glossary additions in
`01-prd.md`; Developer applies approved additions when code introduces the term;
QA marks missing glossary updates as blocking.

### Rule 2. File-Header Annotations

Repo-authored source, test, commentable schema, and migration files must start
with an annotation header. Generated files, vendored files, lockfiles, binaries,
docs, sprint artifacts, and formats that cannot carry comments are excluded
unless the project defines a wrapper convention.

Required fields:

```text
@domain
@layer
@purpose
```

Annotation fields are registered in `docs/annotations.md`. New fields must be
added to the registry before use. Projects should enforce required annotations
through their lint/check pipeline; QA also verifies them.

### Rule 3. Sprint Memory and Sliding Window

Sprints persist artifacts under `.claude/state/sprints/`. Planning loads bounded
prior context using `.claude/config.json -> sprintHistory`.

Selection policy:

1. Load the `recentCount` most recent `completed` sprints.
2. The `/sprint-plan` main loop makes a first-pass domain estimate from the
   feature request, existing glossary, and prior sprint metadata. This estimate
   is only for context loading.
3. Also load older `completed` sprints whose `domain` or `tags` match the
   estimated domain.
4. Also load `completed` sprints whose `domain` or `tags` are in
   `alwaysIncludeDomains`.
5. Apply `tokenBudget` by dropping the oldest selected sprints first.

`aborted` and `in_progress` sprints are excluded unless the user explicitly asks
to inspect them.

### Rule 4. Language-Neutral Conventions

Each project chooses its own stack. The template only requires:

- Automated lint/format or equivalent checks.
- Required file-header annotations.
- Consistent DDD layer names within the project.
- No commented-out code.
- Tests for approved success criteria, written by Developer unless the design
  explicitly justifies why none are needed.

See `docs/CONVENTIONS.md`.

### Rule 5. Sprint Artifact Language

`/lang <language>` sets the project default artifact language in
`.claude/state/language.json`. New sprints copy that value into
`meta.json.language` during sprint creation. All human-readable sprint artifacts
and gate summaries must use `meta.json.language`; code identifiers, commands,
paths, and quoted source text remain unchanged. If the code is `match-user`, use
the language of `meta.json.feature_request`.

---

## 3. Sprint Workflow

Triggered by `/sprint <feature description>` in Claude Code, or by asking Codex
to run a sprint.

After creating sprint state, every sprint starts in the Plan phase and must stop
at Gate 1 before execution unless the user explicitly approves or waives the PRD
gate.

1. `/sprint-plan` creates or updates `01-prd.md`.
   - Gate: user approves, revises, or aborts the PRD.
2. `/sprint-execute` writes `02-design.md`, then Developer implements code,
   tests, glossary updates, and `03-implementation-notes.md`.
   - If Architect rejects the PRD, route back to `/sprint-plan`.
   - Gate: user approves, revises, or aborts the implementation.
3. `/sprint-review` writes `04-review.md`.
   - If implementation issues exist, route back to `/sprint-execute`.
   - If PRD/scope issues exist, route back to `/sprint-plan`.
4. `/sprint-retro` writes `05-retro.md` and finalizes `meta.json`.

The main loop appends gate feedback and route-back-to-Plan summaries to
`meta.json.revision_notes` and passes them to the next phase invocation.
Route-backs to `/sprint-execute` rely on `04-review.md` as the trace and are
not duplicated into `revision_notes`; this keeps execution feedback in the
review artifact instead of copying it into sprint metadata.
Each entry must use this shape:

```json
{
  "phase": "plan | execute | review",
  "at": "<ISO 8601 UTC timestamp>",
  "source": "gate | review | architect",
  "action": "revise | waive_open_question | route_back",
  "note": "<human-readable feedback or reason>"
}
```

Revising or re-executing overwrites the phase artifact; `01-prd.md`,
`02-design.md`, and `03-implementation-notes.md` must include a short
`Revision History` section when replacing prior content because of a gate
revision, route-back, or repeated phase run.
Loop-backs keep `meta.json.status` as `in_progress`.

---

## 4. Role Boundaries

| Role | Reads | Writes |
|---|---|---|
| PM | feature request, glossary, selected prior sprints, revision notes | `01-prd.md`; `meta.json.domain` |
| Architect | approved PRD, glossary, annotations, relevant files, review feedback if any | `02-design.md` |
| Developer | approved design, referenced files, glossary, annotations | code, tests, `docs/glossary.md`, `03-implementation-notes.md` |
| QA-Reviewer | PRD, design, implementation notes, changed files | `04-review.md` only |
| Main loop | all artifacts | initial `meta.json`; `05-retro.md`; `meta.json.status`; `meta.json.completed_at`; `meta.json.tags`; `meta.json.revision_notes` |

QA-Reviewer must not edit implementation code or tests. Missing tests for
approved success criteria are blocking. Optional follow-up tests are non-blocking
and should become retro action items.

Parallel Developer agents are allowed only when `02-design.md` emits a
`## Work Packages` section with strictly disjoint `Files:` sets. The main loop
merges partial implementation notes. Parallel Developers should be dispatched
as worktree-isolated background sessions via Claude Code Agent View
(`isolation: worktree` on the developer agent); the main loop is the only
writer of the canonical `03-implementation-notes.md`. Shared output files
(e.g., `docs/glossary.md`) must be assigned to exactly one WP. See
`docs/AGENT_VIEW.md`.

---

## 5. Artifact Contract

Each sprint directory has this shape:

```text
.claude/state/sprints/sprint-NNN-<slug>/
├── 01-prd.md
├── 02-design.md
├── 03-implementation-notes.md
├── 04-review.md
├── 05-retro.md
└── meta.json
```

`meta.json`:

```json
{
  "sprint_id": "sprint-001-add-login",
  "slug": "add-login",
  "domain": "auth",
  "tags": [],
  "language": {
    "code": "ko",
    "label": "Korean"
  },
  "status": "in_progress",
  "created_at": "2026-05-11T10:00:00Z",
  "completed_at": null,
  "feature_request": "<verbatim user input>",
  "revision_notes": [],
  "review_issue_counts": {}
}
```

Allowed `status` values:

- `in_progress`
- `completed`
- `aborted`

`tags` is an array of additional domain strings touched by the sprint, excluding
the primary `domain`, and is finalized by the main loop during retro. Sprint
numbers may skip when a sprint is aborted; the next sprint id is still one more
than the highest existing sprint number.
`language` is copied from `.claude/state/language.json` at sprint creation and
does not change unless the user explicitly revises that sprint's metadata.
`revision_notes` remains in `meta.json` after completion for auditability.
`review_issue_counts` maps blocking review issue ids to consecutive occurrence
counts during review loops, for example `{ "ISSUE-001-missing-login-test": 2 }`.
It resets after user revision, route-back to Plan, abort, or a new sprint.

Review issues must include stable ids, for example
`ISSUE-001-missing-login-test`, so repeated blocking issues can be counted
across review loops. QA assigns issue ids monotonically within a sprint and
keeps the same id for the same underlying defect across review loops. The
repeated-issue counter resets after user revision, route-back to Plan, abort, or
a new sprint.

Blocking Open Questions must also include stable sprint-scoped ids, for example
`Q-001-auth-provider`. Gate waivers record the question id in
`revision_notes.note` so execution can prove that a specific blocking question
was waived even if the wording changes later.

---

## 6. Pointers

- Sprint workflow: `docs/AGILE.md` *(legacy; Synapse uses sprint dev doc for similar guidance)*
- Code conventions: `docs/CONVENTIONS.md` *(legacy; Synapse uses memory system + per-package conventions)*
- Annotation registry: `docs/annotations.md`
- Glossary: `docs/glossary.md`
- Principle examples: `docs/PRINCIPLES.md` *(legacy; absorbed into §1)*
- Legacy sprint dev docs: `docs/sprints/sprint-{0..16}-*.md` (Sprint 0~16 영속 박물관)
- Legacy receipt scripts: `scripts/receipt/sprint-{1..15}.sh` (Sprint 16 마감 시점 동결)

---

## 7. Project-Specific Constitution (Synapse)

Sprint 17 부터 leo-agile-builder workflow 위에 얹는 Synapse 전용 규약.
기존 16 sprint 의 dev doc + 메모 시스템에서 검증된 10 개 규약을 영속 보존.

### 7.1 PM = User = QA

사용자가 PM 역할을 직접 수행. Gate 1 (PRD 승인) + Gate 2 (구현 승인) 는 사용자의 명시 승인 필수.
외부 데이터 수집은 영구 보류 — 사용자 본인 QA 가 검증을 대체 (Sprint 8~16 의 branch=C inheritance-cleanup 패턴 종결).

**근거**: 사용자 결정 (Sprint 16 결정 = D-S16-external-data-permanent-defer).

### 7.2 origin/main 동기화 의무

매 squash merge 직후 `git push origin main` 필수. Agent View isolation=worktree 의 base 가 origin/main 이므로 push 누락 시 worktree stale → no-op 회귀.

**근거**: Sprint 10/11/12 3 연속 no-op 사례 (메모 `feedback_origin_main_sync.md`).

### 7.3 HOLD-DECIDE-RESUME (결정 직렬화)

PM 결정 분기가 있을 때 모든 워커가 HOLD → PM 결정 → Decision-version 태그 부여 → RESUME. stale 메시지 + 다중 작성자 race 방지.

leo workflow 에서는 `meta.json.revision_notes` 의 `phase` + `at` + `source` + `action` 4-튜플 이 직렬화를 대신. revision_notes 엔트리 추가 시 모든 후속 phase 가 그 시점 이전 상태를 가정하지 않도록 강제.

**근거**: Sprint 6~8 race 회피 패턴 (메모 `feedback_decision_serialization.md`).

### 7.4 Root Index Export 검증 (grep 의무)

새 export 를 패키지에 추가하면 두 위치 모두 grep:
```bash
grep -n "<NEW_EXPORT>" packages/<pkg>/src/index.ts
grep -n "<NEW_EXPORT>" packages/<pkg>/index.ts
```

src/index.ts ≠ root index.ts. 누락 사례 4회 회귀 (Sprint 5/6/8/10). Developer 가 `03-implementation-notes.md -> Verification performed` 에 두 grep 결과 둘 다 기록.

**근거**: 메모 `feedback_root_index_grep.md`.

### 7.5 Receipt 임계 보수적 시작

정량 임계 (chunks/length/latency/count) 는 ≥ 1 로 시작, 연속 receipt 통과 후 헌법 권장값으로 회복. 첫 sprint 부터 N≥3 / 임계 ≥ 10 강제 금지.

**근거**: 메모 `feedback_receipt_threshold.md` (Sprint 1~3 임계 회복 패턴).

### 7.6 헌법 7 옵션 (a) Consumer-Driven 자가판단

producer 패키지의 union/type 1줄 확장이 consumer 의 명백한 요구일 때 (4 조건 충족):
- Frozen 시그니처 아님
- 1줄 추가만 (수정/삭제 없음)
- Consumer 가 코드로 즉시 사용 가능
- PM directive 없음

Consumer 워커가 직접 producer 파일 1줄 추가 + ack 통보. PM 결정 대기 없이 자가판단.

**근거**: Sprint 8 mobile T5 first 사례 (메모 `feedback_constitution7_option_a_self_judgment.md`).

### 7.7 "박다" 용어 사용 금지

코멘트 / 보고 / dev doc / directive / 메시지 어디든 "박다 / 박았음 / 박음" 표현 0건. 대체: 추가 / 작성 / 기록 / 확정 / 보존.

**근거**: Sprint 9 PM directive (메모 `feedback_no_pakda_term.md`).

### 7.8 사전 점검 의무 (`/sprint-plan` 진입 시)

- `git rev-parse main == git rev-parse origin/main` 동기화 확인
- 이전 sprint receipt 단독 PASS 확인 (`pnpm -r test` 무회귀)
- 신규 sprint 의 `meta.json` 작성 직후 `.claude/state/sprints/sprint-NNN-<slug>/` 권한 확인

**근거**: Sprint 13~15 의 사전 점검 §1~§3 패턴.

### 7.9 Frozen 시그니처 보존

다음 시그니처는 변경 절대 금지 (변경 시 PRD 의 Open Questions Blocking 으로 분리):
- `DecisionAct` enum (`silence` / `ghost` / `suggestion` / `strong`) — `packages/orchestrator/`
- `dedupConcepts` 7 시그니처 토큰 — `packages/engine/src/dedupConcepts.ts:1-100` (FROZEN 마커 v2026-05-18 D-S15-dedup-signature)
- `0007_pii_session_hash.sql` 컬럼 3종 + 인덱스 3종 — `packages/storage/schema/` (DIRECTIVE 마커 D-S15-pii-0007-shape)

**근거**: Sprint 3 (DecisionAct) / Sprint 15 (dedup / PII) 의 frozen 결정.

### 7.10 Sprint 17+ Receipt 단독 실행

Sprint 17 부터 receipt 는 `.claude/state/sprints/sprint-NNN-<slug>/receipt.sh` 단독 실행. **wrap cascading 제거.** 기존 `scripts/receipt/sprint-{1..15}.sh` 는 Sprint 16 마감 시점 동결.

회귀 검증이 필요한 경우 (옵션):
```bash
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-15.sh
```

**근거**: Receipt cascading 비대화 (Sprint 9 65 단계 → Sprint 14 71 단계). 단독 실행으로 매 sprint 의 검증 격리.

---

## 8. Legacy → leo Migration Summary

| 구 시스템 (Sprint 0~16) | 신 시스템 (Sprint 17+) |
|---|---|
| `docs/sprints/sprint-N.md` 단일 파일 12 섹션 | `.claude/state/sprints/sprint-NNN-<slug>/` 안 5 파일 (01-prd ~ 05-retro) + meta.json |
| 7 워커 (`.claude/agents/{conversation,designer,engine,mobile,orchestrator,storage,tester}.md`) | 4 역할 (`.claude/agents/{pm,architect,developer,qa-reviewer}.md`) |
| `scripts/receipt/sprint-N.sh` wrap cascading | `.claude/state/sprints/sprint-NNN/receipt.sh` 단독 실행 |
| `/start` `/end` (Sprint 13 폐지) → `claude agents` 직접 dispatch | `/sprint <feature>` 자동 5단계 + Gate 1/2 |
| PM 단독 큐레이션 (워커 4줄 transcript) | PM = User 명시 승인 + revision_notes 자동 기록 |
| branch=C inheritance-cleanup (Sprint 8~16 10 연속) | 외부 데이터 영구 보류, 매 sprint 신규 PRD |
| 메모 시스템 13 항목 헌법 | 본 AGENTS.md §7 (10 항목 + 메모 인덱스 참조) |

### Deprecated 자산 / 패턴 (Sprint 17+ 신규 도입 금지)

| 자산 | 폐지 시점 | 대체 |
|---|---|---|
| `team-leader` 식별자 | Sprint 13 | PM = User + 4 역할 (pm/architect/developer/qa-reviewer) |
| `/start` / `/end` 슬래시커맨드 | Sprint 13 | `/sprint <feature>` 자동 5단계 |
| `7 워커 구조` (`.claude/agents/*.md` 7 파일) | Sprint 15 SUPERSEDED + Sprint 16 P0 폐지 | 4 역할 + Developer 의 7 도메인 메가화 |
| `LEGACY_WRAP_FAIL_TOLERATED` 환경변수 | Sprint 15 T1 영구 제거 | receipt cascading 단절 (Sprint 17+ 단독 실행) |
| `"박다" / "박았음" / "박음"` 표현 | Sprint 9 PM directive | 추가 / 작성 / 기록 / 확정 / 보존 |
| `branch=C inheritance-cleanup` | Sprint 17 종결 | 외부 데이터 영구 보류 + 사용자 본인 QA |

### Mobile Theme-Aware 패턴 (Synapse 영속 규약)

apps/mobile/ 안에서 `colorsHex.light.*` 직접 참조 **금지**. 모든 screen / component 는 `useTheme()` 훅으로 effectiveTheme 기반 ThemeColors 사용. 자세한 패턴은 [`.claude/agents/developer.md`](.claude/agents/developer.md) 의 "Mobile Theme-Aware 패턴" 섹션.
