# Sprint 11 — External Data Arrival

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`
>
> **Reincarnation note**: 본 §1~§2 raw text 는 Sprint 10 §1~§2 의 1:1 복제 (Sprint 10 §10 Implementation Map 명시). Sprint 10 = no-op close 영구 확정 (외부 데이터 N=0). 본 sprint 시작 trigger = PM 외부 모집 트랙 raw 세션 N≥3 도착. trigger 미충족 시 Sprint 10 patterns (no-op close → §12 carry-over + Sprint 12 reincarnation) 직접 적용 — 시간축 분리 패턴 네 번째 정합 사례.
>
> **식별자 swap**: `/start` PM 사인오프 후 §3 Scope 확정 시 D-S10-* → D-S11-* 식별자 swap. 본 skeleton 단계에서는 raw text 보존 위해 D-S10-* 그대로 두되, §3 운영 모드 (branch=A active / branch=B no-op close) 결정과 함께 swap.

## 1. Goal

PM 외부 모집 트랙 raw 세션 N≥3 도착 시점에 시작 — Sprint 8/9 의 외부 검증 인프라 (consent-form / session-guide / PII 정책 / telemetry schema 0006 / mobile telemetryStore / 만족도 UI / receipt 인프라 65 단계) 활용해 외부 데이터 분석 리포트 (`docs/sprints/sprint-11-data/index.md`) 생성 + **Sprint 9 의 5종 보류 frozen (`D-S9-{theme-toggle, empty-error-copy, concept-dedup, recall-log-retention, negation-classifier}-decision`) + 1종 A안 reconfirm (`D-S9-inspector-unlink-recheck`) 을 *실제 데이터 기반* 갱신 + 분기별 본체 작성** (Sprint 9 carry-over 2 의 6 분기 활성 경로 모두 PM 사인오프 후 진행). Sprint 8 carry-over 14 의 시간축 분리 패턴의 네 번째 정합 사례 후보 (Sprint 8 close A first → Sprint 9 close B C-revised second → Sprint 10 no-op close third → Sprint 11 active or no-op fourth).

## 2. Deliverable & Receipt

**Deliverable:**

- **외부 테스터 N≥3 × M≥2 세션 데이터 수집 완료** — Sprint 9 인프라 영구 보존 활용 (consent-form §5 서명 + session-guide §2~7 자유 사용 + export 채널). `docs/sprints/sprint-11-data/raw/<session-hash>.json` 채널. PII 정책 (`sprint-8-pii-policy.md`) Rule 1~5 적용.
- **외부 데이터 분석 리포트 신규** — `docs/sprints/sprint-11-data/index.md`. Sprint 8 의 N=0 리포트 + Sprint 9 의 N=0 reconfirm + Sprint 10 의 no-op close 영구 보존 위에 신규 N≥3 리포트. 6종 집계 지표 실측값 (recall hit rate / dismiss 빈도 / retraction 빈도 / Concept dedup 신호 / recall_log retention 신호 / negation classifier miss 사례 / 만족도).
- **Sprint 9 5종 보류 frozen 갱신** — §11 `[FROZEN v<date> D-S11-{theme-toggle, empty-error-copy, concept-dedup, recall-log-retention, negation-classifier}-decision = {채택 / heuristic / LLM도입 / B안 / ...}]` 5종 갱신 (외부 데이터 신호 기반 결정).
- **D-S9-inspector-unlink-recheck reconfirm 재검증** — 외부 데이터에서 *recall 거절 동작 부족* 신호 검출 시 B안 (`D-S11-inspector-unlink-recheck = B안 채택`) 적용. 신호 부재 시 A안 reconfirm 재확정.
- **6 분기 본체 작성 (채택 분기별)**:
  - **dedup 채택**: engine `dedupConcepts.ts` dormant 활성화 — `tsc --strict` 진단 22건 일괄 해소 + storage adapter wiring + threshold 튜닝. 외부 데이터 신호 = graph 의 동일 의미 다른 표면 토큰 빈도. 헌법 10 dormant 4 조건 정합.
  - **negation-classifier 채택**: engine `negationClassifier.ts` 본체 + `__tests__/negation-classifier.test.ts` + conversation `loop.ts` 옵션 함수 DI + `loop-negation-classifier-wiring.test.ts` + 양 root export `ClassifyNegationFn` (engine + conversation 동시 PR, race 0).
  - **retention 채택**: storage `0007_recall_log_retention.sql` migration + retention cron / column 정책 + 단위 테스트. 시그니처 동결 정합 (추기 only).
  - **theme-toggle 채택**: designer 가 `디자인 목업/content.jsx` 갱신 + `copy.theme.{light,dark,system}` 키 추가 + verify-copy 임계 상향 + mobile theme-toggle UI mount.
  - **empty-error-copy 채택**: designer 가 디자인 목업 갱신 + `copy.{inspector,library}.empty.*` 키 + 임계 상향 + mobile inspector/library 분기 카피.
  - **inspector-unlink B안 채택**: designer DismissButton variant 'unlink' + `copy.unlink` + Inspector 슬롯 + mobile mount.
- **헌법 9~12 영구 보존 회귀** — Sprint 9/10 시점 8 워커 정의 line 9~12 raw text 그대로 보존 (workers_with_constitution=8 회귀 PASS).
- **fixture 토큰 boundary 정책 6번째 룰 추가 검토** (Sprint 9 carry-over 5 / Sprint 10 carry-over 3 항목) — `D-S8-tester-fixture-strict-matching` 정책 5종에 6번째 룰 ("정책 자체 라인 패턴 컨텍스트 인식 제외 의무") 추가 결정.

**Receipt (자동 검증 가능한 형태):**

- `bash scripts/receipt/sprint-11.sh` exit 0 + "✅ Sprint 11 receipt PASSED"
- Sprint 9 65 단계 wrap (`SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환)
- 신규 5~7 단계:
  1. **외부 데이터 N≥3 실측** — `docs/sprints/sprint-11-data/raw/` 디렉토리 N≥3 raw 세션 파일 + `index.md` 6종 지표 실측값 raw text 검증.
  2. **D-S11-* 6종 결정 갱신 frozen** — §11 `[FROZEN v<date> D-S11-*]` 6종 (5 보류 갱신 + 1 unlink reconfirm/B안). frozen-flag-audit lint exit 0.
  3. **분기별 본체 작성 검증** (채택 분기에 한해):
     - dedup 채택 시: `dedupConcepts.ts` strict 진단 0 + 단위 테스트 PASS + caller wiring grep.
     - negation-classifier 채택 시: engine + conversation 양 root export `ClassifyNegationFn` + 단위 테스트 PASS.
     - retention 채택 시: `0007_recall_log_retention.sql` + 단위 테스트 PASS.
     - theme-toggle / empty-error / unlink 채택 시: 디자인 목업 갱신 + copy 키 + verify-copy 임계 상향 + mobile mount.
  4. **Sprint 9 회귀 wrap** — 65 단계 그대로 PASS (Sprint 4: 32 + 5: 8 + 6: 6 + 7: 7 + 8: 7 + 9: 5).
  5. **헌법 9~12 8 워커 정의 보존 회귀** — Sprint 9 의 헌법 9~12 raw text 그대로 유지 (workers_with_constitution=8).
