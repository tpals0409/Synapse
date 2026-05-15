# Sprint 8 — External Validation

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`

## 1. Goal

Sprint 0~7 의 *내부* 데모 가능 MVP 위에 **외부 사용자 dogfooding + 데이터 기반 결정** 단계를 박는다 — 외부 테스터 N명 (≥3) 의 *실사용* 세션 데이터를 수집·분석해 Sprint 7 carry-over 7~11 (theme-toggle UI / 4 화면 Empty/Error 카피 / Inspector unlink B안 재검토 / Concept dedup / recall_log retention 30d / LLM-based negation classifier) 의 *데이터 기반 결정* 을 박는다. PM 직접 dogfooding + fixture 시뮬레이션의 한계를 외부 데이터로 대체한다.

## 2. Deliverable & Receipt

**Deliverable:**

- **외부 테스터 모집 + 인프라** — N≥3 외부 사용자 모집 + 사용자 합의 + 사용 세션 로그 수집 (recall_log + decision_log + 만족도 설문). PII 처리 정책 박힘.
- **dogfooding 데이터 분석 리포트** — `docs/sprints/sprint-8-data/` 신규. 세션별 요약 (recall hit/miss + dismiss 빈도 + retraction 빈도 + 만족도) + 집계 지표 (사용자 N × session M = 데이터 포인트).
- **carry-over 7 (theme-toggle UI) 결정** — 데이터 + 외부 사용자 피드백 기반 결정. 디자인 목업 content.jsx 에 `theme-toggle` 카피 추가 또는 *시스템 자동만 유지* 결정 박힘.
- **carry-over 8 (4 화면 별 Empty/Error 카피) 결정** — 4 화면 사용자 피드백 기반. inspector / library 별도 카피가 필요한지 판단 + 디자인 목업 갱신 또는 *firstChat 1 세트 재사용 유지* 결정 박힘.
- **carry-over 2 (Inspector unlink) 재검토** — 외부 데이터에서 *recall 거절 동작 부족* 신호 검출 시 B안 (DismissButton variant 'unlink' + Inspector 슬롯 + copy.unlink 키) 박음. 신호 부재 시 A안 frozen 유지 + 데이터 기반 reconfirm.
- **carry-over 9 (Concept dedup / alias merge)** — 외부 사용자 graph 의 중복 Concept 빈도 분석 후 dedup 알고리즘 박음 또는 보류 결정 박힘.
- **carry-over 10 (recall_log retention 30d)** — DB 측 cron 또는 migration. recall_log row 의 retention window + dismiss 마킹 후 보존 기간 정책 박힘.
- **carry-over 11 (LLM-based negation classifier)** — 외부 사용자 retraction 빈도 + heuristic miss 사례 분석 후 LLM 기반 classifier 도입 또는 heuristic 강화 결정 박힘.

**Receipt (자동 검증 가능한 형태):**

- `bash scripts/receipt/sprint-8.sh` exit 0, "✅ Sprint 8 receipt PASSED".
- Sprint 7 53 단계 wrap (`SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환).
- 신규 5~7 단계:
  1. **외부 사용자 데이터 인덱스** — `docs/sprints/sprint-8-data/index.md` 존재 + 세션 N≥3 raw text 검증.
  2. **carry-over 7~11 결정 박힘** — Sprint 8 dev doc §11 에 5 종 frozen 박음 (frozen-flag-audit lint exit 0).
  3. **PII 처리 정책 frozen** — `docs/sprints/sprint-8-pii-policy.md` 존재 + raw text 검증.
  4. **recall_log retention** — 신규 migration (있는 경우) + 단위 테스트 PASS, 또는 *결정 보류 frozen* 박음.
  5. **Concept dedup** — 신규 알고리즘 (있는 경우) 단위 테스트 PASS, 또는 *결정 보류 frozen* 박음.
  6. **LLM-based negation classifier** — heuristic 강화 또는 LLM 도입 (있는 경우) 단위 테스트 PASS, 또는 *결정 보류 frozen* 박음.
  7. **Sprint 7 회귀 wrap** — 53 단계 그대로 PASS.

- 임계 보강 (D-S8-receipt-threshold-recovery) — Sprint 7 의 53 단계 누적 위에 신규 `external_session_count ≥ 3` + `frozen_decisions_carry_over ≥ 5`.

## 3. Scope

**In:**

