# Sprint 10 — External Data Arrival

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`

## 1. Goal

PM 외부 모집 트랙 raw 세션 N≥3 도착 시점에 시작 — Sprint 8/9 의 외부 검증 인프라 (consent-form / session-guide / PII 정책 / telemetry schema 0006 / mobile telemetryStore / 만족도 UI / receipt 인프라 65 단계) 활용해 외부 데이터 분석 리포트 (`docs/sprints/sprint-10-data/index.md`) 생성 + **Sprint 9 의 5종 보류 frozen (`D-S9-{theme-toggle, empty-error-copy, concept-dedup, recall-log-retention, negation-classifier}-decision`) + 1종 A안 reconfirm (`D-S9-inspector-unlink-recheck`) 을 *실제 데이터 기반* 갱신 + 분기별 본체 작성** (Sprint 9 carry-over 2 의 6 분기 활성 경로 모두 PM 사인오프 후 진행). Sprint 8 carry-over 14 의 시간축 분리 패턴의 두 번째 정합 사례 (Sprint 8 close A first → Sprint 9 close B C-revised second → Sprint 10 close A second).

## 2. Deliverable & Receipt

**Deliverable:**

- **외부 테스터 N≥3 × M≥2 세션 데이터 수집 완료** — Sprint 9 인프라 영구 보존 활용 (consent-form §5 서명 + session-guide §2~7 자유 사용 + export 채널). `docs/sprints/sprint-10-data/raw/<session-hash>.json` 채널. PII 정책 (`sprint-8-pii-policy.md`) Rule 1~5 적용.
- **외부 데이터 분석 리포트 신규** — `docs/sprints/sprint-10-data/index.md`. Sprint 8 의 N=0 리포트 + Sprint 9 의 N=0 reconfirm 영구 보존 위에 신규 N≥3 리포트. 6종 집계 지표 실측값 (recall hit rate / dismiss 빈도 / retraction 빈도 / Concept dedup 신호 / recall_log retention 신호 / negation classifier miss 사례 / 만족도).
- **Sprint 9 5종 보류 frozen 갱신** — §11 `[FROZEN v<date> D-S10-{theme-toggle, empty-error-copy, concept-dedup, recall-log-retention, negation-classifier}-decision = {채택 / heuristic / LLM도입 / B안 / ...}]` 5종 갱신 (외부 데이터 신호 기반 결정).
- **D-S9-inspector-unlink-recheck reconfirm 재검증** — 외부 데이터에서 *recall 거절 동작 부족* 신호 검출 시 B안 (`D-S10-inspector-unlink-recheck = B안 채택`) 적용. 신호 부재 시 A안 reconfirm 재확정.
- **6 분기 본체 작성 (채택 분기별)**:
  - **dedup 채택**: engine `dedupConcepts.ts` dormant 활성화 — `tsc --strict` 진단 22건 일괄 해소 + storage adapter wiring + threshold 튜닝. 외부 데이터 신호 = graph 의 동일 의미 다른 표면 토큰 빈도. 헌법 10 dormant 4 조건 정합.
  - **negation-classifier 채택**: engine `negationClassifier.ts` 본체 + `__tests__/negation-classifier.test.ts` + conversation `loop.ts` 옵션 함수 DI + `loop-negation-classifier-wiring.test.ts` + 양 root export `ClassifyNegationFn` (engine + conversation 동시 PR, race 0).
  - **retention 채택**: storage `0007_recall_log_retention.sql` migration + retention cron / column 정책 + 단위 테스트. 시그니처 동결 정합 (추기 only).
  - **theme-toggle 채택**: designer 가 `디자인 목업/content.jsx` 갱신 + `copy.theme.{light,dark,system}` 키 추가 + verify-copy 임계 상향 + mobile theme-toggle UI mount.
  - **empty-error-copy 채택**: designer 가 디자인 목업 갱신 + `copy.{inspector,library}.empty.*` 키 + 임계 상향 + mobile inspector/library 분기 카피.
  - **inspector-unlink B안 채택**: designer DismissButton variant 'unlink' + `copy.unlink` + Inspector 슬롯 + mobile mount.
- **헌법 9~12 영구 보존 회귀** — Sprint 9 시점 8 워커 정의 line 9~12 raw text 그대로 보존 (workers_with_constitution=8 회귀 PASS).
- **fixture 토큰 boundary 정책 6번째 룰 추가 검토** (Sprint 9 carry-over 5) — `D-S8-tester-fixture-strict-matching` 정책 5종에 6번째 룰 ("정책 자체 라인 패턴 컨텍스트 인식 제외 의무") 추가 결정.

**Receipt (자동 검증 가능한 형태):**

- `bash scripts/receipt/sprint-10.sh` exit 0 + "✅ Sprint 10 receipt PASSED"
- Sprint 9 65 단계 wrap (`SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환)
- 신규 5~7 단계:
  1. **외부 데이터 N≥3 실측** — `docs/sprints/sprint-10-data/raw/` 디렉토리 N≥3 raw 세션 파일 + `index.md` 6종 지표 실측값 raw text 검증.
  2. **D-S10-* 6종 결정 갱신 frozen** — §11 `[FROZEN v<date> D-S10-*]` 6종 (5 보류 갱신 + 1 unlink reconfirm/B안). frozen-flag-audit lint exit 0.
  3. **분기별 본체 작성 검증** (채택 분기에 한해):
     - dedup 채택 시: `dedupConcepts.ts` strict 진단 0 + 단위 테스트 PASS + caller wiring grep.
     - negation-classifier 채택 시: engine + conversation 양 root export `ClassifyNegationFn` + 단위 테스트 PASS.
     - retention 채택 시: `0007_recall_log_retention.sql` + 단위 테스트 PASS.
     - theme-toggle / empty-error / unlink 채택 시: 디자인 목업 갱신 + copy 키 + verify-copy 임계 상향 + mobile mount.
  4. **Sprint 9 회귀 wrap** — 65 단계 그대로 PASS (Sprint 4: 32 + 5: 8 + 6: 6 + 7: 7 + 8: 7 + 9: 5).
  5. **헌법 9~12 8 워커 정의 보존 회귀** — Sprint 9 의 헌법 9~12 raw text 그대로 유지 (workers_with_constitution=8).
