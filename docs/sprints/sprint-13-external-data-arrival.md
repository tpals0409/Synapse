# Sprint 13 — External Data Arrival

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`
>
> **Reincarnation note (세 번째 reincarnation, 4중 동일 raw text 체인)**: 본 §1~§2 raw text 는 Sprint 11 §1~§2 의 1:1 복제이자 Sprint 12 §1~§2 의 1:1 복제 (Sprint 10→11→12→13 = 4중 동일 raw text 체인). Sprint 12 = no-op close 영구 확정 (X4 swap, Agent View worktree base 시스템 결함으로 워커 dispatch 본체 진행 불가). 본 sprint 시작 trigger = PM 외부 모집 트랙 raw 세션 N≥3 도착 **OR** Agent View 결함 해소 후 Sprint 12 메타 본체 inheritance 진행. trigger 미충족 시 Sprint 10/11/12 patterns (no-op close → §12 carry-over + Sprint 14 reincarnation) 직접 적용 — **시간축 분리 패턴 여섯 번째 정합 사례** 후보.
>
> **시스템 결함 사전 점검 의무 (Sprint 12 신규)**: `/start` 진입 직후 다음 2 단계 사전 검증:
> 1. **Agent View worktree base 결함 점검** — 임의 Agent tool isolation=worktree 호출 → 새 worktree 의 `git log -1 --format="%H %s"` 출력. main HEAD 와 다르면 (특히 `15f8228 sprint-5` fix point) 시스템 결함 여전 → Sprint 13 워커 dispatch 패턴을 X2 (manual worktree) 또는 X3 (isolation 미사용) 강제. cmux 인프라 점검 별개 트랙.
> 2. **`.gitignore` 영속성 회귀 점검** — `git check-ignore -v docs/sprints/sprint-13-*.md .claude/agents/designer.md CLAUDE.md` 실행. hit 발견 시 영속성 결함 회귀 → 즉시 hotfix.
>
> **식별자 swap**: `/start` PM 사인오프 후 §3 Scope 확정 시 D-S11/12-* → D-S13-* 식별자 swap. 본 skeleton 단계에서는 raw text 보존 위해 D-S11-* 그대로 두되, §3 운영 모드 (branch=A active / branch=B no-op close / X2/X3 manual dispatch) 결정과 함께 swap.

## 1. Goal

PM 외부 모집 트랙 raw 세션 N≥3 도착 시점에 시작 — Sprint 8/9 의 외부 검증 인프라 (consent-form / session-guide / PII 정책 / telemetry schema 0006 / mobile telemetryStore / 만족도 UI / receipt 인프라 65 단계) 활용해 외부 데이터 분석 리포트 (`docs/sprints/sprint-13-data/index.md`) 생성 + **Sprint 9 의 5종 보류 frozen (`D-S9-{theme-toggle, empty-error-copy, concept-dedup, recall-log-retention, negation-classifier}-decision`) + 1종 A안 reconfirm (`D-S9-inspector-unlink-recheck`) 을 *실제 데이터 기반* 갱신 + 분기별 본체 작성** (Sprint 9 carry-over 2 의 6 분기 활성 경로 모두 PM 사인오프 후 진행). **추가 (Sprint 12 신규 inheritance)**: Sprint 12 메타 sprint 본체 50% (designer copy 키 `firstChat.empty.demoHint` + mobile `Platform.OS === 'web'` 분기 mount + tester sprint-13.sh + fixture 4종) 함께 진행 가능 — Agent View worktree base 결함 해소 시 또는 X2/X3 패턴 강제 시. Sprint 8 carry-over 14 의 시간축 분리 패턴의 **여섯 번째 정합 사례 후보** (Sprint 8 close A first → Sprint 9 close B C-revised second → Sprint 10 no-op close third → Sprint 11 no-op close fourth → Sprint 12 no-op close X4 swap fifth → Sprint 13 active or no-op sixth).

## 2. Deliverable & Receipt

**Deliverable:**

- **외부 테스터 N≥3 × M≥2 세션 데이터 수집 완료** — Sprint 9 인프라 영구 보존 활용 (consent-form §5 서명 + session-guide §2~7 자유 사용 + export 채널). `docs/sprints/sprint-13-data/raw/<session-hash>.json` 채널. PII 정책 (`sprint-8-pii-policy.md`) Rule 1~5 적용.
- **외부 데이터 분석 리포트 신규** — `docs/sprints/sprint-13-data/index.md`. Sprint 8 의 N=0 리포트 + Sprint 9 의 N=0 reconfirm + Sprint 10/11/12 의 no-op close 영구 보존 (3중 연속) 위에 신규 N≥3 리포트. 6종 집계 지표 실측값 (recall hit rate / dismiss 빈도 / retraction 빈도 / Concept dedup 신호 / recall_log retention 신호 / negation classifier miss 사례 / 만족도).
- **Sprint 9 5종 보류 frozen 갱신** — §11 `[FROZEN v<date> D-S13-{theme-toggle, empty-error-copy, concept-dedup, recall-log-retention, negation-classifier}-decision = {채택 / heuristic / LLM도입 / B안 / ...}]` 5종 갱신 (외부 데이터 신호 기반 결정).
- **D-S9-inspector-unlink-recheck reconfirm 재검증** — 외부 데이터에서 *recall 거절 동작 부족* 신호 검출 시 B안 (`D-S13-inspector-unlink-recheck = B안 채택`) 적용. 신호 부재 시 A안 reconfirm 재확정.
- **6 분기 본체 작성 (채택 분기별)**:
  - **dedup 채택**: engine `dedupConcepts.ts` dormant 활성화 — `tsc --strict` 진단 22건 일괄 해소 + storage adapter wiring + threshold 튜닝.
  - **negation-classifier 채택**: engine `negationClassifier.ts` 본체 + conversation `loop.ts` 옵션 함수 DI + 양 root export `ClassifyNegationFn`.
  - **retention 채택**: storage `0007_recall_log_retention.sql` migration + retention cron / column 정책 + 단위 테스트.
  - **theme-toggle 채택**: designer `디자인 목업/content.jsx` 갱신 + `copy.theme.{light,dark,system}` 키 + verify-copy 임계 상향 + mobile theme-toggle UI mount.
  - **empty-error-copy 채택**: designer 디자인 목업 갱신 + `copy.{inspector,library}.empty.*` 키 + 임계 상향 + mobile inspector/library 분기 카피.
  - **inspector-unlink B안 채택**: designer DismissButton variant 'unlink' + `copy.unlink` + Inspector 슬롯 + mobile mount.
- **Sprint 12 메타 본체 inheritance (Sprint 12 미수행 50%)**:
  - **designer Tier 1**: `copy.{ko,en}.firstChat.empty.demoHint` 신규 카피 키 + verify-copy 임계 ≥ 24 (Sprint 7 ok=23 +1).
  - **mobile Tier 3**: `apps/mobile/src/firstChat.tsx` web 분기 demoHint mount (`Platform.OS === 'web'`).
  - **tester Tier 3**: `scripts/receipt/sprint-13.sh` + 신규 fixture 4종 (end-mark-live-measure / receipt-infra-path-swap / dev-infra-doc / web-demo-banner) + Sprint 9 65 단계 wrap. **단, sprint-12.sh 가 미작성이었으므로 Sprint 13 fixture 가 처음으로 sprint-12.sh 의 4 단계 정책을 검증**.
- **Agent View 결함 우회 패턴 영속화 (Sprint 12 신규 inheritance)**:
  - **X2 또는 X3 패턴 강제** — Agent View worktree base 시스템 결함 해소 전까지 manual worktree (X2) 또는 isolation 미사용 (X3) 강제. `/start` 절차 §8/§10/§12 dispatch 본문 갱신 (메타 sprint 별개 또는 본 sprint 활성 경로).
- **헌법 9~12 영구 보존 회귀** — Sprint 9~12 시점 8 워커 정의 line 9~12 raw text 그대로 보존 (workers_with_constitution=8 회귀 PASS).
- **fixture 토큰 boundary 정책 6번째 룰 추가 검토** (Sprint 9~12 carry-over 항목, 4중 연속 미해소) — `D-S8-tester-fixture-strict-matching` 정책 5종에 6번째 룰 ("정책 자체 라인 패턴 컨텍스트 인식 제외 의무") 추가 결정.

**Receipt (자동 검증 가능한 형태):**

- `bash scripts/receipt/sprint-13.sh` exit 0 + "✅ Sprint 13 receipt PASSED"
- Sprint 9 65 단계 wrap (`SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환) — D-S11-receipt-infra-hotfix 후 65/65 PASS 안정.
- 신규 4~7 단계:
  1. **외부 데이터 N≥3 실측** (branch=A 만 강제) — `docs/sprints/sprint-13-data/raw/` 디렉토리 N≥3 raw 세션 파일 + `index.md` 6종 지표 실측값 raw text 검증.
  2. **D-S13-* 6종 결정 갱신 frozen** — §11 `[FROZEN v<date> D-S13-*]` 6종 (5 보류 갱신 + 1 unlink reconfirm/B안). frozen-flag-audit lint exit 0.
  3. **Sprint 12 메타 본체 inheritance 4 단계** (sprint-12.sh 의 미작성 fixture 인계):
     - end-mark-live-measure / receipt-infra-path-swap / dev-infra-doc / web-demo-banner 4 fixture.
  4. **분기별 본체 작성 검증** (채택 분기별).
  5. **Sprint 9 회귀 wrap** — 65 단계 PASS.
  6. **헌법 9~12 8 워커 정의 보존 회귀** — workers_with_constitution=8.
  7. **Agent View 결함 우회 패턴 receipt** — X2 또는 X3 dispatch 흔적 (manual worktree commit 또는 isolation 없는 Agent tool 호출 흔적) raw text 검증.
