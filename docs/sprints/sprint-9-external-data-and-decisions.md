# Sprint 9 — External Data and Decisions

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`

## 1. Goal

Sprint 8 의 외부 검증 인프라 (PII 정책 / 모집 양식 / telemetry / dormant code / 사전 합의) 위에 **PM 직접 외부 모집 트랙 진행 + N≥3 × M≥2 세션 dogfooding 데이터 수집 + Sprint 8 의 5종 보류 frozen + carry-over 2 reconfirm 결정을 *실제 데이터 기반* 으로 갱신**한다 — Sprint 8 close 분기 (A) 의 시간축 분리 패턴 후속.

## 2. Deliverable & Receipt

**Deliverable:**

- **외부 테스터 N≥3 × M≥2 세션 데이터 수집 완료** — `consent-form.md` §5 서명 + `session-guide.md` 따른 자유 사용 + `docs/sprints/sprint-9-data/raw/<session-hash>.json` 채널 export. PII 정책 (`sprint-8-pii-policy.md`) Rule 1~5 적용.
- **외부 데이터 분석 리포트 갱신** — `docs/sprints/sprint-9-data/index.md` 신규 (Sprint 8 의 `sprint-8-data/index.md` N=0 리포트는 영구 보존). 6종 집계 지표 (recall hit rate / dismiss 빈도 / retraction 빈도 / Concept dedup 신호 / recall_log retention 신호 / negation classifier miss 사례 / 만족도) 실측값 기록.
- **Sprint 8 5종 보류 frozen 결정 갱신** — Sprint 8 §11 의 `D-S8-{theme-toggle,empty-error-copy,concept-dedup,recall-log-retention,negation-classifier}-decision = 보류` 5종을 외부 데이터 신호 기반 `D-S9-*-decision = {채택/A안/B안/heuristic/LLM도입/...}` 로 갱신. carry-over 2 (Inspector unlink) reconfirm 도 외부 신호로 재검증.
- **B안 채택 분기별 본체 작성**:
  - **carry-over 9 채택** — engine T6 dormant code (`packages/engine/src/dedupConcepts.ts`) 활성화. `tsc --strict` 진단 22건 해소 + storage adapter wiring + threshold 튜닝.
  - **carry-over 11 채택** — engine `negationClassifier.ts` 본체 + `__tests__/negation-classifier.test.ts` + conversation `loop.ts` 옵션 함수 DI + `loop-negation-classifier-wiring.test.ts` + 양 root export `ClassifyNegationFn` (engine + conversation 동시 PR, race 0).
  - **carry-over 10 채택** — storage `0007_recall_log_retention.sql` migration + `migration-0007-retention.test.ts` + retention cron / column 정책.
  - **carry-over 7 채택** — designer 가 `디자인 목업/content.jsx` 갱신 + `copy.theme.{light,dark,system}` 키 추가 + verify-copy 임계 ↑ + mobile theme-toggle UI mount.
  - **carry-over 8 채택** — designer 가 디자인 목업 갱신 + `copy.{inspector,library}.empty.*` 키 추가 + verify-copy 임계 ↑ + mobile inspector/library 분기 카피.
  - **carry-over 2 B안** — designer DismissButton variant 'unlink' 추가 + Inspector 슬롯 + `copy.unlink` + mobile unlink 슬롯 mount.
- **헌법 후보 9~11 + PM "박다" 용어 금지 inject** — Sprint 9 워커 spawn prompt 0번 묶음에 추가. `.claude/commands/*.md` 8 워커 정의 갱신.

**Receipt (자동 검증 가능한 형태):**

- `bash scripts/receipt/sprint-9.sh` exit 0, "✅ Sprint 9 receipt PASSED".
- Sprint 8 60 단계 wrap (`SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환).
- 신규 5~7 단계:
  1. **외부 데이터 N≥3 실측** — `docs/sprints/sprint-9-data/raw/` 디렉토리에 N≥3 raw 세션 파일 + `index.md` 6종 지표 실측값 raw text.
  2. **5종 결정 갱신 frozen** — Sprint 9 dev doc §11 에 `[FROZEN v<date> D-S9-{theme-toggle,empty-error-copy,concept-dedup,recall-log-retention,negation-classifier}-decision]` 5종 갱신 (채택/A안/B안 명시) + carry-over 2 reconfirm/B안 결정.
  3. **분기별 본체 작성 검증**:
     - dedup 채택 시: `dedupConcepts.ts` strict 진단 0 + 단위 테스트 PASS + caller wiring 추가.
     - negation-classifier 채택 시: engine `negationClassifier.ts` + conversation `loop.ts` 옵션 + 양 root export + 단위 테스트 PASS.
     - retention 채택 시: `0007_recall_log_retention.sql` + 단위 테스트 PASS.
     - theme-toggle / empty-error / unlink 채택 시: 디자인 목업 갱신 + copy.ts 신규 키 + verify-copy 임계 ↑ + mobile mount.
  4. **8 워커 spawn prompt 갱신** — 헌법 9~11 + 박다 용어 금지 raw text 검증.
  5. **Sprint 8 회귀 wrap** — 60 단계 그대로 PASS.

- 임계 보강 (D-S9-receipt-threshold-recovery) — Sprint 8 의 60단계 위에 신규 `external_session_count ≥ 3` (강제, branch=A 만) + `frozen_decisions_updated ≥ 5` (Sprint 8 보류 frozen 모두 갱신).

## 3. Scope

> **운영 모드: close 분기 (B) C-revised** — Sprint 8 carry-over 14 시간축 분리 권고 적용. 외부 데이터 N≥3 수집은 Sprint 10 (= "External Data Arrival" sprint) 으로 이월. 본 sprint 는 *외부 데이터 무관* 한 인프라 영역만 본 day 안에 완결.
>
> §1 Goal / §2 Receipt 의 raw text 는 그대로 보존 (Sprint 8 carry-over 14 의 시간축 분리 학습이 본 §3 In/Out 으로 구체화). §2 임계 보강의 `external_session_count ≥ 3 (강제, branch=A 만)` 는 branch=B 분기에서 `≥ 0` 로 정합.

**In:**

- **워커 spawn prompt 0번 묶음 raw text 갱신** — 헌법 5~8 그대로 보존 (Sprint 7 carry-over 1) + 헌법 9~11 채택 (default = 3건 모두 채택 — PM 사인오프 변경 가능) + "박다" 용어 0건 강제 (`feedback_no_pakda_term.md` 영구 기록 PM frozen).
- **`.claude/commands/<role>.md` 8 워커 정의 갱신** — 공통 헌법 섹션에 헌법 9~11 raw text 추기 + "박다" 용어 0건 raw text inject (대체어 6종: 확정 / 기록 / 추가 / 보존 / 작성 / 적용). 단일 작성자 시간창 (team-leader) 강제. grep 검증 (박힘 / 박는다 / 박음 / 박혔 = 0 hits).
- **Sprint 9 receipt 인프라** — `scripts/receipt/sprint-9.sh` 신규. Sprint 8 60단계 wrap (`SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환) + 신규 5단계 (spawn-prompt-update / pakda-term-zero / decisions-re-frozen / inspector-unlink-reconfirm / sprint-8-wrap). fixture 5종 신규.
- **5종 보류 frozen 재갱신** — `[FROZEN v2026-04-30 D-S9-{theme-toggle,empty-error-copy,concept-dedup,recall-log-retention,negation-classifier}-decision = 보류]` 5종 (Sprint 10 재진입 trigger inline + revert 비용 명시) + `[FROZEN v2026-04-30 D-S9-inspector-unlink-recheck = A안 reconfirm]` 1종 (Sprint 8 D-S8-* 재갱신).
- **Sprint 10 trigger carry-over 명시** — PM 외부 모집 trigger (consent §5 서명 → session-guide §2~7 → export → `docs/sprints/sprint-10-data/index.md` 분석) + dormant 활성 경로 (engine `dedupConcepts.ts` caller wiring + threshold ≈ 15분) + 사전 합의 활성 경로 (engine + conversation `negationClassifier` 양 워커 동시 PR ≈ 1시간) + storage retention 0007 추가 경로 (`0007_recall_log_retention.sql` + 단위 테스트 ≈ 30분) + designer carry-over 7/8/2 B안 활성 경로 (디자인 목업 갱신 + copy 키 + verify-copy 임계 ↑ + mobile mount).
- **임계 보강 (D-S9-receipt-threshold-recovery)** — `external_session_count ≥ 0 (branch=B 강제)` + `frozen_decisions_updated ≥ 5` + `pakda_term_count = 0` (신규 dev doc 변경분 / directive / 8 워커 정의 한정 — 기존 §1~§2 raw text + Sprint 8 이전 영역은 churn 회피로 그대로 유지).

**Out:**

- **외부 데이터 N≥3 수집** — Sprint 10 으로 이월. close 분기 (B) 명시. carry-over 14 시간축 분리 정합. PM 외부 모집 트랙은 PM 페이스로 별도 진행.
- **engine T6 `dedupConcepts.ts` 본체 활성화** — Sprint 8 dormant 그대로 보존 (caller 미호출 = 동작 0). strict 진단 22건 해소도 보류 (Sprint 8 frozen "보류 시 0 가치" 정합 — Sprint 10 채택 시 일괄 해소).
- **engine + conversation T7 `negationClassifier` 본체** — Sprint 8 사전 합의 dev doc §7 line 276~454 + path 결정 = 가설 1 영구 보존. 본체 코드 0.
- **storage `0007_recall_log_retention.sql`** — retention window 30d 결정에 외부 데이터 신호 (retention 후 dismissed row 사용 빈도) 필요. Sprint 10 이월.
- **designer carry-over 7/8/2 B안** — 외부 신호 부재. 디자인 목업 / copy.ts / DismissButton variant 'unlink' / mobile mount 코드 변경 0. Sprint 10 활성 경로.
- **DecisionAct enum / runMemoryFormation / runRecallHook / RecallFn / DecideFn / chatStore 기존 메서드 시그니처 + storage migration 0001~0006 + protocol DecisionLogAction union 9종 + 헌법 5~8 = 영구 동결** (Sprint 7 carry-over 12 + Sprint 8 carry-over 10 그대로).
- **신규 화면 / 신규 패키지 / 만족도 설문 UI 변경** — 그대로 유지. 8 패키지 그대로.
- **platform-adapter 표준 변경** — Sprint 7 carry-over 1 / Sprint 8 carry-over 13 그대로 (9회차 telemetryStore 영구 보존).
- **e2e 시나리오 신규 추가** — Sprint 7 `full-journey.spec.ts` 9 단계 그대로 wrap.
- **B안 일부 강제 채택** — PM 이 명시 정정 시에 한해 본 sprint scope 변경 (HOLD-DECIDE-RESUME). default 는 5종 보류 + 1종 A안 reconfirm 모두 재갱신.

## 4. Architecture & Data Flow

```
[PM 사인오프 (default = C-revised, 헌법 9~11 3건 모두 채택, "박다" 금지 강제, branch=B)]
  → team-leader: 헌법 raw text 합성 + 대체어 매핑
    ├─ 헌법 5~8 raw text (영구 보존, Sprint 7 carry-over 1)
    ├─ 헌법 9 raw text — task assignment 수신 시 dev doc §6 blocker 컬럼 1회 grep + 외부 데이터 독립성 1차 분류 (Sprint 8 T6 dormant + T7 stand-by 양쪽 first 정합)
    ├─ 헌법 10 raw text — dormant code 패턴 명시 (외부 contract 변경 0 + 동작 0 + revert ≤3분 + idempotent 4 조건 충족 시 본체 작성 valid; Sprint 8 T6 first 사례)
    ├─ 헌법 11 raw text — 워커가 directive 의 진단 원인이 fixture/실측과 다를 때 보고 의무 (consumer-side correction; Sprint 8 tester syntax 진단 first 사례)
    └─ "박다" 0건 강제 raw text — feedback_no_pakda_term.md 영구 기록. 대체어 6종 (확정 / 기록 / 추가 / 보존 / 작성 / 적용).

[8 워커 정의 갱신 — 단일 작성자 시간창 team-leader, 헌법 #4 정합]
  → .claude/commands/{team-leader,storage,engine,conversation,orchestrator,mobile,designer,tester}.md
    ├─ 공통 헌법 섹션 갱신 (헌법 9~11 추기 + "박다" 0건 inject + 대체어 6종 명시)
    └─ grep 검증 (박힘 / 박는다 / 박음 / 박혔 = 0 hits 8 워커 정의)

[Sprint 9 receipt 인프라]
  → scripts/receipt/sprint-9.sh 신규 — Sprint 8 60단계 wrap (SKIP_OLLAMA / SKIP_SPRINT1_E2E 호환) + 신규 5단계 = 65단계
    Step 61: spawn-prompt-update — 8 워커 정의 raw text 검증 (헌법 9~11 채택 분기별 + 박다 0건 grep)
    Step 62: pakda-term-zero — 신규 dev doc 변경분 / directive / 8 워커 정의 박다 용어 0건 grep
    Step 63: decisions-re-frozen — §11 5종 D-S9-*-decision = 보류 재갱신 + Sprint 10 trigger 명시 raw text
    Step 64: inspector-unlink-reconfirm — D-S9-inspector-unlink-recheck = A안 reconfirm 재갱신 raw text
    Step 65: sprint-8-wrap — Sprint 8 60단계 그대로 PASS (Sprint 4: 32 + 5: 8 + 6: 6 + 7: 7 + 8: 7)

  → fixture: scripts/receipt/.receipt-runner/sprint9-{spawn-prompt-update,pakda-term-zero,decisions-re-frozen,inspector-unlink-reconfirm,sprint-8-wrap}.mjs
    fixture 작성 직전 ACK 합의 1회 grep 의무 (Sprint 8 carry-over 5 강화):
      - §11 raw text 1회 grep
      - §3 In/Out raw text 1회 grep
      - §4 Architecture raw text 1회 grep
      - .claude/commands/*.md 8 워커 정의 1회 grep

[5종 보류 + carry-over 2 재 reconfirm — HOLD-DECIDE-RESUME (PM Go 수신 = RESUME 직진)]
  → team-leader: §11 raw text 갱신
    ├─ [FROZEN v2026-04-30 D-S9-theme-toggle-decision = 보류] (Sprint 10 trigger inline + revert 비용 ≈ 30분)
    ├─ [FROZEN v2026-04-30 D-S9-empty-error-copy-decision = 보류]
    ├─ [FROZEN v2026-04-30 D-S9-concept-dedup-decision = 보류] + dormant 활성 경로 명시 (≈ 15분)
    ├─ [FROZEN v2026-04-30 D-S9-recall-log-retention-decision = 보류] + 0007 추가 경로 명시 (≈ 30분)
    ├─ [FROZEN v2026-04-30 D-S9-negation-classifier-decision = 보류] + 사전 합의 활성 경로 명시 (≈ 1시간)
    └─ [FROZEN v2026-04-30 D-S9-inspector-unlink-recheck = A안 reconfirm] (Sprint 10 B안 재진입 ≈ 30분)

[Sprint 10 trigger carry-over 명시 — §12]
  → Sprint 10 = "External Data Arrival" sprint
    ├─ PM 외부 모집 trigger (consent §5 서명 → session-guide §2~7 → export → docs/sprints/sprint-10-data/index.md)
    ├─ dormant code 활성 경로 (engine dedupConcepts.ts caller wiring + threshold ≈ 15분)
    ├─ 사전 합의 활성 경로 (engine + conversation negationClassifier 양 워커 동시 PR race 0 ≈ 1시간)
    ├─ storage retention 0007 추가 경로 (0007_recall_log_retention.sql + 단위 테스트 ≈ 30분)
    └─ designer carry-over 7/8/2 B안 활성 경로 (디자인 목업 + copy + verify-copy 임계 ↑ + mobile mount)

[Receipt 실행]
  → bash scripts/receipt/sprint-9.sh
    Step 1~60: Sprint 8 wrap PASS
    Step 61~65: 신규 5단계 PASS
    임계: external_session_count ≥ 0 (branch=B) / frozen_decisions_updated ≥ 5 / pakda_term_count = 0
    → "✅ Sprint 9 receipt PASSED"
```

핵심 변경 (Sprint 8 대비, branch=B C-revised):

- 코드 변경 0 (storage / engine / conversation / mobile / designer / orchestrator) — Sprint 8 dormant + 사전 합의 + 인프라 그대로 보존.
- `.claude/commands/<role>.md` 8 워커 정의 갱신 (헌법 9~11 추기 + "박다" 0건 inject + 대체어 6종 명시).
- `scripts/receipt/sprint-9.sh` 신규 + 5 fixture (`scripts/receipt/.receipt-runner/sprint9-*.mjs`).
- dev doc §11 6 분기 frozen 재갱신 (D-S9-* 6종, Sprint 10 trigger inline).
- dev doc §12 Sprint 10 trigger carry-over 명시 (5종 활성 경로 + revert 비용).

의존 그래프 신규 엣지 0 — Sprint 8 의존 그대로 wrap.

## 5. File Ownership

| Agent | Files |
|---|---|
| **team-leader** | `docs/sprints/sprint-9-external-data-and-decisions.md` (라이브 갱신 §3~12, 단일 작성자 시간창), `.claude/commands/team-leader.md` 자기 정의 갱신, `.claude/commands/{storage,engine,conversation,orchestrator,mobile,designer,tester}.md` 7 워커 정의 갱신 (단일 작성자 시간창 — 헌법 #4 강제, 동시 충돌 회피). raw text 갱신 후 grep 검증 (박힘 / 박는다 / 박음 / 박혔 = 0 hits). |
| **tester** | `scripts/receipt/sprint-9.sh` 신규 (Sprint 8 60단계 wrap + 신규 5단계), `scripts/receipt/.receipt-runner/sprint9-{spawn-prompt-update,pakda-term-zero,decisions-re-frozen,inspector-unlink-reconfirm,sprint-8-wrap}.mjs` 5 신규 fixture. fixture 작성 직전 §11 + §3 + §4 + `.claude/commands/*.md` raw text 1회 grep 의무. |
| **storage** | (코드 변경 0, branch=B — Sprint 8 telemetry schema 그대로 보존) |
| **engine** | (코드 변경 0, branch=B — `dedupConcepts.ts` dormant 그대로, root export 그대로) |
| **conversation** | (코드 변경 0, branch=B — 사전 합의 dev doc §7 그대로) |
| **mobile** | (코드 변경 0, branch=B — telemetryStore 9회차 그대로) |
| **designer** | (코드 변경 0, branch=B — 디자인 목업 / copy.ts 그대로) |
| **orchestrator** | (코드 변경 0, branch=B — 시그니처 동결 + 임계 6종 그대로) |

## 6. Tasks

| ID | Description | Owner | Blocked By |
|---|---|---|---|
| T1 | **team-leader**: PM 사인오프 묶음 confirm (default = 헌법 9~11 3건 모두 채택 + "박다" 금지 강제 + branch=B C-revised). 헌법 9~11 raw text 합성 (각 ≤ 5줄, 출처 인용 inline) + "박다" 대체어 6종 (확정 / 기록 / 추가 / 보존 / 작성 / 적용) 매핑 명시. 본 sprint 의 4 묶음 spawn prompt 표준 갱신 (heritage 5~8 + 9~11 + 박다 0건). | team-leader | — |
| T2 | **team-leader**: `.claude/commands/<role>.md` 8 워커 정의 갱신 — 공통 헌법 섹션에 헌법 9~11 raw text 추기 + "박다" 용어 0건 강제 inject + 대체어 6종 raw text. 단일 작성자 시간창 강제 (헌법 #4). 갱신 후 grep 검증 (박힘 / 박는다 / 박음 / 박혔 = 0 hits 8 워커 정의 + 본 dev doc §3~§4 변경분). | team-leader | T1 |
| T3 | **team-leader**: dev doc §11 6 분기 재갱신 raw text — 5종 보류 frozen (`[FROZEN v2026-04-30 D-S9-{theme-toggle,empty-error-copy,concept-dedup,recall-log-retention,negation-classifier}-decision = 보류]`) + 1종 A안 reconfirm (`[FROZEN v2026-04-30 D-S9-inspector-unlink-recheck = A안 reconfirm]`). 각 분기 inline (Sprint 10 재진입 trigger + revert 비용 + 활성 경로). | team-leader | T1 |
| T4 | **tester**: `scripts/receipt/sprint-9.sh` 신규 — Sprint 8 60단계 wrap (`SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환) + 신규 5단계 (61~65). fixture 5종 신규 (`scripts/receipt/.receipt-runner/sprint9-*.mjs`). 임계 보강 (`external_session_count ≥ 0 (branch=B 강제)` + `frozen_decisions_updated ≥ 5` + `pakda_term_count = 0`). fixture 작성 직전 §11 + §3 + §4 + `.claude/commands/*.md` raw text 1회 grep 의무 (헌법 11 + Sprint 8 carry-over 5 정합). receipt 실행 → exit 0 검증. | tester | T2, T3 |
| T5 | **team-leader**: dev doc §10 Implementation Map (실 산출 인덱스 — `.claude/commands/*.md` 변경 라인 + `scripts/receipt/sprint-9.sh` 65단계 + fixture 5종 + §11 6분기 raw text) + §12 Carry-over (Sprint 10 trigger 명시 + 5종 활성 경로 + Sprint 8 carry-over 14 항목 변동분 추적) + §retrospective (잘 된 것 / 아팠던 것 / 다음에 다르게 할 것). | team-leader | T4 |

## 7. Interfaces / Contracts
<함수 시그니처, 메시지 타입, 패키지 경계 — 책임 에이전트가 결정될 때마다 추기>

## 8. Test Scenarios
<디자인 목업/기획서 인용 시나리오 + 자동화 위치 (`e2e/scenarios/...`)>

## 9. Demo Script

```bash
# 1. Lint 사전 검증 (PM 사인오프 게이트 전 표준)
bash scripts/lint/mockup-scope-parity.sh docs/sprints/sprint-9-external-data-and-decisions.md
# → exit 0 (불일치 없음)

bash scripts/lint/frozen-flag-audit.sh docs/sprints/sprint-9-external-data-and-decisions.md
# → exit 0 (9 frozen + 1 reconfirm 모두 [FROZEN v2026-04-30 D-S9-*] prefix 정합)

# 2. Sprint 9 receipt 65 단계 실행
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-9.sh
# → exit 0 + "✅ Sprint 9 receipt PASSED" + 65/65

# 3. 신규 5 단계 결과 확인
# [61/65] spawn_prompt_update_pass=1 ; workers_with_constitution=8
# [62/65] pakda_term_zero_pass=1 ; pakda_term_count=0
# [63/65] decisions_re_frozen_pass=1 ; frozen_decisions_updated=5 ; sprint10_trigger_marks=5
# [64/65] inspector_unlink_reconfirm_pass=1 ; reject_layer_marks=2 ; sprint10_b_marks=1
# [65/65] sprint_8_wrap_pass=1 ; sprint_8_fixtures=7

# 4. 임계 3종 정합 확인 (Sprint 8 step 54 wrap 통해 자동 검증)
# - external_session_count=0 (branch=B 강제)
# - frozen_decisions_updated=5 (5종 보류 재확정 매칭)
# - pakda_term_count=0

# 5. 8 워커 정의 헌법 9~12 추기 영역 검증
for f in .claude/commands/{team-leader,storage,engine,conversation,orchestrator,mobile,designer,tester}.md; do
  grep -c "외부 데이터 독립성 1차 분류" "$f"
done
# → 8 줄 모두 "1" 출력 (8/8 워커 정의에 헌법 9 raw text 보존)

# 6. dev doc §11 9 frozen + 1 reconfirm 확인
grep -c "FROZEN v2026-04-30 D-S9" docs/sprints/sprint-9-external-data-and-decisions.md
# → 9 (3 신규 + 5 보류 재확정 + 1 A안 reconfirm)

# 7. Sprint 8 60 단계 회귀 wrap 확인
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-8.sh | tail -3
# → "✅ Sprint 8 receipt PASSED" + 60/60
```

## 10. Implementation Map

### team-leader (T1, T2, T3, T5)
- `docs/sprints/sprint-9-external-data-and-decisions.md` — §3~§12 라이브 갱신 (단일 작성자 시간창, 헌법 #4 정합). 9 frozen + 1 reconfirm + 4 Open Issues + 14 carry-over (다음 sprint 재진입 trigger 5종 + Sprint 10 trigger inline).
- `.claude/commands/{team-leader,storage,engine,conversation,orchestrator,mobile,designer,tester}.md` 8 파일 — line 9~12 헌법 9~12 추기 (각 ≤ 5줄, 출처 inline). 헌법 9 = 외부 데이터 독립성 1차 분류 의무 / 헌법 10 = Dormant code valid 4 조건 / 헌법 11 = directive 진단 mismatch 보고 의무 / 헌법 12 = PM frozen "박다" 0건 강제 (검증 토큰 10종 + 대체어 6종 매핑). 단일 작성자 시간창 (team-leader 단일 작성), 동시 충돌 0.
- §3 Out 1건 동사 활용형 정정 (원 표현 = 동사 활용형 1종 → `영구 보존` 으로 변환) — 신규 작성분 0건 정합.

### tester (T4)
- `scripts/receipt/sprint-9.sh` 신규 (executable, 65단계 = Sprint 8 60단계 wrap + 신규 5단계). `SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환.
- `scripts/receipt/.receipt-runner/sprint9-{spawn-prompt-update,pakda-term-zero,decisions-re-frozen,inspector-unlink-reconfirm,sprint-8-wrap}.mjs` 5 신규 fixture.
- 검증: `bash scripts/receipt/sprint-9.sh` exit 0 + "✅ Sprint 9 receipt PASSED" + 65/65 PASS.
- 임계 3종 모두 충족: `external_session_count=0 (branch=B 강제)` + `frozen_decisions_updated=5` (5종 보류 재확정 매칭) + `pakda_term_count=0`.
- fixture 매트릭스: 65/65 PASS (Sprint 4: 32 + Sprint 5: 8 + Sprint 6: 6 + Sprint 7: 7 + Sprint 8: 7 + Sprint 9: 5 = 65).
- fixture-contract gap 1건 발견 + fixture 측 보강 (carry-over 5 정합) — pakda-term-zero fixture 1차 작성 후 dev doc 자체 정책 정의 라인 11건 false positive 검출 (`grep 검증` / `0건 grep` 라인 패턴). 제외 룰 2종 추가 (정책 자체 라인 패턴) → fixture 자체 보강으로 해결, dev doc 변경 0건. carry-over 5 학습 한 건: *정책 자체 라인 패턴* 도 `D-S8-tester-fixture-strict-matching` 토큰 boundary 정책 5종에 6번째로 추가 후보 (Sprint 10 carry-over 5 항목으로 이월).

### 코드 영역 변경 0 (branch=B C-revised 정합)
- `packages/storage/` — Sprint 8 telemetry schema 0006 + repo 모듈 + protocol union 그대로 보존. 0007_recall_log_retention.sql 미작성 (D-S9-recall-log-retention-decision = 보류 정합, Sprint 10 활성 경로).
- `packages/engine/` — `dedupConcepts.ts` 175줄 + 17/17 단위 테스트 + root export dormant 그대로 보존 (`tsc --strict` 진단 22건 보류 그대로, "보류 시 0 가치" Sprint 8 frozen 정합). `negationClassifier.ts` 본체 미작성 (D-S9-negation-classifier-decision = 보류 정합, Sprint 10 활성 경로).
- `packages/conversation/` — `loop.ts` 옵션 함수 DI 미추기 (D-S9-negation-classifier-decision = 보류 정합).
- `apps/mobile/` — `themeStore` 시스템 자동 디폴트 그대로 / inspector·library 분기 카피 미추기 / Inspector unlink 슬롯 미추기 (D-S9-{theme-toggle,empty-error-copy}-decision = 보류 + D-S9-inspector-unlink-recheck = A안 reconfirm 정합).
- `packages/design-system/` — `copy.theme.*` / `copy.{inspector,library}.empty.*` / `copy.unlink` 미추기. 디자인 목업 갱신 0건. verify-copy 임계 그대로.
- `packages/orchestrator/` — 시그니처 동결 + 임계 6종 그대로 (Sprint 8 T13 사전 진단 인벤토리 영구 보존).

### Receipt 종합 (65/65 PASS)
- Sprint 4: 32 + Sprint 5: 8 + Sprint 6: 6 + Sprint 7: 7 + Sprint 8: 7 + Sprint 9: 5 = 65.
- lint 3종 (mockup-scope-parity / frozen-flag-audit / directive-tag-audit) 모두 exit 0 (Sprint 9 dev doc 대상 mockup-scope-parity exit 0 사전 검증 완료).
- frozen 9종 + 1 reconfirm (3 신규: close-branch-B / constitution-9-10-11-adopted / no-pakda-term + 5 보류 재확정: theme-toggle / empty-error-copy / concept-dedup / recall-log-retention / negation-classifier + 1 reconfirm: inspector-unlink-recheck = A안).
- 헌법 9~12 추기 8 워커 정의 line 9~12 영구 보존 (token 4종 OR 매칭 100%).

## 11. Decisions Made / Open Issues

**Decisions Made:**

- **[FROZEN v2026-04-30 D-S9-close-branch-B]** Sprint 9 운영 모드 = close 분기 (B) C-revised 영구 확정. 사유: Sprint 8 carry-over 14 의 시간축 분리 권고 적용 — 외부 데이터 N≥3 수집은 Sprint 10 (= "External Data Arrival" sprint) 으로 이월. 본 sprint 는 외부 데이터 무관 인프라 영역 (헌법 9~12 + 8 워커 정의 갱신 + receipt 인프라 + 5종 보류 frozen 재확정 + carry-over 2 재 reconfirm + Sprint 10 trigger carry-over 명시) 만 본 day 안에 완결. revert 비용: branch=A 전환 시 외부 데이터 수집 1~2주 + N≥3 분석 리포트 + 5종 결정 데이터 기반 갱신.

- **[FROZEN v2026-04-30 D-S9-constitution-9-10-11-adopted]** 헌법 9~11 채택 확정 (PM Go default = 3건 모두 채택). 9 = 외부 데이터 독립성 1차 분류 의무 (출처: Sprint 8 T6 dormant + T7 stand-by). 10 = Dormant code 패턴 valid 4 조건 (출처: Sprint 8 T6 first 사례). 11 = Directive 진단 원인 mismatch 보고 의무 (출처: Sprint 8 tester step 59 first 사례). 8 워커 정의 (`.claude/commands/*.md`) 추기 완료. revert 비용: 채택 회수 시 8 파일 line 9~11 삭제 ≈ 5분.

- **[FROZEN v2026-04-30 D-S9-no-pakda-term]** "박다" 용어 0건 강제 PM frozen 영구 확정. 출처: `~/.claude/projects/-Users-kimsemin-Desktop-2026-Synapse/memory/feedback_no_pakda_term.md`. 적용 영역: 신규 dev doc 변경분 / directive / SendMessage / 8 워커 정의 추기분 / commit 메시지 / 보고. 제외 영역 (churn 회피): Sprint 8 이전 기존 영역 / Sprint 8 §11~§12 / 메타 인용 (정책 정의 + 검증 토큰 명시). 검증 동사 활용형 grep 토큰 10종 + 대체어 6종 매핑 명시. 8 워커 정의 추기 완료. revert 비용: 정책 회수 시 8 파일 line 12 삭제 + dev doc §3~§12 동사 활용형 표현 정정 retrofit ≈ 30분.

- **[FROZEN v2026-04-30 D-S9-theme-toggle-decision = 보류]** (carry-over 7) — Sprint 8 D-S8-theme-toggle-decision = 보류 재확정. 사유: branch=B C-revised 운영 (외부 데이터 N=0) — 외부 사용자 토글 필요 신호 부재. 디자인 목업 (`디자인 목업/content.jsx`) 의 theme-toggle 카피 미정의 그대로 보존. mobile themeStore 시스템 자동 디폴트 그대로 유지. **Sprint 10 재진입 trigger**: 외부 데이터 도착 → 토글 UI 필요 신호 검출 시 designer 가 디자인 목업 갱신 + `copy.theme.{light,dark,system}` 키 추가 + verify-copy 임계 상향 + mobile mount. revert 비용 ≈ 30분.

- **[FROZEN v2026-04-30 D-S9-empty-error-copy-decision = 보류]** (carry-over 8) — Sprint 8 D-S8-empty-error-copy-decision = 보류 재확정. 사유: branch=B C-revised 운영 — inspector / library 별도 카피 필요 외부 사용자 신호 부재. 현재 `firstChat.{empty/emptySub/error/errorSub/retry}` 1세트 재사용 + 컴포넌트 props 직접 주입 그대로 유지. **Sprint 10 재진입 trigger**: 외부 데이터에서 화면별 카피 차이 신호 검출 시 designer 가 디자인 목업 갱신 + `copy.{inspector,library}.empty.*` + 임계 상향 + mobile 분기. revert 비용 ≈ 30분.

- **[FROZEN v2026-04-30 D-S9-concept-dedup-decision = 보류]** (carry-over 9) — Sprint 8 D-S8-concept-dedup-decision = 보류 재확정. 사유: branch=B C-revised 운영 — 외부 graph 중복 빈도 분석 데이터 부재. *engine 측 dormant code 영구 보존 그대로* (`packages/engine/src/dedupConcepts.ts` 175줄 + 17/17 단위 테스트 + root export). caller 미호출 = 동작 0 (dormant) 그대로. `tsc --strict` 진단 22건 보류 그대로 ("보류 시 0 가치" Sprint 8 frozen 정합). **Sprint 10 활성 경로**: 외부 데이터 도착 → graph 중복 빈도 신호 검출 시 storage adapter wiring + threshold 튜닝 + strict 진단 일괄 해소. revert 비용 ≈ 15분.

- **[FROZEN v2026-04-30 D-S9-recall-log-retention-decision = 보류]** (carry-over 10) — Sprint 8 D-S8-recall-log-retention-decision = 보류 재확정. 사유: branch=B C-revised 운영 — retention window 결정에 외부 데이터 신호 (retention 후 dismissed row 사용 빈도) 필요. storage T3 의 0006_telemetry.sql 영구 보존 그대로 (decision_log + satisfaction_survey). **Sprint 10 활성 경로**: `0007_recall_log_retention.sql` 신규 + 단위 테스트 + retention cron / column 정책. revert 비용 ≈ 30분.

- **[FROZEN v2026-04-30 D-S9-negation-classifier-decision = 보류]** (carry-over 11) — Sprint 8 D-S8-negation-classifier-decision = 보류 재확정. 사유: branch=B C-revised 운영 — retraction 빈도 + heuristic miss 사례 외부 데이터 부재. *engine + conversation 양 워커 시그니처 사전 합의 영구 보존 그대로* (Sprint 8 dev doc §7 line 276~454). path 결정 = 가설 1 (engine + conversation 양쪽 작성) 그대로. **Sprint 10 활성 경로**: 외부 데이터 도착 → retraction 빈도 신호 검출 시 engine `negationClassifier.ts` 본체 + conversation `loop.ts` 옵션 함수 DI + 양 root export `ClassifyNegationFn` (양 워커 동시 PR race 0). revert 비용 ≈ 1시간.

- **[FROZEN v2026-04-30 D-S9-inspector-unlink-recheck = A안 reconfirm]** (carry-over 2 재검토) — Sprint 8 D-S8-inspector-unlink-recheck = A안 reconfirm 재확정. 사유: branch=B C-revised 운영 — recall 거절 동작 부족 외부 사용자 신호 부재. Sprint 7 D-S7-inspector-unlink-decision 의 5층위 거절 메커니즘 (DismissButton variant='reject' Suggestion+Strong + HumbleRetraction chat + chatStore.dismiss + recall_log dismissed + concept-edge weight decay + concept dismiss penalty 0.5) 충분 판정 그대로 유지. **Sprint 10 B안 재진입 trigger**: 외부 데이터에서 부족 신호 검출 시 designer DismissButton variant='unlink' + Inspector 슬롯 + `copy.unlink` + mobile mount. revert 비용 ≈ 30분.

**Open Issues:**

- **PM 외부 모집 트랙 시점** — 디폴트 가정: PM 자기 페이스로 외부 모집 → consent §5 서명 → session-guide §2~7 자유 사용 → export. Sprint 10 시작 trigger 는 raw 세션 N≥3 도착 시점. PM 모집 채널 / 보상 / 법무 검토 별개 트랙.
- **Sprint 10 시간축 가정** — 디폴트 가정: 외부 데이터 도착 즉시 5종 분기 PM 사인오프 → 본체 작성 (≈ 15분 ~ 1시간 분기별). Sprint 10 dev doc §1~2 는 본 sprint §12 carry-over + Sprint 8 T6/T7 사전 합의 + 5종 활성 경로 + carry-over 2 B안 경로 모두 포함.
- **헌법 9 (외부 데이터 독립성 1차 분류) 의 분류 경계** — 디폴트 가정: caller wiring 추가/제거가 데이터 의존이면 의존, root export / 시그니처 / migration 추기는 독립. 분류 경계 모호 사례는 Sprint 10 retrospective 에 추가.
- **fixture 메타 인용 컨텍스트 인식 정책** — 디폴트 가정: T4 tester 가 fixture 작성 시 정책 자체 정의 라인 (검증 토큰 명시 / 대체어 매핑) 은 false positive 회피 위해 라인 prefix grep (`^.*"박다"|^.*검증.*토큰|^.*대체어`) 으로 제외. Sprint 8 carry-over 5 fixture-contract gap 정합.

## 12. Carry-over + Retrospective

**Carry-over (다음 스프린트가 반드시 알아야 할 것):**

1. **Sprint 10 = "External Data Arrival" sprint** — 본 sprint 의 close 분기 (B) C-revised 의 직접 후속. PM 외부 모집 → consent §5 서명 → session-guide §2~7 자유 사용 → export → `docs/sprints/sprint-10-data/raw/<session-hash>.json` 채널 → `docs/sprints/sprint-10-data/index.md` 분석 리포트 (6종 집계 지표 실측). 통상 N≥3 × M≥2 세션 수집 사이클 ≈ 1~2주 (PM pace). Sprint 10 시작 trigger = raw 세션 N≥3 도착.

2. **Sprint 10 5종 활성 경로 + carry-over 2 B안 경로 (외부 데이터 도착 시 즉시 사인오프 가능 분기)**:
   - **dedup 채택 분기 (D-S9-concept-dedup-decision)**: engine `dedupConcepts.ts` dormant 활성화 — `tsc --strict` 진단 22건 일괄 해소 + storage adapter wiring + threshold 튜닝. 외부 데이터 신호 = graph 의 동일 의미 다른 표면 토큰 빈도. ≈ 15분.
   - **negation-classifier 채택 분기 (D-S9-negation-classifier-decision)**: engine `negationClassifier.ts` 본체 + 단위 테스트 + conversation `loop.ts` 옵션 함수 DI + `loop-negation-classifier-wiring.test.ts` + 양 root export `ClassifyNegationFn` (engine + conversation 동시 PR, race 0). LLM 호출 owner = engine (extractConcepts/embed 패턴). 외부 데이터 신호 = retraction 빈도 + heuristic miss 사례. ≈ 1시간.
   - **retention 채택 분기 (D-S9-recall-log-retention-decision)**: storage `0007_recall_log_retention.sql` migration + retention cron / column 정책 + 단위 테스트. 외부 데이터 신호 = 30d 후 dismissed row 사용 빈도. ≈ 30분.
   - **theme-toggle 채택 분기 (D-S9-theme-toggle-decision)**: designer 가 `디자인 목업/content.jsx` 갱신 + `copy.theme.{light,dark,system}` 키 추가 + verify-copy 임계 상향 + mobile theme-toggle UI mount. 외부 데이터 신호 = 토글 UI 필요 신호. ≈ 30분.
   - **empty-error-copy 채택 분기 (D-S9-empty-error-copy-decision)**: designer 가 디자인 목업 갱신 + `copy.{inspector,library}.empty.*` + 임계 상향 + mobile inspector/library 분기 카피. 외부 데이터 신호 = 화면별 카피 차이 신호. ≈ 30분.
   - **carry-over 2 B안 채택 분기 (D-S9-inspector-unlink-recheck = A안 reconfirm 의 B안 전환)**: designer DismissButton variant 'unlink' + `copy.unlink` + Inspector 슬롯 + mobile mount. 외부 데이터 신호 = recall 거절 동작 부족 신호. ≈ 30분.

3. **engine T6 dormant code 영구 보존 그대로** — `packages/engine/src/dedupConcepts.ts` 175줄 + 17/17 단위 테스트 (runtime PASS) + root export (`dedupConcepts` + `DEFAULT_DEDUP_EMBED_THRESHOLD = 0.85` + 5 type). caller 미호출 = 동작 0 (dormant) 그대로. `tsc --strict` 진단 22건 보류 그대로. 헌법 10 dormant 4 조건 정합 (외부 contract 변경 0 + 동작 0 + revert ≤3분 + idempotent). Sprint 10 활성 시 일괄 해소.

4. **engine + conversation T7 사전 합의 영구 보존 그대로** — Sprint 8 dev doc §7 line 276~454 의 시그니처 합의 (`classifyNegationWithLLM` engine builder + `RetractionHookDeps.classifyNegation?` conversation 옵션 + threshold 0.7 default + sendStream 한정). path 결정 = 가설 1 (engine + conversation 양쪽 작성). 본체 코드 0. Sprint 10 채택 시 양 워커 동시 PR (race 0).

5. **fixture-contract gap 패턴 6번째 룰 후보** (Sprint 8 carry-over 5 의 next iteration) — Sprint 9 T4 에서 발견. *정책 자체 라인 패턴* (`grep 검증 (...)` / `0건 grep` / `검증 토큰 명시` 라인) 이 fixture 의 grep 대상에서 false positive 발생. tester fixture 보강으로 본 sprint 안에서 해결 (dev doc 변경 0건). Sprint 10 시 `D-S8-tester-fixture-strict-matching` 정책 5종에 6번째 룰로 추가 검토: "정책 자체 라인 패턴 (정책 정의 / 검증 토큰 명시 / 대체어 매핑) 은 fixture grep 에서 라인 prefix 패턴 (`^.*"박다"|^.*검증.*토큰|^.*대체어`) 으로 컨텍스트 인식 제외 의무".

6. **헌법 9~12 영구 확정 8 워커 정의 line 9~12 보존** — 9 (외부 데이터 독립성 1차 분류 의무) / 10 (Dormant code valid 4 조건) / 11 (Directive 진단 원인 mismatch 보고 의무) / 12 (PM frozen "박다" 0건 강제). 8 워커 모두 동일 raw text 보존 (단일 작성자 시간창 정합). Sprint 10+ spawn prompt 0번 묶음 자동 inject 표준 = 헌법 1~12 그대로.

7. **PM frozen "박다" 0건 강제 영구 적용** — 신규 작성분에서 동사 활용형 0건 강제. 메타 인용 + 정책 정의 + 검증 토큰 명시 + 대체어 매핑 영역은 제외. 본 sprint 의 신규 작성 영역 (dev doc §3~§12 / 8 워커 정의 line 9~12 / receipt fixture) 모두 검증 0건 PASS.

8. **branch=B C-revised 운영 패턴의 first 정합 사례** — 외부 데이터 의존 sprint 의 시간축 분리 (Sprint 8 carry-over 14 의 next iteration) 가 본 sprint 의 close 패턴. 인프라 sprint (1 day) + 외부 데이터 수집 sprint (1~2주) 분리. Sprint 10 가 두 번째 정합 사례 후보. 외부 데이터 의존 결정이 *모두 보류* 인 sprint 는 *재확정 + Sprint+1 trigger 명시* 패턴 (3 신규 frozen + 5 보류 재확정 + 1 A안 reconfirm = 9 frozen + 1 reconfirm).

9. **system routing replay 인식 표준** (Sprint 8 carry-over 13 의 next iteration) — 본 sprint T4 spawn 직후 task_assignment routing replay 4건 자동 도착 (T1/T2/T3 completed + T5 blockedBy = 모두 stale). 무동작 처리 정합. Sprint 10+ 도 동일 패턴 강제.

10. **DecisionAct enum 4원 + runMemoryFormation / runRecallHook / RecallFn / DecideFn / chatStore 기존 메서드 시그니처 + storage migration 0001~0006 + protocol DecisionLogAction union 9종 + 헌법 5~8 = 영구 동결** (Sprint 7 carry-over 12 + Sprint 8 carry-over 10 그대로). Sprint 9 시점 신규 동결 추가: **헌법 9~12 8 워커 정의 line 9~12 영구 보존**.

11. **stale directive 누적 (Sprint 8 8건 학습 그대로)** — 본 sprint 는 spawn 워커 1명 (tester) + team-leader 단일 작성자 시간창 강제로 stale directive 0건 (race 0). 본 sprint = stale directive 0건 first sprint. Sprint 10+ 도 단일 작성자 시간창 + spawn 워커 최소화 패턴 권장.

12. **mockup-scope-parity lint 사전 검증 표준** — `/start` 절차 §4 PM 사인오프 게이트 *전* 의무. 본 sprint 도 exit 0 (불일치 없음). Sprint 10+ 도 동일 표준.

13. **platform-adapter 누적 9회 + Sprint 9 시점 추가 0회** (Sprint 8 carry-over 9 그대로) — themeStore (7) + chatStore (8) + telemetryStore (9). Sprint 10+ 신규 mobile store 작성 시 표준 강제 (carry-over 1/13 그대로).

14. **외부 데이터 수집 sprint 의 시간축 분리 패턴 (Sprint 8 carry-over 14 의 강화)** — 본 sprint = 두 번째 정합 사례 (Sprint 8 close 분기 (A) 가 first, Sprint 9 close 분기 (B) C-revised 가 second). 패턴 영구 확정. *내부 인프라 sprint* (≤1 day) + *외부 데이터 수집 sprint* (1~2주, PM 외부 트랙) 분리 권장. Sprint 10+ 도 동일 패턴.

**Retrospective:**

- **잘 된 것**:
  - 5/5 task 완료 (T1 → T2 → T3 → T4 → T5 sequential, blocker 충실 정합) + receipt 65/65 PASS — close 분기 (B) C-revised 정합 검증 완료.
  - 본 day 안에 *외부 데이터 무관* 인프라 영역 (헌법 9~12 + 8 워커 정의 갱신 + receipt 인프라 + 5 보류 재확정 + 1 reconfirm + Sprint 10 trigger carry-over) 완결 — Sprint 8 carry-over 14 의 시간축 분리 권고 직접 적용.
  - 단일 작성자 시간창 + spawn 워커 최소화 (tester 1명만) — stale directive 0건. Sprint 8 의 8건 누적과 대비.
  - tester 의 fixture-contract gap 1건 자체 발견 + 자체 보강 (dev doc 변경 0건) — 헌법 11 (consumer-side correction) first 정합 사례. Sprint 8 carry-over 5 의 next iteration 학습 (정책 자체 라인 패턴 6번째 룰 후보).
  - 동사 활용형 0건 강제 본 sprint 신규 작성 영역 (dev doc §3~§12 / 8 워커 line 9~12 / receipt fixture) 모두 PASS — 메타 인용 + 정책 정의 + 검증 토큰 명시 + 대체어 매핑 4종 제외 영역 컨텍스트 인식 정합.
  - mockup-scope-parity lint 사전 검증 (PM 사인오프 게이트 전) exit 0 — `/start` 절차 §4 표준 정합.
  - PM 의 "Go" 한 단어로 4 결정 묶음 (시간축 모드 / 헌법 9~11 채택 / D-S9-no-pakda-term 강제 / 작업 분해) 동시 confirm — HOLD-DECIDE-RESUME 의 *묶음 사인오프* 패턴 first 사례.

- **아팠던 것**:
  - dev doc §3 Out 동사 활용형 1건 (원 표현 = 동사 활용형 1종) 작성 직후 grep 검증으로 catch + 정정. 사전 grep 의무 (헌법 12 의 raw text 검토) 가 작성 *직후* 가 아닌 작성 *직전* 에 와야 0건 first time. 단, 작성 직후 catch + 정정 cycle 도 동작.
  - Edit tool Read 선행 의무 — 8 파일 병렬 Edit 시 6 파일 (storage / engine / conversation / orchestrator / mobile / designer) Read 누락 → 첫 시도 실패 → Read 후 재시도. tail 체크 만으로 Edit 전제 충족 미달. 본 day cost ≈ 2 cycle. Sprint 10+ 표준 = Edit 대상 파일 모두 Read 선행 의무.
  - tester fixture 1차 작성 false positive 11건 — pakda-term-zero fixture 가 *정책 자체 라인 패턴* 미인지. 자체 보강으로 해결, dev doc 변경 0건. 정책 자체 라인 패턴이 fixture 토큰 boundary 정책 6번째 룰 후보 (Sprint 8 carry-over 5 next iteration).
  - dedupConcepts.ts strict 진단 22건 + dedup-concepts.test.ts strict 진단 — IDE/lsp diagnostic 알림 도착. dormant 영역 (Sprint 8 frozen "보류 시 0 가치") 정합으로 무동작 처리하나, IDE 가 매 sprint 시작 시 동일 진단 반복 발송 노이즈 가능성. Sprint 10 채택 시 일괄 해소.
  - dev doc §12 Edit 첫 시도 anchor mismatch (templating line 사이 공백) — Read 후 재시도. 본 day cost ≈ 1 cycle.

- **다음에 다르게 할 것**:
  - **sprint scope 자체가 외부 데이터 의존인 경우 sprint 시작 시점에 시간축 분리 PM confirm 의무** — 본 sprint 의 close 분기 (B) C-revised 패턴 표준화. 인프라 sprint (≤1 day) + 외부 데이터 수집 sprint (1~2주) 분리.
  - **Edit 대상 파일 모두 Read 선행 의무** — 병렬 Edit 시 tail 체크 단독으로 Edit 전제 충족 미달. 본 day cost 2 cycle.
  - **fixture 작성 직전 ACK 합의 1회 grep + 정책 자체 라인 패턴 6번째 룰 추가 검토** (Sprint 8 carry-over 5 next iteration).
  - **dev doc 작성 *직전* 동사 활용형 grep 1회 의무** — 작성 직후 catch + 정정 cycle 회피, 작성 직전 검토 완결.
  - **dormant code 영역 IDE diagnostic 노이즈 처리 정책** — Sprint 10 채택 시 일괄 해소 + dormant 영역의 *expected diagnostics* 기록 (별도 .receipt-runner allowlist 검토).
  - **PM 묶음 사인오프 패턴 표준화** — "Go" 한 단어로 다중 결정 묶음 confirm 패턴 (HOLD-DECIDE-RESUME 의 묶음 RESUME). Sprint 10+ 도 PM 시간 절약 + 결정 직렬화 정합.
  - **dev doc §12 Edit 시 anchor 정확 매칭 의무** — Read 선행 후 raw text 1:1 사용. anchor 라인 사이 공백 행 카운트 검증.