- 임계 보강 (D-S10-receipt-threshold-recovery) — Sprint 9 의 65단계 위에 신규 `external_session_count ≥ 3` (강제, branch=A 만) + `decisions_updated_from_S9 ≥ 5` + `pakda_term_count = 0` 보존.

## 3. Scope

> **운영 모드: no-op close** — 사용자 명시적 "작업 중지" + 외부 데이터 N=0. /start 가 PM 사인오프 게이트 직전에서 정지. dev doc §3 In/Out 확정 + §10 변경 0건 마감 + §11 3 frozen 추가 + §12 carry-over 영속화 + Sprint 11 skeleton 생성만 신규. 시간축 분리 패턴 세 번째 정합 사례 (Sprint 8 (A) first / 9 (B) C-revised second / 10 (no-op) third).
>
> §1 Goal / §2 Receipt 의 raw text 는 그대로 보존 — Sprint 11 이 reincarnation 으로 이어받음.

**In:**

- **dev doc 마감 영속화** — §3 In/Out 확정 + §10 Implementation Map (변경 0건 raw text) + §11 3 frozen (no-op-close / receipt-script-deferred / decisions-frozen-deferred) + §12 carry-over (Sprint 11 reincarnation + Sprint 9 carry-over 14 항목 그대로 이월) + retrospective.
- **Sprint 11 skeleton 생성** — `docs/sprints/sprint-11-external-data-arrival.md` (template copy + Goal/Deliverable/Receipt/Scope 초안). Sprint 10 §1~§2 raw text 그대로 복제 + carry-over 추가 항목.
- **`SPRINTS.md` 행 10 ⚠ no-op + 행 11 추가** + `_current.txt` → `11`.
- **회귀 검증 영속화** — Sprint 9 receipt 65/65 PASS + 모노레포 437 PASS 기록.

**Out:**

- **모든 코드 영역 변경 0** — packages/{storage, engine, conversation, orchestrator, design-system, protocol, llm} + apps/mobile + e2e + scripts/receipt 변경 0건. dev doc §4~§9 빈 칸 그대로 (no-op close 정합).
- **`scripts/receipt/sprint-10.sh` 미작성** + **`docs/sprints/sprint-10-data/` 미생성** + fixture 5종 미작성 — Sprint 11 활성 경로 이월.
- **D-S9-* 6 frozen 재갱신 0건** — 5종 보류 (theme-toggle / empty-error-copy / concept-dedup / recall-log-retention / negation-classifier) + 1종 A안 reconfirm (inspector-unlink-recheck) 그대로 보존. Sprint 11 trigger inline 그대로.
- **DecisionAct enum 4원 + runMemoryFormation / runRecallHook / RecallFn / DecideFn / chatStore 기존 메서드 시그니처 + storage migration 0001~0006 + protocol DecisionLogAction union 9종 + 헌법 1~12 = 영구 동결** 그대로 (Sprint 9 carry-over 10 그대로).
- **외부 데이터 N≥3 수집 / 6 분기 활성 경로 본체 작성** — Sprint 11 (외부 데이터 도착 시) 이월.
- **신규 화면 / 신규 패키지 / e2e 시나리오 신규 추가** — 그대로 유지. 7 패키지 + 9 화면 그대로.

## 4. Architecture & Data Flow
<텍스트 다이어그램 / 데이터 흐름 / 관여 패키지>

## 5. File Ownership
| Agent | Files |
|---|---|
| | |

## 6. Tasks
| ID | Description | Owner | Blocked By |
|---|---|---|---|
| | | | |

## 7. Interfaces / Contracts
<함수 시그니처, 메시지 타입, 패키지 경계 — 책임 에이전트가 결정될 때마다 추기>

## 8. Test Scenarios
<디자인 목업/기획서 인용 시나리오 + 자동화 위치 (`e2e/scenarios/...`)>

## 9. Demo Script
<step-by-step 시연 스크립트 — receipt 재현용>

## 10. Implementation Map

### team-leader (no-op close 마감)
- `docs/sprints/sprint-10-external-data-arrival.md` §3 In/Out 확정 + §10 + §11 (3 frozen + 3 Open Issues) + §12 (9 carry-over + retrospective) 마감. §4~§9 빈 칸 그대로 (no-op close 정합).
- `docs/sprints/sprint-11-external-data-arrival.md` skeleton 신규 — Sprint 10 §1~§2 raw text 그대로 복제 (reincarnation) + Scope 초안.
- `SPRINTS.md` 행 10 ⚠ no-op partial + 행 11 추가 + 한 줄 결과 갱신.
- `docs/sprints/_current.txt` → `11`.