- 임계 보강 (D-S13-receipt-threshold-recovery) — Sprint 9 의 65단계 위에 신규 `external_session_count ≥ 3` (강제, branch=A 만) + `decisions_updated_from_S9 ≥ 5` + `pakda_term_count = 0` 보존 + `verify_copy_ok ≥ 24` (Sprint 12 inheritance) + `agent_view_workaround_pattern ≥ 1`.

## 3. Scope
**In:**
- *(다음 `/start` PM 사인오프 후 확정)*

**Out:**
- *(다음 `/start` PM 사인오프 후 확정)*

## 4. Architecture & Data Flow
<텍스트 다이어그램 / 데이터 흐름 / 관여 패키지 — `/start` 후 작성>

## 5. File Ownership
| Agent | Tier | Files |
|---|---|---|
| | | |

> **Tier 정의** (Sprint 11+, Agent View 단계별 dispatch 용):
> - **Tier 1 (producer-only)**: 다른 워커가 의존하는 영향력 있는 변경 — protocol 타입, storage 마이그레이션, design tokens breaking change. 동시 dispatch OK (서로 충돌 안 함).
> - **Tier 2 (의존 + 자체 export)**: Tier 1 결과를 import 하면서 자기도 새 export 제공 — engine / conversation / orchestrator 의 일반 슬라이스.
> - **Tier 3 (소비자만)**: 모든 producer 결과를 consume — mobile UI, tester e2e.
>
> **Sprint 13 신규 (Agent View 결함 우회 패턴 강제)**: `/start` dispatch 본문이 X2 (manual worktree) 또는 X3 (isolation 미사용) 강제. Agent View isolation=worktree 사용 금지 (cmux 결함 해소 전까지). 워커 헌법 4 (단일 작성자 시간창) 보장 위해 **순차 dispatch 강제** (Tier 끼리도 동시 X).

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
<실제로 만들어진 파일/함수/엔드포인트 인덱스>

## 11. Decisions Made / Open Issues
**Decisions Made:**
- *(/end 가 채움)*

**Open Issues:**
- *(/end 가 채움)*

## 12. Carry-over + Retrospective
**Carry-over (다음 스프린트가 반드시 알아야 할 것):**
- *(빈 칸 금지. /end 가 채움.)*

**Retrospective:**
- 잘 된 것:
- 아팠던 것:
- 다음에 다르게 할 것:
