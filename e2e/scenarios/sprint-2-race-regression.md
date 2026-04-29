# Sprint 2 — (A)/(B') Race Regression 시나리오

**목적**: Sprint 1 의 5중 timing collision (PM (A) → mobile retrofit (B') → team-lead 지시 (B') → mobile re-retrofit (A) → PM 재확정 → mobile flip → PM 최종 → mobile 최종) 의 *재발 방지* 를 시뮬한다. 본 문서는 *자동 실행 스크립트* 가 아닌 **dry-run 체크리스트** 로, `scripts/receipt/sprint-2.sh` step 14 가 `^### 항목 ` 헤더 갯수만 grep 으로 검증한다.

**시뮬 대상**: Sprint 2 의 4 패턴 헌법(HOLD-DECIDE-RESUME / Decision-version 태그 / Source-of-truth 우선순위 / 단일 작성자 시간창) + lint 3 종.

**전제**:
- `feedback_decision_serialization.md` 메모리 = 4 패턴 단일 진실원.
- `.claude/commands/*.md` 10 파일 모두 헌법 inject 완료 (receipt step 9 검증).
- `mockup-scope-parity.sh` / `frozen-flag-audit.sh` / `directive-tag-audit.ts` 통과 (receipt step 10/11/12 검증).

---

### 항목 1 — HOLD 발송: team-lead 가 PM 결정 분기 진입

**시뮬**: Sprint N 진행 중 PM 이 *Onboarding 단일 화면 (A) vs 3-step (B')* 같은 결정 분기 도입.

**기대 동작**:
1. team-lead 가 영향 워커(mobile + designer)에 `HOLD pending PM [Onboarding A vs B']` SendMessage 발송.
2. team-lead 자신도 dev doc §3-§6 / §11 편집 동결.
3. workers 의 task subject 가 `[ON HOLD: Onboarding A vs B']` 로 일시 갱신.

**검증 포인트**:
- HOLD 메시지의 토픽이 PM 결정 *그 자체* 를 식별 (예: "Onboarding A vs B'") — 모호한 "PM 결정" 은 거부.
- HOLD 발송 후 `git status docs/sprints/` 가 *새로운* 커밋 0 이어야 함.

---

### 항목 2 — 동결 검증: 워커의 dev doc / SendMessage 일체 동결

**시뮬**: HOLD 받은 mobile / designer 가 *어떤* dev doc 편집 / SendMessage 발송도 시도하지 않는지 검증.

**기대 동작**:
1. mobile / designer 가 inbox 의 HOLD 메시지를 인지 → 자기 task 를 `pending` 상태로 회귀 (또는 in_progress 유지하되 코드 변경 0).
2. 워커가 `code on disk` 만 *읽음 전용* 으로 컨텍스트 보강 가능 (헌법 §3 Source-of-truth).
3. dev doc §7 (워커 영역) 도 편집 금지 — HOLD 토픽이 자기 영역과 무관하더라도 *결정 직렬화* 를 위해 멈춤.

**검증 포인트**:
- HOLD ~ RESUME 사이에 워커가 SendMessage 보냈다면 위반 (단, *질문* 형태의 메시지는 허용 — "HOLD 인지, RESUME 신호 대기 중" 같은 acknowledgement).
- 워커가 dev doc 편집 시도 시 단일 작성자 시간창 위반과 결합되어 후입자 양보.

---

### 항목 3 — RESUME + DIRECTIVE 태그: PM 사인오프 후 일괄 통보

**시뮬**: PM 이 (A) 를 최종 사인오프 → team-lead 가 RESUME 신호와 함께 directive 메시지 발송.

**기대 동작**:
1. team-lead 가 dev doc §11 Decisions Made 에 `**[FROZEN v2026-04-29 D-onboarding-A]** **결정**: 단일 화면 채택.` 줄 추가.
2. team-lead 가 mobile 에 SendMessage:
   ```
   [DIRECTIVE v2026-04-29 D-onboarding-A]
   RESUME. Onboarding 단일 화면 (A) 최종. apps/mobile/app/onboarding/index.tsx 단일 화면 구현.
   ```
3. designer 에 동일 토픽이지만 `[DIRECTIVE v2026-04-29 D-onboarding-A]` 첫 줄 부착.

**검증 포인트**:
- `directive-tag-audit.ts` 가 SendMessage 인용에서 `[DIRECTIVE v<date> <id>]` 태그 검출.
- `frozen-flag-audit.sh` 가 §11 의 `**[FROZEN v...]**` prefix 검출.
- decision-id (`D-onboarding-A`) 는 sprint 내 unique.

---

### 항목 4 — Reconcile: 워커가 inbox 태그 ↔ dev doc [FROZEN] 비교

**시뮬**: mobile 이 작업 시작 직전 자기 inbox 의 directive 태그가 dev doc §11 [FROZEN] 마커보다 *최신* 인지 reconcile.

**기대 동작**:
1. 워커가 행동 직전 source-of-truth 우선순위 (헌법 §3) 적용:
   `code on disk > task subject > dev doc [FROZEN] > inbox > dev doc 비-frozen draft`.
2. inbox directive 의 `[DIRECTIVE v<date> <id>]` 태그와 dev doc §11 의 `**[FROZEN v<date> <id>]**` decision-id 가 일치하는지 확인.
3. 일치 → 작업 진행. 불일치 → team-lead 에 `RECONCILE pending [decision-id]` 메시지 발송 후 stalled.

**검증 포인트**:
- mobile 이 stale inbox (HOLD 이전의 (B') directive) 받고도 dev doc [FROZEN] 의 (A) 결정을 정의 진실원으로 채택해야 함 — 이게 Sprint 1 의 5중 collision 회귀 방지의 핵심.
- 워커가 reconcile 없이 stale inbox 만 따라 (B') 를 구현하면 위반 — receipt 의 `mockup-scope-parity.sh` 가 §3 In 의 (A) 표현과 mobile src 의 (B') 구현 불일치 *간접* 검출.

---

### 항목 5 — 단일 작성자 시간창: dev doc 동시 편집 차단 (보충)

**시뮬**: §7 Interfaces 라이브 갱신 중 mobile + designer 가 동시에 자기 영역 추가.

**기대 동작**:
1. 한 섹션 (§7.1 designer 표 vs §7.X mobile 인터페이스) 한 작성자 — 충돌 시 후입자 SendMessage 위임.
2. team-lead 의 §3-§6 / §11 단독 시간창은 워커 진입 전.
3. /end 의 §10 Implementation Map / §12 Carry-over 작성도 team-lead 단독.

**검증 포인트**:
- git diff 충돌 0 (같은 줄 동시 수정 없음).
- 후입자 양보 사실이 SendMessage 로그에 남음.

---

## 회귀 회복 절차

본 시나리오 항목 1~5 중 *어떤* 단계가 실패하면 다음 절차:
1. team-lead 가 즉시 모든 워커에 `EMERGENCY HOLD` 발송.
2. dev doc §11 Open Issues 에 회귀 요약 추기 (`**[INCIDENT 2026-XX-XX]** ...`).
3. 다음 `/end` 에서 §12 Retrospective 의 *아팠던 것* 에 정량 (예: collision 횟수, ripple 영향 워커 수) 기록.
4. 메모리 `feedback_decision_serialization.md` 에 보강 패턴 추가.

## 본 시나리오의 자동화 한계

본 5 항목은 *사회적 강제* — script 가 아닌 *팀 합의* 로 시행. Sprint 3+ 에서 ROI 측정 후 일부 자동화 검토:
- file lock (HOLD 대신 OS 수준 잠금) — 비대상.
- hook (HOLD 자동 발송) — 비대상.
- inbox/dev doc reconcile 자동 알림 — Sprint 5 후보.