### 코드 영역 변경 0 (no-op close 정합)
- `packages/storage/` — Sprint 9 그대로 보존 (telemetry schema 0006 + repo 모듈 + protocol union). 0007_recall_log_retention.sql 미작성 (D-S9-recall-log-retention-decision = 보류 그대로).
- `packages/engine/` — Sprint 9 그대로 보존. `dedupConcepts.ts` 175줄 + 17/17 단위 테스트 + root export = dormant 그대로 (`tsc --strict` 진단 22건 보류 그대로). `negationClassifier.ts` 본체 미작성 (D-S9-negation-classifier-decision = 보류 그대로).
- `packages/conversation/` — Sprint 9 그대로 보존. `loop.ts` 옵션 함수 DI 미추기 (D-S9-negation-classifier-decision = 보류 그대로).
- `apps/mobile/` — Sprint 9 그대로 보존. `themeStore` 시스템 자동 디폴트 / inspector·library 분기 카피 / Inspector unlink 슬롯 미추기 (D-S9-{theme-toggle, empty-error-copy}-decision = 보류 + D-S9-inspector-unlink-recheck = A안 reconfirm 그대로).
- `packages/design-system/` — Sprint 9 그대로 보존. `copy.theme.*` / `copy.{inspector,library}.empty.*` / `copy.unlink` 미추기. 디자인 목업 갱신 0건. verify-copy 임계 그대로.
- `packages/orchestrator/` — Sprint 9 그대로 보존. 시그니처 동결 + 임계 6종 그대로.
- `scripts/receipt/sprint-10.sh` 미작성 + `docs/sprints/sprint-10-data/` 미생성 + fixture 5종 미작성 (D-S10-receipt-script-deferred 정합).

### 회귀 검증 (no-op close 진입 직전)
- **Sprint 9 receipt 65/65 PASS** (`SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-9.sh` exit 0 + "✅ Sprint 9 receipt PASSED"). spawn_prompt_update_pass=1 / pakda_term_zero_pass=1 / decisions_re_frozen_pass=1 / inspector_unlink_reconfirm_pass=1 / sprint_8_wrap_pass=1 / workers_with_constitution=8 / pakda_term_count=0 / frozen_decisions_updated=5 / sprint10_trigger_marks=5.
- **모노레포 437 PASS** (`pnpm -r test`): protocol 22 + llm 6 + engine 103 + storage 85 + design-system 107 + orchestrator 59 + conversation 52 + e2e 3. mobile = skip (정책).
- **frozen-flag-audit lint exit 0** (Sprint 10 dev doc 대상, 마감 직전 사전 검증).
- 헌법 1~12 8 워커 정의 line 9~12 보존 회귀 PASS (workers_with_constitution=8).

### Sprint 11 skeleton (생성)
- `docs/sprints/sprint-11-external-data-arrival.md` — `_template.md` 복사 + §1 Goal (Sprint 10 §1 그대로 복제, reincarnation) + §2 Deliverable & Receipt (Sprint 10 §2 그대로 복제 + Sprint 9 wrap 65 단계로 정합) + §3 Scope 초안 (다음 /start 시 PM 사인오프 후 확정).

## 11. Decisions Made / Open Issues

**Decisions Made:**

- **[FROZEN v2026-04-30 D-S10-no-op-close]** Sprint 10 운영 모드 = no-op close 영구 확정. 사유: 사용자 명시적 "작업 중지" + 외부 데이터 N=0 (PM 외부 모집 트랙 raw 세션 미도착). /start 가 PM 사인오프 게이트 직전에서 정지 → dev doc §3 In/Out 확정 + §10 변경 0건 마감 + §11 3 frozen 추가 + §12 carry-over (Sprint 11 reincarnation) + Sprint 11 skeleton 생성만 신규. 코드 영역 변경 0건. Sprint 9 carry-over 14 항목 그대로 Sprint 11 으로 이월. 시간축 분리 패턴 세 번째 정합 사례 (Sprint 8 (A) first / 9 (B) C-revised second / 10 (no-op) third). revert 비용: Sprint 11 이 Sprint 10 §1~§2 raw text 그대로 복제 + 외부 데이터 도착 시점에 PM 사인오프 후 진행.

- **[FROZEN v2026-04-30 D-S10-receipt-script-deferred]** `scripts/receipt/sprint-10.sh` 미작성 + `docs/sprints/sprint-10-data/` 디렉토리 미생성 + fixture 5종 미작성 영구 확정. 사유: no-op close 정합 (sprint 작업 본체 0건이므로 receipt 자체 무의미). Sprint 11 활성 경로에서 `scripts/receipt/sprint-11.sh` 신규 작성 (Sprint 9 65 단계 wrap + 신규 5~7 단계). revert 비용: Sprint 11 sprint-11.sh 작성 cost 와 동일 (≈ 30분 ~ 1시간).