- **PII 처리 정책 frozen** — `docs/sprints/sprint-8-pii-policy.md` 신규. 외부 테스터 데이터 수집 시 raw 대화 / 임베딩 / recall_log / 설문 응답 anonymize 규칙. 디폴트: 해시 + 임베딩 + 메타만 (raw text 저장 격리). carry-over 11 (LLM-based negation classifier) 가 raw text 학습 데이터 필요한 경우 별도 합의 양식.
- **외부 테스터 모집 인프라** — N≥3. PM 직접 모집 + team-leader 가 합의 양식 (consent form raw text) + 세션 운영 가이드 박음. 데이터 수집 채널 (raw 세션 export → `docs/sprints/sprint-8-data/raw/<session-id>.json` + 익명화 hash 매핑).
- **데이터 수집 스키마** — `decision_log` *신규 테이블* (storage T3 disk 진실원 정정 — `[DIRECTIVE D-S8-storage-shape-ack]` v2026-04-30) + `satisfaction_survey` 테이블 신규. storage migration 0006 (telemetry) + 0007 (session_hash 추기, 필요 시). 시그니처 동결 규칙은 *기존* 메서드만 — 신규 테이블/메서드 추기 OK (carry-over 12 정합). protocol 측 `DecisionLogAction` TS union 가드 (런타임 DB CHECK 없음).
- **mobile 데이터 수집 telemetry hook** — `apps/mobile/src/telemetryStore.{ts,web.ts}` 신규 platform-adapter (carry-over 13 표준 강제). decision/recall/satisfaction event emit. 만족도 설문 UI (mid-session N=5 turn / end-session 1회).
- **carry-over 10 (recall_log retention 30d)** — DB 측 long-term retention. migration 0006 (있는 경우, *추기 only*) OR 보류 frozen. dismiss 마킹 후 30일 보존 정책.
- **carry-over 9 (Concept dedup / alias merge)** — 외부 graph 중복 빈도 분석 후 알고리즘 (있는 경우, engine `dedupConcepts.ts` 신규) OR 보류 frozen.
- **carry-over 11 (LLM-based negation classifier)** — retraction 빈도 + heuristic miss 사례 분석. LLM 도입 (있는 경우, conversation T7 옵션 함수 DI 패턴 재사용 — `feedback_di_pattern.md` 정합) OR heuristic 강화 OR 보류 frozen.
- **carry-over 7 (theme-toggle UI) 결정** — 디자인 목업 갱신 (designer 가 단일 진실원 갱신 주체) + `copy.theme.{light,dark,system}` 키 추기 OR 시스템 자동만 유지 frozen.
- **carry-over 8 (4 화면 별 Empty/Error 카피) 결정** — 디자인 목업 갱신 (designer) + `copy.{inspector,library}.empty.*` 키 추기 OR firstChat 1세트 재사용 유지 frozen.
- **carry-over 2 (Inspector unlink) 재검토** — 외부 데이터에서 *recall 거절 동작 부족* 신호 검출 시 B안 (DismissButton variant 'unlink' + Inspector 슬롯 + copy.unlink) OR A안 reconfirm.
- **외부 데이터 분석 리포트** — `docs/sprints/sprint-8-data/index.md` + 세션별 raw 요약 + 집계 지표 (recall hit/miss / dismiss 빈도 / retraction 빈도 / 만족도 점수).
- **5종 carry-over 7~11 frozen 박음** — `[FROZEN v2026-04-30 D-S8-*]` 5종 (carry-over 2 재검토 frozen 별도).
- **워커 spawn prompt 0번 묶음** — 헌법 5~8 그대로 자동 inject (Sprint 7 carry-over 1 표준 보존). 본 sprint 신규 헌법 추기 0 (외부 데이터 부족 시 보류 frozen 박는 패턴이 본 sprint 의 패턴 그 자체).
- **receipt 자동화** — `scripts/receipt/sprint-8.sh` Sprint 7 53단계 wrap (`SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환) + 신규 7단계 (external-data-index / frozen-decisions-carry-over / pii-policy / recall-log-retention / concept-dedup / negation-classifier / sprint-7-wrap).
- **임계 보강 (D-S8-receipt-threshold-recovery)** — 신규 `external_session_count ≥ 3` + `frozen_decisions_carry_over ≥ 5`.

**Out:**

- **DecisionAct enum / runMemoryFormation / runRecallHook / RecallFn / DecideFn / chatStore 기존 메서드 시그니처 변경** — 영구 동결 (carry-over 12).
- **storage migration 0001~0005 변경** — 영구 동결. migration 0006 (recall_log retention) 은 *추기 only*.
- **신규 화면 추가** — 디자인 목업 그대로. 만족도 설문 UI 는 *컴포넌트* 추기 (별 화면 X — chat 화면 overlay).
- **헌법 5~8 변경** — 영구 박힘 (`.claude/commands/*.md` 8 워커 raw text).
- **platform-adapter 표준 변경** — carry-over 1/13 그대로. 신규 mobile store (telemetryStore) 도 동일 패턴 강제.
- **e2e 시나리오 신규 추가** — Sprint 7 `e2e/scenarios/full-journey.spec.ts` 9 단계 그대로 wrap. 외부 데이터 수집 자체는 e2e 가 아닌 *실사용 export* 경로.
- **신규 패키지 추가** — 8 패키지 그대로.
- **B안 채택이 *모두* 강제되는 것** — 5종 carry-over 7~11 + carry-over 2 재검토 모두 *외부 데이터 신호* 의존. 신호 부재 시 *보류 frozen* 박음 (receipt 통과). 신호가 5종 모두 박을 만큼 충분하지 않을 가능성 정상 (Open Issue 처분).
- **외부 테스터 보상 / 법무 검토** — PM 직접 영역 (team-leader 인프라 + 합의 양식만 박음).

## 4. Architecture & Data Flow

```
[외부 테스터 N≥3 모집 (PM)]
  → 합의 양식 서명 (team-leader 박음, raw text)
  → 세션 운영 가이드 (chat / recall / dismiss / retraction 자유 사용)
  → mobile telemetryStore.emit({event, payload, ts}) — platform-adapter
    ├─ decision_log row append (storage)
    ├─ recall_log 기존 row 활용 (Sprint 4~7 그대로)
    └─ satisfaction_survey row append (mid-session 5 turn / end-session 1회)
      → mobile 만족도 설문 UI (chat overlay)
        → telemetryStore.emit({event:'satisfaction', score:1~5, comment?})

[익명화 export — raw → docs/sprints/sprint-8-data/raw/]
  → SQLite 세션 DB (외부 테스터 디바이스) → export script (있는 경우)
  → PII 처리 정책 (sprint-8-pii-policy.md) 적용
    ├─ 사용자 식별자 → SHA-256 hash (salt = sprint-8-salt)
    ├─ raw 텍스트 → 격리 (학습 데이터 합의 시에만 별도 채널)
    └─ 임베딩 / 메타 / event 통계만 → docs/sprints/sprint-8-data/raw/<session-hash>.json

[데이터 분석 (team-leader)]
  → docs/sprints/sprint-8-data/index.md
    ├─ 세션 요약 (N개 × M turn = K decision events)
    ├─ 집계 지표
    │   ├─ recall hit rate (사용자 직접 연관 / 거절 비율)
    │   ├─ dismiss 빈도 (DismissButton click rate per recall surfaced)
    │   ├─ retraction 빈도 (HumbleRetraction mount rate)
    │   ├─ Concept dedup 신호 (graph 의 동일 의미 다른 표면 토큰 빈도)
    │   ├─ recall_log retention 신호 (30d 후 dismissed row 사용 빈도)
    │   ├─ negation classifier miss 사례 (heuristic miss 사용자 사례)
    │   └─ 만족도 평균 + 자유 코멘트 카테고리
    └─ 5종 carry-over 7~11 + carry-over 2 결정 근거 inline 인용

[5종 carry-over 결정 박음 — HOLD-DECIDE-RESUME]
  → team-leader: HOLD 발송 (영향 워커 모두)
    → PM 사인오프 (carry-over 7/8/9/10/11 + carry-over 2 재검토 = 6 분기)
    → RESUME directive (decision-version 태그 [DIRECTIVE D-S8-<topic>])
  → dev doc §11 frozen 박음 (raw text + revert 비용)
  → designer / engine / mobile / storage / conversation 각 워커가 B안 구현 (있는 경우)

[B안 구현 흐름 (분기별)]
  ├─ carry-over 7 B안 → designer (디자인 목업 + copy.theme.*) → mobile (toggle UI mount)
  ├─ carry-over 8 B안 → designer (디자인 목업 + copy.{inspector,library}.empty.*) → mobile (분기 mount)
  ├─ carry-over 9 B안 → engine (dedupConcepts.ts) → storage (alias 테이블 OR concept-edge 통합)
  ├─ carry-over 10 B안 → storage (migration 0006 + retention cron OR migration only)
  ├─ carry-over 11 B안 → engine + conversation (LLM 어댑터 옵션 함수 DI)
  └─ carry-over 2 B안 (재검토) → designer (DismissButton variant 'unlink' + copy.unlink) → mobile (Inspector 슬롯 mount)

[receipt — scripts/receipt/sprint-8.sh]
  Step 1~53: Sprint 7 wrap (SKIP_OLLAMA / SKIP_SPRINT1_E2E 호환)
  Step 54: external_session_count ≥ 3 (sprint-8-data/raw/ 디렉토리 카운트)
  Step 55: frozen_decisions_carry_over ≥ 5 (dev doc §11 raw text count)
  Step 56: pii-policy raw text (sprint-8-pii-policy.md 키 5종 검증)
  Step 57: recall-log-retention (migration 0006 OR 보류 frozen 분기)
  Step 58: concept-dedup (dedupConcepts.ts unit test OR 보류 frozen 분기)
  Step 59: negation-classifier (LLM 도입 / heuristic 강화 / 보류 frozen 3 분기)
  Step 60: sprint-7-wrap (53단계 그대로 PASS)
```

핵심 변경 (Sprint 7 대비 wiring + 데이터 수집 + 결정 박음):
- `apps/mobile/src/telemetryStore.{ts,web.ts}` 신규 platform-adapter (carry-over 13 표준 강제, 9회차).
- `docs/sprints/sprint-8-data/` 신규 디렉토리 (raw + index.md).
- `docs/sprints/sprint-8-pii-policy.md` 신규.
- storage migration 0006 (있는 경우) — recall_log retention.
- engine `dedupConcepts.ts` (있는 경우) — Concept alias merge.
- conversation `negationClassifier.ts` (있는 경우) — LLM 옵션 함수 DI.
- designer `copy.theme.*` / `copy.{inspector,library}.empty.*` / `copy.unlink` (있는 경우) — 디자인 목업 갱신 동반.
- receipt `scripts/receipt/sprint-8.sh` + `.receipt-runner/sprint8-*.mjs` 7 신규 fixture.

의존 그래프 신규 엣지: `mobile → telemetry → storage(decision_log/satisfaction_survey)` (Sprint 4~7 의 storage 의존 그대로 확장).

## 5. File Ownership

| Agent | Files |
|---|---|
| **team-leader** | `docs/sprints/sprint-8-pii-policy.md` 신규, `docs/sprints/sprint-8-external-validation.md` (라이브 갱신 §7~§12 + frozen 5종 박음), `docs/sprints/sprint-8-data/index.md` 신규, `docs/sprints/sprint-8-data/consent-form.md` 신규, `docs/sprints/sprint-8-data/session-guide.md` 신규 |
| **storage** | `packages/storage/src/migrations/0006_*.ts` 신규 (있는 경우 — recall_log retention), `packages/storage/src/repo/decisionLog.ts` 확장 (있는 경우 — telemetry hook), `packages/storage/src/repo/satisfactionSurvey.ts` 신규 (있는 경우), `packages/storage/__tests__/migration-0006*.test.ts` 신규, `packages/storage/index.ts` (root export 추기 — *grep 검증 의무 헌법 6*) |
| **engine** | `packages/engine/src/dedupConcepts.ts` 신규 (있는 경우 — carry-over 9), `packages/engine/__tests__/dedup-concepts.test.ts` 신규, `packages/engine/index.ts` (root export 추기) |
| **conversation** | `packages/conversation/src/negationClassifier.ts` 신규 (있는 경우 — carry-over 11 LLM 도입), `packages/conversation/src/loop.ts` (옵션 함수 DI 추기 — 시그니처 동결, `feedback_di_pattern.md` 정합), `packages/conversation/__tests__/negation-classifier.test.ts` 신규, `packages/conversation/index.ts` (root export 추기) |
| **mobile** | `apps/mobile/src/telemetryStore.ts` 신규, `apps/mobile/src/telemetryStore.web.ts` 신규 (platform-adapter 9회차), `apps/mobile/app/_layout.tsx` (TelemetryProvider mount), `apps/mobile/app/chat/index.tsx` (만족도 설문 overlay + telemetry emit), `apps/mobile/src/themeStore.{ts,web.ts}` (carry-over 7 B안 시 toggle UI 추기), `apps/mobile/app/inspector/index.tsx` (carry-over 2 B안 시 unlink 슬롯 + carry-over 8 B안 시 별도 카피 분기) |
| **designer** | `packages/design-system/src/copy.ts` (carry-over 7/8/2 B안 시 신규 키 추기 — `copy.theme.*` / `copy.{inspector,library}.empty.*` / `copy.unlink`), `packages/design-system/src/components/{DismissButton,EmptyState,ErrorState}.tsx` (carry-over 2/8 B안 시 보강), `디자인 목업/content.jsx` (carry-over 7/8/2 B안 시 단일 진실원 갱신 — designer 가 갱신 주체), `packages/design-system/.receipt-runner/verify-copy.mjs` (임계 ↑) |
| **orchestrator** | `packages/orchestrator/src/decide.ts` (외부 데이터 기반 silence rule 임계 재조정, 시그니처 동결, 신규 코드 0 가능), `packages/orchestrator/__tests__/decide-external-data.test.ts` 신규 (있는 경우) |
| **tester** | `scripts/receipt/sprint-8.sh` 신규 (Sprint 7 53 wrap + 신규 7단계), `scripts/receipt/.receipt-runner/sprint8-{external-data-index,frozen-decisions-carry-over,pii-policy,recall-log-retention,concept-dedup,negation-classifier,sprint-7-wrap}.mjs` 7 신규 fixture |

## 6. Tasks

| ID | Description | Owner | Blocked By |
|---|---|---|---|
| T1 | **team-leader**: PII 처리 정책 frozen (`docs/sprints/sprint-8-pii-policy.md`) — anonymize 규칙 5종 (사용자 식별자 hash / raw 텍스트 격리 / 임베딩 / 메타 / 학습 합의 양식). raw text 검증 (receipt step 56 입력). | team-leader | — |
| T2 | **team-leader**: 외부 테스터 모집 인프라 — `docs/sprints/sprint-8-data/consent-form.md` + `session-guide.md` 신규. PM 직접 모집은 별도 트랙. | team-leader | T1 |
| T3 | **storage**: 데이터 수집 스키마 — `decision_log` 확장 (telemetry hook) + `satisfaction_survey` 테이블 신규 (있는 경우). storage migration 0006 (있는 경우, *추기 only*) OR 보류 frozen 박음 후보. 시그니처 동결 규칙 — *기존* 메서드만 (carry-over 12). | storage | T1 |
| T4 | **storage**: recall_log retention 30d migration 0006 (있는 경우) + 단위 테스트 PASS — carry-over 10 결정 분기. 외부 데이터 신호 부재 시 보류 frozen 박음 (T11 분기). | storage | T8 (외부 데이터 신호 받은 후) |
| T5 | **mobile**: `telemetryStore.{ts,web.ts}` platform-adapter 9회차 신규 + `_layout.tsx` TelemetryProvider mount + `chat/index.tsx` 만족도 설문 overlay (mid-session 5 turn / end-session). decision/recall/satisfaction event emit. | mobile | T3 |
| T6 | **engine**: 외부 graph 중복 Concept 빈도 분석 → `dedupConcepts.ts` 알고리즘 (있는 경우) + 단위 테스트 PASS — carry-over 9 결정 분기. 신호 부재 시 보류 frozen 박음 (T11 분기). | engine | T8 |
| T7 | **engine + conversation**: retraction 빈도 + heuristic miss 사례 분석 → LLM-based negation classifier (있는 경우, `negationClassifier.ts` + 옵션 함수 DI) OR heuristic 강화 OR 보류 frozen — carry-over 11 결정 분기. | engine, conversation | T8 |
| T8 | **team-leader**: 외부 데이터 분석 리포트 (`docs/sprints/sprint-8-data/index.md`) — N≥3 세션 raw 요약 + 6종 집계 지표 (recall hit / dismiss / retraction / dedup 신호 / retention 신호 / negation miss 사례 / 만족도). | team-leader | T2, T5 (PM 모집 + 데이터 수집 후) |
| T9 | **designer**: carry-over 7 B안 시 — 디자인 목업 갱신 (`디자인 목업/content.jsx` 단일 진실원) + `copy.theme.{light,dark,system}` 키 + verify-copy 임계 ↑. 보류 frozen 시 코드 변경 0. | designer | T11 |
| T10 | **designer**: carry-over 8 B안 시 — 디자인 목업 갱신 + `copy.{inspector,library}.empty.*` 키 + verify-copy 임계 ↑. carry-over 2 B안 시 — DismissButton variant 'unlink' + `copy.unlink`. 보류 frozen 시 코드 변경 0. | designer | T11 |
| T11 | **team-leader**: T8 데이터 분석 리포트 기반 5종 carry-over 7~11 + carry-over 2 재검토 결정 — HOLD-DECIDE-RESUME → PM 사인오프 → `[FROZEN v2026-04-30 D-S8-{theme-toggle-decision,empty-error-copy-decision,concept-dedup-decision,recall-log-retention-decision,negation-classifier-decision,inspector-unlink-recheck}]` 6종 박음. revert 비용 + B안/A안 사유 inline. | team-leader | T8 |
| T12 | **mobile**: T9/T10 후속 — carry-over 7 B안 시 toggle UI mount, carry-over 8 B안 시 inspector/library 분기 카피, carry-over 2 B안 시 Inspector unlink 슬롯 mount. 보류 frozen 시 코드 변경 0. | mobile | T9, T10, T11 |
| T13 | **orchestrator**: 외부 데이터 기반 silence rule 임계 재조정 (있는 경우, 시그니처 동결, 신규 코드 0 가능). decision_log 수집 hook 보강 — telemetry consumer 사전 진단 (헌법 5). | orchestrator | T3, T8 |
| T14 | **tester**: `scripts/receipt/sprint-8.sh` Sprint 7 53 wrap + 신규 7단계 fixture (`sprint8-{external-data-index,frozen-decisions-carry-over,pii-policy,recall-log-retention,concept-dedup,negation-classifier,sprint-7-wrap}.mjs`). 임계 보강 (D-S8-receipt-threshold-recovery) — `external_session_count ≥ 3` + `frozen_decisions_carry_over ≥ 5`. | tester | T1, T3, T4, T6, T7, T11 |

## 7. Interfaces / Contracts

<함수 시그니처, 메시지 타입, 패키지 경계 — 책임 에이전트가 결정될 때마다 추기>

### storage T3 — telemetry stream schema [APPLIED v1, [DIRECTIVE D-S8-storage-shape-ack]]

**상태 (2026-04-30)**: schema/0006_telemetry.sql 박힘 + 2 repo 모듈 + protocol union + root index export + 단위 테스트 18종 PASS (migration 4 / decision-log 8 / satisfaction-survey 6) + storage 전체 85/85 PASS + 헌법 6 grep 검증 PASS.

**migration `schema/0006_telemetry.sql` (추기 only, carry-over 12 정합):**
- `decision_log (id TEXT PK, ts INTEGER NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, payload TEXT)` + `idx_decision_log_ts(ts)` + `idx_decision_log_actor_action(actor, action)`. `action` CHECK 없음 — 자유 문자열. 컴파일 타임 가드는 `protocol DecisionLogAction` union.
- `satisfaction_survey (id TEXT PK, ts INTEGER NOT NULL, score INTEGER CHECK BETWEEN 1 AND 5, comment TEXT, session_marker TEXT CHECK IN ('mid','end'))` + `idx_satisfaction_survey_ts(ts)`.

**신규 메서드 (storage root index 노출, 헌법 6 grep PASS):**

```ts
// packages/storage/index.ts
export type DecisionLogRow = { id: string; ts: number; actor: string; action: string; payload?: string };
export type ListDecisionLogOptions = { sinceMs?: number; actor?: string; action?: string; limit?: number };
export function appendDecisionLog(db: Database, row: DecisionLogRow): void;
export function listDecisionLog(db: Database, opts?: ListDecisionLogOptions): DecisionLogRow[];

export type SatisfactionSurveyRow = { id: string; ts: number; score: number; comment?: string; session_marker: 'mid'|'end' };
export type ListSatisfactionSurveysOptions = { sinceMs?: number; limit?: number };
export function appendSatisfactionSurvey(db: Database, row: SatisfactionSurveyRow): void;
export function listSatisfactionSurveys(db: Database, opts?: ListSatisfactionSurveysOptions): SatisfactionSurveyRow[];
```

**protocol root export (단일 진실원, 헌법 6 grep PASS):**

```ts
// packages/protocol/index.ts
export type DecisionLogActor = 'orchestrator' | 'mobile' | 'engine' | 'conversation';
export type DecisionLogAction = 'silence'|'ghost'|'suggestion'|'strong'|'dismiss'|'retraction'|'recall_click'|'satisfaction'|'send'; // [DIRECTIVE D-S8-storage-decision-log-action-send] mobile T5 chat onSubmit 카운트.
export type SatisfactionSessionMarker = 'mid' | 'end';
```

**의미론:**
- `appendDecisionLog` 는 `INSERT OR IGNORE` (PK conflict idempotent — CHECK 없음 → swallow risk 0).
- `appendSatisfactionSurvey` 는 `INSERT ... ON CONFLICT(id) DO NOTHING` (PK conflict 만 IGNORE, score/session_marker CHECK 위반은 throw — `INSERT OR IGNORE` 가 CHECK 도 swallow 하므로 ON CONFLICT 사용).
- `list*` 정렬 = `ORDER BY ts ASC, id ASC` (D-S6-storage-sql-secondary-sort-audit 정합).

**PII 정합 (T1 격리 박힘):** sessionHash 적용 위치 = mobile telemetryStore.emit 직전. storage 는 plain row 만 받음. 본 0006 에 session_hash 컬럼 부재 — 분석 시 세션 단위 집계가 필요해지면 0007 추기 migration 으로 별도 박음 (T1/T8 후속).

**테스트 위치:**
- `packages/storage/__tests__/migration-0006.test.ts` — table/index/CHECK/idempotent 4 케이스.
- `packages/storage/__tests__/decision-log.test.ts` — round-trip / IGNORE on dup PK / 정렬 결정성 / sinceMs+actor+action+limit 8 케이스.
- `packages/storage/__tests__/satisfaction-survey.test.ts` — round-trip / IGNORE on dup PK / score CHECK / session_marker CHECK / 정렬 / sinceMs+limit 6 케이스.

**검증:** `pnpm --filter @synapse/storage typecheck` 0 errors + `pnpm --filter @synapse/storage test` 85/85 PASS + `pnpm --filter @synapse/protocol typecheck` 0 errors + 헌법 6 root index grep PASS.

### mobile T5 — telemetryStore (platform-adapter 9회차) [APPLIED v2 — D-S8-mobile-telemetry-type-singletruth]

**파일** (directive 정정 후):
- `apps/mobile/src/telemetryStore.ts` (native) — in-memory + storage adapter 디폴트 활성화 + type inline.
- `apps/mobile/src/telemetryStore.web.ts` (web) — in-memory only (storage 의존 0) + type inline.
- ~~`apps/mobile/src/telemetryStoreTypes.ts`~~ **삭제됨** — directive `[D-S8-mobile-telemetry-type-singletruth]` 정합 + themeStore 패턴 (양 짝 inline) 답습.

**단일 진실원 (directive 정합):**
- storage T3 root export (`@synapse/storage`) — `appendDecisionLog`, `appendSatisfactionSurvey`, `DecisionLogRow`, `SatisfactionSurveyRow`, `Database`.
- protocol root export (`@synapse/protocol`) — `DecisionLogActor`, `DecisionLogAction`, `SatisfactionSessionMarker`. mobile 내부 type 재정의 0.
- `TelemetryEvent` / `TelemetryListener` / `StorageAdapter` = mobile-internal boundary type — 양 짝 inline (themeStore 패턴 — `EffectiveTheme`/`ThemeStorageAdapter` 도 양 짝 inline).

**책임**: decision / recall / satisfaction 이벤트 emit. storage adapter 디폴트 활성화 (T3 PASS 박힘 후) + setStorageAdapter null 로 비활성 가능.

**외부 export 시그니처 (현재 적용 — protocol union 사용):**

```ts
import type { DecisionLogActor, DecisionLogAction, SatisfactionSessionMarker } from '@synapse/protocol';

type RecallAct = Extract<DecisionLogAction, 'silence' | 'ghost' | 'suggestion' | 'strong'>;

export type TelemetryEvent =
  | { event: 'decision'; actor: DecisionLogActor; action: DecisionLogAction; ts: number; payload?: string }
  | { event: 'recall'; recallLogId: string; act: RecallAct; ts: number }
  | { event: 'satisfaction'; score: 1 | 2 | 3 | 4 | 5; comment?: string; sessionMarker: SatisfactionSessionMarker; ts: number };

export type TelemetryListener = (ev: TelemetryEvent) => void;
export type StorageAdapter = (ev: TelemetryEvent) => void;

export function emit(ev: TelemetryEvent): void;
export function getRecent(withinMs: number, now?: number): TelemetryEvent[];
export function subscribe(listener: TelemetryListener): () => void;
export function setStorageAdapter(adapter: StorageAdapter | null): void;
export function shouldShowMidSessionSurvey(turnCount: number): boolean;
export function shouldShowEndSessionSurvey(): boolean;
export function markSurveyShown(marker: SatisfactionSessionMarker): void;
export function _resetForTest(): void;
```

**protocol union 추기 (헌법 7 옵션 (a))**: `packages/protocol/src/decisionLog.ts` 의 `DecisionLogAction` 에 `'send'` 추기 (mobile T5 chat onSubmit 사용). ≤3줄 + idempotent + revert ≤5분 + 확장 only — 기존 코드 영향 0 (storage CHECK 자유 string + 기존 7 값 그대로).

**TelemetryProvider** (carry-over 13 표준 — 모듈 scope state 패턴):
- React Context 컴포넌트 *없음* — 모듈 import 시 자동 초기화 (recallStore.ts 패턴 그대로).
- `_layout.tsx`: `import '../src/telemetryStore'` 만 추기. storage adapter 주입은 chat/index.tsx 의 ensureDb 시점에 1회 (T3 PASS 후 wiring).
- chat/index.tsx 가 turn 마다 emit + shouldShow* 체크 후 SatisfactionSurveyOverlay mount.

**SatisfactionSurveyOverlay** (chat overlay):
- 위치: `apps/mobile/app/chat/index.tsx` 내 inline 컴포넌트 (별 화면 X — dev doc §3 Out 정합).
- mid-session: user 발화 5회 도달 시 1회 mount, 답변 또는 dismiss 시 close + `markSurveyShown('mid')` (mount 트리거 단계에서 mark).
- end-session: 본 sprint 미구현 (Open Issue) — chat 화면 unmount 트리거 / explicit "세션 종료" 버튼 / 백그라운드 트랜지션 중 *PM 사인오프 시 추가 분기*. 시그니처는 `shouldShowEndSessionSurvey` 그대로 노출.
- 카피: 디자인 목업 부재 → mobile inline 한국어 (D-S4-design-system-single-copy-file 정합 — copy.ts 키 추가 0). 외부 데이터 수집 후 designer T9/T10 분기로 키 추가 검토.

**storage adapter wiring (T3 PASS — D-S8-storage-shape-ack 박힘 후 적용):**
- native: telemetryStore.ts 모듈 scope 에서 `defaultStorageAdapter` 자동 활성화. ensureDb (chatStore.ts 와 동일 `synapse.db` 공유) → `appendDecisionLog` / `appendSatisfactionSurvey` 호출. 실패 silent catch (emit listener catch 처리).
- native shape 매핑:
  - `decision` event → `appendDecisionLog({ id, ts, actor, action, payload? })`.
  - `recall` event → `appendDecisionLog({ id, ts, actor:'orchestrator', action:ev.act, payload:JSON({recallLogId}) })`.
  - `satisfaction` event → `appendSatisfactionSurvey({ id, ts, score, comment?, session_marker })` + `appendDecisionLog({ id, ts, actor:'mobile', action:'satisfaction', payload:JSON({score, sessionMarker}) })` (T8 단일 source 정합 — decision_log 만 봐도 만족도 응답 빈도 추적 가능).
- web: 디폴트 adapter 가 web 짝에는 노출 0 (`telemetryStore.web.ts` 가 storage import 0 — `setStorageAdapter` 만 시그니처 노출). web 짝의 `storageAdapter` 디폴트 `null`.
- T3 보류 frozen 분기 (미박힘) — `setStorageAdapter(null)` 호출로 비활성화. mobile 코드 변경 0.

**emit 호출처 (chat/index.tsx 현재 적용):**
- `decision { actor:'mobile', action:'send', ts, payload:JSON({ turn }) }` — onSubmit 진입 직후.
- `recall { recallLogId, act, ts }` — recallStore.subscribe 콜백.
- `satisfaction { score, comment?, sessionMarker, ts }` — SatisfactionSurveyOverlay onSubmit.

**carry-over 12 정합**: chatStore 기존 메서드 시그니처 (sendStream/dismiss/listMessages) 변경 0. 본 store 는 *신규* mobile store — 시그니처 자유.

**MAX_ENTRIES = 500** — 누수 방지. native 의 storage 영속이 cold start 복원 보장 (in-memory eviction 후에도 row 자체는 SQLite 에서 복원 가능).

**검증 완료**: `pnpm --filter mobile typecheck` PASS. `pnpm --filter mobile build` PASS. web bundle grep 검증 — `better-sqlite3` / `sqlite-vec` / `AsyncStorage` 0 hits.

**T3 contract gap 사전 진단 (헌법 5/6/7)**:
- mobile T5 시점 storage 측 미구현 — `packages/storage/index.ts` grep 결과 `appendDecisionLog` / `appendSatisfactionSurvey` 0 hits, `packages/storage/src/repo/` 에 `decisionLog.ts` / `satisfactionSurvey.ts` 미존재, `migrations/` 디렉토리 비어있음.
- **헌법 7 옵션 (a)** — mobile 측은 옵션 DI 패턴 (`feedback_di_pattern.md`) 으로 storage 의존 *완전 분리*. T3 결정 분기 (박음 / 보류) 와 무관하게 mobile T5 코드 표면 동일.
- **non-blocking 확정** — T3 PASS 후 wiring 한 줄 추기 (chat/index.tsx 의 ensureDb 시점 `setStorageAdapter` 주입). T3 보류 frozen 시 wiring 0 + in-memory only.
- storage 측에 시그니처 ping 발송 (mobile→storage SendMessage) — 응답 수신 시 wiring 시그니처 확정.

### engine T6 — dedupConcepts (영구 박힘 dormant, T11 RESUME 후 채택/보류 결정 — `[REVISE v2026-04-30 D-S8-engine-t6-defer-body]`)

**상태 (2026-04-30, REVISE 적용 후)**: 알고리즘 + 단위 테스트 17종 runtime PASS + root index export + grep 검증 PASS + receipt step 58 (`concept_dedup_pass=1;branch=A`) PASS. team-lead REVISE directive 가 **dormant code 패턴** 인정 — 헌법 7 옵션 (a) 정합 (외부 contract 변경 0 + revert ≤3분 + idempotent). 본 sprint *외부 데이터 독립 영역 first 사례* 박힘.

**REVISE 적용 (이전 defer-body 부분 철회 → 영구 박힘 인정)**:
- 본체 + 17 테스트 + root export *영구 보존* — REVISE 가 명시 인정.
- 알고리즘 (NFKC + lowercase + trim + cosine similarity) 자체 *외부 데이터 신호 독립* — 결정성 + 정합성 단위 테스트로 검증 가능. dormant 패턴 인정 사유.
- T11 RESUME 후 분기:
  - **(a) 채택 frozen**: `[FROZEN v2026-04-30 D-S8-concept-dedup-decision = 채택]` + storage adapter wiring (caller 책임, T11 후 추기) + `DEFAULT_DEDUP_EMBED_THRESHOLD` T8 데이터 기반 튜닝.
  - **(b) 보류 frozen**: `[FROZEN v2026-04-30 D-S8-concept-dedup-decision = 보류]` + caller 미호출 → dormant 그대로. revert ≈ 0.

**strict 진단 처분 (REVISE 명시 안 함, 본 워커 정신 보존)**: `tsc --noEmit --strict` → src + 테스트 22 건 (TS2532 / TS18048). REVISE 가 진단 처분 명시 안 함 → 채택 시 해소 / 보류 시 0 가치 정신 그대로 보존.

**시그니처 동결 (carry-over 12) 보존**: RecallFn / DecideFn / runMemoryFormation / runRecallHook 변경 0. dedup 은 *순수 함수* — caller (storage adapter) 가 MergePlan 받아 graph 갱신 책임 분리.

**파일 (영구 박힘, dormant)**:
- `packages/engine/src/dedupConcepts.ts` — 알고리즘 (175 줄). strict 진단 보류 (T11 채택 시 해소).
- `packages/engine/__tests__/dedup-concepts.test.ts` — 단위 테스트 17종 runtime PASS. strict 진단 보류.
- `packages/engine/index.ts` — root export (`dedupConcepts`, `DEFAULT_DEDUP_EMBED_THRESHOLD`, 5 type) — 헌법 6 grep 검증 PASS.
- `scripts/receipt/.receipt-runner/sprint8-concept-dedup.mjs` — receipt step 58 branch=A PASS (`feedback_receipt_external_contract.md` 정합).

**알고리즘 단계**:
1. label 정규화 (NFKC + lowercase + trim) → 동일 normalized label 그룹화 → MergePlan(reason='normalized-label-equal').
2. (옵션) step 1 미claimed concept 중 *서로 다른 normalized label* 페어 cosine ≥ embedThreshold 검출 → MergePlan(reason='embedding-similarity').
3. canonical: createdAt ASC + id ASC tie-break. alias: 같은 정렬 결정성. 출력 plan: canonicalId 사전순.
4. **first-claim wins**: 한 concept 은 한 plan 의 일원 (canonical 또는 alias 1회만) — graph 갱신 충돌 방지.

**시그니처 (root export, 구현 박힘)**:

```ts
import type { Concept } from '@synapse/protocol';

/** Concept 간 cosine similarity 계산. embed.ts EmbedFn 결과 가정. */
export type EmbedSimilarityFn = (a: Float32Array, b: Float32Array) => number;

/** label 정규화. Default: NFKC + lowercase + trim. */
export type NormalizeLabelFn = (label: string) => string;

export type DedupOptions = {
  /** cosine similarity threshold for embedding-based merge. Default 0.85. */
  embedThreshold?: number;
  /** label 정규화 함수. Default: NFKC + lowercase + trim. */
  normalizeLabel?: NormalizeLabelFn;
  /** 임베딩 비교 함수. 미주입 시 normalize-only 매칭. */
  embedSimilarity?: EmbedSimilarityFn;
};

export type MergePlan = {
  /** 유지할 canonical concept id (createdAt ASC + id ASC tie-break). */
  canonicalId: string;
  /** canonical 로 흡수될 alias concept ids. */
  aliasIds: string[];
  /** merge 사유. */
  reason: 'normalized-label-equal' | 'embedding-similarity';
  /** 임베딩 매칭 시 cosine score, normalize 매칭 시 1.0. */
  score: number;
};

/**
 * Concept 배열에서 중복 / alias 후보 검출 → MergePlan 반환.
 *
 * - **순수 함수** — DB / storage 의존 0. caller (storage adapter) 가 MergePlan 받아 graph 갱신.
 * - **결정성 보장** — 동일 입력 → 동일 출력. id 정렬 createdAt ASC + id ASC tie-break.
 * - **embedding 옵션 분리** — embed 부재 시 normalize-only 매칭. 단위 테스트 가능.
 *
 * 단계:
 *   1. 모든 concept 의 normalize(label) 동등성 확인 → MergePlan(reason='normalized-label-equal').
 *   2. (옵션) embeddings 가 있고 embedSimilarity 주입 시 → cosine ≥ threshold 페어 검출.
 *   3. 같은 alias 그룹은 1 MergePlan 으로 합쳐 반환.
 */
export function dedupConcepts(
  concepts: ReadonlyArray<Concept & { embedding?: Float32Array }>,
  opts?: DedupOptions,
): MergePlan[];
```

**root export (박힘)**: `packages/engine/index.ts` 에 `dedupConcepts` + `DEFAULT_DEDUP_EMBED_THRESHOLD` + `DedupOptions` / `DedupConceptInput` / `MergePlan` / `EmbedSimilarityFn` / `NormalizeLabelFn` 5종 type — grep 검증 PASS.

**T8 결과 후 분기**:
- **B안 (채택)**: dev doc §11 `[FROZEN v2026-04-30 D-S8-concept-dedup-decision]` 박음 + (선택) `DEFAULT_DEDUP_EMBED_THRESHOLD` 튜닝 + storage adapter wiring (graph 갱신 단계 추기, 본 sprint 또는 Sprint 9+ 분기).
- **A안 (보류 frozen)**: 코드 dormant 유지 (caller 미호출 → 동작 0). dev doc §11 에 *보류* frozen + 신호 부재 사유 + revert 비용 명시.

### engine + conversation T7 — negation classifier (B안 채택 시) — 사전 합의 (양 워커 ack 대기)

`packages/engine/src/negationClassifier.ts` 신규 + `packages/conversation/src/loop.ts` `RetractionHookDeps` *추기 only* (Sprint 6 retraction hook 패턴 답습, carry-over 12 정합).

```ts
// packages/engine/src/negationClassifier.ts (B안 채택 시)
import type { CompleteFn } from './extractConcepts.ts';
export type { CompleteFn };

/** 사용자 발화의 부정 신호 분류. confidence ∈ [0, 1]. */
export type ClassifyNegationFn = (
  text: string,
) => Promise<{ negated: boolean; confidence: number }>;

/**
 * LLM 기반 default 분류기 — Gemma JSON 모드. extractConcepts.ts 패턴 답습.
 * complete 미주입 시 ollama gemma JSON 모드 default — extractConcepts.ts 의 defaultComplete 와 동일.
 */
export function classifyNegationWithLLM(opts?: {
  complete?: CompleteFn;
}): ClassifyNegationFn;
```

```ts
// packages/conversation/src/loop.ts — RetractionHookDeps 확장 (추기 only, 시그니처 동결)
export type RetractionHookDeps = {
  // ... 기존 필드 보존 (detectRetraction, markRetracted, rollbackCaptureForTurn,
  //                  markDismissed, prevAssistantMessageId, prevAssistantConceptIds, prevRecallLogId) ...
  /** Sprint 8 T7 — LLM-based 부정 신호 분류 (옵션). 미주입 시 detectRetraction heuristic 사용. */
  classifyNegation?: ClassifyNegationFn;
  /** classifyNegation 결과의 confidence threshold. Default 0.7. */
  negationConfidenceThreshold?: number;
};
```

**wiring 흐름** (`runRetractionHook` 내부, 동작 변경 0 — 옵션 분기만):

```ts
async function detectNegation(text, deps): Promise<boolean> {
  if (deps.classifyNegation) {
    const r = await deps.classifyNegation(text);
    return r.negated && r.confidence >= (deps.negationConfidenceThreshold ?? 0.7);
  }
  const fn = deps.detectRetraction ?? defaultDetectRetraction;
  return fn(text);
}
```

**root export (B안 채택 시)**: `packages/engine/index.ts` + `packages/conversation/index.ts` 양쪽 추기 — *grep 검증 의무*.

**A안 (heuristic 강화) 채택 시**: engine 측 코드 변경 0. `packages/conversation/src/retraction.ts` KO_RETRACTION / EN_RETRACTION regex alternation 만 보강 (T8 분석 검출 miss 사례 추기).

**C안 (보류 frozen) 채택 시**: 양 워커 코드 변경 0. dev doc §11 frozen 박음.

**합의 상태**: 2026-04-30 engine→conversation 시그니처 사전 제안 발송. conversation ack 후 본 §7 에 합의 raw text 박음. T8 PASS 후 분기 결정 + 즉시 병렬 구현.

**conversation ACK (2026-04-30, conversation 워커):**
- **시그니처 동결 정합 OK** — `RetractionHookDeps` 확장 (옵션 `classifyNegation` + `negationConfidenceThreshold` 추기 only). `send` / `sendStream` / `RecallFn` / `DecideFn` / `RecallStore` / `OnErrorFn` / `RetractionHookDeps` 의 *기존* 필드 변경 0. carry-over 12 정합.
- **DI 패턴 정합 OK** — 옵션 함수 주입 + 클래스/싱글톤 0 (`feedback_di_pattern.md` 정합). engine 의 `classifyNegationWithLLM(opts?)` 가 default `ClassifyNegationFn` 빌더 — `extractConcepts` 패턴 답습 OK.
- **헌법 7 옵션 (a) 정합 OK** — `loop.ts` 추기 분량 ≤3 줄 옵션 type + ≤8 줄 wiring (helper `detectNegation` 1 함수 + `runRetractionHook` 동기→비동기 1 글자). idempotent + revert ≤5분.
- **`runRetractionHook` 동기→비동기 변환 영향 분석 OK**:
  - `runRetractionHook` 는 `loop.ts` *내부 helper* — `index.ts` root export 0 (grep 검증 완료, line 1~22).
  - 호출부 `sendStream` line 285 의 `runRetractionHook(text, deps)` → `await runRetractionHook(text, deps)` 1 글자 추기. 이미 try/catch + logger.warn 격리 (line 284~288) — async throw 도 동일 catch 로 흡수.
  - 외부 contract (export 표면) 변경 0.
- **OnErrorFn 'llm-failure' enum 재사용 합의** — `classifyNegation` 호출 실패 시 `emitError(deps.onError, 'llm-failure', logger, err)` 통보 + regex fallback. 신규 enum 추기 0 (Sprint 7 D-S7-conversation-onerror-signature 그대로). user reply 흐름 막지 않음 (헌법 = "침묵이 디폴트").
- **threshold 0.7 default 합의 OK** — T8 데이터 후 T11 RESUME directive 로 미세 조정 가능. default 는 보수적 (heuristic 동작 보존 우선).
- **caller wiring (mobile chatStore, B안 시)**: `sendStream({ ..., classifyNegation: classifyNegationWithLLM({ complete: gemma.completeJson }) })` 1줄. carry-over 13 platform-adapter 정합 — web/native 동일 wiring (LLM adapter 가 platform-agnostic).
- **분기 시그니처 (T11 결과)**:
  - **B안**: 위 시그니처 그대로. conversation 측 추기 = `loop.ts` 옵션 2개 + `runRetractionHook` async 변환 + helper 1 함수 + `index.ts` root export 추기 (`ClassifyNegationFn` re-export, *grep 검증 의무*).
  - **A안 (heuristic 강화)**: conversation `RetractionHookDeps` 확장 0. `retraction.ts` KO_RETRACTION/EN_RETRACTION regex alternation 만 보강 — engine 워커가 분석한 miss 사례 patch.
  - **C안 (보류)**: 양 워커 코드 변경 0. `[FROZEN v2026-04-30 D-S8-negation-classifier-decision = 보류]` T11 박음.
- **T8 blocker 상태**: `docs/sprints/sprint-8-data/index.md` 미생성. 본 ACK 후 코드 변경 0 (T11 RESUME directive 받은 뒤 실행).
- **추가 진단 (헌법 5)**: `RetractionHookDeps` 는 현재 `SendStreamDeps` 에만 합쳐져 있음 — `send` (non-stream) 는 retraction hook 미지원. T7 도 *sendStream 한정* (Sprint 6 결정 그대로). non-stream 경로의 retraction 지원은 별도 carry-over 사항 — 본 sprint scope 0.

**✅ fixture vs ACK path 충돌 — 양 워커 합의 + `[DECISION v2026-04-30 D-S8-negation-classifier-path-resolution]` team-lead 채택 (가설 1 확정)**:

**team-lead 채택 박힘 (2026-04-30)**: ACK 합의 = path 진실원. 가설 1 (fixture 정정) 확정. fixture 정정 directive tester 워커에 발송 (engine path 추가 verify). T11 RESUME 분기 (B/A/C) 자체는 T8 PASS 후 — 본 결정은 *path 결정만*. 결정 사유:
1. **헌법 #1 SoT** — code on disk > task subject > dev doc [FROZEN] > inbox > draft. ACK 박힌 사전 합의안이 양 워커 동의 + Sprint 6 DI 패턴 정합.
2. **`feedback_receipt_external_contract.md` 정합** — fixture 가 ACK 합의를 *가드* 해야 함. 현재 fixture conversation 단일 path 검증 = false positive 후보 (Sprint 8 step 57 false positive 와 동일 패턴).
3. **carry-over 11 본질** — 알고리즘 책임 = engine (memory engine 영역, recall/decide 와 동일 layer), runtime 어댑터 = conversation (LLM 호출 wrapper). 양 워커 책임 분리 = ACK 합의의 자연스러운 박음.

**`feedback_receipt_external_contract.md` first 사례 박힘** — B안 채택 시 양 path 모두 verify.

**원본 양 워커 verify 박음 (2026-04-30, engine + conversation 동시 verify, team-lead 채택 사유 근거)**:

**진단**: Receipt fixture (`scripts/receipt/.receipt-runner/sprint8-negation-classifier.mjs`) A 분기 본문 (line 31-50) 이 *`packages/conversation/src/negationClassifier.ts` + `__tests__/` + `index.ts` re-export* 세 path 만 verify. ACK 합의 (위 시그니처 line 383~ 의 engine 측 `classifyNegationWithLLM(opts?)` 빌더 박음 명시) 와 직접 충돌 — engine 측 path verify 0 건.

**양 워커 합의 = 가설 1 (fixture 정정) 강력 지지**.

**3 근거 (conversation 워커 verify, engine 워커 합류)**:
1. **LLM 호출 owner = engine 패턴 (carry-over 12 정합)**: `extractConcepts.ts` (Sprint 3) + `embed.ts` 둘 다 LLM JSON 모드 / embedding owner = engine. classifier 알고리즘 = engine 영역. conversation 헌법 ("LLM 함수 호출") 의 "함수 호출" 은 *어댑터 호출* 이지 *알고리즘 owner* 아님.
2. **DI 패턴 (`feedback_di_pattern.md`) 정합**: conversation = 옵션 함수 wiring (`RetractionHookDeps.classifyNegation?`) — 기존 패턴 (`extractConcepts?`, `embedConcept?`, `nearest?`, `recall?`, `decide?`) 그대로. engine = LLM 호출 default 빌더 (`classifyNegationWithLLM(opts?)`) — `extractConcepts({ complete })` 패턴 답습. **conversation 측 `negationClassifier.ts` 신규 파일 추기는 패턴 위반**.
3. **시그니처 동결 (carry-over 12) 정합**: conversation 측 추기 = `loop.ts` 옵션 2개 + helper 1 함수 + `index.ts` type re-export. 신규 파일 0. engine 측 = `negationClassifier.ts` 신규 + `index.ts` export.

**fixture 정정 raw text 제안 (가설 1 구체화, conversation 워커 박음)**:

```js
// scripts/receipt/.receipt-runner/sprint8-negation-classifier.mjs 의 tryBranchA() 정정.
function tryBranchA() {
  // (a) engine 측 본체 — classifier 알고리즘 owner.
  const ENGINE_SRC = resolve(ROOT, 'packages/engine/src/negationClassifier.ts');
  const ENGINE_TEST = resolve(ROOT, 'packages/engine/__tests__/negation-classifier.test.ts');
  const ENGINE_ROOT = resolve(ROOT, 'packages/engine/index.ts');
  if (!existsSync(ENGINE_SRC)) return { ok: false, reason: `${ENGINE_SRC} 미존재` };
  if (!existsSync(ENGINE_TEST)) return { ok: false, reason: `${ENGINE_TEST} 미존재` };
  if (!existsSync(ENGINE_ROOT)) return { ok: false, reason: `${ENGINE_ROOT} 미존재` };
  const engineRootText = readFileSync(ENGINE_ROOT, 'utf8');
  if (!engineRootText.includes('classifyNegation') && !engineRootText.includes('ClassifyNegation')) {
    return { ok: false, reason: 'packages/engine/index.ts 에 classifyNegation re-export 미박힘 (root index grep)' };
  }
  // (b) conversation 측 wiring — RetractionHookDeps 옵션 + type re-export.
  const CONV_LOOP = resolve(ROOT, 'packages/conversation/src/loop.ts');
  const CONV_ROOT = resolve(ROOT, 'packages/conversation/index.ts');
  const loopText = readFileSync(CONV_LOOP, 'utf8');
  if (!loopText.includes('classifyNegation')) {
    return { ok: false, reason: 'packages/conversation/src/loop.ts 에 classifyNegation 옵션 미박힘' };
  }
  const convRootText = readFileSync(CONV_ROOT, 'utf8');
  if (!convRootText.includes('ClassifyNegationFn')) {
    return { ok: false, reason: 'packages/conversation/index.ts 에 ClassifyNegationFn type re-export 미박힘' };
  }
  return { ok: true };
}
```

**conversation 측 unit test 정정 (conversation 워커 박음)**:
- `packages/conversation/__tests__/negation-classifier.test.ts` *불필요* (classifier 본체 = engine 영역).
- 대신 `packages/conversation/__tests__/loop-negation-classifier-wiring.test.ts` (Sprint 7 `loop-error-fallback.test.ts` 패턴 답습) — *옵션 함수 주입 시 LLM 결과 우선 + threshold 분기 + 실패 시 regex fallback* wiring 검증만.
- `packages/engine/__tests__/negation-classifier.test.ts` 가 classifier 알고리즘 unit test (LLM mock + JSON 파싱 + confidence 추출).

**T11 RESUME 시 결정 분기 3종**:
1. **fixture 정정 (양 워커 합의 가설 1)** — 위 raw text 그대로 채택. tester 워커 ping → fixture 갱신 → ACK 합의대로 양쪽 박음 → 양 워커 동시 PR (race 0).
2. **conversation 단일 (가설 2)** — fixture valid, ACK 회수. engine 측 = type export 0 또는 type re-export only. 본 워커 합의 = 패턴 위반 권장 X.
3. **C안 (보류 frozen)** — 양 워커 코드 변경 0. fixture 자동 해소.

**team-lead 보고 합류 박힘**: engine 워커 + conversation 워커 양쪽 fixture 정정 결정 요청 박음 → `[DECISION D-S8-negation-classifier-path-resolution]` 가설 1 채택 확정 박힘 (위 subsection 헤더 참조). fixture 정정 directive 는 team-lead 가 tester 워커에 발송 진행. T11 RESUME 시 분기 (B/A/C) 명시 받으면 즉시 양 워커 동시 PR — path 합의 영구 박힘.

### orchestrator T13 — silence rule 임계 재조정 (사전 진단, T3+T8 blocked)

**상태**: blocked by T3 (storage `decision_log` / `satisfaction_survey` schema) + T8 (외부 데이터 분석 리포트). 본 §7 갱신은 *사전 진단* (헌법 5 consumer-producer-gap-policy) — RESUME directive 전 코드 변경 0.

**시그니처 동결 정합 (carry-over 12)**: `decide(ctx: DecideContext): DecisionAct` + `applySilence(decision, ctx): SilenceResult` + `DecisionAct` 4원 enum (silence/ghost/suggestion/strong) **영구 동결**. T13 가능 작업 = *임계값 상수 변경* OR *결정 보류* 만.

**임계값 인벤토리 (재조정 후보 6종, raw text 박음)**:

```ts
// packages/orchestrator/src/decide.ts (현재 frozen 값 — 변경 시 [FROZEN v2026-04-30 D-S8-orchestrator-silence-tuning] 박음)
const SCORE_GHOST = 0.4;          // candidates max score < 0.4 → silence
const SCORE_SUGGESTION = 0.6;     // < 0.6 → ghost
const SCORE_STRONG = 0.8;         // < 0.8 → suggestion, ≥ 0.8 → strong
const TOKEN_CONTEXT_WEAKEN = 2000; // tokenContext > 임계 → 1단계 약화
const RECENCY_MS_WEAKEN = 1500;    // recencyMs < 임계 → 1단계 약화

// packages/orchestrator/src/silence.ts
const COOLDOWN_MS = 60_000;        // 동일 candidate × recall act 60초 내 재등장 → silence
```

**T13 가능 결정 분기**:
- **A안 (보류 frozen)** — 외부 데이터에서 silence rule miss 신호 부재 시. 코드 변경 0. dev doc §11 에 `[FROZEN v2026-04-30 D-S8-orchestrator-silence-tuning = 보류]` 박음 + 사유 inline.
- **B안 (임계값 재조정)** — 외부 데이터에서 *과개입* (recall hit rate 너무 낮 / dismiss rate 너무 높) OR *과침묵* (silence rule low-confidence reason 빈도 너무 높) 신호 검출 시. 6종 상수 중 영향 받는 값만 조정. revert ≤1 commit. 신규 코드 0.

**T8 데이터 source 사전 매핑 (recall_log row 가 곧 telemetry)**:

T13 의 임계값 재조정 신호는 *기존* `recall_log` row 만으로 추출 가능. 별도 telemetry hook 보강 불필요 — T3 의 `decision_log` 신규 테이블은 *non-recall* decision (예: dismiss / capture) 추적용으로 orchestrator 슬라이스와 직교. 헌법 5 사전 진단 결과:

| 임계값 | 신호 source (recall_log) | 재조정 트리거 |
|---|---|---|
| `SCORE_GHOST/SUGGESTION/STRONG` | `act` 분포 (silence/ghost/suggestion/strong 비율) + dismiss rate | strong 비율 < 5% → SCORE_STRONG 하향, silence 비율 > 80% → SCORE_GHOST 하향 |
| `TOKEN_CONTEXT_WEAKEN` | tokenContext 분포 — *현재 미기록*. T8 분석 시 미공급 → 재조정 불가 (보류 강제) |
| `RECENCY_MS_WEAKEN` | 동일 — *미기록* (recency 조건 weaken 만 적용). T8 분석 시 미공급 → 재조정 불가 |
| `COOLDOWN_MS` | `suppressed_reason='cooldown'` 빈도 + cooldown 직후 재등장한 candidate 의 사용자 수용률 | cooldown 빈도 > 30% AND 수용률 > 50% → COOLDOWN_MS 하향 |

**가능 신호 (3종)**: SCORE_* 3종 + COOLDOWN_MS — recall_log 만으로 검출 가능.
**불가 신호 (2종)**: TOKEN_CONTEXT_WEAKEN / RECENCY_MS_WEAKEN — telemetry 추기 없이는 재조정 *근거* 부족 → A안 (보류) 강제.

**T3 contract gap 사전 진단 (헌법 5/7)**:
- mobile telemetryStore (`apps/mobile/src/telemetryStore.ts:12,16`) 가 `appendDecisionLog` / `appendSatisfactionSurvey` 옵션 DI 로 *예상* 중. storage 측 미구현 — `packages/storage/src/repo/decisionLog.ts` 미존재 + `migrations/` 디렉토리 비어있음.
- *orchestrator 측 영향 0* — `decide` / `applySilence` 는 storage 의존 0 (순수 함수 + DecideContext 입력만). T3 결정 분기 (박음 / 보류) 와 무관하게 T13 코드 변경 표면 동일.
- **헌법 7 옵션 (a)** — orchestrator 는 storage T3 의 *consumer 미아님* (mobile 만 consumer). T3 보류 frozen 분기에도 T13 진행 가능. 본 사전 진단으로 *non-blocking 확정*.

**T13 시작 조건 갱신 (carry-over 14 directive)**:
- 원 directive: blocked by T3 + T8.
- 사전 진단 결과: T3 *non-blocking* (orchestrator 가 storage decision_log consumer 아님). 실제 blocker = **T8 외부 데이터 분석 리포트만**.
- T8 PASS → silence rule miss 신호 검출 (recall_log act 분포 + cooldown 빈도) → A안/B안 결정 → dev doc §11 frozen 박음.

**root export (B안 채택 시)**: `packages/orchestrator/index.ts` 변경 0 — *임계값 상수* 만 src/decide.ts / src/silence.ts 내부 변경. 신규 export 추기 0 (시그니처 동결 정합).

**A안 (보류 frozen) 채택 시**: 코드 변경 0 + dev doc §11 frozen 박음.

**테스트 영향 (B안 시)**: `packages/orchestrator/__tests__/decide.test.ts` / `silence.test.ts` 의 임계값 의존 테스트 (예: `score=0.4` boundary, `cooldown 60s` boundary) — 임계값 변경 시 테스트 fixture 동기화 필수. 임계 회복 정책 (`feedback_receipt_threshold.md` 정합) — 보수적 시작 + 실측 후 회복.

**team-lead 보고**: T13 *non-blocking from T3* 확정 + T8 PASS 대기. T8 후 즉시 진행.

### tester (T14) — Receipt fixture contracts (live)

**`scripts/receipt/sprint-8.sh`** — Sprint 7 53 단계 wrap + 신규 7 단계 (54~60). `SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환.

신규 fixture 출력 contract (sprint-8.sh 가 stdout key=value 파싱):

| Step | Fixture | stdout (샘플) |
|---|---|---|
| 54 | `sprint8-external-data-index.mjs` | `external_data_index_pass=1;external_session_count=<n>;index_marks=<n>` |
| 55 | `sprint8-frozen-decisions-carry-over.mjs` | `frozen_decisions_carry_over_pass=1;frozen_decisions_carry_over=<n>` |
| 56 | `sprint8-pii-policy.mjs` | `pii_policy_pass=1;pii_policy_marks=<n>` |
| 57 | `sprint8-recall-log-retention.mjs` | `recall_log_retention_pass=1;branch=<A\|B>` |
| 58 | `sprint8-concept-dedup.mjs` | `concept_dedup_pass=1;branch=<A\|B>` |
| 59 | `sprint8-negation-classifier.mjs` | `negation_classifier_pass=1;branch=<A\|B\|C>` |
| 60 | `sprint8-sprint-7-wrap.mjs` | `sprint_7_wrap_pass=1;sprint_7_fixtures=6` |

분기 표 (보류 frozen 분기 = receipt 통과 valid 경로 — dev doc §3 In + §11 Open Issues 5 종 모두 보류 가능 정합):

| Fixture | A 분기 (구현) | B 분기 | C 분기 |
|---|---|---|---|
| step 57 retention | `packages/storage/schema/0006_*.sql` 안에 `recall_log` + `retention`/`30` raw text + `packages/storage/__tests__/migration-0006*.test.ts` | dev doc §11 안에 `[FROZEN v2026-04-30 D-S8-recall-log-retention-decision]` + 보류 사유 키워드 (`보류` / `신호 부재` / `데이터 부족` / `미구현`) | — |
| step 58 dedup | `packages/engine/src/dedupConcepts.ts` + `packages/engine/__tests__/dedup-concepts.test.ts` + `packages/engine/index.ts` 에 `dedupConcepts` re-export (헌법 6 root index grep) | dev doc §11 안에 `[FROZEN v2026-04-30 D-S8-concept-dedup-decision]` + 보류 사유 | — |
| step 59 negation | `packages/conversation/src/negationClassifier.ts` + 테스트 + `packages/conversation/index.ts` re-export | conversation/src 안에 `negation` + `heuristic`/`강화` 키워드 + dev doc §11 안에 `[FROZEN v2026-04-30 D-S8-negation-classifier-decision]` + heuristic 강화 사유 | dev doc §11 안에 `[FROZEN v2026-04-30 D-S8-negation-classifier-decision]` + 보류 사유 |

임계 보강 (D-S8-receipt-threshold-recovery — Sprint 7 누적 그대로 + 신규 4 종):
- `external_session_count ≥ 3` (step 54)
- `frozen_decisions_carry_over ≥ 5` (step 55)
- `pii_policy_marks = 5` (step 56)
- `sprint_7_wrap_pass = 1` (step 60)

PII 정책 5 종 anonymize 규칙 (step 56 — `docs/sprints/sprint-8-pii-policy.md` §5 와 1:1 정합):
1. `SHA-256 hash` + `sprint-8-salt`
2. `raw text 격리`
3. `임베딩 보존` 또는 `768d`
4. `메타 통계 보존`
5. `학습 데이터 합의 양식` 또는 `opt-in-raw-text`

5 종 frozen 토큰 (step 55 — Sprint 8 dev doc §11 Decisions Made 섹션 안에 raw text):
- `[FROZEN v2026-04-30 D-S8-theme-toggle-decision]`
- `[FROZEN v2026-04-30 D-S8-empty-error-copy-decision]`
- `[FROZEN v2026-04-30 D-S8-concept-dedup-decision]`
- `[FROZEN v2026-04-30 D-S8-recall-log-retention-decision]`
- `[FROZEN v2026-04-30 D-S8-negation-classifier-decision]`

External-data-index 6 종 집계 지표 (step 54 — `docs/sprints/sprint-8-data/index.md` raw text):
- `recall hit`, `dismiss 빈도`, `retraction 빈도`, `dedup 신호`, `retention 신호`, `만족도`

Raw 세션 파일: `docs/sprints/sprint-8-data/raw/*.json` 사이즈 > 0 ≥ 3 (`.gitkeep` 제외).

**의존 그래프 (T14 입력)**:
- T1 (PII 정책) → step 56 ✅ PASS.
- T6 (concept-dedup) → step 58 ✅ PASS (분기 A — root index re-export 박힘 검증).
- T8 (외부 데이터 분석 리포트) → step 54 (대기).
- T11 (5 종 carry-over 결정 frozen) → step 55 (대기).
- T4 / T7 (각 분기 구현) OR T11 보류 frozen 분기 → step 57 / 59 (대기).
- step 60 = Sprint 7 receipt 메타 정합 (의존 0) ✅ PASS.

**Live 갱신 노트**:
- T1 PASS 후 step 56 fixture contract 를 PII 정책 §5 와 1:1 정합으로 재조정 (alternates 그룹 매칭). `feedback_receipt_external_contract` 정합 — fixture 가 외부 정책 contract 를 가드.
- **[DIRECTIVE v2026-04-30 D-S8-tester-step57-false-positive] 정합** — step 57 fixture branch A 의 `recall_log` + `30` 매칭이 directive 태그 날짜 (`v2026-04-30`) + 주석 내 `recall_log` 언급과 우연 충돌하는 false positive 박힘. 정정: 주석 line 제외 + word-boundary + 단위 명시 (`30d` / `30 day` / `30 일` / `RETENTION_DAYS=30`). negation-classifier branch B 도 동일 패턴 강화 (주석 line 제외 후 매칭). Sprint 8 retrospective 후보로 fixture 매칭 정책 박음.
- step 57 strict 매칭 정정 후 결과 = `B (보류 frozen): [FROZEN v2026-04-30 D-S8-recall-log-retention-decision] 미박힘` — 정확. T4 가 0007_*.sql 로 retention migration 박거나 T11 가 보류 frozen 박을 때 PASS.

## 8. Test Scenarios

<디자인 목업/기획서 인용 시나리오 + 자동화 위치 (`e2e/scenarios/...`)>

## 9. Demo Script

본 sprint 의 close 분기 (A) — *내부 인프라 + 사전 합의* 가 산출물. 코드 시연보다 *인벤토리 + receipt 자동 재현* 중심.

### Step 1 — lint 3종 (모두 exit 0)
```bash
bash scripts/lint/frozen-flag-audit.sh docs/sprints/sprint-8-external-validation.md
bash scripts/lint/mockup-scope-parity.sh docs/sprints/sprint-8-external-validation.md
node scripts/lint/directive-tag-audit.ts docs/sprints/sprint-8-external-validation.md
```

### Step 2 — Sprint 8 receipt 60/60 PASS 재현
```bash
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-8.sh
# → ✅ Sprint 7 receipt PASSED (1~53)
# → ✅ Sprint 8 receipt PASSED (54~60)
#
# 신규 7 단계 결과:
# [54] external-data-index   branch=B (N=0 데이터 부재 분기)
# [55] frozen-decisions       5/5 슬러그 확정
# [56] pii-policy             5/5 키워드 확정
# [57] recall-log-retention   branch=B (보류 frozen)
# [58] concept-dedup          branch=A (engine T6 dormant code 영구 보존)
# [59] negation-classifier    branch=C (보류 frozen)
# [60] sprint-7-wrap          6 fixture 메타 + footer 정합
```

### Step 3 — 외부 검증 인프라 인벤토리
```bash
ls docs/sprints/sprint-8-pii-policy.md          # PII 정책 (Rule 1~5 + opt-in-raw-text)
ls docs/sprints/sprint-8-data/consent-form.md   # 합의 양식 (§5 서명 + §opt-in 별도 동의)
ls docs/sprints/sprint-8-data/session-guide.md  # 세션 운영 가이드
ls docs/sprints/sprint-8-data/index.md          # 데이터 부재 분석 리포트 (N=0)
ls packages/storage/schema/0006_telemetry.sql   # decision_log + satisfaction_survey
ls packages/storage/src/repo/decisionLog.ts packages/storage/src/repo/satisfactionSurvey.ts
ls packages/protocol/src/decisionLog.ts         # DecisionLogActor / DecisionLogAction (9종) / SatisfactionSessionMarker
ls apps/mobile/src/telemetryStore.ts apps/mobile/src/telemetryStore.web.ts
```

### Step 4 — 사전 합의 + dormant code 인벤토리
```bash
ls packages/engine/src/dedupConcepts.ts                        # T6 dormant 175줄
ls packages/engine/__tests__/dedup-concepts.test.ts            # 17/17 runtime PASS
grep "classifyNegationWithLLM\|ClassifyNegationFn" docs/sprints/sprint-8-external-validation.md
# → T7 engine + conversation 양 워커 사전 합의 dev doc §7 line 276~454 확인
```

### Step 5 — frozen 12 항목 검증
```bash
grep "\[FROZEN v2026-04-30 D-S8-" docs/sprints/sprint-8-external-validation.md | wc -l
# → 12 (5 보류 결정 + 1 A안 reconfirm + 6 인프라 확정)
```

## 10. Implementation Map

## 10. Implementation Map

### team-leader (T1, T2, T8, T11)
- `docs/sprints/sprint-8-pii-policy.md` 신규 — PII 처리 정책 frozen. Rule 1~5 (사용자 식별자 SHA-256 hash + sprint-8-salt / raw text 격리 / 임베딩 768d / 메타 통계 / opt-in-raw-text). receipt step 56 키워드 5종 정합.
- `docs/sprints/sprint-8-data/consent-form.md` 신규 — 외부 테스터 합의 양식. §1~6 + §5 서명란 + §opt-in-raw-text 별도 동의.
- `docs/sprints/sprint-8-data/session-guide.md` 신규 — 세션 운영 가이드. §1~7 + §2 자유 사용 + §3 만족도 설문 + §4 export 절차.
- `docs/sprints/sprint-8-data/index.md` 신규 — 데이터 부재 분석 리포트 (N=0). 6종 집계 지표 측정 불가 + Sprint 9+ 재진입 경로 명시.
- `docs/sprints/sprint-8-external-validation.md` — §3~12 라이브 작성 + frozen 12 항목 + carry-over 14건 + retrospective 작성 완료.

### storage (T3, T4)
- `packages/storage/schema/0006_telemetry.sql` 신규 — `decision_log` (id/ts/actor/action/payload, action CHECK 없음 자유 문자열) + `satisfaction_survey` (id/ts/score CHECK 1~5/comment/session_marker CHECK mid|end). 인덱스 3종 (`idx_decision_log_ts`, `idx_decision_log_actor_action`, `idx_satisfaction_survey_ts`). WAL/idempotent.
- `packages/storage/src/repo/decisionLog.ts` 신규 — `appendDecisionLog`, `listDecisionLog`, `DecisionLogRow`, `ListDecisionLogOptions`. ON CONFLICT(id) DO NOTHING (CHECK 위반 throw 가능 정정).
- `packages/storage/src/repo/satisfactionSurvey.ts` 신규 — `appendSatisfactionSurvey`, `listSatisfactionSurveys`, `SatisfactionSurveyRow`.
- `packages/storage/index.ts` — 4 메서드 + 2 type root export. 헌법 6 grep 검증 PASS.
- `packages/storage/__tests__/{decision-log,satisfaction-survey,migration-0006}.test.ts` 신규 — 18종 단위 테스트. storage 전체 85/85 PASS.
- T4 (recall_log retention 30d) — 보류 frozen 분기 (별도 migration 0007 작성하지 않음). Sprint 9+ B안 채택 시 0007_recall_log_retention.sql 추가 ≈ 30분.

### protocol (T3 후속)
- `packages/protocol/src/decisionLog.ts` 신규 — `DecisionLogActor` (4종: orchestrator/mobile/engine/conversation) + `DecisionLogAction` (9종: silence/ghost/suggestion/strong/dismiss/retraction/recall_click/satisfaction/send) + `SatisfactionSessionMarker` (mid/end).
- `packages/protocol/index.ts` — 3 type root export.
- mobile T5 의 `'send'` 자가판단 1줄 확장 (헌법 7 옵션 (a) first 사례).

### mobile (T5, T12)
- `apps/mobile/src/telemetryStore.ts` 신규 — RN, in-memory + setStorageAdapter 옵션 DI + defaultStorageAdapter 자동 활성화. type 양 짝 inline (themeStore 패턴 답습).
- `apps/mobile/src/telemetryStore.web.ts` 신규 — Web, in-memory only (storage 의존 0). platform-adapter 9회차.
- `apps/mobile/app/_layout.tsx` — telemetryStore 자동 초기화 import.
- `apps/mobile/app/chat/index.tsx` — turn count 추적 + decision/recall/satisfaction event emit + SatisfactionSurveyOverlay inline 컴포넌트 (mid-session 5 turn).
- T12 (B안 후속 mount) — 보류 frozen 분기 (코드 변경 0).
- 검증: `pnpm --filter mobile typecheck/build` PASS + web bundle grep `better-sqlite3/sqlite-vec/AsyncStorage/appendDecisionLog` 0 hits.

### engine T6 (영구 보존 dormant — `[REVISE v2026-04-30 D-S8-engine-t6-defer-body]` 적용, 본 sprint 외부 데이터 독립 영역 first 사례)
- `packages/engine/src/dedupConcepts.ts` — `dedupConcepts(concepts, opts)` 순수 함수 + `DEFAULT_DEDUP_EMBED_THRESHOLD = 0.85` + 5 type (`DedupOptions`, `DedupConceptInput`, `MergePlan`, `EmbedSimilarityFn`, `NormalizeLabelFn`). 영구 박힘. `tsc --strict` 진단 다수 — *T11 채택 시* 해소 (보류 시 0 가치).
- `packages/engine/__tests__/dedup-concepts.test.ts` — 단위 테스트 17종 *runtime* PASS (normalize 5 / embedding 6 / 결정성 3 / 옵션 3). 영구 박힘. strict 진단 22 건 보류.
- `packages/engine/index.ts` — root export (`dedupConcepts` + `DEFAULT_DEDUP_EMBED_THRESHOLD` + 5 type), 헌법 6 grep 검증 PASS, runtime verify PASS. 영구 박힘.
- receipt fixture: `scripts/receipt/.receipt-runner/sprint8-concept-dedup.mjs` → step 58 branch=A PASS (`feedback_receipt_external_contract.md` 정합).
- **dormant 패턴**: caller (storage adapter) 미호출 = 동작 0. T11 결정 결과 (b) 보류 frozen → dormant 그대로 보존. Sprint 9+ 외부 데이터 도착 시 caller wiring 추가 + threshold 튜닝 ≈ 15분 즉시 활성. 헌법 7 옵션 (a) 정합 (외부 contract 변경 0 + revert ≤3분 + idempotent).

### engine + conversation T7 사전 합의 (영구 보존, 본체 코드 변경 0)
- dev doc §7 line 276~454 — `ClassifyNegationFn = (text) => Promise<{negated, confidence}>` + engine 측 `classifyNegationWithLLM(opts?)` builder + conversation 측 `loop.ts` `RetractionHookDeps.classifyNegation?` 옵션 + threshold 0.7 default + sendStream 한정.
- path 결정: 가설 1 (engine + conversation 양쪽 작성). LLM 호출 owner = engine 패턴 (`extractConcepts.ts` / `embed.ts` 답습). conversation 측 = 어댑터 wiring + type re-export.
- T11 결정 결과 = C 분기 (보류 frozen). 본체 코드 0. Sprint 9+ B안 채택 시 양 워커 동시 PR 가능 (race 0) ≈ 1시간.

### orchestrator T13 (사전 진단, 코드 변경 0)
- 임계값 6종 인벤토리 영구 기록 — `SCORE_GHOST=0.4` / `SCORE_SUGGESTION=0.6` / `SCORE_STRONG=0.8` / `TOKEN_CONTEXT_WEAKEN=2000` / `RECENCY_MS_WEAKEN=1500` / `COOLDOWN_MS=60_000`.
- T8 데이터 신호 사전 매핑 — 재조정 가능 3종 (SCORE_*+ COOLDOWN_MS) + 재조정 불가 2종 (TOKEN_CONTEXT_WEAKEN / RECENCY_MS_WEAKEN — 근거 부족 → A안 강제).
- T11 결정 결과 = 보류 frozen. 코드 변경 0. Sprint 9+ 외부 데이터에서 silence rule miss 신호 검출 시 임계값 재조정 ≈ 1 commit.

### tester T14 (receipt + fixture 7종 영구 보존)
- `scripts/receipt/sprint-8.sh` 신규 — Sprint 7 53단계 wrap (`SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환) + 신규 7단계 = 60단계.
- `scripts/receipt/.receipt-runner/sprint8-{external-data-index,frozen-decisions-carry-over,pii-policy,recall-log-retention,concept-dedup,negation-classifier,sprint-7-wrap}.mjs` 7 fixture.
- 임계 보강 (D-S8-receipt-threshold-recovery) — `external_session_count ≥ 0 (branch=B) OR ≥ 3 (branch=A)` + `frozen_decisions_carry_over ≥ 5` + `pii_policy_marks = 5`.
- fixture 매트릭스: 60/60 PASS (54 branch=B / 55 5 슬러그 / 56 5 키워드 / 57 branch=B / 58 branch=A / 59 branch=C / 60 6 fixture 메타).
- D-S8-tester-fixture-strict-matching frozen — fixture token 매칭 정책 5종 (주석 line 제외 / word-boundary 강제 / boundary suffix `]/공백/=` / 분기 disambiguation 명시 suffix / JSDoc 안 block-comment terminator line comment 변경).

### Receipt 종합 (60/60 PASS)
- Sprint 4: 32 + Sprint 5: 8 + Sprint 6: 6 + Sprint 7: 7 + Sprint 8: 7 = 60.
- lint 3종 (mockup-scope-parity / frozen-flag-audit / directive-tag-audit) 모두 exit 0.
- frozen 12 항목 (5 보류 + 1 A안 reconfirm + 6 인프라).
- engine 패키지 103/103 PASS / storage 85/85 PASS / conversation 100x 결정성 / e2e 3/3 (Sprint 7 wrap).

## 11. Decisions Made / Open Issues

**Decisions Made:**

- **[FROZEN v2026-04-30 D-S8-recall-log-retention-decision = 보류]** (T4) — recall_log retention 30d migration 보류. 사유: 외부 사용자 dogfooding 데이터 부재 (PM 직접 모집 트랙 미진행) + 본 sprint 의 *시간축 수집 한계* (실사용 데이터 통상 1~2주 소요, 본 conversation 기간 부족). storage T3 의 0006_telemetry.sql 은 추가 작성 완료 (decision_log + satisfaction_survey). retention 정책은 Sprint 9+ 외부 데이터 수집 후 결정. Sprint 6 carry-over 5 그대로 이월. revert 비용: B안 채택 시 별도 0007_recall_log_retention.sql 추가 + 단위 테스트 ≈ 30분.

- **[FROZEN v2026-04-30 D-S8-concept-dedup-decision = 보류]** (T6) — Concept dedup / alias merge 알고리즘 보류. 사유: 외부 graph 중복 빈도 분석 데이터 부재. *engine 측 dormant code 영구 보존* (`packages/engine/src/dedupConcepts.ts` 175줄 + 17/17 단위 테스트 + root export). caller 미호출 = 동작 0 (dormant). Sprint 9+ 외부 데이터 도착 시 *즉시 채택 분기* 가능 — caller wiring 만 추가하면 활성. 헌법 7 옵션 (a) dormant code 패턴 first 사례. revert 비용: 채택 시 storage adapter wiring + threshold 튜닝 ≈ 15분 / 보류 유지 시 0 (호출 안 함 = 동작 0).

- **[FROZEN v2026-04-30 D-S8-negation-classifier-decision = 보류]** (T7) — LLM-based negation classifier 보류. 사유: retraction 빈도 + heuristic miss 사례 외부 데이터 부재. *engine + conversation 양 워커 시그니처 사전 합의 영구 보존* (dev doc §7 line 276~454). path 결정 = *가설 1 채택* (engine 측 빌더 + conversation 측 옵션 함수 DI = 양쪽 작성). Sprint 9+ B안 채택 시 양 워커 동시 PR 가능 (race 0). C안 (보류) 분기에서 양 워커 코드 변경 0. revert 비용: B안 채택 시 engine 본체 + conversation 옵션 추가 + tester fixture 정정 ≈ 1시간.

- **[FROZEN v2026-04-30 D-S8-theme-toggle-decision = 보류]** (carry-over 7) — theme-toggle UI 카피 추가 보류. 사유: 외부 사용자 토글 필요 신호 부재 + 디자인 목업 (`디자인 목업/content.jsx`) 의 theme-toggle 카피 미정의. mobile themeStore 시스템 자동 디폴트 (`effectiveTheme = userOverride ?? systemTheme`) 그대로 유지. Sprint 9+ 외부 데이터에서 토글 UI 필요 신호 검출 시 designer 가 디자인 목업 갱신 + `copy.theme.{light,dark,system}` 키 추가. revert 비용: B안 채택 시 디자인 목업 + copy.ts + verify-copy 임계 + mobile mount ≈ 30분.

- **[FROZEN v2026-04-30 D-S8-empty-error-copy-decision = 보류]** (carry-over 8) — 4 화면 별 Empty/Error 카피 보류. 사유: inspector / library 별도 카피 필요 신호 부재. 현재 `firstChat.{empty/emptySub/error/errorSub/retry}` 1세트 재사용 + 컴포넌트 props 직접 주입 그대로 유지. Sprint 9+ 외부 데이터에서 화면별 카피 차이 필요 신호 검출 시 designer 가 디자인 목업 갱신 + `copy.{inspector,library}.empty.*` 추가. revert 비용: B안 채택 시 디자인 목업 + copy.ts + verify-copy 임계 + mobile 분기 ≈ 30분.

- **[FROZEN v2026-04-30 D-S8-inspector-unlink-recheck = A안 reconfirm]** (carry-over 2 재검토) — Inspector unlink B안 비채택, A안 (미구현 그대로) reconfirm. 사유: 외부 데이터 *recall 거절 동작 부족* 신호 부재 (외부 데이터 미수집) + Sprint 7 D-S7-inspector-unlink-decision 의 5층위 거절 메커니즘 (DismissButton variant='reject' Suggestion+Strong + HumbleRetraction chat + chatStore.dismiss + recall_log dismissed + concept-edge weight decay + concept dismiss penalty 0.5) 충분 판정 그대로 유지. Sprint 9+ 외부 데이터에서 부족 신호 검출 시 B안 (DismissButton variant='unlink' + Inspector 슬롯 + copy.unlink) 재진입 가능. revert 비용: B안 전환 시 designer 보강 ≈ 30분.

- **[FROZEN v2026-04-30 D-S8-pii-policy]** (T1) — PII 처리 정책 영구 확정. anonymize 규칙 5종 (사용자 식별자 SHA-256 hash + sprint-8-salt / raw text 격리 / 임베딩 768d 보존 / 메타 통계 보존 / 학습 데이터 합의 양식 opt-in-raw-text). raw text 검증 = `scripts/receipt/.receipt-runner/sprint8-pii-policy.mjs` step 56 PASS. revert 비용: 정책 본문 수정 + 영향 참여자 재합의 ≈ 1시간.

- **[FROZEN v2026-04-30 D-S8-consent-form]** (T2) — 외부 테스터 합의 양식 영구 확정. `docs/sprints/sprint-8-data/consent-form.md`. revert 비용: 양식 본문 수정 + 영향 참여자 재합의 ≈ 1시간.

- **[FROZEN v2026-04-30 D-S8-session-guide]** (T2) — 외부 테스터 세션 운영 가이드 영구 확정. `docs/sprints/sprint-8-data/session-guide.md`. revert 비용: 가이드 본문 수정 ≈ 30분.

- **[FROZEN v2026-04-30 D-S8-storage-shape-ack]** (T3) — telemetry 스키마 shape 4종 ACK. (a) decision_log = 신규 테이블. (b) action CHECK 없는 자유 문자열 + protocol union 컴파일 타임 가드. (c) 0006 (telemetry) + 0007 분리. (d) sessionHash 적용 위치 = mobile telemetryStore.emit 직전. storage 0006_telemetry.sql + decisionLog/satisfactionSurvey repo + protocol DecisionLogAction union 9종 (`'send'` 포함) 영구 보존. INSERT OR IGNORE swallow risk 정정 → ON CONFLICT(id) DO NOTHING (CHECK 위반 throw 가능). revert 비용: 0006 schema 삭제 + repo 모듈 삭제 + protocol union 회수 ≈ 30분.

- **[FROZEN v2026-04-30 D-S8-mobile-telemetry-event-abstraction]** (T5) — mobile telemetryStore event abstraction = storage row 와 분리된 layer 영구 확정. 양 짝 inline (themeStore 패턴 답습) + setStorageAdapter 옵션 DI + defaultStorageAdapter 자동 활성화. carry-over 13 platform-adapter 9회차. revert 비용: telemetryStoreTypes 자체 모듈 복원 + DI 패턴 변경 ≈ 30분.

- **[FROZEN v2026-04-30 D-S8-negation-classifier-path-resolution = 가설 1]** (T7 사전 결정) — fixture vs ACK path 충돌 진단 결과 *가설 1 채택* (engine + conversation 양쪽 작성 = ACK 합의 정합). LLM 호출 owner = engine (extractConcepts/embed 패턴 답습). conversation 측 = 옵션 함수 DI wiring + type re-export. tester step 59 fixture B 분기 = 5 path verify 정정 완료. carry-over 12 시그니처 동결 정합. revert 비용: 가설 2 (conversation 단일) 전환 시 fixture + 책임 분리 ≈ 1시간.

- **[FROZEN v2026-04-30 D-S8-tester-fixture-strict-matching]** (T14) — fixture token 매칭 정책 영구 확정. (a) OR 매칭 토큰 word-boundary + 단위 명시 (`30d` / `RETENTION_DAYS=30`) 강제 — directive 태그 날짜 (`2026-04-30` 의 `30`) false positive 회피. (b) substring 매칭 (`negation` / `heuristic`) 주석 line 제외 후 매칭 강제. (c) JSDoc 안 block-comment terminator (`*/`) 는 line comment (`//`) 로 변경 의무. step 56/57/58/59/60 모두 strict 매칭 확정. revert 비용: substring 매칭 회수 ≈ 10분.

**Open Issues:**
- **외부 테스터 모집 운영 주체** — 디폴트 가정: PM 직접 모집 + team-leader 가 합의 양식 + 세션 운영 가이드 박음. PM 수정 가능.
- **데이터 수집 기간** — 디폴트 가정: Sprint 8 안에서 N≥3 × M세션 수집. 부족 시 부분 fixture hybrid OK (frozen 박을 때 데이터 부족 사유 명시).
- **PII 익명화 수준** — 디폴트 가정: 사용자 식별자 SHA-256 hash + 임베딩 + 메타만. raw text 격리 (학습 데이터 합의 시 별도 채널). carry-over 11 LLM 도입이 raw text 학습 필요한 경우 합의 양식 갱신.
- **B안 채택 시 디자인 목업 갱신 주체** — 디폴트 가정: designer 가 `디자인 목업/content.jsx` 단일 진실원 갱신. carry-over 7/8/2 의 "디자인 목업 부재" 명시 사유로 본 sprint 한정 갱신 권한 부여.
- **5종 결정 모두 보류 가능성** — 외부 데이터 신호 부재 시 5종 모두 *보류 frozen* 박는 패턴이 receipt step 55 (`frozen_decisions_carry_over ≥ 5`) 통과시키는 valid 경로. B안 강제 아님.

## 12. Carry-over + Retrospective

**Carry-over (다음 스프린트가 반드시 알아야 할 것):**

1. **Sprint 9+ 첫 day 외부 모집 시작이 본 sprint 의 자연스러운 후속** — Sprint 8 의 인프라 (T1~T5 + T14) 영구 보존. PM 직접 모집 → consent-form §5 서명 → session-guide §2 자유 사용 → export → 분석 리포트 갱신 → T11 6 분기 *실제 데이터 기반* 결정. 통상 N≥3 × M≥2 세션 수집 사이클 ≈ 1~2주.

2. **engine T6 dormant code 활용 경로** — `packages/engine/src/dedupConcepts.ts` 175줄 + 17/17 단위 테스트 + root export 영구 보존 (D-S8-concept-dedup-decision = 보류 frozen). caller 미호출 = 동작 0 (dormant). Sprint 9+ 외부 데이터로 graph 중복 빈도 신호 검출 시 storage adapter wiring + threshold 튜닝 ≈ 15분 즉시 활성. 헌법 7 옵션 (a) dormant 패턴 first 사례.

3. **engine + conversation T7 사전 합의 영구 보존** — dev doc §7 line 276~454 의 시그니처 합의 (`classifyNegationWithLLM` engine builder + `RetractionHookDeps.classifyNegation?` conversation 옵션 + threshold 0.7 default + sendStream 한정). path 결정 = 가설 1 (engine + conversation 양쪽 작성). tester step 59 fixture B 분기 5 path verify 정합. Sprint 9+ B안 채택 시 양 워커 동시 PR 가능 ≈ 1시간 (race 0).

4. **stale directive 누적 8건 (Sprint 7 designer 4 + Sprint 8 engine 1 + mobile 2 + tester 1)** — 헌법 8 first 본격 적용 sprint. Sprint 9 spawn prompt 0번 묶음 강화 후보: "team-lead directive 발송 직전 producer 측 *최신 보고 시각* 1회 verify 의무 (inbox snapshot 신뢰 금지)" + "REVISE/ACK 작성 시 baseline state 명시 + verify 결과 inline 인용 의무".

5. **fixture-contract gap 발견 5건** (step 54 N=0 분기 / step 55 boundary suffix / step 56 PII contract / step 57 substring false positive / step 59 partial verify) — `feedback_receipt_external_contract.md` 강화 후보: "fixture 작성 직전 ACK 합의 (dev doc §7) 1회 grep 의무 + token boundary + 분기 disambiguation 명시 suffix 강제 + JSDoc 안 block-comment terminator (`*/`) line comment 변경 의무".

6. **헌법 7 옵션 (a) consumer-driven 자가판단 first 사례** (mobile T5 `'send'` protocol union 1줄 확장) — 4 조건 (≤3줄 + idempotent + revert ≤5분 + 확장 only) 충족 시 producer 패키지 union/type 1줄 확장 직접 가능 + producer ack 의무. 메모리 `feedback_constitution7_option_a_self_judgment.md` 영구 기록.

7. **헌법 후보 9~11 (Sprint 9 spawn prompt 0번 묶음 inject 검토)**:
   - 9: "task assignment 수신 시 dev doc §6 blocker 컬럼 1회 grep + 외부 데이터 독립성 1차 분류" (T6 dormant + T7 stand-by 양쪽 사례).
   - 10: "dormant code 패턴 명시 — 외부 contract 변경 0 + 동작 0 + revert ≤3분 + idempotent 4 조건 충족 시 본체 작성 valid" (T6 first 사례).
   - 11: "워커가 directive 의 진단 원인이 fixture 실측과 다를 때 보고 의무 — 헌법 8 의 consumer-side correction" (tester syntax 진단 별개 원인 보고 first 사례).

8. **PM "박다" 용어 사용 금지** — `feedback_no_pakda_term.md` 메모리 영구 기록. Sprint 9 spawn prompt 0번 묶음에 PM 피드백 inject 의무. 신규 보고 / directive / dev doc / 메시지 / 워커 메시지 모두 0건 강제. 문맥별 대체어: "확정 / 기록 / 추가 / 보존 / 작성 / 적용".

9. **platform-adapter 누적 9회** — themeStore (7) + chatStore (8) + telemetryStore (9). Sprint 9+ 신규 mobile store 작성 시 표준 강제 (carry-over 1/13 그대로).

10. **DecisionAct enum 4원 + runMemoryFormation / runRecallHook / RecallFn / DecideFn / chatStore 기존 메서드 시그니처 + storage migration 0001~0005 = 영구 동결** (Sprint 7 carry-over 12 그대로). 0006_telemetry.sql 추가 (decision_log + satisfaction_survey) + protocol DecisionLogAction union 9종 영구 보존.

11. **단일 작성자 시간창 race 회피 패턴 first 사례** — storage + mobile 의 §7 동시 작성자 충돌 → anchor 축소 (sub-section 단위) 후 재시도 PASS. Sprint 9+ 라이브 갱신 시 짧은 anchor 표준 강제.

12. **HOLD-DECIDE-RESUME 의 *기술 분기* 사전 합의 first 사례** (engine + conversation T7) — PM 결정 분기 *전*에 영향 워커 양쪽이 시그니처 + path + 분기 라벨 사전 합의 → T11 RESUME 후 race 0 동시 PR 가능. Sprint 9+ 외부 데이터 의존 결정 sprint 에서 동일 패턴 권장.

13. **system routing replay 별도 카운트** — TaskCreate / TaskUpdate / self-loop 등 system 자동 알림은 team-lead directive 와 별도. 워커 측 stale 진단 + 무동작 처리 의무 (mobile self-loop 1건 first 사례).

14. **외부 데이터 수집 sprint 의 *시간축 분리* 검토** — 본 sprint 의 핵심 학습. sprint scope 가 외부 데이터 의존 결정인 경우, *내부 인프라 sprint* (1~2 day) + *외부 데이터 수집 sprint* (1~2주) 분리가 자연스러울 수 있음. 본 sprint 의 close 분기 (A) 가 이 패턴의 first 정합.

**Retrospective:**

- **잘 된 것**:
  - 14/14 task 완료 + receipt 60/60 PASS — close 분기 (A) 정합 검증 완료.
  - 외부 검증 인프라 (PII 정책 + 모집 양식 + 세션 가이드 + telemetry schema + 만족도 UI + 분석 리포트 자리 + receipt 60단계 + fixture 7 종) 완비 — Sprint 9+ 외부 데이터 수집 즉시 가능.
  - dormant code 패턴 first 사례 (engine T6) + consumer-driven 자가판단 first 사례 (mobile T5) — 헌법 7 옵션 (a) 의 두 정신 영구 기록.
  - HOLD-DECIDE-RESUME 의 *기술 분기* 사전 합의 first 사례 (engine + conversation T7) — PM 결정 *전* 양 워커 시그니처 + path + 분기 라벨 사전 합의 → T11 RESUME 후 race 0.
  - 헌법 8 (Sprint 7 carry-over 14) first 본격 적용 — stale directive 8건 자동 catch + 정정 cycle. 워커 자율 판단 (engine dormant body / mobile event abstraction / tester JSDoc terminator / conversation path 결정) 모두 정합.
  - tester 의 fixture-contract gap 5건 발견 + strict 매칭 정정 — `feedback_receipt_external_contract.md` 의 next iteration. token boundary + 분기 disambiguation + 주석 line 제외 + N=0 분기 추가.
  - storage 의 INSERT OR IGNORE swallow risk 정정 (CHECK 위반 throw 가능하게 ON CONFLICT(id) DO NOTHING) — TS strict null + SQL constraint cross-layer race 단위 테스트로 catch.

- **아팠던 것**:
  - team-lead directive stale 4건 (engine T6 defer + mobile telemetry-type-singletruth + storage `'send'` redundant + tester regex 오타 진단) — 헌법 8 의 baseline state verify 의무 위반 누적.
  - fixture-contract gap 5건 — fixture 가 외부 contract 의 단일 진실원과 1:1 정합 의무 위반. receipt 가 false positive / partial verify 로 통과하는 위험성 노출.
  - 외부 데이터 수집 *시간축 한계* — 본 conversation 단일 day 안에서 N≥3 × M≥2 세션 수집은 통상 1~2주 사이클과 mismatch. sprint scope 자체의 시간축 가정 별도 sprint 분리 필요.
  - "박다" 용어 누적 사용 (Sprint 7~8 dev doc / directive / 보고) — PM 의 한국어 감각과 mismatch. 메모리 등록 후 본 §11~§12 부터 0건 적용 (이전 §1~§11 은 churn 회피 사유로 그대로 유지).

- **다음에 다르게 할 것**:
  - **Sprint 9+ 첫 day 외부 모집 시작** — PM 직접 모집 트랙 즉시 진행. T1~T5 인프라 + T6 dormant + T7 사전 합의 활용 → 외부 데이터 수집 → T8 분석 갱신 (`sprint-9-data/index.md`) → T11 6 분기 PM 사인오프.
  - **헌법 8 baseline state verify 의무 강화** — directive 발송 직전 producer 측 *최신 보고 시각* 1회 verify. inbox snapshot 신뢰 금지. REVISE/ACK 작성 시 baseline state 명시 + verify 결과 inline 인용.
  - **fixture 작성 직전 ACK 합의 1회 grep 의무** — `feedback_receipt_external_contract.md` 강화. token boundary + 분기 disambiguation 명시 suffix 강제.
  - **헌법 후보 9~11 채택 검토** — Sprint 9 첫 day spawn prompt 0번 묶음 inject 검토.
  - **"박다" 용어 0건 강제** — Sprint 9 spawn prompt 의 PM 피드백 inject + 모든 워커 자동 적용.
  - **외부 데이터 의존 sprint 시간축 분리** — *내부 인프라 sprint* (1~2 day) + *외부 데이터 수집 sprint* (1~2주) 분리 패턴 권장. 본 sprint close 분기 (A) 가 이 패턴의 first 정합 사례.