- 임계 보강 (D-S11-receipt-threshold-recovery) — Sprint 9 의 65단계 위에 신규 `external_session_count ≥ 3` (강제, branch=A 만) + `decisions_updated_from_S9 ≥ 5` + `pakda_term_count = 0` 보존.

## 3. Scope

> **운영 모드: no-op close (branch=B)** — PM 사인오프 게이트에서 GO branch=B 확정 (외부 raw 세션 N=0, `docs/sprints/sprint-11-data/` 디렉토리 부재). /start 가 PM 사인오프 직후 §3 In/Out 만 확정 → 워커 dispatch 0건. /end 가 §10 변경 0건 마감 + §11 3 frozen 추가 + §12 carry-over 영속화 + Sprint 12 skeleton 생성. **시간축 분리 패턴 네 번째 정합 사례 영구 확정** (Sprint 8 (A) first / 9 (B) C-revised second / 10 (no-op) third / 11 (no-op) fourth).
>
> §1 Goal / §2 Receipt 의 raw text 는 그대로 보존 (Sprint 10 §1~§2 의 1:1 복제 유지) — Sprint 12 가 reincarnation 으로 이어받음. D-S10-* → D-S11-* 식별자 swap 은 no-op close 정합으로 §11 frozen 식별자에만 적용.

**In:**

- **dev doc 마감 영속화** — §3 In/Out 확정 (/start) + §10 Implementation Map (변경 0건 raw text) + §11 3 frozen (`D-S11-{no-op-close, receipt-script-deferred, decisions-frozen-deferred}`) + §12 carry-over (Sprint 12 reincarnation + Sprint 10 carry-over 10 항목 그대로 이월 + 신규 항목) + retrospective. /end 작성.
- **Sprint 12 skeleton 생성** — `docs/sprints/sprint-12-external-data-arrival.md` (template copy + Goal/Deliverable/Receipt/Scope 초안). Sprint 11 §1~§2 raw text 그대로 복제 + carry-over 추가 항목. /end 작성.
- **`SPRINTS.md` 행 11 ⚠ no-op + 행 12 추가** + `_current.txt` → `12`. /end 작성.
- **회귀 검증 영속화** — Sprint 9 receipt 65/65 PASS + 모노레포 437 PASS 기록 (Sprint 10 마감 시점 회귀와 동일 결과 확인).

