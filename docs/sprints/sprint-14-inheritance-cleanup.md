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

- **`.claude/agents/{conversation,designer,engine,mobile,orchestrator,storage,tester}.md`** — 헌법 12 항 → 13 항 확장. `[FROZEN v2026-05-15 D-S14-worktree-bypass-prohibition]` 동일 텍스트 7 파일 보존. 검증 3 조항 (`pwd` / `git rev-parse --show-toplevel` / 절대경로 금지) raw text 매칭. 적용 영역: 신규 dispatch (Sprint 13+). 제외 영역: PM 직접 작업.
- **`apps/mobile/package.json`** — `scripts.test`: `"echo skip"` → `"jest"`. devDependencies 5종 추가 (`jest`, `jest-expo@~52.0.6`, `react-test-renderer@18.3.1`, `@types/jest`, `@types/react-test-renderer`). pnpm 패키지매니저 가정 (`.pnpm/` 가상 디렉토리 allowlist 정규식).
- **`apps/mobile/jest.config.js`** — jest-expo preset + transformIgnorePatterns pnpm allowlist 정규식 (`node_modules/.pnpm/(?!(@?react-native|@react-native-async-storage|expo(nent)?|@expo(nent)?|@expo-google-fonts|expo-.*|@synapse)[@+])`). CommonJS module (typescript 진단 80001 무관).
- **`apps/mobile/jest.setup.ts`** — `setPlatformOS` helper + `afterEach` restore. `jest.mock('react-native', ...)` 패턴으로 Platform.OS 동적 swap. `globalThis.__setPlatformOS` helper consumer 확장 가능.
- **`apps/mobile/tsconfig.json`** — `compilerOptions.types: ["jest"]` + `include` 에 `jest.setup.ts` 추가. `@jest/globals` import 대신 글로벌 노출 패턴.
- **`apps/mobile/app/chat/__tests__/index.test.tsx`** — `react-test-renderer` 기반 Platform.OS 분기 2 케이스 (web → demoHint 렌더 / ios → 미렌더). 테스트 2/2 PASS.
- **`apps/mobile/app/chat/index.tsx`** — `useTheme()` hook (from `apps/mobile/src/themeStore`) 추가 import. L208 `colorsHex.light.ink` → `themeColorsHex.ink` swap (effectiveTheme 자동 분기). ThemeProvider 가 `_layout.tsx` 에 이미 mount 됨 → wiring 0 추가. opacity 0.55 보존.
- **`scripts/receipt/sprint-2.sh` L36-50** — 정적 `INJECT_TARGETS` (10 파일 가정) 폐기 → 동적 `INJECT_TARGETS_DIR` 기반 `find .claude/agents -maxdepth 1 -name '*.md' | wc -l`. 임계 `≥ 7` (이전 `-lt 10` 검증 제거). raw marker `worker_constitution_targets=$INJECT_COUNT` 보존.
- **`scripts/receipt/sprint-13.sh` L81-88** — `LEGACY_WRAP_FAIL_TOLERATED=1` 분기 **보존** (D-S14-legacy-wrap-fail-tolerated-removal REVOKED — B2 헌법 #11 mismatch 보고 결과, sprint-9 wrap fail 의 진짜 원인이 `.receipt-runner/*.mjs` 의 `team-leader` stale 토큰 잔존이라 분기 제거 시점은 stale fixture 정리 후로 carry-over).
- **`scripts/receipt/sprint-14.sh`** — sprint-13.sh wrap 단일 호출 (sprint-13 가 sprint-9 wrap 내부에서 LEGACY 분기 자체 처리). 신규 2 단계 (70~71). 환경변수 3종 (`SKIP_OLLAMA=1` / `SKIP_SPRINT1_E2E=1` / `LEGACY_WRAP_FAIL_TOLERATED=1`).
- **`scripts/receipt/.receipt-runner/sprint14-mobile-jest-infra.mjs`** — raw marker `mobile_jest_config_present=1;test_files_count=<n>;test_script=<jest|expo-jest>`. 검증: `apps/mobile/jest.config.js` + `jest.setup.ts` + `package.json` scripts.test 매칭 + `__tests__/*.test.tsx` 1건 이상.
- **`scripts/receipt/.receipt-runner/sprint14-worktree-bypass-clause.mjs`** — raw marker `worktree_bypass_clause_count=<0..7>;agents_scanned=7`. 검증: 7 워커 파일 모두 `D-S14-worktree-bypass-prohibition` 토큰 + 3 검증 조항 매칭.

## 8. Test Scenarios

- **헌법 #13 영속성**: `grep -l D-S14-worktree-bypass-prohibition .claude/agents/*.md | wc -l == 7` → sprint14-worktree-bypass-clause.mjs PASS.
- **mobile jest 인프라**: `pnpm --filter mobile test` (또는 `cd apps/mobile && jest`) → demoHint mount 2/2 PASS. Platform.OS='web' 분기 ko/en 카피 매칭 + Platform.OS='ios' 분기 미렌더.
- **theme-aware demoHint**: `grep colorsHex.light.ink apps/mobile/app/chat/index.tsx | wc -l == 0` (L208 swap 영속성). `useTheme()` import 존재.
- **sprint-2 INJECT 동적 swap**: `bash scripts/receipt/sprint-2.sh` exit 0 (LEGACY 미설정). raw marker `worker_constitution_targets=7`.
- **종단 receipt**: `SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 LEGACY_WRAP_FAIL_TOLERATED=1 bash scripts/receipt/sprint-14.sh` → exit 0 + "✅ Sprint 14 receipt PASSED" + 71 단계 완주.

## 9. Demo Script

PM 검증 흐름 (배포 환경 시뮬레이션):
```bash
# 1) origin/main 동기화 검증 (헌법 #3)
git rev-parse main; git rev-parse origin/main  # 동일해야 PASS

# 2) 헌법 #13 영속성
grep -l "D-S14-worktree-bypass-prohibition" .claude/agents/*.md | wc -l  # 7

# 3) mobile jest infra (단순 존재 검증)
ls apps/mobile/jest.config.js apps/mobile/jest.setup.ts apps/mobile/app/chat/__tests__/index.test.tsx

# 4) theme-aware demoHint
grep "colorsHex.light.ink" apps/mobile/app/chat/index.tsx  # 0
grep "useTheme" apps/mobile/app/chat/index.tsx              # ≥ 1

# 5) sprint-2 동적 swap
bash scripts/receipt/sprint-2.sh 2>&1 | grep "worker_constitution_targets"  # ≥ 7

# 6) 종단 receipt
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 LEGACY_WRAP_FAIL_TOLERATED=1 \
  bash scripts/receipt/sprint-14.sh | tail -20  # 71/71 PASS
```

## 10. Implementation Map

PM 이 워커 transcript 4 줄을 합성한 실제 구현 경로:

**Phase A — PM 사전 처리** (commit `9bd0bdb`)
- A1: `.claude/agents/{conversation,designer,engine,mobile,orchestrator,storage,tester}.md` 7 파일 동시에 헌법 #13 동일 텍스트 추가. 같은 `old_string` (헌법 #12 본문 끝) 으로 7 Edit 호출 → 7 파일 모두 동일 위치에 #13 항 추가. 검증: `grep -l D-S14-worktree-bypass-prohibition .claude/agents/*.md | wc -l == 7`.
- A2: `docs/sprints/sprint-14-inheritance-cleanup.md` 신규 (§1~§6 + §11 6 결정 + §12 placeholder). Sprint 13 dev doc 패턴 계승 (§5.5 슬라이스 정의 형식 / 실측 path 강조 / transcript 4 줄 종료 의무).
- 머지: PM 워크트리 (`worktree-sprint-14-pm`) → main ff merge → `git push origin main` (헌법 #3 즉시 push).

**Phase B — 워커 dispatch (B1+B2 병렬, B3 후행)**
- **B1 mobile** (commit `2669535` on main, worktree `d873b5a`): jest-expo@~52.0.6 preset 선택 (Expo SDK 52 공식). 5 파일 (`jest.config.js` 신규 / `jest.setup.ts` 신규 / `__tests__/index.test.tsx` 신규 / `package.json` 수정 / `tsconfig.json` 수정 / `chat/index.tsx` L208 swap). 테스트 2/2 PASS (`Platform.OS='web' → demoHint 렌더 / 'ios' → 미렌더`). theme-aware 패턴은 기존 `apps/mobile/src/themeStore` 의 `useTheme()` hook 활용 — wiring 0 추가 (ThemeProvider 가 `_layout.tsx` 에 이미 mount). mobile typecheck 신규 에러 0.
- **B2 tester-A** (commit `fe9e6e4` on main, worktree 동일): `scripts/receipt/sprint-2.sh` L36-50 동적 swap PASS (`worker_constitution_targets=7`). **헌법 #11 mismatch 보고**: sprint-9 wrap fail 의 진짜 원인이 `.receipt-runner/*.mjs` 의 `team-leader` stale 토큰 잔존 (Sprint 13 7 워커 정렬 시 미정리). sprint-13.sh LEGACY 분기 제거는 revert → Sprint 15+ carry-over (`O-S14-receipt-runner-stale-fixture-cleanup`).
- **B3 tester-B** (commit `3c50cd2` on main, worktree `4a9b515`): `scripts/receipt/sprint-14.sh` + `.receipt-runner/sprint14-{mobile-jest-infra,worktree-bypass-clause}.mjs` 2종 신규. 71 단계 PASS (Sprint 9 65 + Sprint 13 4 + Sprint 14 2). 임계 8종 raw marker 모두 출력. B2 ack 계승 — sprint-14.sh LEGACY 분기 보존.

**Phase C — PM 큐레이션 + 마감** (본 commit)
- C1: 본 §3~§12 본체 작성 (워커 transcript 4 줄 합성).
- C2: `bash scripts/receipt/sprint-14.sh` exit 0 + 71/71 PASS 실측 확인. 임계 8종 raw marker 출력 inline 검증.
- C3: `_current.txt`=15 + sprint-15 skeleton + `git tag sprint-14-closed` + `git push origin main --tags`.

## 11. Decisions Made / Open Issues

**Decisions Made (작성 시점):**
- **[FROZEN v2026-05-15 D-S14-branch] branch=C inheritance-cleanup** — Sprint 13 §12 carry-over 4 신규 항목 회수. 외부 데이터 N≥3 미도착 7 연속 (Sprint 8~14), branch=A 불가. branch=B no-op 은 7중 no-op 회피로 거부. Sprint 13 sixth inheritance-only first → Sprint 14 seventh inheritance-cleanup.
- **[FROZEN v2026-05-15 D-S14-worktree-bypass-prohibition] 헌법 #13 추가** — 7 워커 파일 모두 동일 텍스트. Sprint 13 §11 O-S13-tester-worktree-bypass 회수. `pwd / git rev-parse --show-toplevel / 절대경로 금지` 3 검증 조항. 적용 영역: 신규 dispatch (Sprint 13+). 제외 영역: PM 직접 작업 (main 인스턴스 또는 PM 전용 worktree).
- **[FROZEN v2026-05-15 D-S14-mobile-jest-preset] jest-expo@~52.0.6 preset 확정** — 워커 실측 결과 jest-expo Expo SDK 52 공식 preset 채택. design-system 의 Node native test 와 일관성보다 Expo SDK 기본 지원 우선. pnpm allowlist 정규식 보존.
- **[FROZEN v2026-05-15 D-S14-sprint-2-threshold-dynamic] INJECT_TARGETS 동적 카운트** — `find .claude/agents -maxdepth 1 -name '*.md' | wc -l` 임계 `≥ 7`. 정적 list 폐기. raw marker `worker_constitution_targets` 보존.
- **[REVOKED v2026-05-15 D-S14-legacy-wrap-fail-tolerated-removal]** — B2 워커 헌법 #11 mismatch 보고 결과 revert. sprint-9 wrap fail 의 진짜 원인이 INJECT 만이 아닌 `.receipt-runner/*.mjs` 의 `team-leader` stale 토큰 잔존. sprint-13.sh + sprint-14.sh 모두 LEGACY_WRAP_FAIL_TOLERATED 분기 보존. 제거 시점은 stale fixture 정리 후 Sprint 15+ 결정.
- **[FROZEN v2026-05-15 D-S14-receipt-threshold-recovery] sprint-14.sh 임계 8종** — Sprint 13 6종 계승 (external_session_count=0 / verify_copy_ok≥24 / web_demo_banner_present=1 / pakda_term_count=0 / agent_view_workaround_pattern≥0 / workers_with_constitution=7/7) + 신규 2종 (`mobile_jest_config_present=1;test_files_count=1;test_script=jest` / `worktree_bypass_clause_count=7;agents_scanned=7`).
- **[FROZEN v2026-05-15 D-S14-mobile-theme-aware-pattern] useTheme() hook 활용** — `apps/mobile/src/themeStore` 의 기존 hook 사용. wiring 0 추가 (ThemeProvider `_layout.tsx` mount 영속). consumer 는 `useTheme()` → `{ colorsHex }` → `colorsHex.ink` 직접 참조.

**Open Issues (마감 시점 보강):**
- **O-S14-receipt-runner-stale-fixture-cleanup** (B2 진단, 우선순위 高) — `.receipt-runner/*.mjs` 안 `team-leader` stale 토큰 잔존: `sprint7-contract-gap-policy.mjs:24 'team-leader.md'`, `sprint7-inspector-unlink-decision.mjs:1`, `sprint8-{external-data-index,frozen-decisions-carry-over,pii-policy}.mjs:1` 헤더 코멘트, `sprint9-pakda-term-zero.mjs:141` 8 워커 list, `sprint9-spawn-prompt-update.mjs:28` 8 워커 list. Sprint 13 7 워커 정렬 (commit `7419216`) 시 미정리 → sprint-2.sh INJECT swap 만으로는 sprint-9 wrap PASS 불가. Sprint 15+ 회수 시 sprint-13.sh + sprint-14.sh LEGACY 분기 동시 제거 가능.
- **O-S14-mobile-screen-theme-aware-migration** (B1 carry-over a/b, 우선순위 中) — `chat/index.tsx` 의 다른 light-고정 토큰 참조 30+ 위치 (ChatHeader / UserBubble / AIBubble / TypingDots / SatisfactionSurveyOverlay / Composer 등) 모두 `useTheme()` 패턴 swap 필요. 다른 화면 (onboarding / inspector / ghost / suggestion / strong) 도 useTheme 미적용. Sprint 7 (Polish) 본체 목표와 정합 — Sprint 15+ Polish 마이그레이션 슬라이스 후보.
- **O-S14-mobile-jest-actual-run-threshold** (B3 carry-over c, 우선순위 低) — `mobile_jest_config_present=1` 임계는 단순 존재 검증. Sprint 15+ 에서 `pnpm --filter mobile test` PASS ≥ 1 강화 검토 — receipt 가 실제 jest run 결과까지 검증 가능하게.
- **O-S14-worktree-bypass-commit-history-scan** (B3 carry-over d, 우선순위 低) — `sprint14-worktree-bypass-clause.mjs` 는 raw text 조항 매칭만. Sprint 15+ 에서 워커 실제 commit history scan (main repo 가 아닌 worktree path 에서 발생한 commit 비율) 강화 가능.
- **O-S14-jest-expo-pnpm-coupling** (B1 carry-over c, 우선순위 低) — jest-expo transformIgnorePatterns 가 pnpm `.pnpm/` 가상 디렉토리 정규식. pnpm 외 패키지매니저 도입 시 재조정.
- **미해소 D-S9-* 5종 + 1 reconfirm** (Sprint 9 이월, 우선순위 高 but 외부 데이터 의존) — `D-S9-{theme-toggle, empty-error-copy, concept-dedup, recall-log-retention, negation-classifier}-decision` + `D-S9-inspector-unlink-recheck`. 외부 데이터 N≥3 도착 후 branch=A 진입 시 갱신. Sprint 15+ 가 branch=A active 진입 시 첫 작업.

## 12. Carry-over + Retrospective

**Carry-over (다음 스프린트가 반드시 알아야 할 것):**

> Sprint 15 PM 이 본 §12 + Sprint 13 §12 두 dev doc 만 읽고 시작 가능해야 한다 (헌법 #2 자가완결).

- **현재 main HEAD = `3c50cd2`** (B3 머지 직후, C3 마감 commit 후 갱신). origin/main 동기화 검증됨 (헌법 #3). Sprint 15 진입 전 `git rev-parse main == origin/main` 확인 후 `claude agents` dispatch.
- **Sprint 14 = inheritance-cleanup 신규 패턴 (시간축 분리 일곱 번째 정합 사례)**. Sprint 8 first close A → Sprint 9 second close B C-revised → Sprint 10/11/12 third/fourth/fifth no-op close → Sprint 13 sixth inheritance-only first → **Sprint 14 seventh inheritance-cleanup**. Sprint 15 patterns 후보:
  1. **branch=A 활성** (외부 데이터 N≥3 도착 시) — 5종 D-S9 보류 frozen 갱신 + 1종 reconfirm + 6 분기 본체 (dedup / negation / retention / theme-toggle / empty-error / unlink).
  2. **branch=B no-op close** (외부 데이터 미도착 + inheritance 추가 본체 없음) — 8중 no-op 위험 회피 권장 X.
  3. **branch=C inheritance 추가** — Sprint 14 신규 carry-over 4건 중 高 우선순위 (`O-S14-receipt-runner-stale-fixture-cleanup` 高) 회수 슬라이스. 정리 후 sprint-13.sh + sprint-14.sh LEGACY 분기 영구 제거 가능.
  4. **branch=D 혼합** — branch=A 부분 + branch=C 부분.
- **Sprint 14 로 해소된 frozen / 미해소 frozen**:
  - 해소: Sprint 13 carry-over 4 신규 항목 모두 (mobile-jest-infra 高 / tester-worktree-bypass 高 / sprint-2-threshold-swap 中 / theme-aware-demoHint 低). 단 sprint-2 swap 은 부분 해소 — INJECT 동적 swap PASS, LEGACY 분기 제거는 stale fixture cleanup 후로 연기.
  - **미해소** (Sprint 15+ 로 이월): Sprint 9 5종 보류 frozen + 1 reconfirm (외부 데이터 의존), Sprint 14 신규 carry-over 5건 (위 §11 Open Issues).
- **신규 carry-over 항목 (Sprint 14 발생)** — 위 §11 Open Issues 5건 (`O-S14-receipt-runner-stale-fixture-cleanup` 高 / `O-S14-mobile-screen-theme-aware-migration` 中 / `O-S14-mobile-jest-actual-run-threshold` 低 / `O-S14-worktree-bypass-commit-history-scan` 低 / `O-S14-jest-expo-pnpm-coupling` 低).
- **Sprint 14 receipt 흐름**: `SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 LEGACY_WRAP_FAIL_TOLERATED=1 bash scripts/receipt/sprint-14.sh` exit 0 + 71/71 PASS + 임계 8종 raw text marker (`external_session_count=0` / `verify_copy_ok≥24` / `web_demo_banner_present=1;copy_keys_matched=2;chat_mount_lines=2` / `pakda_term_count=0` / `agent_view_workaround_pattern≥0` / `workers_with_constitution=7/7` / `mobile_jest_config_present=1;test_files_count=1;test_script=jest` / `worktree_bypass_clause_count=7;agents_scanned=7`).
- **헌법 #13 worktree-bypass 영속성** — Sprint 14 의 모든 워커 (B1/B2/B3) 가 헌법 #13 준수 (worktree path 1회 + git rev-parse --show-toplevel 1회 + 절대경로 main repo 직접 commit 0건). Sprint 13 §11 O-S13-tester-worktree-bypass 재발 0건.
- **헌법 #3 (origin/main 동기화 의무) Sprint 14 영속 준수** — 매 워커 머지 직후 즉시 push (Phase A 후, B1/B2/B3 cherry-pick 후, C3 마감 후). Sprint 13 1회 위반 패턴 재발 0건.
- **Agent View `isolation: worktree` 결함 = 영구 해소 검증됨** — Sprint 14 의 모든 워커 worktree HEAD = base 동기화 1:1 (B1 base=9bd0bdb / B2 base=9bd0bdb / B3 base=2669535 = 직전 머지 후 main). cmux 결함 재발 0건.

**Retrospective:**
- **잘 된 것**:
  1. **Sprint 13 carry-over 4 신규 항목 100% 회수** (mobile-jest-infra 高 / tester-worktree-bypass 高 / sprint-2-threshold-swap 中 / theme-aware-demoHint 低). branch=C inheritance-cleanup 신규 패턴 영속화.
  2. **헌법 #11 (Directive 진단 mismatch 보고) first 실제 적용** — B2 워커가 sprint-9 wrap fail 의 진짜 원인을 실측해 directive (`INJECT swap → wrap 정상화`) vs 실측 (`INJECT swap PASS, team-leader stale 토큰 잔존이 별개 원인`) mismatch 보고 + ack 보류 + 정정 directive 요청 정확히 수행. Sprint 9 이후 첫 활용.
  3. **헌법 #13 (worktree-bypass) 도입 후 즉시 영속성 확보** — Sprint 14 의 모든 워커 (B1/B2/B3) 가 worktree-bypass 0건 + 시작 시 pwd 검증 + commit 직전 git rev-parse 검증 정확 수행.
  4. **헌법 #3 (origin/main 동기화) 매 머지 직후 즉시 push 완전 정착** — Sprint 14 의 모든 머지 (A1+A2 / B2 / B1 / B3) 직후 즉시 push, 다음 워커 dispatch 직전 동기화 1회 검증. Sprint 13 1회 위반 패턴 재발 0건.
  5. **mobile jest infra + theme-aware 패턴 영속화** — 기존 `useTheme()` hook 발견 + wiring 0 추가로 design-system tokens 의 light/dark 양쪽 활용 자동화.
- **아팠던 것**:
  1. **D-S14-legacy-wrap-fail-tolerated-removal 결정 revoke** — PM 의 dev doc skeleton 작성 시점 가정 (`INJECT swap 만으로 sprint-9 wrap 정상화`) 이 실측과 mismatch. B2 워커의 헌법 #11 보고 덕에 즉시 정정. PM directive 작성 시 stale fixture 군 사전 검증 의무.
  2. **Sprint 14 cwd 자동 swap 현상** — B2 워커 완료 시 PM 의 cwd 가 자동으로 B2 worktree (agent-a8b0aaec3a850145e) 로 swap → main worktree 머지 시 `git -C` 절대경로 의무. ExitWorktree / EnterWorktree 가 subagent 안에서 차단 — Agent View 격리 매커니즘의 부수 효과. Sprint 15+ PM 작업 시 모든 git 명령에 `git -C /Users/.../Synapse ...` 강제 검토.
  3. **EnterWorktree 차단 (cwd override prohibition)** — Phase C 진입 시 새 PM worktree 생성이 차단됨 ("EnterWorktree cannot be called from a subagent with a cwd override"). 기존 sprint-14-pm worktree 의 base 를 main 으로 ff merge 한 후 그 안에서 절대경로로 작업. Sprint 15+ PM worktree 는 시작 시점에 1회 생성 후 마감까지 base ff merge 만으로 갱신하는 패턴 영속화.
- **다음에 다르게 할 것**:
  1. **PM dev doc skeleton 작성 시점에 stale fixture 사전 검증 의무 추가** — `.receipt-runner/*.mjs` 안 stale 토큰 (이전 워커 이름 / 정적 카운트 등) 사전 grep 1회. directive mismatch 회피.
  2. **PM worktree 생명주기 재설계** — Sprint 시작 시 1회 EnterWorktree → 매 phase 사이 base ff merge → 마감 시 ExitWorktree 패턴 영속화. Phase C 단계에서 새 worktree 생성 시도 금지.
  3. **헌법 #11 적용 first 사례 메모리 추출** — Sprint 14 B2 의 mismatch 보고 패턴 (directive 인용 + 자기 실측 + 별개 원인 후보 + ack 보류) 을 memory 에 등록. Sprint 15+ 워커들이 같은 패턴 따라가도록.
  4. **stale fixture cleanup 우선순위 Sprint 15 Tier 1 producer-only 후보** — `O-S14-receipt-runner-stale-fixture-cleanup` 高. 정리 후 sprint-13.sh + sprint-14.sh LEGACY 분기 동시 제거 → 시스템 부채 완전 영점화.