- **[FROZEN v2026-04-30 D-S10-decisions-frozen-deferred]** D-S9-* 6 frozen (5종 보류 + 1 reconfirm) 그대로 보존 + 재갱신 0건 영구 확정. 사유: no-op close 정합. Sprint 9 §11 의 `[FROZEN v2026-04-30 D-S9-{theme-toggle, empty-error-copy, concept-dedup, recall-log-retention, negation-classifier}-decision = 보류]` 5종 + `[FROZEN v2026-04-30 D-S9-inspector-unlink-recheck = A안 reconfirm]` 1종 그대로 raw text 보존. Sprint 11 trigger inline 그대로 (외부 데이터 도착 시 6종 일괄 갱신). revert 비용: Sprint 11 §11 신규 D-S11-* 6종 frozen 작성 (≈ 5분).

**Open Issues:**

- **PM 외부 모집 트랙 raw 세션 N=0** — Sprint 11 시작 trigger = raw 세션 N≥3 도착. PM 자기 페이스 별도 트랙 (consent §5 서명 → session-guide §2~7 자유 사용 → export → `docs/sprints/sprint-11-data/raw/<session-hash>.json` 채널). 모집 채널 / 보상 / 법무 검토 별개.

- **web 빌드 데모 모드 표면 인식 부족** (Sprint 10 사용자 시연 first 발견) — `apps/mobile/src/chatStore.web.ts` 의 `DEMO_REPLY_KO = ['환영해요. ', '무엇이든 ', '떠오르는 ', '대로 ', '적어보세요.']` 5토큰 cycle 이 사용자 첫 진입 시 LLM 응답으로 오해됨 (Sprint 1 D-S1-* 의도된 동작 — better-sqlite3 native-only 우회). Onboarding 또는 firstChat 의 카피만으로는 데모 vs 실 LLM 구분 불가. Sprint 11 활성 경로에서 D-S11-web-demo-banner-decision 후보 (Onboarding 또는 firstChat empty 카피에 "데모 모드" 마이크로 카피 / ErrorState reason 'demo-mode' / 별도 마이크로 토스트 추가 검토). web 빌드 또는 dev 서버 진입 시점 분기 필요.

- **dist 정적 export SPA fallback 미설정** (Sprint 10 사용자 시연 first 발견) — `apps/mobile/dist/index.html` 단일 + `_expo/static/js/web/entry-*.js` 단일 번들. `serve` 기본 모드는 `/chat` `/onboarding` `/inspector` 등 모든 dynamic 라우트를 404 반환 → client-side 라우팅 실패. `serve -s` (SPA fallback) 의무. 실행 가이드 / README 또는 별도 인프라 문서 작성 검토 (Sprint 11 또는 별개 dev-infra sprint).

- **dormant code IDE diagnostic 노이즈** (Sprint 9 retro 이월) — `dedupConcepts.ts` strict 진단 22건 매 sprint 시작 시 반복 발송. Sprint 11 dedup 채택 시 일괄 해소 + 별개 `.receipt-runner` allowlist 검토 후보.

## 12. Carry-over + Retrospective

**Carry-over (다음 스프린트가 반드시 알아야 할 것):**

1. **Sprint 11 = "External Data Arrival" sprint (Sprint 10 의 reincarnation)** — Sprint 10 의 §1 Goal + §2 Receipt raw text 그대로 복제. trigger = raw 세션 N≥3 도착. PM 외부 모집 트랙 PM 자기 페이스 별도 진행. Sprint 8 carry-over 14 시간축 분리 패턴 네 번째 정합 사례 후보.