**Out:**

- **모든 코드 영역 변경 0** — packages/{storage, engine, conversation, orchestrator, design-system, protocol, llm} + apps/mobile + e2e + scripts/receipt 변경 0건. dev doc §4~§9 빈 칸 그대로 (no-op close 정합).
- **`scripts/receipt/sprint-11.sh` 미작성** + **`docs/sprints/sprint-11-data/` 미생성** + fixture 5종 미작성 — Sprint 12 활성 경로 이월.
- **D-S9-* 6 frozen 재갱신 0건** — 5종 보류 (theme-toggle / empty-error-copy / concept-dedup / recall-log-retention / negation-classifier) + 1종 A안 reconfirm (inspector-unlink-recheck) 그대로 보존. Sprint 12 trigger inline 그대로.
- **DecisionAct enum 4원 + runMemoryFormation / runRecallHook / RecallFn / DecideFn / chatStore 기존 메서드 시그니처 + storage migration 0001~0006 + protocol DecisionLogAction union 9종 + 헌법 1~12 = 영구 동결** 그대로 (Sprint 10 carry-over 그대로).
- **외부 데이터 N≥3 수집 / 6 분기 활성 경로 본체 작성** — Sprint 12 (외부 데이터 도착 시) 이월.
- **신규 화면 / 신규 패키지 / e2e 시나리오 신규 추가** — 그대로 유지. 7 패키지 + 9 화면 그대로.
- **워커 dispatch** — 8 워커 (storage / engine / conversation / orchestrator / designer / mobile / tester / llm) dispatch 0건. `.claude/worktrees/` 디렉토리 미생성. /start §7 리포트 디렉토리 (`docs/sprints/sprint-11/reports/`) 미생성.

## 4. Architecture & Data Flow
<텍스트 다이어그램 / 데이터 흐름 / 관여 패키지>

## 5. File Ownership
| Agent | Tier | Files |
|---|---|---|
| | | |

> **Tier 정의** (Sprint 11+, Agent View 단계별 dispatch 용):
> - **Tier 1 (producer-only)**: 다른 워커가 의존하는 영향력 있는 변경 — protocol 타입, storage 마이그레이션, design tokens breaking change. 동시 dispatch OK (서로 충돌 안 함).
> - **Tier 2 (의존 + 자체 export)**: Tier 1 결과를 import 하면서 자기도 새 export 제공 — engine / conversation / orchestrator 의 일반 슬라이스.
> - **Tier 3 (소비자만)**: 모든 producer 결과를 consume — mobile UI, tester e2e.
>
> `/start` 가 Tier 1 dispatch → 모두 Completed → main squash merge → Tier 2 dispatch → … 순으로 진행. 헌법 5 (Consumer 사전 진단) / 헌법 6 (Root index grep) 의 grep 기준점이 자동으로 최신 main 보장.

## 5.5 Worker Slices
<!-- 워커 슬라이스 본문. /start 가 sed 로 추출해 dispatch prompt 에 결정적 주입.
     워커가 dispatch 대상이 아니면 해당 slice 블록 통째 생략. -->

## 6. Tasks
| ID | Description | Owner | Tier | Blocked By |
|---|---|---|---|---|
| | | | | |

## 7. Interfaces / Contracts
<함수 시그니처, 메시지 타입, 패키지 경계 — 책임 에이전트가 결정될 때마다 추기>

## 8. Test Scenarios
<디자인 목업/기획서 인용 시나리오 + 자동화 위치 (`e2e/scenarios/...`)>

## 9. Demo Script
<step-by-step 시연 스크립트 — receipt 재현용>

## 10. Implementation Map

### team-leader (no-op close 마감 + receipt 인프라 긴급 통합 수정)
- `docs/sprints/sprint-11-external-data-arrival.md` §3 In/Out 확정 (/start 단계, branch=B no-op close raw text) + §10 + §11 (4 frozen + Open Issues) + §12 (10 carry-over + retrospective) 마감. §4~§9 빈 칸 그대로 (no-op close 정합).
- `docs/sprints/sprint-12-external-data-arrival.md` skeleton 신규 — Sprint 11 §1~§2 raw text 그대로 복제 (reincarnation, 두 번째 reincarnation 사례) + Scope 초안.
- `SPRINTS.md` 행 11 ⚠ no-op partial + 행 12 추가 + 한 줄 결과 갱신.
- `docs/sprints/_current.txt` → `12`.

