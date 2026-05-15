# Sprint 14 — Inheritance Cleanup (O-S13-* 4건 회수)

> 이 문서는 *영속 메모리* 입니다. PM 단독 큐레이션. 워커는 transcript 4 줄만 남기고, PM 이 본 dev doc §10/§11/§12 를 직접 작성.
>
> **Inheritance-only 정합 사례**: 본 sprint = Sprint 8 carry-over 14 의 시간축 분리 패턴 **일곱 번째** 정합 (Sprint 8 close A first → Sprint 9 close B C-revised second → Sprint 10/11/12 no-op close third/fourth/fifth → Sprint 13 sixth inheritance-only first → Sprint 14 seventh inheritance-cleanup). 외부 데이터 N≥3 미도착 상태에서 Sprint 13 신규 carry-over 4건을 회수해 inheritance 부채 영점화.
>
> **사전 점검 의무 (Sprint 13 강화)**:
> 1. **origin/main 동기화 점검 (헌법 #3)** — `git rev-parse main == git rev-parse origin/main` 1회. mismatch 시 즉시 `git push origin main` 후 dispatch. **매 워커 머지 직후 즉시 push** (Sprint 13 1회 위반 → 재발 방지).
> 2. **헌법 #13 적용 검증** — 7 워커 파일 모두 `grep -l D-S14-worktree-bypass-prohibition .claude/agents/*.md | wc -l == 7` 확인. Sprint 13 §11 O-S13-tester-worktree-bypass 회수.
> 3. **dev doc §5.5 slice path 실측 의무** — Sprint 13 의 path 가정 (`apps/mobile/src/firstChat.tsx` vs 실측 `apps/mobile/app/chat/index.tsx`) mismatch 재발 방지. PM 이 작성 시점 grep 1회.

## 1. Goal

Sprint 13 §12 carry-over 4 신규 항목 (O-S13-mobile-jest-infra 高 / O-S13-tester-worktree-bypass 高 / O-S13-sprint-2-threshold-swap 中 / O-S13-mobile-theme-aware-demoHint 低) 을 회수해 외부 데이터 미도착 상태에서도 inheritance 부채를 영점화. Sprint 15+ 가 외부 데이터 도착 시 branch=A active 진입 시점에 시스템 부채가 0 이도록 보장.

## 2. Deliverable & Receipt

**Deliverable:**

- **헌법 #13 7 워커 보존** (PM 사전 처리) — 7 `.claude/agents/*.md` 파일에 `[FROZEN v2026-05-15 D-S14-worktree-bypass-prohibition]` 동일 텍스트. Agent View `isolation: worktree` 강제력 부재 보강. Sprint 13 §11 O-S13-tester-worktree-bypass 회수.
- **mobile jest 인프라 추가** — `apps/mobile/package.json` jest + babel-jest + react-test-renderer + jest-expo preset 의존성 + `jest.config.js` + `jest.setup.ts` (Platform.OS='web' mock). Sprint 13 demoHint Platform 분기 mount 가드 단위 테스트 2건 (Platform.OS='web' → demoHint 렌더, Platform.OS='ios' → demoHint 미렌더).
- **mobile theme-aware demoHint** — `apps/mobile/app/chat/index.tsx` L208-209 의 `colorsHex.light.ink` 하드코딩을 `themeStore` 또는 등가 dynamic theme selection 으로 swap. design-system 토큰 (light/dark 반전) 그대로 사용.
- **sprint-2 threshold swap** — `scripts/receipt/sprint-2.sh` L36-50 의 정적 `INJECT_TARGETS` 검증을 동적 `.claude/agents/*.md` 카운트 (`≥ 7`) 로 swap. `scripts/receipt/sprint-13.sh` L81-88 의 `LEGACY_WRAP_FAIL_TOLERATED` 임시 분기 제거. Sprint 9 wrap chain 정상화.
- **scripts/receipt/sprint-14.sh 신규** — Sprint 13 패턴 계승 (LEGACY_WRAP_FAIL_TOLERATED 분기 없음). Sprint 9 65 단계 + Sprint 13 4 단계 (66~69) + Sprint 14 신규 2 단계 (70~71) = 71 단계. 신규 임계 2종 (`mobile_jest_config_present=1`, `worktree_bypass_clause_count=7`).
- **헌법 #13 적용 후 7 워커 정의 보존 회귀** — `workers_with_constitution ≥ 7` 보존. 헌법 12 항 → 13 항 확장.

**Receipt (자동 검증 가능한 형태):**

- `SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-14.sh` exit 0 + "✅ Sprint 14 receipt PASSED" (LEGACY_WRAP_FAIL_TOLERATED 환경변수 불필요)
- Sprint 9 65 단계 wrap + Sprint 13 4 단계 wrap (66~69) 모두 PASS — sprint-2.sh 정상 통과 (LEGACY 우회 없이)
- 신규 2 단계 (70~71):
  1. **mobile jest infra 검증** (70) — `apps/mobile/jest.config.js` 존재 + `apps/mobile/package.json` 의 `scripts.test` 가 `jest` 또는 `expo jest` 호출. demoHint mount 단위 테스트 2건 PASS.
  2. **worktree-bypass 헌법 #13 검증** (71) — 7 워커 파일 모두 `D-S14-worktree-bypass-prohibition` 토큰 보유. `pwd / git rev-parse --show-toplevel / 절대경로 금지` 3 검증 조항 raw text 매칭.
- 임계 보강 (D-S14-receipt-threshold-recovery):
  - 기존 6종 (Sprint 13 D-S13-receipt-threshold-recovery 계승): `external_session_count=0` / `verify_copy_ok≥24` / `web_demo_banner_present=1` / `pakda_term_count=0` / `agent_view_workaround_pattern≥0` / `workers_with_constitution≥7`
  - 신규 2종: `mobile_jest_config_present=1` / `worktree_bypass_clause_count=7`

## 3. Scope

**In:**
- 헌법 #13 7 파일 추가 (PM 사전 처리, A1)
- Sprint 14 dev doc skeleton 작성 (PM 사전 처리, A2)
- mobile jest 인프라 + Platform.OS mock + demoHint mount 테스트 2건 (B1)
- mobile theme-aware demoHint swap (B1, mobile 워커 묶음)
- sprint-2.sh INJECT_TARGETS 동적 swap + sprint-13.sh LEGACY_WRAP 분기 제거 (B2)
- sprint-14.sh + fixture 2종 신규 (B3)

**Out:**
- 외부 데이터 N≥3 수집 (미도착, Sprint 15+ 로 이월)
- D-S9-* 5종 보류 frozen 갱신 + D-S9-inspector-unlink-recheck reconfirm (외부 데이터 의존, Sprint 15+ 로 이월)
- 6 분기 본체 작성 (dedup / negation / retention / theme-toggle / empty-error / unlink — 외부 데이터 의존, Sprint 15+ 로 이월)

> **branch 결정 (2026-05-15 PM 사인오프)**: 외부 데이터 N≥3 미도착 상태 6 연속 (Sprint 8 → 13) → branch=A active 불가. branch=B no-op 은 7중 no-op 회피 위해 거부. **Sprint 13 신규 carry-over 4건 inheritance-cleanup 진행** = branch=C inheritance-only 본체. 시간축 분리 패턴 일곱 번째 정합 사례 = inheritance-cleanup 신규 패턴.

## 4. Architecture & Data Flow

데이터 흐름은 비동기 병렬 — mobile (apps/mobile) 과 tester (scripts/receipt) 는 path 겹침 0 으로 동시 dispatch 안전. PM 사전 처리 (헌법 #13 + dev doc skeleton) 가 모든 dispatch 의 base.

```
PM 사전 처리 (.claude/agents/*.md 7 파일 + dev doc skeleton)
       ↓ origin push (헌법 #3 강화)
       ├─→ mobile (apps/mobile/jest.config + package.json + chat/index.tsx)
       │     ↓ jest infra + theme-aware swap
       ├─→ tester-A (scripts/receipt/sprint-2.sh + sprint-13.sh)
       │     ↓ INJECT_TARGETS 동적 swap + LEGACY_WRAP 분기 제거
       └─→ tester-B (scripts/receipt/sprint-14.sh + fixture 2종)  [tester-A 머지 후]
             ↓ sprint-14.sh 71 단계 + 임계 8종 검증
       receipt PASS
```

관여 패키지: `apps/mobile`, `scripts/receipt`, `.claude/agents` (PM 사전). 다른 패키지 (engine / conversation / orchestrator / storage / design-system) 손대지 않음 — frozen 보존.

## 5. File Ownership
| Agent | Tier | Files |
|---|---|---|
| PM (사전) | - | `.claude/agents/{conversation,designer,engine,mobile,orchestrator,storage,tester}.md` (7 파일, #13 추가), `docs/sprints/sprint-14-inheritance-cleanup.md` (신규) |
| mobile | 3 | `apps/mobile/package.json`, `apps/mobile/jest.config.js` (신규), `apps/mobile/jest.setup.ts` (신규), `apps/mobile/app/chat/__tests__/index.test.tsx` (신규, 또는 등가 위치), `apps/mobile/app/chat/index.tsx` (L208-209 theme-aware swap) |
| tester | 3 | `scripts/receipt/sprint-2.sh` (L36-50 swap), `scripts/receipt/sprint-13.sh` (L81-88 LEGACY_WRAP 분기 제거), `scripts/receipt/sprint-14.sh` (신규), `scripts/receipt/.receipt-runner/sprint14-{mobile-jest-infra,worktree-bypass-clause}.mjs` (신규 2종) |

> **Tier 정의** (Sprint 11+ 계승):
> - Tier 1 (producer-only) — 본 sprint 미사용 (design-system / protocol / storage frozen 보존)
> - Tier 2 — 본 sprint 미사용 (engine / conversation / orchestrator frozen 보존)
> - Tier 3 (소비자만) — mobile / tester. 본 sprint 의 모든 워커 슬라이스.
>
> **Sprint 14 dispatch 패턴**: Agent View `isolation: worktree` 사용 (Sprint 13 의 cmux 결함 해소 검증됨). mobile 1 dispatch 가 jest-infra + theme-aware demoHint 묶음, tester 2 dispatch (sprint-2 swap → sprint-14.sh). PM 사전 처리 (헌법 #13 + skeleton) 후 mobile + tester-A 동시 dispatch 가능 (path 겹침 0). tester-B 는 mobile + tester-A 머지 후 (sprint-14.sh fixture 가 jest-infra 결과 검증).

## 5.5 Worker Slices
<!-- 워커 슬라이스 본문. PM 이 `claude agents` 입력에 paste 해 `@<worker> <slice>` dispatch. 워커가 dispatch 대상이 아니면 해당 slice 블록 통째 생략. -->

### [mobile] S14-mobile-jest-infra + S14-mobile-theme-aware-demoHint (묶음, Tier 3)
- **목표 1**: `apps/mobile` 패키지에 jest 단위 테스트 인프라 추가. design-system 의 Node native test (`node --test`) 와 다르게 mobile 은 RN+Expo 라 jest-expo preset 권장 (Expo SDK 기본).
- **목표 2**: `apps/mobile/app/chat/index.tsx` L208-209 의 `colorsHex.light.ink` 하드코딩 → theme-aware swap (themeStore 구독 또는 useColorScheme 기반).
- 코드 구조 실측:
  - `apps/mobile/package.json` — `"test": "echo skip"` (jest 의존성 부재)
  - `apps/mobile/app/chat/index.tsx` L195-217 — `Platform.OS === 'web'` 분기 안 demoHint mount. L208-209 = `color: colorsHex.light.ink, opacity: 0.55` (light 고정 하드코딩).
  - `packages/design-system/src/tokens.ts` — light/dark 양쪽 토큰 완성 (oklch 반전). consumer 는 dynamic theme selection 만 추가.
- 변경 대상:
  - **추가**: `apps/mobile/jest.config.js` (jest-expo preset 또는 react-native preset), `apps/mobile/jest.setup.ts` (Platform.OS mock 셋업), `apps/mobile/app/chat/__tests__/index.test.tsx` (또는 `apps/mobile/__tests__/chat.test.tsx`, 워커 실측 path 선택).
  - **수정**: `apps/mobile/package.json` (devDependencies: jest + jest-expo OR ts-jest + react-test-renderer + @testing-library/react-native; scripts.test: `jest`).
  - **수정**: `apps/mobile/app/chat/index.tsx` L208-209 의 `colorsHex.light.ink` → 동적 (useColorScheme() 또는 themeStore). 실측 패턴은 design-system 또는 다른 mobile 화면이 이미 쓰는 dynamic theme 패턴 grep 1회 후 따라가기.
- 테스트 2건:
  1. **Platform.OS='web' → demoHint 렌더** (`@testing-library/react-native` render + queryByText('이건 웹 데모예요...') truthy)
  2. **Platform.OS='ios' → demoHint 미렌더** (queryByText null)
- 의존: PM A1 + A2 머지 + **origin push** 후 dispatch. designer/engine/conversation/orchestrator/storage/protocol 어떤 파일도 손대지 말 것 (frozen).
- 헌법 #13 강제: 자기 worktree 안에서만 작업. 작업 시작 시 `pwd` 1회 확인. commit 직전 `git rev-parse --show-toplevel` 1회 확인. main repo 절대경로 직접 commit 금지.
- transcript 4 줄 종료: (1) 슬라이스 결과 (jest preset 선택 + 테스트 2건 PASS) (2) Interfaces (theme-aware swap 패턴 + jest scripts 변경) (3) Carry-over (Sprint 15+ 가 mobile 단위 테스트 확장할 때 주의점) (4) Frozen 위반 여부

### [tester-A] S14-sprint-2-threshold-swap (Tier 3)
- **목표**: `scripts/receipt/sprint-2.sh` 의 정적 `INJECT_TARGETS` (10 파일 가정) 를 동적 `.claude/agents/*.md` 카운트 (`≥ 7`) 로 swap. `sprint-13.sh` 의 `LEGACY_WRAP_FAIL_TOLERATED` 임시 분기 제거 후 sprint-9 wrap chain 정상화 검증.
- 코드 구조 실측:
  - `scripts/receipt/sprint-2.sh` L36-50 — `INJECT_TARGETS` 정의 + `INJECT_COUNT` 검증 (`[ "$INJECT_COUNT" -lt 10 ]` 강제, 7 워커 + 0 명령어 = 7 파일이라 fail).
  - `scripts/receipt/sprint-13.sh` L81-88 — `if [ "${LEGACY_WRAP_FAIL_TOLERATED:-0}" = "1" ]; then ... else fail ... fi` 분기.
  - `scripts/receipt/sprint-9.sh` L80 — sprint-2.sh 호출 chain.
- 변경 대상:
  - **수정**: `scripts/receipt/sprint-2.sh` L36-50 — `INJECT_TARGETS` 정적 list 제거, `INJECT_COUNT=$(find .claude/agents -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')` 동적 카운트. 임계 `[ "$INJECT_COUNT" -lt 7 ]` (≥7 통과). raw text marker `worker_constitution_targets=$INJECT_COUNT` 유지.
  - **수정**: `scripts/receipt/sprint-13.sh` L81-88 — `LEGACY_WRAP_FAIL_TOLERATED` 분기 제거. sprint-9 wrap fail 시 즉시 fail (정상 동작). sprint-2.sh 정상 통과 가정.
- 의존: PM A1 + A2 머지 + origin push 후 dispatch. mobile 슬라이스와 path 겹침 0 → 동시 dispatch 안전.
- 검증: 작업 완료 후 `bash scripts/receipt/sprint-2.sh` exit 0 + `bash scripts/receipt/sprint-9.sh` exit 0 + `bash scripts/receipt/sprint-13.sh` exit 0 (모두 LEGACY_WRAP_FAIL_TOLERATED 미설정 상태에서).
- 헌법 #13 강제: 자기 worktree 안에서만 작업.
- transcript 4 줄 종료: (1) 슬라이스 결과 (sprint-2/9/13 all exit 0 확인) (2) Interfaces (sprint-2.sh 의 새 marker, sprint-13.sh 의 제거 분기) (3) Carry-over (sprint-9 wrap 회복 후 잔존 임시 분기 list) (4) Frozen 위반 여부

### [tester-B] S14-receipt-sprint-14.sh + fixture 2종 (Tier 3)
- **목표**: `scripts/receipt/sprint-14.sh` 신규 작성. Sprint 13 패턴 계승 (LEGACY_WRAP 분기 없음). 신규 임계 2종 + fixture 2종.
- 변경 대상 (신규):
  - `scripts/receipt/sprint-14.sh` — Sprint 13 wrap (Sprint 9 65 단계 + Sprint 13 4 단계) + 신규 2 단계 (70~71). 임계 8종 raw text marker.
  - `scripts/receipt/.receipt-runner/sprint14-mobile-jest-infra.mjs` — `apps/mobile/jest.config.js` 존재 + `apps/mobile/package.json` scripts.test 가 `jest|expo jest` 매칭 + `__tests__` 디렉토리 또는 `*.test.tsx` 파일 존재.
  - `scripts/receipt/.receipt-runner/sprint14-worktree-bypass-clause.mjs` — 7 워커 파일 모두 `D-S14-worktree-bypass-prohibition` 토큰 보유 (`pwd / git rev-parse --show-toplevel / 절대경로 금지` 3 검증 조항 raw text 매칭).
- 의존: mobile B1 + tester-A B2 머지 + origin push 후 dispatch (consumer-only). tester-A 가 sprint-13.sh 의 LEGACY_WRAP 분기를 제거했으므로 sprint-14.sh 도 LEGACY 분기 없이 작성.
- 임계 (D-S14-receipt-threshold-recovery):
  - Sprint 13 6종 계승: `external_session_count=0` / `verify_copy_ok≥24` / `web_demo_banner_present=1` / `pakda_term_count=0` / `agent_view_workaround_pattern≥0` / `workers_with_constitution≥7`
  - 신규 2종: `mobile_jest_config_present=1` / `worktree_bypass_clause_count=7`
- 헌법 #13 강제: 자기 worktree 안에서만 작업.
- transcript 4 줄 종료: (1) 슬라이스 결과 (71 단계 PASS + fixture 2종 추가) (2) Interfaces (신규 임계 2종 marker raw text) (3) Carry-over (Sprint 15+ 외부 데이터 도착 시 강화할 임계 list) (4) Frozen 위반 여부

## 6. Tasks
| ID | Description | Owner | Tier | Blocked By |
|---|---|---|---|---|
| A1 | `.claude/agents/*.md` 7 파일에 헌법 #13 추가 (`D-S14-worktree-bypass-prohibition`) | PM | - | - |
| A2 | Sprint 14 dev doc skeleton 작성 (§1~§6 + §11 Constitution refs) | PM | - | A1 |
| B1 | mobile jest infra + theme-aware demoHint 묶음 (apps/mobile 전체) | mobile | 3 | A1, A2 머지 + origin push |
| B2 | sprint-2.sh INJECT 동적 swap + sprint-13.sh LEGACY_WRAP 분기 제거 | tester | 3 | A1, A2 머지 + origin push |
| B3 | sprint-14.sh + fixture 2종 신규 + 임계 8종 | tester | 3 | B1, B2 머지 + origin push |
| C1 | Sprint 14 dev doc §3~§12 PM 큐레이션 (workers transcript 합성) | PM | - | B1, B2, B3 머지 |
| C2 | `SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-14.sh` exit 0 검증 | PM | - | B3 머지 |
| C3 | `_current.txt`=15 + sprint-15 skeleton 작성 + `git tag sprint-14-closed` + `git push origin main --tags` (헌법 #3) | PM | - | C1, C2 |

## 7. Interfaces / Contracts

(워커 머지 후 PM 큐레이션 단계에서 보강)

## 8. Test Scenarios

(워커 머지 후 PM 큐레이션 단계에서 보강)

## 9. Demo Script

(워커 머지 후 PM 큐레이션 단계에서 보강)

## 10. Implementation Map

(워커 머지 후 PM 큐레이션 단계에서 보강 — 각 워커 transcript 4 줄 합성)

## 11. Decisions Made / Open Issues

**Decisions Made (작성 시점):**
- **[FROZEN v2026-05-15 D-S14-branch] branch=C inheritance-cleanup** — Sprint 13 §12 carry-over 4 신규 항목 회수. 외부 데이터 N≥3 미도착 7 연속 (Sprint 8~14), branch=A 불가. branch=B no-op 은 7중 no-op 회피로 거부. Sprint 13 sixth inheritance-only first → Sprint 14 seventh inheritance-cleanup.
- **[FROZEN v2026-05-15 D-S14-worktree-bypass-prohibition] 헌법 #13 추가** — 7 워커 파일 모두 동일 텍스트. Sprint 13 §11 O-S13-tester-worktree-bypass 회수. `pwd / git rev-parse --show-toplevel / 절대경로 금지` 3 검증 조항. 적용 영역: 신규 dispatch (Sprint 13+). 제외 영역: PM 직접 작업.
- **[FROZEN v2026-05-15 D-S14-mobile-jest-preset] jest-expo preset 권장** — design-system 의 Node native test 와 일관성보다 Expo SDK 기본 지원 우선. 워커가 실측 후 ts-jest 또는 react-native preset 선택 가능 (헌법 7(a)).
- **[FROZEN v2026-05-15 D-S14-sprint-2-threshold-dynamic] INJECT_TARGETS 동적 카운트** — `find .claude/agents -maxdepth 1 -name '*.md' | wc -l` 임계 `≥ 7`. 정적 list 폐기. raw marker `worker_constitution_targets` 유지.
- **[FROZEN v2026-05-15 D-S14-legacy-wrap-fail-tolerated-removal] LEGACY_WRAP_FAIL_TOLERATED 분기 영구 제거** — sprint-13.sh 의 L81-88 임시 분기 제거. sprint-2.sh 동적 swap 후 sprint-9 wrap 정상 통과 가정.
- **[FROZEN v2026-05-15 D-S14-receipt-threshold-recovery] sprint-14.sh 임계 8종** — Sprint 13 6종 계승 + 신규 2종 (`mobile_jest_config_present=1` / `worktree_bypass_clause_count=7`).

**Open Issues (마감 시점에 PM 보강):**
- (워커 머지 후 보강)

## 12. Carry-over + Retrospective

**Carry-over (다음 스프린트가 반드시 알아야 할 것):**

> Sprint 15 PM 이 본 §12 + Sprint 13 §12 두 dev doc 만 읽고 시작 가능해야 한다 (헌법 #2 자가완결).

(워커 머지 + receipt 검증 후 PM 보강 — 외부 데이터 N≥3 도착 여부, 미해소 D-S9-* 5종 + 1 reconfirm, Sprint 14 신규 carry-over 항목, sprint-15 의 patterns 후보 — branch=A active / branch=B no-op / branch=C 신규 inheritance / branch=D 혼합 — 등)

**Retrospective:**
(워커 머지 + receipt 검증 후 PM 보강 — 잘 된 것 / 아팠던 것 / 다음에 다르게 할 것)