2. **Sprint 10 = no-op close 영구 확정** — 사용자 명시적 "작업 중지" + 외부 데이터 N=0. /start 가 PM 사인오프 게이트 직전에서 정지 → dev doc 3 frozen + carry-over + Sprint 11 skeleton 생성만 신규. 코드 영역 변경 0. Sprint 9 carry-over 14 항목 그대로 Sprint 11 이월.

3. **Sprint 9 carry-over 14 항목 그대로 이월** (외부 신호 부재로 변동 0) — 5종 활성 경로 (dedup ≈15분 / negation-classifier ≈1시간 / retention ≈30분 / theme-toggle ≈30분 / empty-error-copy ≈30분) + carry-over 2 B안 (unlink ≈30분) / dormant code 영구 보존 / 사전 합의 영구 보존 / fixture 6번째 룰 후보 / 헌법 9~12 8 워커 정의 line 9~12 보존 / "박다" 0건 강제 / 시간축 분리 패턴 / system routing replay 표준 / 동결 영역 / stale directive 0건 first sprint / mockup-scope-parity lint 사전 검증 표준 / platform-adapter 누적 9회 / 외부 데이터 sprint 시간축 분리.

4. **web 빌드 데모 모드 마이크로 카피 후보** (Sprint 10 사용자 시연 first 발견) — `chatStore.web.ts` DEMO_REPLY_KO 5토큰 cycle 표면 인식 부족. Sprint 11 활성 경로에서 D-S11-web-demo-banner-decision 후보 (Onboarding 또는 firstChat empty 카피에 "데모" 마이크로 카피 / ErrorState reason 'demo-mode' 추가 / 별도 마이크로 토스트). web 빌드 진입 시점 분기 필요. native iOS/Android 빌드는 `chatStore.ts` 활성 → 실 Gemma + SQLite 동작 그대로 (영향 0).

5. **dist 정적 export SPA fallback 인프라 문서 후보** (Sprint 10 사용자 시연 first 발견) — `serve -s` 플래그 의무. README 또는 별도 dev-infra 문서 작성 검토 (Sprint 11 활성 경로 또는 별개). 실행 명령 인덱스: `pnpm --filter mobile build` (export) + `npx serve -s apps/mobile/dist -l 3000` (SPA fallback) + Ollama CORS (`OLLAMA_ORIGINS="http://localhost:3000" ollama serve`).

6. **dormant code IDE diagnostic 노이즈** (Sprint 9 retro 이월) — `dedupConcepts.ts` strict 진단 22건 반복. Sprint 11 dedup 채택 시 일괄 해소 + 별개 `.receipt-runner` allowlist 검토 후보.

7. **헌법 1~12 영구 확정 + 8 워커 정의 line 9~12 보존 회귀 PASS** — Sprint 9 65/65 receipt 재실행 PASS (workers_with_constitution=8 / pakda_term_count=0). 시그니처 동결 정합.

8. **모노레포 437 테스트 PASS 회귀 무결** — protocol 22 + llm 6 + engine 103 + storage 85 + design-system 107 + orchestrator 59 + conversation 52 + e2e 3 = 437. mobile = skip (정책). Sprint 5 시점 242 PASS 대비 +195 (Sprint 6/7/8/9 누적). 시그니처 동결 정합.

9. **PM 사인오프 게이트 직전 작업 중지 패턴 first 사례** — /start 가 PM 사인오프 게이트 *전* dev doc/코드 변경 0건 보존. /start 의 절대 규칙 "PM 사인오프 *전*에는 어떤 코드 변경도 하지 않는다" 정합. /end 표준 동작 = no-op close (3 frozen + carry-over + skeleton 생성). Sprint 11+ 동일 패턴 권장.

10. **시간축 분리 패턴 세 번째 정합 사례 영구 확정** — Sprint 8 (A) first / 9 (B) C-revised second / 10 (no-op) third → Sprint 11+ 도 동일 패턴 권장. 외부 데이터 도착 미확인 sprint 의 표준 close 모드.