### Receipt 인프라 긴급 통합 수정 (D-S11-receipt-infra-hotfix, 5 파일 swap)
- `scripts/receipt/sprint-2.sh` step [9/14] 헌법 inject 검증 target → `.claude/agents/*.md + .claude/commands/{start,end}.md` 결합 = 10 파일 (기존 `.claude/commands/*.md /10` stale).
- `scripts/lint/directive-tag-audit.ts:33` `COMMANDS_DIR` → `.claude/agents` swap + header docstring 갱신.
- `scripts/lint/__tests__/run-tests.sh:79` dry-run 라벨 `.claude/commands/*.md` → `.claude/agents/*.md`.
- `scripts/receipt/.receipt-runner/sprint7-contract-gap-policy.mjs:21` `COMMANDS_DIR` → `.claude/agents` swap (8 워커 spawn prompt raw text 검사).
- `scripts/receipt/.receipt-runner/sprint9-pakda-term-zero.mjs:152` `.claude/commands/${w}.md` → `.claude/agents/${w}.md` swap (헌법 9~12 추기 영역 박힘 검사).
- `scripts/receipt/.receipt-runner/sprint9-spawn-prompt-update.mjs:47` `.claude/commands/${w}.md` → `.claude/agents/${w}.md` swap (헌법 9~12 raw text 4 종 검사).
- **공통 root cause**: commit `c460712 chore: gitignore .claude/ (agent runtime files)` (2026-04-29) 이 10 워커 정의 파일을 `.claude/commands/` 에서 삭제 (gitignored) 하고 `.claude/agents/` 8 파일 (워커) + `.claude/commands/` 2 파일 (start/end) 구조로 swap 했으나 receipt/lint 자산이 미갱신. Sprint 9~10 마감 시 마크된 "Sprint 9 receipt 65/65 PASS" 는 stale (실제로는 step [9/14] / [53/53] / [61/65] / [62/65] 4 fail).
- **사후 효과**: Sprint 9 receipt 65/65 PASS 재실측 (수정 후) + Sprint 10/11 마감 마크 신뢰도 회복.

### 코드 영역 변경 0 (no-op close 정합)
- `packages/storage/` — Sprint 9 그대로 보존 (telemetry schema 0006 + repo 모듈 + protocol union). 0007_recall_log_retention.sql 미작성 (D-S9-recall-log-retention-decision = 보류 그대로).
- `packages/engine/` — Sprint 9 그대로 보존. `dedupConcepts.ts` 175줄 + 17/17 단위 테스트 + root export = dormant 그대로 (`tsc --strict` 진단 22건 보류 그대로). `negationClassifier.ts` 본체 미작성 (D-S9-negation-classifier-decision = 보류 그대로).
- `packages/conversation/` — Sprint 9 그대로 보존. `loop.ts` 옵션 함수 DI 미추기 (D-S9-negation-classifier-decision = 보류 그대로).
- `apps/mobile/` — Sprint 9 그대로 보존. `themeStore` 시스템 자동 디폴트 / inspector·library 분기 카피 / Inspector unlink 슬롯 미추기 (D-S9-{theme-toggle, empty-error-copy}-decision = 보류 + D-S9-inspector-unlink-recheck = A안 reconfirm 그대로).
- `packages/design-system/` — Sprint 9 그대로 보존. `copy.theme.*` / `copy.{inspector,library}.empty.*` / `copy.unlink` 미추기. 디자인 목업 갱신 0건. verify-copy 임계 그대로.
- `packages/orchestrator/` — Sprint 9 그대로 보존. 시그니처 동결 + 임계 6종 그대로.
- `scripts/receipt/sprint-11.sh` 미작성 + `docs/sprints/sprint-11-data/` 미생성 + fixture 5종 미작성 (D-S11-receipt-script-deferred 정합).

### 회귀 검증 (no-op close 마감 직전)
- **Sprint 9 receipt 65/65 PASS** (`SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-9.sh` exit 0 + "✅ Sprint 9 receipt PASSED"). spawn_prompt_update_pass=1 / workers_with_constitution=8 / pakda_term_zero_pass=1 / pakda_term_count=0 / decisions_re_frozen_pass=1 / frozen_decisions_updated=5 / sprint10_trigger_marks=5 / inspector_unlink_reconfirm_pass=1 / reject_layer_marks=2 / sprint10_b_marks=1 / sprint_8_wrap_pass=1 / sprint_8_fixtures=7.
- **모노레포 437 PASS** (`pnpm -r test`): protocol 22 + llm 6 + engine 103 + storage 85 + design-system 107 + orchestrator 59 + conversation 52 + e2e 3. mobile = skip (정책). Sprint 10 마감 시점 437 PASS 와 동일.
- **frozen-flag-audit lint exit 0** (Sprint 11 dev doc 대상, 마감 직전 사전 검증).
- **mockup-scope-parity lint exit 0** (Sprint 11 dev doc 대상).
- 헌법 1~12 8 워커 정의 line 9~12 보존 회귀 PASS (workers_with_constitution=8).

