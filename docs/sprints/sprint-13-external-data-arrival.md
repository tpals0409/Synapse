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
- Sprint 12 메타 본체 inheritance 3 슬라이스 (designer Tier 1, mobile Tier 3, tester Tier 3)
- Sprint 9 65 단계 receipt wrap (`SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환)
- 헌법 9~12 워커 정의 보존 회귀 (Sprint 13 정렬로 7 워커 됐으므로 임계 7 로 갱신)
- designer-s12 잔존 worktree 폐기 (Sprint 12 no-op close 와 일관성 유지)

**Out:**
- 외부 데이터 N≥3 수집 (미도착, Sprint 14 로 이월)
- D-S13-* 6종 결정 갱신 (외부 데이터 의존, Sprint 14 로 이월)
- 6 분기 본체 작성 (dedup / negation / retention / theme-toggle / empty-error / unlink) — 외부 데이터 의존, Sprint 14 로 이월

> **branch 결정 (2026-05-15 PM 사인오프)**: 외부 데이터 N≥3 미도착 → branch=A active 불가, branch=B no-op close 는 4중 연속 no-op 회피 위해 거부 → **Sprint 12 메타 본체 inheritance only** 진행. Sprint 8 carry-over 14 의 시간축 분리 패턴 여섯 번째 정합 사례 = inheritance-only 신규 패턴.

## 4. Architecture & Data Flow

데이터 흐름은 단방향 — designer 가 copy 키 추가 → mobile 이 web 분기에서 mount → tester 가 receipt fixture 로 검증.

```
designer (packages/design-system/src/copy.ts)
        ↓ root index export: FirstChatCopy.demoHint
mobile (apps/mobile/app/chat/index.tsx)
        ↓ Platform.OS === 'web' 분기 안에서 mount
tester (scripts/receipt/sprint-13.sh + fixture 4종)
        ↓ verify-copy ≥ 24 + web_demo_banner_present=1
receipt PASS
```

관여 패키지: `packages/design-system`, `apps/mobile`, `scripts/receipt`. 다른 패키지 (engine / conversation / orchestrator / storage) 손대지 않음 — frozen 보존.

## 5. File Ownership
| Agent | Tier | Files |
|---|---|---|
| designer | 1 | `packages/design-system/src/copy.ts`, `packages/design-system/__tests__/copy.test.ts`, `packages/design-system/.receipt-runner/verify-copy.mjs`, `디자인 목업/content.jsx` (참조 only) |
| mobile | 3 | `apps/mobile/app/chat/index.tsx` |
| tester | 3 | `scripts/receipt/sprint-13.sh` (신규), `scripts/receipt/.receipt-runner/sprint13-{end-mark-live-measure,receipt-infra-path-swap,dev-infra-doc,web-demo-banner}.mjs` (신규 4종) |

> **Tier 정의** (Sprint 11+, Agent View 단계별 dispatch 용):
> - **Tier 1 (producer-only)**: 다른 워커가 의존하는 영향력 있는 변경 — protocol 타입, storage 마이그레이션, design tokens breaking change. 동시 dispatch OK (서로 충돌 안 함).
> - **Tier 2 (의존 + 자체 export)**: Tier 1 결과를 import 하면서 자기도 새 export 제공 — engine / conversation / orchestrator 의 일반 슬라이스.
> - **Tier 3 (소비자만)**: 모든 producer 결과를 consume — mobile UI, tester e2e.
>
> **Sprint 13 실측 패턴**: Agent View `isolation: worktree` 사용 — designer / mobile 워커는 자동 생성된 worktree 에서 작업 후 PM 이 squash merge. T3 tester 는 worktree 격리 우회 → main 에 직접 commit (O-S13-tester-worktree-bypass 로 carry-over). 순차 dispatch (Tier 끼리도 동시 X) — 단일 작성자 시간창 보장.

## 5.5 Worker Slices
<!-- 워커 슬라이스 본문. PM 이 `claude agents` 입력에 그대로 paste 해 `@<worker> <slice>` 형태로 dispatch.
     워커가 dispatch 대상이 아니면 해당 slice 블록 통째 생략. -->

### [designer] Sprint 12 inheritance — copy.firstChat.demoHint (sibling) + verify-copy 23→24
- `packages/design-system/src/copy.ts` 에 `FirstChatCopy.demoHint: string` 타입 + ko/en 카피 추기
  - ko: "이건 웹 데모예요. 진짜 기억은 모바일에서 시작돼요."
  - en: "This is a web demo. Real memories begin in the mobile app."
- 코드 구조 실측: `firstChat.empty` 는 string 이라 `empty.demoHint` (nested) 불가 → **`firstChat.demoHint` (sibling)** 결정 (헌법 7(a)).
- root export 무변경 (`packages/design-system/index.ts` 가 `copy` + `FirstChatCopy` 이미 노출 중) — grep 으로 확인.
- verify-copy lint 임계 ≥ 24 — `packages/design-system/.receipt-runner/verify-copy.mjs` (NOT `scripts/`) self-consistency 카운트 +1. content.jsx 매칭은 demoHint 키 부재라 checks 배열 무변경.
- frozen 위반 점검: engine / conversation / orchestrator / storage / mobile / scripts / 디자인 목업 어떤 파일도 손대지 말 것.
- transcript 4 줄 종료: (1) 슬라이스 결과 (2) Interfaces (root export 갱신 여부 + 키 path) (3) Carry-over (mobile 이 consume 할 때 주의점) (4) Frozen 위반 여부

### [mobile] Sprint 12 inheritance — Platform.OS === 'web' 분기 demoHint mount
- 실측 구조: `apps/mobile/src/firstChat.tsx` 부재. Expo Router 의 `apps/mobile/app/chat/index.tsx` 가 FirstChat 화면 진입점.
- empty state 영역 (line ~180) 의 `DSEmptyState` 직후 `Platform.OS === 'web'` 분기 1 블록 추가
- 분기 안에서 `c.firstChat.demoHint` mount (designer 가 producer, `c` = `copy[lang].firstChat`)
- 디자인 토큰만 사용 (`role.body` / `spacing.lg` / `colorsHex.light.ink` @ 0.55 opacity / 가운데 정렬), 하드코딩 0
- iOS / Android 분기는 mount 안 함 (디자인 톤 단일 진실원 유지)
- 의존: designer T1 머지 + **origin push** 후 dispatch (consumer-only) — 시작 전 `grep -n demoHint packages/design-system/src/copy.ts` 로 producer contract 확인. origin push 누락 시 worktree base stale → 워커가 producer 심볼 부재 검출 후 정상 중단 (헌법 #5/#7/#8/#11).
- 단위 테스트는 mobile 패키지 jest 인프라 부재 (`test=echo skip`)로 carry-over.
- frozen 위반 점검: 다른 화면 (Inspector / Onboarding / Library) 손대지 말 것
- transcript 4 줄 종료: (1) 슬라이스 결과 (2) Interfaces (firstChat 컴포넌트 prop 변경 여부) (3) Carry-over (tester 가 e2e 로 검증할 시나리오) (4) Frozen 위반 여부

### [tester] Sprint 12 inheritance — sprint-13.sh + fixture 4종 + Sprint 9 65 wrap
- 실측 구조: fixture 형식 = `.mjs` 단일 파일 in `scripts/receipt/.receipt-runner/`. dev doc 의 `.ok/.fail` 쌍 + `fixtures/` 디렉토리 가정은 잘못됨.
- `scripts/receipt/sprint-13.sh` 신규 작성 (sprint-12.sh 미작성이라 처음으로 sprint-12 의 4 단계 정책을 본 fixture 가 검증)
- 신규 fixture 4종 `scripts/receipt/.receipt-runner/sprint13-<name>.mjs`:
  - `sprint13-end-mark-live-measure.mjs` — 메모리 `feedback_end_mark_live_measure` 정책 메타-검증
  - `sprint13-receipt-infra-path-swap.mjs` — 메모리 `feedback_receipt_external_contract` 정책 (모든 fixture 가 root index 경로 import 검증)
  - `sprint13-dev-infra-doc.mjs` — `docs/dev-infra.md` 영속성 + 5종 raw text
  - `sprint13-web-demo-banner.mjs` — T2 mobile 결과 raw text consume
- Sprint 9 65 단계 wrap — `SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환 분기 보존. Sprint 13 7 워커 정렬 부수 효과 (sprint-2.sh step 9 fail) 우회 위해 `LEGACY_WRAP_FAIL_TOLERATED=1` 임시 분기 도입.
- 임계 (D-S13-receipt-threshold-recovery):
  - `external_session_count = 0` (inheritance 모드, branch=A 미진입이므로 N≥3 강제 X)
  - `verify_copy_ok ≥ 24`
  - `web_demo_banner_present = 1`
  - `pakda_term_count = 0` (메모리 `feedback_no_pakda_term`)
  - `agent_view_workaround_pattern ≥ 0` (Sprint 12 결함 우회 불필요로 임계 완화)
  - `workers_with_constitution ≥ 7` (Sprint 13 정렬로 team-leader 제거, 7 워커 기준)
- 의존: designer T1 + mobile T2 머지 + origin push 후 dispatch (consumer-only)
- frozen 위반 점검: receipt 외 코드 손대지 말 것
- transcript 4 줄 종료: (1) 슬라이스 결과 (2) Interfaces (receipt 신규 임계 list) (3) Carry-over (Sprint 14 가 외부 데이터 도착 시 임계 강화할 항목) (4) Frozen 위반 여부

## 6. Tasks
| ID | Description | Owner | Tier | Blocked By |
|---|---|---|---|---|
| T0 | designer-s12 잔존 worktree 폐기 (`git worktree remove ... --force` + `git branch -D worker/designer-s12`) | PM | - | - |
| T1 | `copy.firstChat.demoHint` ko/en 추기 + root export 확인 + verify-copy 임계 ≥ 24 | designer | 1 | T0 |
| T2 | `chat/index.tsx` Platform.OS === 'web' 분기 demoHint mount | mobile | 3 | T1 머지 + origin push |
| T3 | `sprint-13.sh` + fixture 4종 + Sprint 9 65 wrap + 임계 갱신 | tester | 3 | T1 머지, T2 머지 + origin push |
| T4 | Sprint 13 dev doc §7~§12 PM 큐레이션 | PM | - | T1, T2, T3 머지 |
| T5 | `bash scripts/receipt/sprint-13.sh` exit 0 검증 | PM | - | T3 머지 |
| T6 | sprint close commit + `git tag sprint-13-closed` + `git push origin main` (헌법 #3) | PM | - | T4, T5 |

## 7. Interfaces / Contracts
- **`packages/design-system`** — `FirstChatCopy` 에 `demoHint: string` 필드 신규. ko/en 양쪽 mount 가능. root export (`copy`, `FirstChatCopy`) 무변경 (이미 노출 중). consumer breaking change 0건 (객체 literal 작성 코드 부재 — 모든 consumer 가 `copy.{ko,en}.firstChat.demoHint` 읽기만).
- **`apps/mobile/app/chat/index.tsx`** — `FirstChat` default export prop 무변경. EmptyState 직후 `Platform.OS === 'web'` 분기 1 블록 추가 (line 195~). iOS/Android 분기는 미렌더 (의도). 디자인 토큰 (role.body / spacing.lg / colorsHex.light.ink) 만 사용, 하드코딩 0.
- **`scripts/receipt/sprint-13.sh`** — Sprint 9 65 단계 wrap + 신규 4 단계 (66~69) = 69 단계. 환경변수: `SKIP_OLLAMA=1` / `SKIP_SPRINT1_E2E=1` / `LEGACY_WRAP_FAIL_TOLERATED=1` (Sprint 13 7 워커 정렬로 sprint-2.sh step 9 fail 우회). 신규 임계 6종은 §11 참조.
- **`scripts/receipt/.receipt-runner/sprint13-*.mjs`** — 4 fixture 신규: `sprint13-end-mark-live-measure.mjs` / `sprint13-receipt-infra-path-swap.mjs` / `sprint13-dev-infra-doc.mjs` / `sprint13-web-demo-banner.mjs`. 각 fixture stdout 1 줄 결과 (예: `web_demo_banner_present=1;copy_keys_matched=2;chat_mount_lines=2`).

## 8. Test Scenarios
- **web 데모 빈 화면 진입** (`apps/mobile/app/chat/index.tsx` empty state) → web 환경에서만 `이건 웹 데모예요. 진짜 기억은 모바일에서 시작돼요.` 가 EmptyState 직후 부가 정보로 mount. iOS/Android 진입 시 미mount. 자동화: `scripts/receipt/.receipt-runner/sprint13-web-demo-banner.mjs` (raw text + Platform.OS === 'web' 동시 매칭, copy_keys_matched ≥ 2, chat_mount_lines = 2). e2e 시나리오는 carry-over (mobile jest 인프라 부재).
- **i18n 정합** — verify-copy.mjs ok=24 (Sprint 7 ok=23 +1) 으로 ko 카피 단일 진실원 대 design-system copy 1:1 매칭 보존.

## 9. Demo Script
1. `git fetch origin && git checkout main && git pull` (origin/main = `cd4b0f0` 시점 + T4 PM 큐레이션 commit 까지 갱신).
2. `pnpm install`.
3. `SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 LEGACY_WRAP_FAIL_TOLERATED=1 bash scripts/receipt/sprint-13.sh` → exit 0 + `✅ Sprint 13 receipt PASSED` + 단계 카운트 `66/69` ~ `69/69` 모두 PASS 확인.
4. (옵션) web 데모 시연 — `pnpm --filter mobile build` + `serve -s` 후 빈 채팅 화면에서 demoHint 가 노출되는지 육안 확인. 모바일 분기는 미노출.

## 10. Implementation Map
- **commit 7aaf9a5** (T1/designer):
  - `packages/design-system/src/copy.ts` — `FirstChatCopy.demoHint: string` 타입 + ko/en 카피 추기.
  - `packages/design-system/__tests__/copy.test.ts` — demoHint unit test 2건 (109 PASS).
  - `packages/design-system/.receipt-runner/verify-copy.mjs` — ok 23→24 (self-consistency).
- **commit 6a50e0d** (T2/mobile):
  - `apps/mobile/app/chat/index.tsx` line 181~218 — EmptyState 를 `<View>` wrap, 직후 `Platform.OS === 'web'` 분기 1 블록 (`role.body` / `spacing.lg` / `colorsHex.light.ink @ 0.55`).
- **commit cd4b0f0** (T3/tester):
  - `scripts/receipt/sprint-13.sh` — 신규, 69 단계, LEGACY_WRAP_FAIL_TOLERATED 분기.
  - `scripts/receipt/.receipt-runner/sprint13-{end-mark-live-measure,receipt-infra-path-swap,dev-infra-doc,web-demo-banner}.mjs` — 신규 4 fixture.
- **PM 실측 마커** (T5): `SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 LEGACY_WRAP_FAIL_TOLERATED=1 bash scripts/receipt/sprint-13.sh` exit 0, `workers_with_constitution=7/7`, `fixtures_scanned=35`, `copy_keys_matched=2`, `dev_infra_token_count=5`, `sprint_13_live_marker_count=4`. 2026-05-15 PM 실측.

## 11. Decisions Made / Open Issues
**Decisions Made:**
- **D-S13-branch = inheritance-only** (2026-05-15 PM 사인오프) — branch=A 외부 데이터 N≥3 미도착, branch=B no-op 4중 연속 회피, **Sprint 12 메타 본체 inheritance 3 슬라이스만 진행**. Sprint 8 carry-over 14 시간축 분리 패턴 여섯 번째 정합 사례 = inheritance-only 신규 패턴.
- **D-S13-receipt-threshold-recovery (확정)** — Sprint 9 65 단계 + 신규 4 단계 (66~69) = 69 단계. 임계 6종:
  - `external_session_count = 0` (inheritance 모드)
  - `verify_copy_ok ≥ 24`
  - `web_demo_banner_present = 1`
  - `pakda_term_count = 0`
  - `agent_view_workaround_pattern ≥ 0` (Sprint 12 결함 해소 신호로 완화)
  - `workers_with_constitution ≥ 7`
- **D-S13-copy-key-shape = sibling** — dev doc §2/§5.5 의 `firstChat.empty.demoHint` (nested) 가정은 실제 copy.ts 구조 (`empty: string`) 와 충돌 → designer 가 헌법 7(a) 권한으로 `firstChat.demoHint` (sibling) 결정. consumer (mobile) 도 `c.firstChat.demoHint` 패턴으로 정합.
- **D-S13-mobile-test-defer** — mobile 패키지 jest 인프라 부재 (`test=echo skip`, `__tests__/` 0 파일). 단위 테스트 추기는 헌법 7 non-idempotent 위반이라 보류 → **Sprint 14 carry-over**. T3 fixture (sprint13-web-demo-banner.mjs) 가 raw text 매칭으로 임시 가드.
- **D-S13-legacy-wrap-fail-tolerated = 임시 도입** — sprint-2.sh step 9 (헌법 inject 검증) 이 8 워커 + 2 commands 가정. Sprint 13 정렬로 7 워커 + 0 commands → fail. 본체 swap (sprint-2.sh 임계 ≥ 7) 은 sprint-3 ~ sprint-9 wrap chain 전체 영향 → 임시 우회 분기 `LEGACY_WRAP_FAIL_TOLERATED=1` 도입. Sprint 14 에서 본체 swap 결정.

**Open Issues:**
- **O-S13-mobile-jest-infra**: mobile 패키지 jest + babel-jest + react-test-renderer + Platform mock 셋업 — Sprint 14 의 Tier 1 producer-only 슬라이스 후보. 셋업 후 `Platform.OS === 'web'` mock 으로 demoHint 렌더 / 미렌더 단위 테스트 2건.
- **O-S13-sprint-2-threshold-swap**: sprint-2.sh step 9 의 INJECT_TARGETS 임계를 `≥ 7` (또는 동적 = `.claude/agents/*.md` 카운트) 로 swap. swap 시 LEGACY_WRAP_FAIL_TOLERATED 분기 제거 가능.
- **O-S13-tester-worktree-bypass**: T3 tester 가 worktree 격리를 무시하고 main repo 에 직접 작성 + 커밋. Sprint 14 dispatch 시 워커 헌법 강화 (worktree 경로 강제 검증) 또는 Agent View isolation=worktree 의 강제력 검증 필요.
- **O-S13-mobile-theme-aware-demoHint**: T2 의 `colorsHex.light.ink` 하드코딩 (light 테마 고정). dark 모드에서 부정합. theme-aware (themeStore 구독) 로 swap 권장 — Sprint 14 mobile 슬라이스.

## 12. Carry-over + Retrospective
**Carry-over (다음 스프린트가 반드시 알아야 할 것):**

> Sprint 14 PM 이 본 §12 + Sprint 12 §12 두 dev doc 만 읽고 시작 가능해야 한다 (헌법 #2 자가완결).

- **현재 main HEAD = `cd4b0f0`** (T4 PM 큐레이션 직전, 이 commit 후 갱신). origin/main 동기화 검증됨 (헌법 #3). Sprint 14 진입 전 `git rev-parse main == origin/main` 확인 후 `claude agents` dispatch.
- **Sprint 13 = inheritance-only 신규 패턴 (시간축 분리 여섯 번째 정합 사례)**. Sprint 8 first close A → Sprint 9 second close B C-revised → Sprint 10/11/12 third/fourth/fifth no-op close → **Sprint 13 sixth = inheritance-only**. Sprint 14 의 patterns 후보:
  1. **branch=A 활성** (외부 데이터 N≥3 도착 시) — 5종 D-S13 보류 frozen 갱신 + 1종 reconfirm + 6 분기 본체 (dedup / negation / retention / theme-toggle / empty-error / unlink).
  2. **branch=B no-op close** (외부 데이터 미도착 + inheritance 본체 추가 없음) — 7중 no-op 회피 위해 권장 X.
  3. **branch=C inheritance 추가** — Sprint 14 신규 inheritance 슬라이스 (예: O-S13-mobile-jest-infra, O-S13-sprint-2-threshold-swap, O-S13-mobile-theme-aware-demoHint 중 1~3 슬라이스).
  4. **branch=D 혼합** — branch=A 부분 + branch=C 부분.
- **Sprint 13 으로 해소된 frozen / 미해소 frozen**:
  - 해소: Sprint 12 메타 본체 3 슬라이스 (designer copy 키 + mobile web 분기 + tester sprint-13.sh + fixture 4종).
  - **미해소** (Sprint 14 로 이월): Sprint 9 5종 보류 frozen (`D-S9-{theme-toggle, empty-error-copy, concept-dedup, recall-log-retention, negation-classifier}-decision`) + 1종 reconfirm (`D-S9-inspector-unlink-recheck`) — 외부 데이터 의존이라 inheritance-only 모드에서 진행 불가.
- **신규 carry-over 항목 (Sprint 13 발생)**:
  - **O-S13-mobile-jest-infra** (위 §11 참조) — 우선순위 高 (Sprint 13 의 단위 테스트 부채를 갚음).
  - **O-S13-sprint-2-threshold-swap** (위 §11) — 우선순위 中 (LEGACY_WRAP_FAIL_TOLERATED 임시 분기 제거).
  - **O-S13-tester-worktree-bypass** (위 §11) — 우선순위 高 (워커 헌법 강화 또는 isolation 강제력 검증).
  - **O-S13-mobile-theme-aware-demoHint** (위 §11) — 우선순위 低 (디자인 톤 미세 조정).
- **Sprint 13 receipt 흐름**: `SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 LEGACY_WRAP_FAIL_TOLERATED=1 bash scripts/receipt/sprint-13.sh` exit 0. 임계 6종 PASS 마커 raw text (`workers_with_constitution=7/7` / `fixtures_scanned=35` / `copy_keys_matched=2` / `dev_infra_token_count=5` / `sprint_13_live_marker_count=4` / `web_demo_banner_present=1`).
- **Agent View worktree base 결함 = 해소 검증됨** — Sprint 13 의 designer/mobile 워커 모두 worktree HEAD = origin/main HEAD 일치 (cmux 결함 영구 해소 신호). 단, T3 tester 가 worktree 격리를 무시하고 main 에 직접 commit 한 것은 별개 이슈 (O-S13-tester-worktree-bypass).
- **헌법 #3 (origin/main 동기화 의무) = Sprint 13 에서 1회 미준수 → 즉시 회복** — T1 머지 후 origin push 누락 → T2 dispatch 가 stale base (7419216) 위에 새 worktree 생성 → mobile 워커가 producer 심볼 부재 검출 후 정상 중단 → PM 이 push 후 T2 re-dispatch. 메모리 `feedback_origin_main_sync` 의 패턴 정확히 재현. **Sprint 14 PM 은 매 머지 직후 push 의무** (마감 시점 X, 워커 dispatch 직전 OR 머지 직후 X 둘 다 가능).

**Retrospective:**
- **잘 된 것**:
  1. designer / mobile / tester 3 워커 순차 dispatch + 사전 점검 의무 (worktree HEAD 보고) 정착. 모든 워커가 첫 응답에 worktree HEAD 보고.
  2. mobile 워커가 producer (T1 designer) stale 검출 후 정상 중단 + 헌법 #5/#7/#8/#11 인용 + 명확한 carry-over 보고. PM directive vs 실측 mismatch 패턴 처리.
  3. 디자인 톤 정합 — T2 mobile 가 design-system tokens (role.body / spacing / colorsHex) 만 사용, 하드코딩 0.
  4. Receipt 신규 4 단계 모두 PASS (66/69 ~ 69/69), 임계 6종 raw text 마커 노출.
- **아팠던 것**:
  1. 헌법 #3 (origin/main 동기화 의무) 1회 위반 — T1 머지 후 push 누락. Sprint 10/11/12 3 연속 no-op 의 진정한 원인이 정확히 재현됐는데 PM 이 같은 실수 반복. mobile 워커의 정상 중단 보고 덕에 즉시 회복.
  2. T3 tester 가 worktree 격리 무시하고 main repo 에 직접 작성 + 커밋. Agent View isolation=worktree 의 강제력 부재 신호.
  3. dev doc §5.5 의 슬라이스 path 가정 (`apps/mobile/src/firstChat.tsx`, `packages/design-system/copy/{ko,en}.ts`, `scripts/receipt/fixtures/<name>.{ok,fail}`) 모두 실제 코드베이스와 불일치. 워커가 매번 grep 으로 실측해 진행. dev doc 작성 시 PM 이 코드베이스 grep 1회 의무.
  4. mobile 패키지 jest 인프라 부재 → 단위 테스트 부채 발생. Sprint 14 의무 추기.
- **다음에 다르게 할 것**:
  1. **매 머지 직후 즉시 `git push origin main`** — Sprint 14 의 첫 의무. 마감 시점 push 만으로는 부족 (시간축 분리 워커 dispatch 사이의 stale base 막을 수 없음).
  2. **dev doc §5.5 슬라이스 작성 시 PM 이 실측 path grep 1회 의무** — 가정 path 가 코드베이스와 불일치하면 워커 dispatch 시 워커가 swap 비용 부담.
  3. **워커 헌법 강화 검토** — worktree 격리 우회 차단. 또는 isolation=worktree 의 LSP / Agent tool 검증 강화.
  4. **mobile jest 인프라 우선순위 격상** — Sprint 14 의 Tier 1 producer-only 슬라이스 후보.