**Retrospective:**

- **잘 된 것**:
  - Sprint 9 65/65 receipt 회귀 PASS + 모노레포 437 PASS — 인프라 견고함 검증 (시그니처 동결 정합 + 헌법 1~12 8 워커 정의 보존).
  - PM 사인오프 게이트 직전 작업 중지 시 dev doc/코드 변경 0건 보존 first 사례 — /start 절대 규칙 정합.
  - 사용자 web 데모 표면 인식 진단 끝까지 추적 — 번들 unicode-escape grep + DEMO_REPLY_KO cycle 분석 + "하야" 0 hits 확정 → 데모 vs 실 LLM 명확 구분 (Sprint 11 마이크로 카피 후보 도출).
  - 정적 dist serve SPA fallback 진단 (-s 플래그 부재 → 404) 즉시 catch + 해결 (Sprint 11 인프라 문서 후보 도출).
  - frozen-flag-audit lint exit 0 + Sprint 9 receipt 65/65 PASS + 모노레포 437 PASS 일괄 검증 — 마감 직전 회귀 무결.
  - "박다" 동사 활용형 0건 강제 본 sprint 신규 작성 영역 모두 PASS (헌법 12 정합) — 메타 인용 + 정책 정의 + 검증 토큰 + 대체어 매핑 4종 제외 영역 컨텍스트 인식 정합.

- **아팠던 것**:
  - 외부 데이터 N=0 → Sprint 10 = no-op close. 시간축 분리 패턴 세 번째 적용 (Sprint 8 (A) first / 9 (B) C-revised second / 10 (no-op) third). PM 외부 모집 트랙 raw 세션 도착 1~2주 cycle 가정 — Sprint 10 시작 시점에 trigger 미충족 사전 catch 필요.
  - 사용자 web 빌드 첫 진입 시 데모 모드 명시 부재 (Onboarding / firstChat 카피만으로는 LLM 응답 vs DEMO cycle 구분 불가) — 마이크로 카피 미작성. Sprint 1 D-S1-* 의도된 동작이지만 외부 사용자 표면 인식 불충분.
  - dist 정적 export SPA fallback 미설정 (`serve -s` 플래그 부재 → 404) — 사용자 첫 진입 시 라우팅 실패 표면. README 또는 dev-infra 문서 부재.

- **다음에 다르게 할 것**:
  - **Sprint N = no-op close 패턴 표준화** — 외부 데이터 도착 미확인 sprint 의 표준 close 모드. Sprint 8 carry-over 14 의 next iteration. /start 절차 §1 (현재/직전 스프린트 식별) 직후 trigger 사전 확인 의무 (raw 세션 디렉토리 / 데이터 N≥3 사전 검증) → 미충족 시 PM 에게 즉시 no-op close 옵션 제시.
  - **web 빌드 데모 모드 표면 인식 카피 추가 검토** — D-S11-web-demo-banner-decision 후보. Onboarding 또는 firstChat empty 카피에 "데모 모드" 마이크로 카피 / ErrorState reason 'demo-mode' / 별도 마이크로 토스트 추가.
  - **dist 정적 export 실행 가이드 README 또는 별개 dev-infra 문서 작성 검토** — `npx serve -s apps/mobile/dist -l 3000` + Ollama CORS (`OLLAMA_ORIGINS="http://localhost:3000" ollama serve`) 표준 명시.
  - **PM 사인오프 게이트 직전 작업 중지 시 /end 표준 동작 영구 확정** — dev doc §3 In/Out 확정 (no-op close raw text) + §10 변경 0건 + §11 3 frozen (no-op-close / receipt-script-deferred / decisions-frozen-deferred) + §12 carry-over (Sprint+1 reincarnation) + Sprint+1 skeleton. Sprint 10 first 사례 → Sprint 11+ 표준.