### Sprint 12 skeleton (생성)
- `docs/sprints/sprint-12-external-data-arrival.md` — `_template.md` 복사 + §1 Goal (Sprint 11 §1 그대로 복제, reincarnation 두 번째) + §2 Deliverable & Receipt (Sprint 11 §2 그대로 복제 + Sprint 9 wrap 65 단계로 정합) + §3 Scope 초안 (다음 /start 시 PM 사인오프 후 확정).

## 11. Decisions Made / Open Issues

**Decisions Made:**

- **[FROZEN v2026-05-12 D-S11-no-op-close]** Sprint 11 운영 모드 = no-op close 영구 확정. 사유: PM 외부 모집 트랙 raw 세션 N=0 (`docs/sprints/sprint-11-data/` 디렉토리 부재) + PM 사인오프 게이트에서 GO branch=B 명시. /start 가 §3 In/Out 만 확정 → 워커 dispatch 0건. /end 가 §10/§11/§12 마감 + Sprint 12 reincarnation skeleton 생성. **시간축 분리 패턴 네 번째 정합 사례 영구 확정** (Sprint 8 (A) first / 9 (B) C-revised second / 10 (no-op) third / 11 (no-op) fourth). 코드 영역 변경 0건 (단, D-S11-receipt-infra-hotfix 는 receipt 인프라 stale 해소 별개 분기). Sprint 10 carry-over 10 항목 그대로 Sprint 12 이월. revert 비용: Sprint 12 가 Sprint 11 §1~§2 raw text 그대로 복제 + 외부 데이터 도착 시점에 PM 사인오프 후 진행.

- **[FROZEN v2026-05-12 D-S11-receipt-script-deferred]** `scripts/receipt/sprint-11.sh` 미작성 + `docs/sprints/sprint-11-data/` 디렉토리 미생성 + fixture 5종 미작성 영구 확정. 사유: no-op close 정합 (sprint 작업 본체 0건이므로 receipt 자체 무의미). Sprint 12 활성 경로에서 `scripts/receipt/sprint-12.sh` 신규 작성 (Sprint 9 65 단계 wrap + 신규 5~7 단계). revert 비용: Sprint 12 sprint-12.sh 작성 cost 와 동일 (≈ 30분 ~ 1시간).

- **[FROZEN v2026-05-12 D-S11-decisions-frozen-deferred]** D-S9-* 6 frozen (5종 보류 + 1 reconfirm) 그대로 보존 + 재갱신 0건 영구 확정. 사유: no-op close 정합. Sprint 9 §11 의 `[FROZEN v2026-04-30 D-S9-{theme-toggle, empty-error-copy, concept-dedup, recall-log-retention, negation-classifier}-decision = 보류]` 5종 + `[FROZEN v2026-04-30 D-S9-inspector-unlink-recheck = A안 reconfirm]` 1종 그대로 raw text 보존. Sprint 12 trigger inline 그대로 (외부 데이터 도착 시 6종 일괄 갱신). revert 비용: Sprint 12 §11 신규 D-S12-* 6종 frozen 작성 (≈ 5분).

- **[FROZEN v2026-05-12 D-S11-receipt-infra-hotfix]** Sprint 11 /end 회귀 검증 단계에서 발견된 receipt/lint 인프라 stale 참조 5 파일 일괄 swap 영구 확정 (PM 사인오프 A1 후 team-leader 단독 통합 수정). 사유: commit `c460712` (2026-04-29) 가 워커 정의 파일을 `.claude/commands/` → `.claude/agents/` 구조로 swap 했으나 receipt/lint 자산 (`scripts/receipt/sprint-2.sh` step [9/14] / `scripts/lint/directive-tag-audit.ts` / `scripts/lint/__tests__/run-tests.sh` / `scripts/receipt/.receipt-runner/sprint7-contract-gap-policy.mjs` / `scripts/receipt/.receipt-runner/sprint9-pakda-term-zero.mjs` / `scripts/receipt/.receipt-runner/sprint9-spawn-prompt-update.mjs`) 5 파일 미갱신. Sprint 9~10 마감 시 "Sprint 9 receipt 65/65 PASS" 마크는 실제 실행 시 step [9/14] / [53/53] / [61/65] / [62/65] 4 단계 fail (stale path) — 즉 마감 마크 stale. Sprint 11 /end 가 first 실측으로 catch + fix. 수정 후 Sprint 9 receipt 65/65 PASS 재실측 + Sprint 10/11 마감 마크 신뢰도 회복. /end 의 "긴급 통합 수정만 예외, PM 사인오프 필수" 정합. revert 비용: 5 파일 path 원복 (≈ 5분, but 회귀 fail 복원).

**Open Issues:**

- **PM 외부 모집 트랙 raw 세션 N=0 (두 번째 연속)** — Sprint 12 시작 trigger = raw 세션 N≥3 도착. PM 자기 페이스 별도 트랙 (consent §5 서명 → session-guide §2~7 자유 사용 → export → `docs/sprints/sprint-12-data/raw/<session-hash>.json` 채널). 모집 채널 / 보상 / 법무 검토 별개. Sprint 10/11 연속 N=0 — 두 번째 no-op close cycle 완료. Sprint 12 도 N=0 그대로면 세 번째 no-op close cycle 가능 (시간축 분리 패턴 다섯 번째 정합 사례).

- **Sprint 9~10 마감 receipt 마크 stale 신뢰도 catch first 사례** — Sprint 11 /end 회귀 검증 단계가 first 실측으로 receipt 인프라 stale 5건 발견. Sprint 10 /end 가 "Sprint 9 receipt 65/65 PASS" 마크 시 실행 검증 없이 Sprint 9 시점 결과 복제했을 가능성. 향후 `/end` 절차 §5 (Receipt 검증) 에 **마감 마크 직전 실측 강제** 정책 검토 필요 — 다음 sprint /end 가 동일 stale 문제 catch 보장.

- **web 빌드 데모 모드 표면 인식 부족** (Sprint 10 사용자 시연 first 발견) — `apps/mobile/src/chatStore.web.ts` 의 `DEMO_REPLY_KO = ['환영해요. ', '무엇이든 ', '떠오르는 ', '대로 ', '적어보세요.']` 5토큰 cycle 이 사용자 첫 진입 시 LLM 응답으로 오해됨 (Sprint 1 D-S1-* 의도된 동작 — better-sqlite3 native-only 우회). Onboarding 또는 firstChat 의 카피만으로는 데모 vs 실 LLM 구분 불가. Sprint 12 활성 경로에서 D-S12-web-demo-banner-decision 후보 (Onboarding 또는 firstChat empty 카피에 "데모 모드" 마이크로 카피 / ErrorState reason 'demo-mode' / 별도 마이크로 토스트 추가 검토). web 빌드 또는 dev 서버 진입 시점 분기 필요.

- **dist 정적 export SPA fallback 미설정** (Sprint 10 사용자 시연 first 발견) — `apps/mobile/dist/index.html` 단일 + `_expo/static/js/web/entry-*.js` 단일 번들. `serve` 기본 모드는 `/chat` `/onboarding` `/inspector` 등 모든 dynamic 라우트를 404 반환 → client-side 라우팅 실패. `serve -s` (SPA fallback) 의무. 실행 가이드 / README 또는 별도 인프라 문서 작성 검토 (Sprint 12 또는 별개 dev-infra sprint).

- **dormant code IDE diagnostic 노이즈** (Sprint 9 retro 이월) — `dedupConcepts.ts` strict 진단 22건 매 sprint 시작 시 반복 발송. Sprint 12 dedup 채택 시 일괄 해소 + 별개 `.receipt-runner` allowlist 검토 후보.

## 12. Carry-over + Retrospective

**Carry-over (다음 스프린트가 반드시 알아야 할 것):**

1. **Sprint 12 = "External Data Arrival" sprint (Sprint 11 의 reincarnation, 두 번째 reincarnation 사례)** — Sprint 11 의 §1 Goal + §2 Receipt raw text 그대로 복제 (Sprint 11 자체가 Sprint 10 의 reincarnation 이므로 sprint 10→11→12 = 3중 동일 raw text 체인). trigger = raw 세션 N≥3 도착. PM 외부 모집 트랙 PM 자기 페이스 별도 진행. Sprint 8 carry-over 14 시간축 분리 패턴 **다섯 번째 정합 사례 후보**.

2. **Sprint 11 = no-op close 영구 확정 (두 번째 연속 no-op close)** — PM 외부 모집 트랙 raw 세션 N=0 + PM 사인오프 게이트 GO branch=B. /start 가 §3 In/Out 만 확정 + 워커 dispatch 0건. /end 가 4 frozen + carry-over + Sprint 12 skeleton 생성. **코드 영역 변경 0 (단, D-S11-receipt-infra-hotfix 5 파일 swap 은 receipt 인프라 stale 해소 별개 분기 — PM 사인오프 A1 후 진행).** Sprint 10 carry-over 10 항목 그대로 Sprint 12 이월.

3. **D-S11-receipt-infra-hotfix 영구 보존** (Sprint 11 신규) — `scripts/receipt/sprint-2.sh` + `scripts/lint/directive-tag-audit.ts` + `scripts/lint/__tests__/run-tests.sh` + `scripts/receipt/.receipt-runner/{sprint7-contract-gap-policy, sprint9-pakda-term-zero, sprint9-spawn-prompt-update}.mjs` 5 파일이 `.claude/commands/` → `.claude/agents/` swap 완료 (c460712 후속 정합). Sprint 9 receipt 65/65 PASS 재실측 검증. Sprint 10 마감 시 "65/65 PASS" 마크는 stale 이었음 (4 단계 실제 fail) — Sprint 11 /end 가 first 실측 catch.

4. **/end 절차 §5 마감 마크 직전 실측 강제 정책 후보** (Sprint 11 신규 retro) — Sprint 10 /end 가 receipt 실측 없이 Sprint 9 결과 복제하여 stale 마크. 향후 `/end` Receipt 검증 단계에 *마감 마크 작성 직전 실측 강제* 정책 영구 박힘 검토 필요. Sprint 12 활성 또는 별개 메타 sprint 후보. team-leader 헌법 / `.claude/commands/end.md` 라이브 모드 본문 갱신 영역.

5. **Sprint 9 carry-over 14 항목 + Sprint 10 carry-over 추가 그대로 이월** (외부 신호 부재로 변동 0) — 5종 활성 경로 (dedup ≈15분 / negation-classifier ≈1시간 / retention ≈30분 / theme-toggle ≈30분 / empty-error-copy ≈30분) + carry-over 2 B안 (unlink ≈30분) / dormant code 영구 보존 / 사전 합의 영구 보존 / fixture 6번째 룰 후보 / 헌법 9~12 8 워커 정의 line 9~12 보존 / "박다" 0건 강제 / 시간축 분리 패턴 / system routing replay 표준 / 동결 영역 / stale directive 0건 first sprint / mockup-scope-parity lint 사전 검증 표준 / platform-adapter 누적 9회 / 외부 데이터 sprint 시간축 분리.

6. **web 빌드 데모 모드 마이크로 카피 후보** (Sprint 10 사용자 시연 first 발견, 이월) — `chatStore.web.ts` DEMO_REPLY_KO 5토큰 cycle 표면 인식 부족. Sprint 12 활성 경로에서 D-S12-web-demo-banner-decision 후보 (Onboarding 또는 firstChat empty 카피에 "데모" 마이크로 카피 / ErrorState reason 'demo-mode' 추가 / 별도 마이크로 토스트). web 빌드 진입 시점 분기 필요. native iOS/Android 빌드는 `chatStore.ts` 활성 → 실 Gemma + SQLite 동작 그대로 (영향 0).

7. **dist 정적 export SPA fallback 인프라 문서 후보** (Sprint 10 사용자 시연 first 발견, 이월) — `serve -s` 플래그 의무. README 또는 별도 dev-infra 문서 작성 검토 (Sprint 12 활성 경로 또는 별개). 실행 명령 인덱스: `pnpm --filter mobile build` (export) + `npx serve -s apps/mobile/dist -l 3000` (SPA fallback) + Ollama CORS (`OLLAMA_ORIGINS="http://localhost:3000" ollama serve`).

8. **dormant code IDE diagnostic 노이즈** (Sprint 9 retro 이월) — `dedupConcepts.ts` strict 진단 22건 반복. Sprint 12 dedup 채택 시 일괄 해소 + 별개 `.receipt-runner` allowlist 검토 후보.

9. **헌법 1~12 영구 확정 + 8 워커 정의 line 9~12 보존 회귀 PASS** — Sprint 9 65/65 receipt 재실행 PASS (workers_with_constitution=8 / pakda_term_count=0). 시그니처 동결 정합. D-S11-receipt-infra-hotfix 후 첫 실측 일관성 확정.

10. **모노레포 437 테스트 PASS 회귀 무결** — protocol 22 + llm 6 + engine 103 + storage 85 + design-system 107 + orchestrator 59 + conversation 52 + e2e 3 = 437. mobile = skip (정책). Sprint 5 시점 242 PASS 대비 +195 (Sprint 6/7/8/9 누적). 시그니처 동결 정합. Sprint 10 마감 시점 437 PASS 와 동일.

11. **PM 사인오프 게이트 직전 작업 중지 → no-op close 마감 패턴 두 번째 연속 사례** — Sprint 10 first → Sprint 11 second. /end 표준 동작 = no-op close (3~4 frozen + carry-over + skeleton 생성). Sprint 12+ 동일 패턴 권장. 단, Sprint 11 은 추가로 receipt 인프라 hotfix 4번째 frozen 동반 — 향후 no-op close 마감 시 receipt 회귀 실측에서 인프라 stale 발견 시 PM 사인오프 후 통합 수정 가능 (precedent).

**Retrospective:**

- **잘 된 것**:
  - Sprint 10 마감 시 stale 마크 "Sprint 9 receipt 65/65 PASS" 의 실제 fail 4건 (step [9/14] / [53/53] / [61/65] / [62/65]) 을 Sprint 11 /end 회귀 검증 단계가 first 실측 catch — 마감 마크 신뢰도 결함 발견. c460712 (2026-04-29) commit 후 약 2주간 잠재했던 receipt 인프라 stale 을 5 파일 일괄 swap 으로 해소.
  - PM 사인오프 게이트 다층 재가동 (A → A1 확장) — 처음 발견된 fix scope (1 파일) 이 root cause 분석 후 5 파일로 확장됐을 때 즉시 PM 게이트 재호출 + transparent 보고 → A1 확장 사인오프 후 통합 수정. /end "긴급 통합 수정만 예외, PM 사인오프 필수" 절차 정합.
  - 모노레포 437 PASS + Sprint 9 receipt 65/65 PASS (수정 후) — 인프라 견고함 검증 (시그니처 동결 정합 + 헌법 1~12 8 워커 정의 보존). 코드 영역 변경 0건 유지.
  - PM 사인오프 게이트 직전 작업 중지 → no-op close 마감 패턴 두 번째 연속 적용 — Sprint 10 first → Sprint 11 second. /start 절대 규칙 정합. 시간축 분리 패턴 네 번째 정합 사례 영구 확정.
  - "박다" 동사 활용형 0건 강제 본 sprint 신규 작성 영역 모두 PASS (헌법 12 정합) — 메타 인용 + 정책 정의 + 검증 토큰 + 대체어 매핑 4종 제외 영역 컨텍스트 인식 정합.

- **아팠던 것**:
  - 외부 데이터 N=0 두 번째 연속 → Sprint 11 = no-op close 두 번째 연속. 시간축 분리 패턴 네 번째 적용 (Sprint 8 (A) first / 9 (B) C-revised second / 10 (no-op) third / 11 (no-op) fourth). PM 외부 모집 트랙 raw 세션 도착 1~2주 cycle 가정이 더 길어짐 — 약 2주 (Sprint 10 마감 2026-04-30 → Sprint 11 마감 2026-05-12) 동안 외부 데이터 도착 0건.
  - Sprint 9~10 마감 시 receipt 마크 stale 신뢰도 결함 — Sprint 10 /end 가 "Sprint 9 receipt 65/65 PASS" 마크 시 실측 실행 없이 Sprint 9 시점 결과 복제했을 가능성. c460712 (4/29) 직후 sprint 들에서 이미 fail 이었으나 catch 안 됨. /end 절차 §5 (Receipt 검증) 에 마감 마크 직전 실측 강제 정책 추가 필요.

- **다음에 다르게 할 것**:
  - **/end 절차 §5 마감 마크 직전 실측 강제 정책 영구 박힘** — Sprint 12 활성 경로 또는 별개 메타 sprint 후보. team-leader 헌법 / `.claude/commands/end.md` 라이브 모드 본문 갱신 영역. Sprint 9~10 마감 stale 마크 두 번째 재발 차단.
  - **Sprint N = no-op close 패턴 표준 영구화** — 외부 데이터 도착 미확인 sprint 의 표준 close 모드 (Sprint 10 first → 11 second → 12+ 동일 패턴 권장). /start 절차 §1 (현재/직전 스프린트 식별) 직후 trigger 사전 확인 의무 (raw 세션 디렉토리 / 데이터 N≥3 사전 검증) → 미충족 시 PM 에게 즉시 no-op close 옵션 제시. Sprint 11 /start 가 first 정합 사례.
  - **receipt 인프라 path swap 회귀 정책** — c460712 같은 구조 변경 commit 발생 시 receipt/lint 자산 일괄 grep 검증 의무. team-leader 헌법 / `.claude/commands/end.md` 마감 직전 단계에 `grep -rn "\.claude/commands" scripts/` 자동 검증 검토.
  - **web 빌드 데모 모드 표면 인식 카피 추가 검토 (Sprint 10 이월)** — D-S12-web-demo-banner-decision 후보. Onboarding 또는 firstChat empty 카피에 "데모 모드" 마이크로 카피 / ErrorState reason 'demo-mode' / 별도 마이크로 토스트 추가.
  - **dist 정적 export 실행 가이드 README 또는 별개 dev-infra 문서 작성 검토 (Sprint 10 이월)** — `npx serve -s apps/mobile/dist -l 3000` + Ollama CORS (`OLLAMA_ORIGINS="http://localhost:3000" ollama serve`) 표준 명시.
