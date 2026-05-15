# Sprint 7 — Polish

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`

## 1. Goal
Sprint 1~6 의 기능 (Conversation / Memory / Recall L1~L3 / Hyper-Recall / Failure & Hygiene) 위에 **사용자 테스트 가능 polish 단계** — 디자인 목업 1:1 애니메이션 / 다크·라이트 테마 / 한·영 균형 / Empty/Error 상태 / 사용자 시나리오 e2e — 를 박아 *외부 사용자에게 데모 가능한* MVP 를 완성한다. 동시에 Sprint 6 carry-over 5 (Inspector unlink 트리거 결정) 및 carry-over 4 (consumer-detected producer contract gap 정책) 를 사용자 테스트 결과로 결정한다.

## 2. Deliverable & Receipt

**Deliverable:**
- **애니메이션 미세조정** — 디자인 목업 모션 토큰 (recall-emerge / ink-rise / synapse-pulse / ghost-breathe / thread-draw / node-orbit) 의 *재생 시점·duration·ease·repeat* 가 디자인 목업 styles.css + synapse-ui.jsx 와 1:1 일치 (Sprint 4/5 의 시각 토큰 + Sprint 6 motion.inkRise 위에 보강).
- **다크/라이트 테마 일치** — oklch 팔레트 (paper / ink / synapse) 의 light ↔ dark 반전 정합 (디자인 목업 tokens 그대로). 시스템 테마 자동 추적 + 사용자 토글 옵션.
- **한·영 카피 균형** — `copy.ts` 의 ko/en 균형 검증 (verify-copy ok 임계 추가 +N) + 디자인 목업/content.jsx COPY 1:1 100% 정합 + 누락 키 0.
- **Empty/Error 상태** — Onboarding / FirstChat / Library / Inspector 4 화면의 빈 상태 + 에러 상태 (LLM 실패 / storage 실패 / network 실패) 시각 정합. 디자인 목업의 Empty/Error 슬롯 1:1.
- **사용자 시나리오 e2e** — `e2e/scenarios/` 에 종단 시나리오 (onboarding → first-chat → memory formation → recall L1~L3 → hyper-recall → dismiss/retraction → forgetting) 자동화. Sprint 6 receipt 의 단위 테스트 위에 *사용자 행동 패턴* 종단 검증.
- **carry-over 4 (Inspector unlink 트리거 결정)** — 사용자 테스트 결과로 디자인 목업 InspectorScreen 확장 여부 결정. 필요 시 unlink 슬롯 + DismissButton variant 'unlink' + copy 'unlink' 키 추가 + chat ChatBubble.retracted prop 검토.
- **carry-over 4 (consumer-detected producer contract gap 정책)** — Sprint 6 의 race 사례 (orchestrator T5 root index, mobile T7 3 producer dispatch) 비용 모델 정량 비교 후 표준 운영 정책 명문화. 워커 spawn prompt 0번 묶음 갱신.

**Receipt (자동 검증 가능한 형태):**
- `bash scripts/receipt/sprint-7.sh` exit 0, "✅ Sprint 7 receipt PASSED".
- Sprint 6 46 단계 wrap (SKIP_OLLAMA / SKIP_SPRINT1_E2E 호환).
- 신규 5~7 단계:
  1. 모션 토큰 일치 — 디자인 목업 styles.css 의 keyframes / duration / ease 값을 raw text fs 매칭으로 design-system motion 정의와 1:1 검증 (drift 0).
  2. 다크 테마 oklch 반전 — light/dark 토큰 쌍의 oklch L 값 합 (light + dark) 이 일정 범위 안 (반전 정합 검증).
  3. verify-copy.mjs 임계 — ok≥N (Sprint 7 신규 카피 키 누적 + ko/en 1:1).
  4. Empty/Error 시각 e2e — 4 화면의 빈 상태 + LLM/storage 실패 fallback 정합 (mocked).
  5. 사용자 시나리오 e2e — `e2e/scenarios/full-journey.spec.ts` (또는 동등) onboarding → memory → recall → dismiss/retraction → forgetting 종단 PASS.
  6. carry-over 4 (Inspector unlink) — 사용자 테스트 데이터 또는 명시 결정 박힘 (decision frozen).
  7. carry-over 4 (contract gap 정책) — 워커 spawn prompt 0번 묶음에 정책 박힘 (raw text 검증).
- 임계 보강 (D-S7-receipt-threshold-recovery) — Sprint 6 의 dismiss_decay/retracted_count/pruned_edges 위에 모션 / 테마 / e2e 시나리오 신규 임계.

## 3. Scope

**In:**

- **모션 토큰 정합** — `packages/design-system/src/motion.ts` 의 6 토큰 (recall-emerge / ink-rise / synapse-pulse / ghost-breathe / thread-draw / node-orbit) 의 duration / ease / repeat 가 디자인 목업 `styles.css @keyframes` (line 47, 55, 59, 63, 67, 72, 76 — synapse-pulse / ink-rise / ghost-breathe / shimmer-line / recall-emerge / thread-draw / node-orbit) 1:1. Sprint 6 motion.inkRise 위에 보강.
- **다크/라이트 oklch 반전** — `packages/design-system/src/tokens.ts` 의 paper/ink/synapse 토큰의 light/dark 짝 박음 (디자인 목업 styles.css `--paper`, `--ink`, `--synapse` light + dark variant 그대로). 검증 = `light.L + dark.L` 합이 일정 범위 (반전 정합).
- **mobile 테마 토글** — `apps/mobile/src/themeStore.{ts,web.ts}` 신규 platform-adapter. Appearance API 시스템 자동 추적 + AsyncStorage 사용자 토글 영속화. effectiveTheme = userOverride ?? systemTheme.
- **카피 균형 + 누락 키 0** — `packages/design-system/src/copy.ts` Sprint 7 신규 카피 키 (Empty/Error/theme-toggle 등) ko/en 1:1, `verify-copy.mjs` 임계 ok ≥ N (Sprint 6 16 위에 +M).
- **Empty/Error 4 화면** — `packages/design-system/src/components/{EmptyState,ErrorState}.tsx` 신규. mobile 4 화면 (Onboarding/FirstChat/Library/Inspector) `rows.length === 0` 분기 + LLM/storage/network 실패 reason 분류 mount.
- **conversation 실패 fallback** — `packages/conversation/src/loop.ts` 의 LLM/storage 실패 시 logger.warn 격리 + ErrorState reason 분류 (`'llm-failure' | 'storage-failure' | 'network-failure'`), 시그니처 동결.
- **e2e 사용자 시나리오** — `e2e/scenarios/full-journey.spec.ts` 신규. onboarding → first-chat (LLM stub) → memory formation → recall L1 ghost → L2 suggestion → L3 strong → hyper-recall → dismiss → retraction → forgetting decay 7+ 단계 종단 PASS.
- **e2e fixture 시드** — `packages/storage/src/repo/seedFullJourney.ts` 신규. 시간축 결정성 (faked clock 7d) 박힘.
- **carry-over 4 (Inspector unlink) 결정 박힘** — fixture 시뮬레이션 결과로 [FROZEN D-S7-inspector-unlink-decision] 박음. A안 (미구현 그대로) 가 디폴트, fixture 가 *recall 거절 동작 부족* 박으면 B안 (unlink 슬롯 + DismissButton variant 'unlink' + copy 'unlink' 키).
- **carry-over 4 (consumer-detected producer contract gap 정책) 명문화** — Sprint 5/6 사례 정량 비용 비교 후 [FROZEN D-S7-consumer-producer-gap-policy] 박음. (a) consumer 즉시 직접 추기 OK (carry-over 9 우선) vs. (b) producer 워커 wake 후 적용 (헌법 #4 우선) 두 옵션 명시 + 표준 박힘.
- **워커 spawn prompt 0번 묶음 갱신** — `.claude/commands/*.md` 8 워커 정의에 추가: (i) D-S7-consumer-producer-gap-policy 정책. (ii) "consumer 슬라이스 시작 시 producer §7 계약 gap 사전 진단 1회 의무" (Sprint 6 retrospective). (iii) "root index 변경 보고 직전 grep 검증 1회 의무" (memory `feedback_root_index_grep.md` 강조).
- **receipt 자동화** — `scripts/receipt/sprint-7.sh` Sprint 6 46 단계 wrap (`SKIP_OLLAMA=1 / SKIP_SPRINT1_E2E=1` 호환) + 신규 7 단계. `.receipt-runner/sprint7-{motion-token-parity,oklch-dark-inversion,empty-error-render,full-journey,inspector-unlink-decision,contract-gap-policy}.mjs` 6 신규 fixture (verify-copy 임계 ↑ 는 기존 fixture 보강).
- **임계 보강 (D-S7-receipt-threshold-recovery)** — Sprint 6 의 dismiss_decay/retracted_count/pruned_edges 위에 신규 `humble_retraction_mount_count ≥ 1` + `dismiss_button_render_count ≥ 1` + `motion_token_parity_drift = 0` + `oklch_dark_inversion_pass = 1` + `full_journey_steps_pass ≥ 7`.

**Out:**

- **recall_log retention 정책 (DB 측 long-term 30d)** — Sprint 6 carry-over 5 그대로 Sprint 8+. 본 sprint 의 forgetting decay 는 edges 만, recall_log 는 dismiss 마킹만.
- **Concept dedup / alias merge** — Sprint 6 carry-over 6 그대로 Sprint 8+ (사용자 테스트 결과 우선순위 결정).
- **LLM 기반 부정 신호 분류** — Sprint 6 §3 Out 그대로 Sprint 8+ (latency + cost + 결정성 약화 사유).
- **DecisionAct enum 변경** — 영구 동결 (4 원 silence/ghost/suggestion/strong).
- **runMemoryFormation / runRecallHook / RecallFn / DecideFn / chatStore 기존 메서드 시그니처 변경** — 동결.
- **신규 화면 추가** — 디자인 목업 표 그대로 (8 화면 + Suggestion/Strong/Ghost overlay). EmptyState/ErrorState 는 *컴포넌트* 추기, 새 화면 X.
- **외부 사용자 테스터 모집** — Sprint 8+. 본 sprint 는 PM 직접 dogfooding + fixture 시뮬레이션 (carry-over 4 결정 본 sprint 안에서 박음).
- **schema 변경** — Sprint 6 0005 그대로 (신규 migration 0).
- **mobile 새 store 작성 시 platform-adapter 강제** — Sprint 6 carry-over 1 그대로 표준.
- **새 패키지 추가** — 8 패키지 그대로.

## 4. Architecture & Data Flow

```
[mobile cold start]
  → useColorScheme() (RN Appearance API) → systemTheme: 'light' | 'dark'
  → themeStore (AsyncStorage) → userOverride?: 'light' | 'dark' | null
  → effectiveTheme = userOverride ?? systemTheme
  → ThemeProvider({ effectiveTheme, tokens.light | tokens.dark })
    → 4 화면 mount (Onboarding / FirstChat / Library / Inspector)
      ├─ 데이터 로드
      │   ├─ try storage.list...() → rows
      │   │   ├─ if (rows.length === 0) → <EmptyState screen="onboarding|chat|library|inspector" />
      │   │   └─ else → 본 화면 (Sprint 1~6 그대로)
      │   └─ catch (err) → logger.warn + <ErrorState reason="storage-failure" />
      └─ 모션 mount (RN Reanimated 3 / Moti)
          ├─ recall-emerge: Inspector 화면 카드 (blur→clear 600ms cubic-bezier)
          ├─ ink-rise: HumbleRetraction (Sprint 6 박힘 + 토큰 정합)
          ├─ synapse-pulse: Strong 화면 회로 (1.6s ease-in-out infinite)
          ├─ ghost-breathe: Ghost overlay (3s ease-in-out infinite)
          ├─ thread-draw: Inspector 그래프 엣지
          └─ node-orbit: Library 화면 노드 회전

[conversation sendStream — Sprint 7 신규]
  → user msg append (Sprint 1~6 그대로)
  → try LLM stream
      ├─ on success → assistant chunks (Sprint 1~6 그대로)
      └─ on failure → logger.warn(reason) + reason emit (callback DI 옵션)
        → mobile chatStore catches → <ErrorState reason="llm-failure" />

[e2e/scenarios/full-journey.spec.ts — tester T11]
  Step 1: seedFullJourney(db) (storage T10 시드)
  Step 2: onboarding → user enters name
  Step 3: first-chat user msg → LLM stub stream → assistant complete
  Step 4: memory formation → 768d embed → graph append
  Step 5: recall L1 ghost (single hint), L2 suggestion (DismissButton), L3 strong (DismissButton)
  Step 6: hyper-recall (bridge + temporal + domain crossing 합집합)
  Step 7: user dismiss click → orchestrator.applyDismiss → recall_log dismissed + edge weight decay
  Step 8: user retraction signal "아니야" → runRetractionHook → markRetracted + rollbackCaptureForTurn + HumbleRetraction mount
  Step 9: time advance fake clock +7d → decayWeights (engine forgetting decay) → pruneEdgesBelow
  assert: dismiss_decay ≥ 1, retracted_count ≥ 1, pruned_edges ≥ 0,
          humble_retraction_mount_count ≥ 1, dismiss_button_render_count ≥ 1,
          motion_token_parity_drift = 0, oklch_dark_inversion_pass = 1,
          full_journey_steps_pass = 9
```

핵심 변경 (Sprint 6 대비 wiring + 시각 보강만, 시그니처 동결 100%):
- `themeStore.{ts,web.ts}` 신규 platform-adapter (carry-over 1 표준 강제).
- `EmptyState / ErrorState` 신규 design-system 컴포넌트 (4 화면 공통).
- `motion.ts` 6 토큰 보강 (디자인 목업 styles.css 1:1 raw text 매칭).
- `tokens.ts` light/dark 반전 (oklch L 합 검증).
- conversation `loop.ts` 실패 reason 분류 (시그니처 동결, DI callback only).
- storage `seedFullJourney.ts` 신규 fixture 시드 (시간축 결정성).
- e2e/scenarios/full-journey.spec.ts 종단.

의존 그래프 신규 엣지 0 (engine ↔ protocol, storage ↔ protocol, orchestrator ↔ protocol, conversation ↔ orchestrator 그대로).

## 5. File Ownership

| Agent | Files |
|---|---|
| **designer** | `packages/design-system/src/motion.ts` (6 토큰 보강), `packages/design-system/src/tokens.ts` (light/dark oklch 반전), `packages/design-system/src/copy.ts` (Sprint 7 신규 카피), `packages/design-system/src/components/EmptyState.tsx` 신규, `packages/design-system/src/components/ErrorState.tsx` 신규, `packages/design-system/src/components/index.ts` (re-export), `packages/design-system/.receipt-runner/verify-copy.mjs` (임계 ↑) |
| **mobile** | `apps/mobile/src/themeStore.ts` 신규, `apps/mobile/src/themeStore.web.ts` 신규 (platform-adapter), `apps/mobile/app/_layout.tsx` (ThemeProvider mount), `apps/mobile/app/onboarding/index.tsx` (Empty/Error/모션), `apps/mobile/app/chat/index.tsx` (Empty/Error/모션 + 기존 retracted 시각 그대로), `apps/mobile/app/inspector/index.tsx` (Empty/Error/recall-emerge + thread-draw 모션), `apps/mobile/app/strong/index.tsx` (synapse-pulse 모션), `apps/mobile/app/ghost/index.tsx` (ghost-breathe 모션), `apps/mobile/app/suggestion/index.tsx` (모션 검토) |
| **conversation** | `packages/conversation/src/loop.ts` (LLM/storage 실패 reason callback DI 옵션, 시그니처 동결), `packages/conversation/__tests__/loop-error-fallback.test.ts` 신규 |
| **engine** | `packages/engine/src/recall.ts` (e2e 결정성 재확인, 신규 코드 0 가능), `packages/engine/__tests__/recall-full-journey.test.ts` 신규 |
| **orchestrator** | `packages/orchestrator/src/{decide,dismiss}.ts` (e2e 검증, 신규 코드 0 가능), `packages/orchestrator/__tests__/dispatch-full-journey.test.ts` 신규 |
| **storage** | `packages/storage/src/repo/seedFullJourney.ts` 신규 (e2e fixture 시드, faked clock 7d 결정성), `packages/storage/__tests__/seed-full-journey.test.ts` 신규 |
| **tester** | `e2e/scenarios/full-journey.spec.ts` 신규, `scripts/receipt/sprint-7.sh` 신규 (Sprint 6 46 wrap + 신규 7 단계), `scripts/receipt/.receipt-runner/sprint7-motion-token-parity.mjs`, `sprint7-oklch-dark-inversion.mjs`, `sprint7-empty-error-render.mjs`, `sprint7-full-journey.mjs`, `sprint7-inspector-unlink-decision.mjs`, `sprint7-contract-gap-policy.mjs` 6 신규 fixture |
| **team-leader** | `docs/sprints/sprint-7-polish.md` (라이브 갱신 §7~§12), `.claude/commands/{team-leader,mobile,engine,conversation,orchestrator,storage,designer,tester}.md` (워커 spawn prompt 0번 묶음 갱신 — D-S7-consumer-producer-gap-policy + consumer 사전 진단 의무 + root index grep 의무), `[FROZEN D-S7-inspector-unlink-decision]` 박음 (T11 결과 후), `[FROZEN D-S7-consumer-producer-gap-policy]` 박음 |

## 6. Tasks

| ID | Description | Owner | Blocked By |
|---|---|---|---|
| T1 | designer: 모션 토큰 6 종 (recall-emerge / ink-rise / synapse-pulse / ghost-breathe / thread-draw / node-orbit) duration/ease/repeat 가 디자인 목업 `styles.css @keyframes` 1:1 — `packages/design-system/src/motion.ts` 보강. raw text fs 매칭 receipt 입력. | designer | — |
| T2 | designer: oklch light/dark 반전 토큰 (paper / ink / synapse) — `packages/design-system/src/tokens.ts`. `light.L + dark.L` 합 일정 범위 검증. | designer | — |
| T3 | designer: `EmptyState` + `ErrorState` 컴포넌트 신규 (4 화면 공통, reason='llm-failure' \| 'storage-failure' \| 'network-failure' prop). `packages/design-system/src/components/`. | designer | — |
| T4 | designer: `copy.ts` Sprint 7 신규 카피 키 (Empty/Error/theme-toggle ko/en 1:1) + `verify-copy.mjs` 임계 ↑. | designer | — |
| T5 | mobile: `themeStore.{ts,web.ts}` platform-adapter (carry-over 1 강제) + Appearance API 시스템 자동 추적 + AsyncStorage 사용자 토글 영속화. `_layout.tsx` ThemeProvider mount. | mobile | T2 |
| T6 | mobile: 4 화면 (Onboarding/FirstChat/Inspector + Strong/Ghost) Empty/Error mount + 6 모션 wiring (RN Reanimated 3 / Moti). `rows.length === 0` 분기 + try/catch ErrorState 라우팅. | mobile | T1, T3, T7 |
| T7 | conversation: LLM/storage 실패 시 logger.warn + reason callback DI 옵션 (`onError?: (reason: 'llm-failure' \| 'storage-failure' \| 'network-failure') => void`). 시그니처 동결 (기존 send/sendStream 변경 0 — 신규 옵션 only). | conversation | — |
| T8 | engine: e2e full-journey 시나리오에서 recall L1~L3 + hyper-recall + dismiss penalty + forgetting decay 결정성 재확인 (시드 fixture + faked clock). 신규 코드 0 가능. | engine | T10 |
| T9 | orchestrator: e2e full-journey 시나리오에서 silence rule + dismiss + retraction 종단 dispatch 검증. 신규 코드 0 가능. | orchestrator | T10 |
| T10 | storage: `seedFullJourney.ts` 신규 (e2e fixture 시드 — 사용자 시나리오 9 단계 DB 상태 + faked clock 7d 결정성). | storage | — |
| T11 | tester: `e2e/scenarios/full-journey.spec.ts` 신규 — 9 단계 종단 PASS (onboarding → memory → recall L1~L3 → hyper-recall → dismiss → retraction → forgetting decay). | tester | T5, T6, T7, T8, T9, T10 |
| T12 | tester: `scripts/receipt/sprint-7.sh` Sprint 6 46 wrap + 신규 7 단계 fixture (motion-token-parity / oklch-dark-inversion / empty-error-render / full-journey / inspector-unlink-decision / contract-gap-policy + verify-copy 임계 ↑). | tester | T1, T2, T3, T4, T11, T13, T14 |
| T13 | team-leader: T11 fixture 결과로 `[FROZEN D-S7-inspector-unlink-decision]` 박음 (A: 미구현 그대로 / B: unlink 슬롯 + DismissButton variant 'unlink' + copy 'unlink' 키). | team-leader | T11 |
| T14 | team-leader: `[FROZEN D-S7-consumer-producer-gap-policy]` carry-over 4 두 옵션 정량 비교 + 정책 명문화 + `.claude/commands/*.md` 8 워커 spawn prompt 0번 묶음 갱신 (정책 + consumer 사전 진단 의무 + root index grep 의무). | team-leader | — |

## 7. Interfaces / Contracts
<함수 시그니처, 메시지 타입, 패키지 경계 — 책임 에이전트가 결정될 때마다 추기>

### designer (T1 — `packages/design-system/src/motion.ts` + root export)

**[FROZEN v2026-04-30 D-S7-design-system-motion-token-parity]** — 모션 토큰 6 종 + 신규 변형 3 종 = 8 항목 디자인 목업 styles.css `@keyframes` + synapse-ui.jsx inline `animation:` 1:1. 기존 토큰 (inkRise / ghostBreathe / synapsePulse / recallEmerge / threadDraw / nodeOrbit) 변경 0 — *추기 only*.

```ts
// packages/design-system/src/motion.ts (보강)
export const motion = {
  inkRise: { duration: 400, easing: 'ease-out', fillMode: 'both', from, to },          // 보강: fillMode='both' (목업 inline `both` 1:1)
  ghostBreathe: { duration: 600, easing: 'ease-in-out', from: {opacity:1}, to: {opacity:0} }, // Sprint 3 동결 (CaptureToast out-fade)
  ghostBreatheLoop: {                                                                   // Sprint 7 신규 — 목업 ghost-breathe @keyframes 1:1
    duration: 3000, easing: 'ease-in-out', iterations: 'infinite',
    from: {opacity:0.42}, mid: {opacity:0.68}, to: {opacity:0.42},
  },
  synapsePulse: { /* Sprint 4 동결 */ },
  recallEmerge: { duration: 600, easing: 'cubic-bezier(.2,.7,.3,1)', fillMode: 'both', /* keyframes */ },  // 보강: fillMode='both'
  recallEmergeStrong: { duration: 700, easing: 'cubic-bezier(.2,.7,.3,1)', fillMode: 'both', /* keyframes 동일 */ },  // Sprint 7 신규 (StrongRecall)
  recallEmergeHyper: { duration: 900, easing: 'cubic-bezier(.2,.7,.3,1)', fillMode: 'both', /* keyframes 동일 */ },   // Sprint 7 신규 (HyperRecall)
  threadDraw: { /* Sprint 4 동결 */ },
  nodeOrbit: { /* Sprint 4 동결 */ },
} as const;

export const MOTION_MOCKUP_PARITY = [
  // 8 항목 — receipt step `motion-token-parity` 의 raw text fs 매칭 입력.
  // { token, keyframeName, mockupDuration, mockupEasing, mockupIterations? }
  ...
] as const;
```

**root export 검증** (Sprint 5/6 misreport 회피 의무 준수): `grep MOTION_MOCKUP_PARITY packages/design-system/index.ts` → 1 hit (line 27). tsc 0 errors. 단위 테스트 92 PASS (motion.test.ts 24 신규 + 기존 동결 가드).

**의미적 분리 사유** (`ghostBreathe` vs `ghostBreatheLoop`): Sprint 3 의 `motion.ghostBreathe` 는 *CaptureToast out-fade* (1→0) 의미였고, 디자인 목업 `@keyframes ghost-breathe` 는 *호흡* (0.42↔0.68) 으로 의미가 다름. 변경하면 Sprint 3/4 컴포넌트 (CaptureToast / GhostHint) 가 시각적으로 깨짐 → 신규 키 추가 + 기존 동결.

### designer (T2 — `packages/design-system/src/tokens.ts` + root export)

**[FROZEN v2026-04-30 D-S7-design-system-oklch-inversion]** — oklch light/dark 반전 정합 검증 메타. 기존 `colors` export 변경 0 — *추기 only*.

```ts
// packages/design-system/src/tokens.ts (추기)
export const OKLCH_LIGHTNESS = {
  light: { paper: 0.965, ink: 0.22, synapse: 0.64 },  // styles.css :root 1:1
  dark:  { paper: 0.20,  ink: 0.94, synapse: 0.64 },  // styles.css [data-theme="dark"] 1:1
} as const;

export const OKLCH_INVERSION_BAND = { min: 1.10, max: 1.22 } as const;  // paper 1.165, ink 1.16 ≈ ±0.06 유격
export function oklchLightnessSum(token: ColorToken): number;
```

**검증 모델**: paper.light.L + paper.dark.L = 1.165 ∈ [1.10, 1.22], ink 동일 (1.16). synapse 는 light/dark 동일 (재정의 없음, styles.css 정합 — 별도 동일성 검증). receipt step `oklch-dark-inversion` fixture 가 `OKLCH_LIGHTNESS` + `OKLCH_INVERSION_BAND` import 후 `oklchLightnessSum('paper')` / `oklchLightnessSum('ink')` 가 band 안인지 검증.

**root export 검증**: `grep OKLCH_LIGHTNESS packages/design-system/index.ts` → 1 hit (line 3). 단위 테스트 6 신규 PASS.

### designer (T3 — `packages/design-system/src/components/{EmptyState,ErrorState}.tsx` + sub-entry export)

**[FROZEN v2026-04-30 D-S7-design-system-empty-error-shape]** — 4 화면 (Onboarding / FirstChat / Inspector / Library) 공통 컴포넌트. mobile T6 + conversation T7 가 본 시그니처에 의존 (consumer-producer-gap 사전 박음).

```ts
// packages/design-system/src/components/EmptyState.tsx (신규)
export type EmptyStateVariant = 'empty' | 'loading';
export type EmptyStateScreen = 'onboarding' | 'chat' | 'inspector' | 'library';
export const EMPTY_STATE_VARIANTS: readonly EmptyStateVariant[];
export const EMPTY_STATE_SCREENS: readonly EmptyStateScreen[];
export const EmptyStateMotionTokens: readonly ['inkRise','nodeOrbit'];

export interface EmptyStateProps {
  title: string;                 // 호출자 주입 (copy.firstChat.empty 또는 화면별 카피)
  subtitle?: string;             // copy.firstChat.emptySub (선택)
  variant?: EmptyStateVariant;   // default 'empty'
  screen?: EmptyStateScreen;     // accessibilityLabel hook
}
export function EmptyState(props: EmptyStateProps): JSX.Element;
// accessibilityLabel = `empty-state-${variant}-${screen ?? 'generic'}` (e2e 분기 가드)

// packages/design-system/src/components/ErrorState.tsx (신규)
export type ErrorStateReason = 'llm-failure' | 'storage-failure' | 'network-failure';
export type ErrorStateScreen = 'onboarding' | 'chat' | 'inspector' | 'library';
export const ERROR_STATE_REASONS: readonly ErrorStateReason[];
export const ErrorStateMotionTokens: readonly ['inkRise'];

export interface ErrorStateProps {
  title: string;                 // 호출자 주입 (copy.firstChat.error)
  subtitle?: string;             // copy.firstChat.errorSub
  reason: ErrorStateReason;      // 필수 — conversation T7 onError reason 1:1 (raw text 정합 가드)
  retryLabel?: string;           // copy.firstChat.retry
  onRetry?: () => void;          // 선택 (없으면 pill button 미렌더)
  screen?: ErrorStateScreen;
}
export function ErrorState(props: ErrorStateProps): JSX.Element;
// accessibilityLabel:
//   container = `error-state-${reason}-${screen ?? 'generic'}`
//   retry button = `error-state-retry-${reason}`
```

**reason union 단일 진실원**: `ErrorStateReason` = `'llm-failure' | 'storage-failure' | 'network-failure'` (D-S5-design-system-source-string-union 정합). conversation T7 의 `OnErrorFn` reason 과 *raw text 정확 일치* — `ErrorState.test.ts` 가 이 정합을 directly 검증 (test "reason union 이 conversation T7 의 onError reason 과 *동일*"). drift 발생 시 즉시 빨간 불.

**평가 의무 (3 producer gap)**: mobile T6 가 designer T1+T3+conversation T7 3 producer 의존 — mobile 슬라이스 시작 시 `tsc --noEmit` + `grep ErrorStateReason packages/design-system/src/components/ErrorState.tsx` + `grep OnErrorFn packages/conversation/index.ts` 사전 진단 1회 의무 (Sprint 6 retrospective 적용).

**디자인 목업 1:1** (screens.jsx L296-360):
- empty 원: 80x80, dashed border (StyleSheet.hairlineWidth + dashed), 중앙 14x14 dot.
- loading: 80x80 frame, 중앙 14x14 synapse dot + 5 orbiting nodes (motion.nodeOrbit 2.4s linear infinite).
- error: 80x80 solid border 원, 중앙 점선 X (22dp 라인 두 개 회전) + 두 dot.
- 본문: serif 17~18 / 13~13.5 italic + ink-mute 색.
- retry button: pill (radius.pill), ink bg + paper text + sans 13.

**RN-only API 강제** (carry-over 1 platform-adapter 표준): `react-native` core 만 (Animated/View/Text/Pressable/StyleSheet/Easing). web import / global window/document 0. 단위 테스트가 raw text 로 가드.

**sub-entry export 검증** (Sprint 5/6 misreport 회피 의무 — root index 변경 보고 직전 grep 1회):
- `grep -E "EmptyState|ErrorState" packages/design-system/src/components/index.ts` → 13 hits (컴포넌트 본체 + alias re-export).
- 컴포넌트 본체 (.tsx) 는 RN 의존이라 root `index.ts` 미노출 — 기존 컴포넌트 (CaptureToast / HumbleRetraction) 동일 패턴.

**componentsMeta.ts 분리 (T3 sub, [FROZEN D-S7-design-system-empty-error-constants-export])**:
- 컴포넌트 *메타* (string literal arrays + props enum types) 만 RN-free 모듈 `packages/design-system/src/componentsMeta.ts` 로 분리 → root index 노출.
- 단일 진실원 = componentsMeta.ts. 컴포넌트 (.tsx) 는 동일 식별자 alias re-export 만 (sub-entry 호환 보존).
- root re-export **7건** (RN 의존 0):
  - 3 const: `EMPTY_STATE_VARIANTS`, `EMPTY_STATE_SCREENS`, `ERROR_STATE_REASONS`.
  - 4 type: `EmptyStateVariant`, `EmptyStateScreen`, `ErrorStateReason`, `ErrorStateScreen`.
- 사유 (defense in depth): design-system 자체 노드 환경 (verify-copy.mjs / unit tests / future receipt fixture) + future consumer 가 root import 안전 가능. 컴포넌트 *본체* RN 의존 격리는 그대로 보존 (D-S7-design-system-empty-error-shape 정합).
- raw text 가드 위치도 진실원 (componentsMeta.ts) 으로 이동 — `EmptyState.test.ts` / `ErrorState.test.ts` 가 컴포넌트 .tsx 가 아닌 componentsMeta.ts 에서 literal 검증.
- root index grep 의무 (memory `feedback_root_index_grep.md`): `grep -E "EMPTY_STATE_SCREENS|EMPTY_STATE_VARIANTS|ERROR_STATE_REASONS|EmptyStateVariant|EmptyStateScreen|ErrorStateReason|ErrorStateScreen" packages/design-system/index.ts` → 7 hits 확인.

**테스트** (`packages/design-system/__tests__/{EmptyState,ErrorState}.test.ts`, 17 신규):
- EmptyState 8 신규: 4 화면 + 2 variant 노출 / props 시그니처 / accessibilityLabel 패턴 / motion 정합 / drift guard / 시각 토큰 박힘 / copy source / RN-only API.
- ErrorState 9 신규: reason 3 종 / props (title+reason 필수) / accessibilityLabel (container+retry) / motion / drift guard / 시각 토큰 / copy source / RN-only API / **reason union ↔ conversation T7 OnErrorFn 정확 일치**.

### designer (T4 — `packages/design-system/src/copy.ts` + verify-copy 임계 ↑)

**[FROZEN v2026-04-30 D-S7-design-system-copy-keys]** — Sprint 7 신규 7 카피 키 (디자인 목업 content.jsx COPY 미매핑 키 정규화). 기존 키 *값* 변경 0 — *추기 only*.

```ts
// packages/design-system/src/copy.ts (RecallCopy 보강)
export interface RecallCopy {
  ghost / suggestion / strong / inspector: RecallSurfaceCopy;        // Sprint 4 동결
  dismiss / never / humble: string;                                  // Sprint 6 동결
  // Sprint 7 (T4) 추가:
  hyper: RecallSurfaceCopy;     // ko: '과거와 현재가 만났습니다' / 'Hyper-Recall · 레벨 4'
  expand: string;               // ko: '펼쳐 보기' / en: 'Open'
  collapse: string;             // ko: '접기' / en: 'Close'
  bridge: string;               // ko: '다리' / en: 'bridge'
  why: string;                  // ko: '왜 떠올랐냐면' / en: 'Why this surfaced'
  sources: string;              // ko: '연결된 기억' / en: 'linked memories'
  confidence: string;           // ko: '확신' / en: 'confidence'
}
```

**verify-copy 임계 ↑**: `packages/design-system/.receipt-runner/verify-copy.mjs` checks 배열에 7 신규 entries 추가 (hyperLabel / expand / collapse / bridge / why / sources / confidence). 실측 stdout `ok=23` (Sprint 1 6 + Sprint 3 2 + Sprint 4 5 + Sprint 6 3 + Sprint 7 7). receipt step `verify-copy` 의 임계 = `ok ≥ 23`.

**theme-toggle 카피 추가 0 (디자인 목업 content.jsx 부재)**: 디자인 목업 우선 헌법 (`feedback_mockup_truth.md`) + D-S4-design-system-single-copy-file 준수. mobile T5 의 themeStore UI 토글 라벨은 mobile 화면 단위 결정 (시스템 자동 디폴트). 외부 사용자 테스트 후 토글 UI 가 필요해지면 *디자인 목업 갱신 후* 키 추가 — Sprint 8+ open issue.

**Empty/Error 4 화면 카피 추가 0 (firstChat.* 재사용)**: 디자인 목업 content.jsx 의 empty/emptySub/error/errorSub/retry 는 1 세트만 존재. EmptyState/ErrorState 컴포넌트가 호출자 주입 props 로 받아 4 화면이 동일 키 재사용 OR 화면별 직접 주입 가능 — 키 추가 0 + 컴포넌트 prop interface 로 유연성 확보.

**테스트** (`packages/design-system/__tests__/copy.test.ts`, 6 신규): hyper.title/subtitle ko/en + 6 신규 키 ko/en + RecallSurfaceCopy 형태 + 비어있지 않음 가드.

### storage (T10 — `packages/storage/src/repo/seedFullJourney.ts`)

**[FROZEN v2026-04-30 D-S7-storage-seedFullJourney-shape-UNION]** — 본 sprint storage shape 결정 *최종* (team-lead [DIRECTIVE D-S7-storage-seedFullJourney-shape-UNION] 정합). e2e fixture 시드. team-lead 가 `tsc + grep` 1회 실측 후 directive 발송 (헌법 8 정합). schema 변경 0 (Sprint 6 0005 그대로). `migrate(db)` 후 `appendMessage / appendConcept / appendEdge / appendRecallLog / markDismissed / decayEdgeWeight / markRetracted` 합성으로 9 단계 DB 상태 결정성 박음.

**SUPERSEDED 두 directive (history 보존)**: 원 `D-S7-storage-seedFullJourney-shape` (concepts/recentDecisions/단계별 only) + `D-S7-storage-seedFullJourney-shape-REVISED` (named lookup only) + `D-S7-storage-seedFullJourney-result-alias` (alias only) 모두 UNION 으로 통합. 본 sprint 헌법 8 (team-lead directive 발송 직전 `tsc + grep` 1회 검증 의무) 영구 박힘 — UNION directive 가 헌법 8 첫 적용 사례.

**UNION 정합 (헌법 7 D-S7-consumer-producer-gap-policy)**: 양쪽 표현 모두 export → consumer-side 변경 0. (a) array + 단계별 (engine recall-full-journey + orchestrator dispatch + tester e2e 그대로 호환): `concepts / recentDecisions / advancedNow / dismiss / retraction / forgetting / 단계별`. (b) named lookup + 단일 ID alias (consumer convenience, array filter 0): `conceptIds.{music,jazz,coltrane,saxophone} / recallLogIds.{l1Ghost,l2Suggestion,l3Strong,hyper} / day7 / halfLifeMs / onboardingMessageId / firstChatAssistantMessageId / dismissedRecallLogId / retractedMessageId`.

**cross-shape consistency 강제** (test #9 신규): `conceptIds.jazz === concepts.find(c => c.label === 'jazz').id` / `recallLogIds.l1Ghost === recentDecisions.find(d => d.act === 'ghost').id` / `day7 === advancedNow === forgetting.sevenDaysLater` / `dismissedRecallLogId === recallLogIds.l2Suggestion === dismiss.recallLogId` / `retractedMessageId === firstChatAssistantMessageId === retraction.messageId` / `ghost.recallLogId === recallLogIds.l1Ghost` 등. 두 표현 drift 0 보장.

```ts
// packages/storage/src/repo/seedFullJourney.ts (UNION shape)
export type FullJourneyFixture = {
  // ── 시간축 (양쪽 alias 모두) ──
  now: number;                              // 1735689600000 (2025-01-01T00:00:00Z UTC) frozen
  advancedNow: number;                      // = now + 7d (engine + orchestrator)
  day7: number;                             // alias = advancedNow (named lookup)
  halfLifeMs: number;                       // = 7 * 24 * 60 * 60 * 1000

  // ── engine 입력 (array + named lookup 둘 다) ──
  concepts: Concept[];                      // 4 (music/jazz/coltrane/saxophone, 768d embedding)
  conceptIds: { music: string; jazz: string; coltrane: string; saxophone: string };
  dismissedConceptIds: Set<string>;         // = new Set(['c-jazz'])
  recentDecisions: RecallLogRow[];          // 4 (r-l1/r-l2/r-l3/r-hyper, r-l2 dismissed=1)
  recallLogIds: { l1Ghost: string; l2Suggestion: string; l3Strong: string; hyper: string };

  // ── 단일 ID + alias (consumer convenience) ──
  onboardingMessageId: string;              // 'msg-onb-user'
  firstChatAssistantMessageId: string;      // 'msg-fc-assistant'
  dismissedRecallLogId: string;             // alias = recallLogIds.l2Suggestion
  retractedMessageId: string;               // alias = firstChatAssistantMessageId

  // ── 단계별 fixture (orchestrator dispatch + tester e2e) ──
  ghost:       { candidates: RecallCandidate[]; recallLogId: string };  // 'r-l1'
  suggestion:  { candidates: RecallCandidate[]; recallLogId: string };  // 'r-l2'
  strong:      { candidates: RecallCandidate[]; recallLogId: string };  // 'r-l3'
  hyperRecall: { candidates: RecallCandidate[] };                       // [saxophone source='bridge']
  dismiss:     { recallLogId: string; conceptIds: string[] };           // 'r-l2', ['c-jazz']
  retraction:  { messageId: string; turnId: string };                   // 'msg-fc-assistant', 'turn-fc-1'
  forgetting:  {
    edgeConceptPairs: Array<[string, string]>;                          // 3 pairs
    nowAt: number;                          // alias = now
    sevenDaysLater: number;                 // alias = advancedNow
  };
};

export function seedFullJourney(db: Database): FullJourneyFixture;
```

**시드 9 단계 결정성** (호출 순서 frozen — 내부 `db.transaction` 단일 atomic):
1. **onboarding** — `appendMessage({ id: 'msg-onb-user', role: 'user', content: '안녕, 나는 민준이야', ts: now })`.
2. **first-chat assistant** — `appendMessage({ id: 'msg-fc-assistant', role: 'assistant', content: '반갑습니다, 민준 님.', ts: now+1000, latency_ms: 420 })`.
3. **memory formation** — `appendConcept` × 3 (music/jazz/coltrane, `createdAt = now+2000`, deterministic 768d unit-vector `seedEmbedding(label)` — mulberry32 PRNG seeded by charcode hash, L2-normalized). `appendEdge` × 2: (jazz↔coltrane co_occur 0.7), (music↔jazz semantic 0.6). 모든 concept/edge 의 `last_used_at = now+2000` 직접 UPDATE (Sprint 6 schema 0005 default 0 회피 → engine forgetting decay silent skip 분기 회피).
4. **recall L1 ghost** — `appendRecallLog({ id: 'r-l1', decided_at: now+3000, act: 'ghost', candidate_ids: ['c-jazz'] })`.
5. **recall L2 suggestion** — `appendRecallLog({ id: 'r-l2', decided_at: now+4000, act: 'suggestion', candidate_ids: ['c-jazz', 'c-coltrane'] })`.
6. **recall L3 strong** — `appendRecallLog({ id: 'r-l3', decided_at: now+5000, act: 'strong', candidate_ids: ['c-music', 'c-jazz'] })`.
7. **hyper-recall** — `appendConcept('c-saxophone', createdAt=now+6000)` + `appendEdge(coltrane↔saxophone co_occur 0.5)` (bridge depth 2: jazz→coltrane→saxophone). `appendRecallLog({ id: 'r-hyper', decided_at: now+6500, act: 'suggestion', candidate_ids: ['c-saxophone'] })`. saxophone concept/edge `last_used_at = now+6000`.
8. **dismiss** — `markDismissed(db, 'r-l2', ['c-jazz'])` + `decayEdgeWeight(db, 'c-jazz', 'c-coltrane', 0.5)` (multiplier=0.5 = orchestrator dismiss default). 결과: jazz↔coltrane co_occur weight = 0.7 * 0.5 = **0.35**.
9. **retraction** — `markRetracted(db, 'msg-fc-assistant')` (rollbackCaptureForTurn 호출 X — concept rollback 은 e2e 별도 단계로 T11 이 수행. 시드는 *messages.retracted=1* 마킹만 박아 화면 분기 가능).

**advancedNow fake clock 입력**: `fixture.advancedNow = fixture.now + 7d`. T8 engine 은 `decayScore(score, advancedNow - last_used_at, halfLifeMs)` 로 정확히 *절반 감쇠* 검증. T11 e2e 는 `decayWeights(db, { now: advancedNow, halfLifeMs: 7d })` 로 동일 검증 가능 (storage 가 weight, engine 이 score 변형 — 이중 검증).

**결정성 보강**:
- 모든 ID 는 frozen literal — UUID 미사용 (2회 실행 시 diff 0).
- embedding = `seedEmbedding(label)` — mulberry32 PRNG seeded by charcode hash, L2-normalized 768d unit vector (sqlite-vec MATCH cosine distance 안정 + label 별 distinct).
- `now` 는 함수 내 const (caller override 0 — directive 정합, opts 인자 없음).
- 모든 단계는 단일 transaction 내 atomic — 부분 실패 시 전체 롤백.

**root index export** (`packages/storage/index.ts`):
- `export { seedFullJourney } from './src/repo/seedFullJourney.ts'`.
- `export type { FullJourneyFixture } from './src/repo/seedFullJourney.ts'`.
- root index 변경 보고 직전 `grep -E "seedFullJourney|FullJourneyFixture" packages/storage/index.ts` **2 hits 의무** (directive § 조치 3 + memory `feedback_root_index_grep.md` 강제).

**테스트** (`packages/storage/__tests__/seed-full-journey.test.ts`, 9 신규):
1. 시드 결정성 — 두 fresh DB → fixture projection (Set/embedding 제외 deepEqual) + row count 동일.
2. 시간축 결정성 — `now=1735689600000`, `advancedNow = now + 7d`, `forgetting.nowAt/sevenDaysLater` alias 검증.
3. engine 입력 — concepts 4 (768d embedding + last_used_at ∈ [now, advancedNow]) + dismissedConceptIds = `Set(['c-jazz'])` + recentDecisions 4 (r-l2 dismissed=1).
4. 단계별 fixture — ghost/suggestion/strong/hyperRecall 의 candidates conceptId + recallLogId 검증.
5. dismiss/retraction/forgetting 단계 fixture — recallLogId/conceptIds, messageId/turnId, edgeConceptPairs 3 검증.
6. messages 2 — onboarding (user) + first-chat (assistant, latency_ms=420, retracted=1).
7. edges 3 — jazz↔coltrane weight=0.35 (dismiss 0.5 적용), music↔jazz=0.6, coltrane↔saxophone=0.5 + 모든 edge last_used_at ∈ [now, advancedNow].
8. recall_log 4 + r-l2 dismissed_concept_ids JSON = `["c-jazz"]` (l1 미dismiss → NULL).
9. **UNION cross-shape consistency** — `conceptIds.* ⇔ concepts.find(label).id` / `recallLogIds.* ⇔ recentDecisions.find(act).id` / `day7 === advancedNow === forgetting.sevenDaysLater` / `forgetting.nowAt === now` / `halfLifeMs = 7d` / `dismissedRecallLogId === recallLogIds.l2Suggestion === dismiss.recallLogId` / `retractedMessageId === firstChatAssistantMessageId === retraction.messageId` / `ghost/suggestion/strong.recallLogId === recallLogIds.*`. 두 표현 drift 0 보장 (UNION directive 정합).

**3 consumer 의존 contract gap 사전 진단** (Sprint 6 retrospective 영구 의무 정합):
- engine T8 (`packages/engine/__tests__/recall-full-journey.test.ts`) — `import { seedFullJourney } from '@synapse/storage'`. 사용: `fixture.{now, advancedNow, concepts, dismissedConceptIds, recentDecisions}` (또는 named lookup `conceptIds.*` / `day7`).
- orchestrator T9 (`packages/orchestrator/__tests__/dispatch-full-journey.test.ts`) — 사용: `fixture.{ghost, suggestion, strong, hyperRecall, dismiss, retraction, forgetting, recallLogIds, dismissedRecallLogId}`.
- tester T11 (`e2e/scenarios/full-journey.spec.ts`) — 사용: 모든 필드 (양쪽 표현 자유).

**검증 결과 (헌법 8 본인 측 실측 1회 의무 정합)**:
- `pnpm --filter @synapse/storage test` PASS — **67/67** (Sprint 6 58 + Sprint 7 9 신규 = 8 + UNION cross-shape 1).
- `pnpm exec tsc --noEmit` (storage 패키지) — **0 errors**.
- root index grep `grep -E "seedFullJourney|FullJourneyFixture" packages/storage/index.ts` — **2 hits 확인 ✅** (UNION 도 동일 export shape).
- UNION 필드 grep `grep -E "concepts:|conceptIds:|recentDecisions:|recallLogIds:|dismiss:|retraction:|forgetting:|advancedNow|day7" packages/storage/src/repo/seedFullJourney.ts` — **모든 필드 hit 확인 ✅** (directive § 조치 4 정합).
- schema 변경 0 (Sprint 6 0005 그대로). SQL secondary sort audit (Sprint 6 D-S6) 보존.

### conversation (T7 — `packages/conversation/src/loop.ts` + root export)

**[FROZEN v2026-04-30 D-S7-conversation-onerror-signature]** — LLM/storage 실패 reason callback DI. mobile T6 가 본 시그니처에 의존 (consumer-producer-gap 사전 박음).

```ts
// packages/conversation/src/loop.ts (export) + root packages/conversation/index.ts re-export
export type OnErrorFn = (
  reason: 'llm-failure' | 'storage-failure' | 'network-failure',
) => void;

// SendDeps + SendStreamDeps 양쪽에 옵션 필드만 추기 (기존 필드 변경 0):
//   onError?: OnErrorFn;
//   logger?: Logger;
```

**emit 위치**:
- `send`: `appendMessage(user)` throw → `'storage-failure'` · `complete()` throw → `'llm-failure'` · `appendMessage(assistant)` throw → `'storage-failure'`. 각 단계 `emitError` 후 원 에러 re-throw.
- `sendStream`: `appendMessage(user)` throw → `'storage-failure'` · stream `for await` throw → `'llm-failure'` · `appendMessage(assistant)` throw → `'storage-failure'`.
- `'network-failure'`: loop 내부에서 분류 X — mobile chatStore 가 LLM 어댑터 외부 네트워크 오류 시 직접 호출하는 enum slot.

**격리 (Sprint 6 retraction hook 패턴 답습)**:
- `emitError(onError, reason, logger, cause)`: `logger.warn(reason, cause)` 후 `try { onError(reason) } catch { logger.warn }`.
- 콜백이 throw 해도 원 에러 propagation 보존.
- 옵션 미주입 시 hook 전체 noop — 기존 contract (`loop.test.ts:30`, `loop-stream.test.ts:39`) 변경 0.

**root export 검증** (Sprint 5/6 misreport 회피 의무):
- `grep OnErrorFn packages/conversation/index.ts` → line 20 hit 확인.
- `pnpm --filter @synapse/conversation typecheck` → tsc 0 errors 확인.

**테스트**: `packages/conversation/__tests__/loop-error-fallback.test.ts` 8 unit (send 3 + sendStream 5: 정상 흐름 회귀 가드 / stream-mid throw / 즉시 throw / 콜백 throw 격리 / storage-failure). 전체 conversation 패키지 52 tests PASS.

**revert 비용**: 1줄 (carry-over 9 표준) — `OnErrorFn` 옵션 only, 기존 시그니처 변경 0.

**consumer**: mobile T6 chatStore — `onError(reason)` 받아 `<ErrorState reason={reason} />` 라우팅. `'network-failure'` 는 chatStore 가 LLM 어댑터 외부에서 직접 emit.

**[FROZEN v2026-04-30 D-S7-conversation-send-ts-monotonic]** (T7 sub) — `send` + `sendStream` 의 user/assistant 메시지 ts monotonic 보장. mock complete (즉시 reply) / 즉시 yield streaming 일 때 `Date.now()` 가 같은 ms → storage `listMessages` 의 `ORDER BY ts ASC, id ASC` (Sprint 6 [FROZEN D-S6-storage-listMessages-retracted]) 가 uuid 로 user/assistant 50% 역전. 1줄 fix: `ts1 = Math.max(Date.now(), ts0 + 1)`. 검증: ALL 100x PASS, fail 0. 실측 latency (≥15ms sleep) 영향 0 — 동일 ms 일 때만 +1 강제. revert 비용: 2줄 (`send` + `sendStream` 각 1줄).

**directive scope 자가 확장 사유** (헌법 7 D-S7-consumer-producer-gap-policy 정합 + SoT 헌법 #1 자가 RESUME 예외): team-lead directive 는 `send` only 명시 + "sendStream LLM streaming 자연 분리 OK" 가정. 50x 반복 실측 결과 sendStream 도 mock 환경 same-ms race 20/50 reproduce — directive 가정이 *code on disk* 에서 거짓. fix 패턴 동일 (1줄), revert 비용 동일, idempotent → carry-over 9 우선 직접 추기 (옵션 a). team-lead ack 사후 보고 — 본 §11 frozen 박음 + 100x PASS 증거 첨부.

## 8. Test Scenarios

| # | 시나리오 (디자인 목업 / 기획서 인용) | 자동화 위치 | 검증 |
|---|---|---|---|
| 1 | 디자인 목업 `styles.css @keyframes` 6 + synapse-ui.jsx inline animation 의 duration/ease/repeat 1:1 정합 | `scripts/receipt/.receipt-runner/sprint7-motion-token-parity.mjs` + `packages/design-system/__tests__/motion.test.ts` | `motion_token_parity_drift=0;tokens_checked=8;keyframes_found=8` |
| 2 | 디자인 목업 `:root` (light) + `.dark` 의 paper/ink oklch L 합 [1.10, 1.22] 반전 정합 + synapse 동일 | `scripts/receipt/.receipt-runner/sprint7-oklch-dark-inversion.mjs` + `packages/design-system/__tests__/tokens.test.ts` | `paper_sum=1.165;ink_sum=1.160;synapse_eq=true` |
| 3 | `copy.ts` ko/en 1:1 + 디자인 목업 content.jsx COPY 매핑 ok ≥ 23 (Sprint 6 16 + Sprint 7 7) | `packages/design-system/.receipt-runner/verify-copy.mjs` | `ok=23` |
| 4 | EmptyState (variant=empty\|loading × screen=onboarding\|chat\|inspector\|library) + ErrorState (reason=llm-failure\|storage-failure\|network-failure) 4 화면 mount 정합 + reason union conversation T7 OnErrorFn 과 raw text 정확 일치 | `scripts/receipt/.receipt-runner/sprint7-empty-error-render.mjs` + `packages/design-system/__tests__/{EmptyState,ErrorState}.test.ts` | `empty_screens=4;error_reasons=3` |
| 5 | 사용자 시나리오 종단 9 단계: onboarding → first-chat (LLM stub) → memory formation → recall L1 ghost / L2 suggestion / L3 strong → hyper-recall (bridge+temporal+domain) → dismiss → retraction → forgetting decay (faked clock 7d) | `e2e/scenarios/full-journey.spec.ts` (`node --test`) + `scripts/receipt/.receipt-runner/sprint7-full-journey.mjs` | `full_journey_steps_pass=9;dismiss_decay=1;retracted_count=1;humble_retraction_mount_count=1;dismiss_button_render_count=1` |
| 6 | Inspector unlink 트리거 결정 박힘 (A안 채택) — Sprint 6 carry-over 5 RESOLVED | `scripts/receipt/.receipt-runner/sprint7-inspector-unlink-decision.mjs` | `inspector_unlink_decision_frozen=1;mark='A'` |
| 7 | Consumer-producer-gap-policy 워커 spawn prompt 0번 묶음 raw text 박힘 (8 워커 × 3 패턴 = 24 marks) | `scripts/receipt/.receipt-runner/sprint7-contract-gap-policy.mjs` | `contract_gap_policy_pass=1;files=8;policy_marks=24` |
| W | Sprint 6 46 단계 회귀 wrap (`SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환) — Sprint 1~6 누적 e2e + dismiss/retraction/decay/prune 지속성 | `bash scripts/receipt/sprint-7.sh` | `✅ Sprint 1~6 receipt PASSED` (1~46) + `✅ Sprint 7 receipt PASSED` (47~53) = **53/53 PASS** |
| X | conversation send/sendStream 동일-ms ts race 결정성 (storage `listMessages id ASC` tie-break 와 정합) | `packages/conversation/__tests__/loop.test.ts` × 100x | 100x PASS / fail 0 (D-S7-conversation-send-ts-monotonic 적용 후) |

**디자인 목업 인용 위치**: `디자인 목업/styles.css` (모션·oklch 토큰), `디자인 목업/content.jsx` (COPY/DEMO_KO/EN), `디자인 목업/synapse-ui.jsx` (inline animation), `디자인 목업/screens.jsx` (Empty 슬롯 카드 그라데이션).

## 9. Demo Script

```bash
# 1. 환경 확인 (Sprint 0~6 그대로)
pnpm install
node --version  # ≥ 18

# 2. Sprint 7 receipt 자동 검증 (Ollama 없이 53/53 PASS)
SKIP_OLLAMA=1 bash scripts/receipt/sprint-7.sh
# → "✅ Sprint 1 receipt PASSED" (1~10)
# → "✅ Sprint 3 receipt PASSED" (11~22)
# → "✅ Sprint 4 receipt PASSED" (23~32)
# → "✅ Sprint 5 receipt PASSED" (33~40)
# → "✅ Sprint 6 receipt PASSED" (41~46)
# → "✅ Sprint 7 receipt PASSED" (47~53)
# 핵심 출력:
#   [47/53] motion_token_parity_drift=0;tokens_checked=8;keyframes_found=8
#   [48/53] paper_sum=1.165;ink_sum=1.160;synapse_eq=true
#   [49/53] verify-copy ok=23
#   [50/53] empty_screens=4;error_reasons=3
#   [51/53] full_journey_steps_pass=9;dismiss_decay=1;retracted_count=1;humble_retraction_mount_count=1
#   [52/53] inspector_unlink_decision_frozen=1;mark='A'
#   [53/53] contract_gap_policy_pass=1;files=8;policy_marks=24

# 3. 단위 테스트 회귀 (전 패키지)
pnpm -r test
# → storage/engine/orchestrator/conversation/design-system/protocol/llm/mobile 모두 PASS

# 4. e2e 종단 시나리오 단독 재생
cd e2e/scenarios && node --test full-journey.spec.ts
# → 3/3 PASS (9 단계 + 결정성 + design-system contract)

# 5. lint 3 종 + frozen-flag-audit
bash scripts/lint/mockup-scope-parity.sh docs/sprints/sprint-7-polish.md
bash scripts/lint/frozen-flag-audit.sh docs/sprints/sprint-7-polish.md
node scripts/lint/directive-tag-audit.ts docs/sprints/sprint-7-polish.md
# → 모두 exit 0

# 6. (옵션) Sprint 7 e2e 시각 확인 — 모바일 기기/시뮬레이터
pnpm --filter mobile start
# → Onboarding → FirstChat → 4 화면 (Empty/Error mount + 6 모션 + dark/light 토글)
```

## 10. Implementation Map

**design-system (designer)**:
- `packages/design-system/src/motion.ts` — 8 모션 토큰 (`inkRise` / `ghostBreathe` / `synapsePulse` / `recallEmerge` / `threadDraw` / `nodeOrbit` + 신규 `ghostBreatheLoop` / `recallEmergeStrong` / `recallEmergeHyper`) + `MOTION_MOCKUP_PARITY` 메타. `inkRise` / `recallEmerge` `fillMode='both'` 보강.
- `packages/design-system/src/tokens.ts` — `colors` 그대로 + `OKLCH_LIGHTNESS` / `OKLCH_INVERSION_BAND` / `oklchLightnessSum()` 메타. `ColorTokens` wider type alias + `as const satisfies ColorTokens` 패턴.
- `packages/design-system/src/colorsHex.ts` — `colorsHex` 그대로 + `ColorTokensHex` wider type alias.
- `packages/design-system/src/copy.ts` — `copy.recall.hyper.{title,subtitle}` + `copy.recall.{expand,collapse,bridge,why,sources,confidence}` 7 신규 키 ko/en 1:1.
- `packages/design-system/src/components/EmptyState.tsx` 신규 — `variant=empty|loading × screen=onboarding|chat|inspector|library`.
- `packages/design-system/src/components/ErrorState.tsx` 신규 — `reason=llm-failure|storage-failure|network-failure` + 선택 `onRetry` pill.
- `packages/design-system/src/components/index.ts` — sub-entry `@synapse/design-system/components` re-export (RN 의존 격리, CaptureToast/HumbleRetraction 동일 패턴).
- `packages/design-system/src/componentsMeta.ts` 신규 — RN-free 모듈. `EMPTY_STATE_VARIANTS` / `EMPTY_STATE_SCREENS` / `ERROR_STATE_REASONS` const + `EmptyStateVariant` / `EmptyStateScreen` / `ErrorStateReason` / `ErrorStateScreen` types. root index 노출 (단일 진실원).
- `packages/design-system/index.ts` — root re-export 추가 7 종 (componentsMeta types + consts) + `ColorTokens` / `ColorTokensHex` types + 모션 신규 토큰 (`ghostBreatheLoop` / `recallEmergeStrong` / `recallEmergeHyper`) + `MOTION_MOCKUP_PARITY` + `OKLCH_LIGHTNESS` / `OKLCH_INVERSION_BAND` / `oklchLightnessSum`.
- `packages/design-system/.receipt-runner/verify-copy.mjs` — 임계 `ok ≥ 23` (Sprint 6 16 + Sprint 7 7).

**mobile (mobile)**:
- `apps/mobile/src/themeStore.ts` 신규 — Zustand store + Appearance API 시스템 자동 추적 + AsyncStorage 사용자 토글 영속화. `effectiveTheme = userOverride ?? systemTheme`.
- `apps/mobile/src/themeStore.web.ts` 신규 — LocalStorage adapter (platform-adapter 8회차).
- `apps/mobile/app/_layout.tsx` — ThemeProvider mount.
- `apps/mobile/app/{onboarding,chat,inspector,strong,ghost,suggestion}/index.tsx` — Empty/Error mount + 6 모션 wiring (RN Reanimated 3 / Moti).
- `apps/mobile/src/chatStore.{ts,web.ts}` — `pruneEdges` adapter 1줄 unwrap (carry-over 9 우선 직접 추기 — D-S7-consumer-producer-gap-policy 옵션 (a) 첫 정식 사례).

**conversation (conversation)**:
- `packages/conversation/src/loop.ts` — `OnErrorFn` 타입 + `onError?` DI 옵션 (`SendDeps` / `SendStreamDeps`). `emitError` helper (try/catch + logger.warn). `send` + `sendStream` `ts1 = Math.max(Date.now(), ts0 + 1)` monotonic.
- `packages/conversation/index.ts` — `OnErrorFn` 타입 root export.
- `packages/conversation/__tests__/loop-error-fallback.test.ts` 신규 — 3 reason × send/sendStream 종단.

**engine (engine)**:
- `packages/engine/__tests__/recall-full-journey.test.ts` 신규 — recall L1~L3 + hyper-recall + dismiss penalty + forgetting decay 결정성 재확인 (시드 fixture + faked clock 7d). 신규 코드 0.

**orchestrator (orchestrator)**:
- `packages/orchestrator/src/dismiss.ts` — `pruneEdgesBelow` 시그니처 정합 (storage 의 `{pruned: number}` 반환 그대로 wiring, 시그니처 동결).
- `packages/orchestrator/__tests__/{dismiss,dispatch-full-journey}.test.ts` — full-journey 검증 신규.
- `packages/orchestrator/package.json` — 의존 정합.

**storage (storage)**:
- `packages/storage/src/repo/seedFullJourney.ts` 신규 — e2e fixture 시드 (9 단계 DB 상태 + faked clock 7d 결정성). UNION shape (`day7 + advancedNow` / `dismissedRecallLogId + dismiss.recallLogId` / `retractedMessageId + retraction.messageId` 양방향) 노출.
- `packages/storage/__tests__/seed-full-journey.test.ts` 신규.
- `packages/storage/index.ts` — `seedFullJourney` + `FullJourneyFixture` root export.

**tester / receipt (tester)**:
- `e2e/scenarios/full-journey.spec.ts` 신규 — 9 단계 + 결정성 + design-system contract 3/3.
- `e2e/scenarios/package.json` 신규 — workspace deps 6 종 (`@synapse/{protocol,storage,engine,orchestrator,conversation,design-system}: workspace:*`) + `scripts.typecheck = "tsc --noEmit"` (Sprint 6 carry-over 2 + 7 mobile + e2e 완전 흡수).
- `e2e/scenarios/tsconfig.json` 신규.
- `scripts/receipt/sprint-7.sh` 신규 — Sprint 6 46 wrap + 신규 7 단계 = 53.
- `scripts/receipt/.receipt-runner/sprint7-motion-token-parity.mjs` 신규 — `'in' guard` 양방향 narrowing.
- `scripts/receipt/.receipt-runner/sprint7-oklch-dark-inversion.mjs` 신규.
- `scripts/receipt/.receipt-runner/sprint7-empty-error-render.mjs` 신규.
- `scripts/receipt/.receipt-runner/sprint7-full-journey.mjs` 신규.
- `scripts/receipt/.receipt-runner/sprint7-inspector-unlink-decision.mjs` 신규.
- `scripts/receipt/.receipt-runner/sprint7-contract-gap-policy.mjs` 신규.

**team-leader / 공통 헌법 (team-leader)**:
- `.claude/commands/{conversation,designer,engine,mobile,orchestrator,storage,team-leader,tester}.md` 8 워커 정의 — 헌법 5 (consumer 사전 진단 의무) + 헌법 6 (root index grep 의무) + 헌법 7 (D-S7-consumer-producer-gap-policy) + 헌법 8 (team-lead directive 사전 verify 의무) 영구 박힘.
- `docs/sprints/sprint-7-polish.md` — 라이브 갱신 §7~§12.

**Receipt 종합**: 53/53 PASS (Sprint 4: 32 + Sprint 5: 8 + Sprint 6: 6 + Sprint 7: 7 = 53). lint 3 종 (mockup-scope-parity / frozen-flag-audit / directive-tag-audit) 모두 exit 0. conversation 100x 결정성. e2e 3/3.

## 11. Decisions Made / Open Issues
**Decisions Made:**
- **[FROZEN v2026-04-30 D-S7-design-system-motion-token-parity]** (designer T1) — motion 8 항목 디자인 목업 1:1. 기존 토큰 (inkRise/ghostBreathe/synapsePulse/recallEmerge/threadDraw/nodeOrbit) 변경 0. 신규 추기: `ghostBreatheLoop` (목업 ghost-breathe @keyframes 호흡 1:1) + `recallEmergeStrong` (700ms StrongRecall) + `recallEmergeHyper` (900ms HyperRecall) + `MOTION_MOCKUP_PARITY` 메타 (receipt 입력). `inkRise` / `recallEmerge` 에 `fillMode='both'` 보강 (목업 inline `both` 1:1). 기존 ghostBreathe (CaptureToast out-fade) 의미 동결 보존.
- **[FROZEN v2026-04-30 D-S7-design-system-oklch-inversion]** (designer T2) — oklch L 분해 메타 추기 (`OKLCH_LIGHTNESS` + `OKLCH_INVERSION_BAND` + `oklchLightnessSum`). 기존 `colors` export 변경 0. 검증: paper.L_sum = 1.165, ink.L_sum = 1.16 ∈ [1.10, 1.22]; synapse 는 light/dark 동일성 검증 (재정의 없음, styles.css 1:1).
- **[FROZEN v2026-04-30 D-S7-design-system-color-tokens-widen]** (designer T2 sub) — `colors` / `colorsHex` 의 `light` / `dark` literal type narrowing 으로 mobile T5 themeStore 가 두 토큰 swap 시 cast 강요 (TS2322). `ColorTokens` + `ColorTokensHex` wider type alias 추가 + `colors.{light,dark}` / `colorsHex.{light,dark}` 에 `as const satisfies <Type>` (TS 4.9+) 패턴. literal 정확성 (oklch L 합 receipt 입력 + raw hex 보존) + wider 형태 노출 동시 충족. 기존 export 식별자 변경 0 — `colors`, `colorsHex`, `ThemeName`, `ColorToken`, `ColorHexTheme`, `ColorHexToken` 동결. 신규 root export: `ColorTokens`, `ColorTokensHex` types. revert 비용 8 줄 = 3 분. mobile 자체 `ThemeColors` alias 정리 (단일 진실원 의존 b안) = Sprint 8+ 보류.
- **[FROZEN v2026-04-30 D-S7-design-system-empty-error-shape]** (designer T3) — `EmptyState` (variant=empty|loading + screen=onboarding|chat|inspector|library) + `ErrorState` (reason=llm-failure|storage-failure|network-failure + 선택 onRetry pill). reason union 이 conversation T7 `OnErrorFn` 과 raw text 정확 일치 — drift 시 즉시 빨간 불 (`ErrorState.test.ts`). RN-only API 강제 (carry-over 1 platform-adapter 표준). sub-entry `@synapse/design-system/components` 노출 (컴포넌트 본체 root index 미노출 — RN 의존 격리, CaptureToast/HumbleRetraction 동일 패턴).
- **[FROZEN v2026-04-30 D-S7-design-system-empty-error-constants-export]** (designer T3 sub) — 컴포넌트 *메타* (string literal arrays + props enum types) 만 RN-free 모듈 (`packages/design-system/src/componentsMeta.ts`) 로 분리 + root index 노출. 단일 진실원 = componentsMeta. 컴포넌트 (.tsx) 는 alias re-export 만 (sub-entry 호환 보존). Root re-export 7 건: `EMPTY_STATE_VARIANTS`, `EMPTY_STATE_SCREENS`, `ERROR_STATE_REASONS` const + `EmptyStateVariant`, `EmptyStateScreen`, `ErrorStateReason`, `ErrorStateScreen` types. 사유: design-system 자체 노드 환경 (verify-copy.mjs / unit tests / future receipt fixture) + future consumer 가 안전 import 가능. RN 의존 격리 (D-S7-design-system-empty-error-shape) 정합 보존 — 컴포넌트 본체는 여전히 sub-entry only. raw text 가드 위치도 진실원 (componentsMeta.ts) 로 이동. revert 비용 신규 파일 1 + 컴포넌트 alias 2 + root re-export 14 줄 + test 가드 위치 이동 2 = 약 50 줄 / 5 분.
- **[FROZEN v2026-04-30 D-S7-design-system-copy-keys]** (designer T4) — copy.recall 에 7 신규 키 (hyper.title/subtitle + expand/collapse/bridge/why/sources/confidence) 추기. 디자인 목업 content.jsx COPY 의 미매핑 키 정규화 (1:1 값). 기존 키 *값* 변경 0. verify-copy 임계 = `ok ≥ 23` (Sprint 6 16 + Sprint 7 7). theme-toggle 카피 + 4 화면 별 Empty/Error variant 카피 추가 *0* (디자인 목업 content.jsx 부재 → 우선 헌법 + D-S4 단일 진실원 준수).
- **[FROZEN v2026-04-30 D-S7-consumer-producer-gap-policy]** (team-leader T14) — consumer 가 producer 계약 gap 발견 시 처분 두 옵션 명문화: (a) *코드 변경 ≤3 줄 + revert 비용 ≤5분 + idempotent* → consumer 즉시 직접 추기 OK (carry-over 9 우선) + producer ack 의무. (b) *시그니처 변경 OR ≥4 줄 OR non-idempotent* → producer 워커 ping → wake → 적용 (헌법 #4 우선). 적용 후 dev doc §11 즉시 frozen 박음 (revert 비용 명시). 정량 비교 출처: Sprint 5/6 사례 (orchestrator T5 root index race ≈3분 + idempotent / mobile T7 3 producer dispatch ≈12분 + non-idempotent). 본 sprint 내 첫 정식 사례 = mobile T6 의 chatStore.ts:217 pruneEdges adapter 1줄 unwrap 정합 (carry-over 9 우선 직접 추기). 8 워커 spawn prompt 0번 묶음에 본 정책 + consumer 사전 진단 의무 + root index grep 의무 + team-lead directive 사전 verify 의무 4종 박힘 (`.claude/commands/{conversation,designer,engine,mobile,orchestrator,storage,team-leader,tester}.md` 8 파일). T12 receipt 7번째 단계 (`sprint7-contract-gap-policy.mjs`) 가 raw text 검증.
- **[FROZEN v2026-04-30 D-S7-team-lead-directive-pre-verify]** (team-leader T14 sub) — team-lead 가 directive 발송 직전 producer 측 최신 상태 1회 직접 verify 의무 (`tsc --noEmit` + `grep <symbol>`). 사유: 본 sprint 안에서 stale snapshot directive 5건 발생 (designer 4건 + storage shape 진동 1건) — consumer 사전 진단 보고를 producer 측 검증 없이 패스스루 시 redundant directive + producer 측 작업 0 으로 무효 처리 비용. revert 비용 0 (정책 강화 only).
- **[FROZEN v2026-04-30 D-S7-conversation-send-ts-monotonic]** (conversation T7 sub, team-lead [DIRECTIVE D-S7-conversation-send-ts-race-fix] 수신 → `send` 1줄 적용 + sendStream 자가 RESUME 1줄 확장) — `send` + `sendStream` 양쪽에 `ts1 = Math.max(Date.now(), ts0 + 1)` monotonic 보장. mock complete (즉시 reply) / 즉시 yield streaming same-ms 일 때 storage `listMessages` 의 `id ASC` tie-break (Sprint 6 [FROZEN D-S6-storage-listMessages-retracted]) 가 user/assistant 50% 역전. 검증: `pnpm --filter @synapse/conversation test` ALL 100x PASS / fail 0. tsc 0 errors. 실측 latency (≥15ms sleep) 영향 0. directive scope 자가 확장 사유 = SoT 헌법 #1 (`code on disk > inbox`) — directive 가정 ("sendStream LLM streaming 자연 분리 OK") 이 mock 환경 50x 실측에서 20회 reproduce 로 거짓 입증. 헌법 7 (D-S7-consumer-producer-gap-policy) 옵션 (a) 정합 — 1줄 변경 + revert 비용 1줄 + idempotent 3 조건 모두 충족. revert 비용: 2줄 (send + sendStream 각 1줄) = 1분.
- **[FROZEN v2026-04-30 D-S7-tester-motion-token-parity-narrowing]** (tester T12 sub, team-lead [DIRECTIVE D-S7-tester-motion-token-parity-narrowing] 수신) — `scripts/receipt/.receipt-runner/sprint7-motion-token-parity.mjs:70-79` 옵션 (a) `'in' guard` 양방향 narrowing 적용. `mockupIterations` / `iterations` 둘 다 motion union 안에서 loop 토큰 (ghostBreatheLoop / synapsePulse / nodeOrbit) 에만 선택적 — `'in' guard` 로 narrowing 시 designer T1 모션 토큰 시그니처 변경 강요 0 (carry-over 9 비용 0). 검증: `node sprint7-motion-token-parity.mjs` → `motion_token_parity_drift=0;tokens_checked=8;keyframes_found=8`. `bash scripts/receipt/sprint-7.sh` (`SKIP_OLLAMA=1`) → 53/53 PASS 보존. revert 비용: 10 줄 = 2 분.
- **[FROZEN v2026-04-30 D-S7-tester-e2e-workspace-deps]** (tester T11 sub, team-lead [DIRECTIVE D-S7-tester-e2e-workspace-deps] 수신) — Sprint 6 carry-over 2 (mobile workspace deps) 의 *완전한* 흡수 (mobile + e2e). `e2e/scenarios/package.json` workspace deps 6 종 박음 (`@synapse/{protocol,storage,engine,orchestrator,conversation,design-system}: workspace:*`) + `e2e/scenarios/tsconfig.json` 신규 + `scripts.typecheck = "tsc --noEmit"` (`pnpm --filter` 검증 hook). `pnpm install` → `e2e/scenarios/node_modules/@synapse/*` 6 종 symlink 박힘. 검증: `pnpm --filter @synapse/e2e-scenarios typecheck` → 0 errors (TS2307 해소). `node --test full-journey.spec.ts` → 3/3 PASS (9 단계 + 결정성 + design-system contract). `bash scripts/receipt/sprint-7.sh` (`SKIP_OLLAMA=1`) → 53/53 PASS 보존. storage `FullJourneyFixture` UNION shape (`day7 + advancedNow` / `dismissedRecallLogId + dismiss.recallLogId` / `retractedMessageId + retraction.messageId`) 가 spec 의 OLD/NEW 양쪽 접근 strict 모드 정합 — D-S7-storage-full-journey-shape-union (T10 final) 와 직접 정합. revert 비용: package.json 6 줄 + tsconfig.json 1 파일 = 5 분.
- **[FROZEN v2026-04-30 D-S7-inspector-unlink-decision]** A안 채택 (team-leader T13) — Sprint 6 carry-over 5 (Inspector unlink 슬롯 — 디자인 목업 부재, 사용자 테스트 후 검토) 결정 박음. **A안 (미구현 그대로) 채택**. 사유: T11 fixture 시뮬레이션 결과 (e2e/scenarios/full-journey.spec.ts 9 단계 종단 PASS — onboarding → memory → recall L1~L3 → hyper-recall → dismiss → retraction → forgetting decay) 가 *recall 거절 동작 부족* 박지 않음 — 현재 DismissButton variant='reject' (Suggestion + Strong 2 화면) + HumbleRetraction (chat 화면 retracted 메시지) + chatStore.dismiss + recall_log dismissed 마킹 + concept-edge weight decay + concept dismiss penalty 0.5 의 5 층위 거절 메커니즘 충분. Inspector 화면은 read-only 회상 시각 의도 (디자인 목업 InspectorScreen) 보존. 결정 사항: (i) DismissButton variant 'unlink' 추가 = 0. (ii) ChatBubble.retracted prop 신설 = 0 (HumbleRetraction 별도 mount 패턴 그대로). (iii) Inspector unlink 슬롯 mount = 0 (디자인 목업 부재 + 우선 헌법 정합). (iv) copy.recall.{unlink, retracted} 키 추기 = 0. revert 비용: B안 전환 시 designer 보강 task (DismissButton variant 'unlink' + copy 'unlink' 키 + Inspector 슬롯) ≈ 30분. **carry-over 처분**: Sprint 6 carry-over 5 = RESOLVED (A안 frozen). 외부 사용자 테스트 데이터 박힐 시 (Sprint 8+ 외부 테스터 모집) 재검토 가능 — 단, 본 sprint /end 시점 carry-over 미박음 (Open Issue 0).

**Open Issues:**
- theme-toggle UI 라벨 — 디자인 목업 content.jsx 부재. mobile T5 의 themeStore 시스템 자동 디폴트로 시작, 외부 사용자 테스트 후 토글 UI 가 필요해지면 *디자인 목업 갱신 후* `copy.theme.{light,dark,system}` 키 추가 (Sprint 8+).
- 4 화면 별 Empty/Error 카피 — 현재 firstChat.{empty/emptySub/error/errorSub/retry} 1 세트 재사용 + 컴포넌트 props 직접 주입. inspector/library 가 별도 카피를 원하면 디자인 목업 갱신 후 `copy.{inspector,library}.empty.*` 추가 (Sprint 8+).

## 12. Carry-over + Retrospective

**Carry-over (다음 스프린트가 반드시 알아야 할 것):**

1. **공통 헌법 5~8 영구 박힘 (`.claude/commands/*.md` 8 워커)** — Sprint 7 에서 `D-S7-consumer-producer-gap-policy` (헌법 7) + `D-S7-team-lead-directive-pre-verify` (헌법 8) + 헌법 5 (consumer 사전 진단 의무) + 헌법 6 (root index grep 의무) 4종 영구 박힘. Sprint 8+ 의 모든 워커 spawn prompt 0번 묶음에 자동 inject (8 파일 raw text 박혀있음). 변경 시 `scripts/receipt/.receipt-runner/sprint7-contract-gap-policy.mjs` 빨간 불.
2. **Sprint 6 carry-over 5 (Inspector unlink) = RESOLVED (A안 frozen)** — `D-S7-inspector-unlink-decision` A안 채택. 5 층위 거절 메커니즘 (DismissButton variant='reject' Suggestion+Strong + HumbleRetraction chat + chatStore.dismiss + recall_log dismissed + concept-edge weight decay + concept dismiss penalty 0.5) 충분. **외부 사용자 테스트 데이터 박힐 시 Sprint 8+ 재검토 가능** (B안 전환 비용 = designer 보강 task ≈ 30분, revert path 명시).
3. **Sprint 6 carry-over 4 (consumer-producer gap policy) = RESOLVED (D-S7-consumer-producer-gap-policy)** — 정량 정책 명문화 + 8 워커 spawn prompt 박힘. 본 sprint 안에서 옵션 (a) 첫 사례 = mobile T6 chatStore.ts:217 pruneEdges adapter 1줄 unwrap. 옵션 (b) 첫 사례 = conversation T7 emitError race wake.
4. **Sprint 6 carry-over 2 (mobile workspace deps) = RESOLVED (확장 흡수)** — `D-S7-tester-e2e-workspace-deps` 가 mobile + e2e 완전 흡수. `e2e/scenarios/package.json` workspace deps 6 종 + tsconfig.json + `pnpm --filter @synapse/e2e-scenarios typecheck` hook. Sprint 8+ 신규 패키지 추가 시 동일 패턴 강제.
5. **storage `FullJourneyFixture` UNION shape 단일 진실원** — 본 sprint T10 7 사이클 oscillation 끝에 UNION shape (`day7 + advancedNow` / `dismissedRecallLogId + dismiss.recallLogId` / `retractedMessageId + retraction.messageId` 양방향 노출) 영구 박힘. consumer (engine T8 / orchestrator T9 / e2e T11) 자유 access. Sprint 8+ fixture 시드 추가 시 UNION 패턴 표준 (named lookup + nested 동시 노출).
6. **conversation `send` + `sendStream` ts monotonic 보장 (D-S7-conversation-send-ts-monotonic)** — `ts1 = Math.max(Date.now(), ts0 + 1)` 박힘 (storage `listMessages ORDER BY ts ASC, id ASC` Sprint 6 frozen 과 정합). 100x 결정성. Sprint 8+ conversation 신규 메시지 append 시 동일 패턴 강제.
7. **테마 토글 UI 라벨 (디자인 목업 부재)** — mobile themeStore 시스템 자동 디폴트로 시작. 외부 사용자 테스트 후 토글 UI 가 필요해지면 *디자인 목업 갱신 후* `copy.theme.{light,dark,system}` 키 추가. Sprint 8+ 첫 결정 분기.
8. **4 화면 별 Empty/Error 카피 (디자인 목업 부재)** — 현재 `firstChat.{empty/emptySub/error/errorSub/retry}` 1 세트 재사용 + 컴포넌트 props 직접 주입. inspector/library 가 별도 카피를 원하면 디자인 목업 갱신 후 `copy.{inspector,library}.empty.*` 추가.
9. **Sprint 6 carry-over 6 (Concept dedup / alias merge) = 이월** — Sprint 7 본 범위 외. 외부 사용자 테스트 결과 우선순위 결정.
10. **Sprint 6 carry-over 5 (recall_log retention 30d 정책) = 이월** — DB 측 long-term retention. forgetting decay 가 edges 만, recall_log 는 dismiss 마킹만. Sprint 8+ DB 측 별도 cron / migration 필요.
11. **LLM 기반 부정 신호 분류 = 이월** — Sprint 6 §3 Out 그대로. latency + cost + 결정성 약화 사유로 보류.
12. **DecisionAct enum 4 원 + runMemoryFormation / runRecallHook / RecallFn / DecideFn / chatStore 기존 메서드 시그니처 + storage migration 0005 = 영구 동결** — Sprint 8+ 변경 금지 (변경 필요 시 명시 frozen + revert 비용 박음).
13. **platform-adapter 누적 8회** — Sprint 6 6회 + Sprint 7 (themeStore) 1회 + (chatStore 보강) 1회 = 8회. Sprint 8+ 신규 mobile store 작성 시 platform-adapter 표준 (carry-over 1 강제).
14. **stale directive 사례 5건 (designer 4 + storage 1) → 헌법 8 영구 박힘** — team-lead 가 consumer 사전 진단 보고를 producer 측 검증 없이 패스스루 시 redundant directive + 워커 측 작업 0 으로 무효 처리. Sprint 8+ 모든 directive 발송 직전 producer `tsc --noEmit` + `grep <symbol>` 1회 의무. 위반 패턴 발생 시 메모리 `feedback_team_lead_stale_directive.md` 박힘 (Sprint 8 /start 시 메모리 검증).

**Retrospective:**

- **잘 된 것:**
  - 14/14 task + 53/53 receipt PASS — 본 MVP 의 목표 (외부 데모 가능한 polish 단계) 완전 달성.
  - 헌법 5~8 (4종) 영구 박힘 — Sprint 5/6/7 누적 retrospective 가 8 워커 spawn prompt 0번 묶음 표준화로 흡수. Sprint 8+ 영구 자동 inject.
  - storage T10 UNION shape 7 사이클 oscillation → consumer 양쪽 표현 자유 access 패턴 확립. consumer 사전 진단 (헌법 5) 의 *시그니처 oscillation 흡수형* 진화.
  - conversation T7 race-flaky → tester 가 단독 owner 아님 인지 → conversation 워커 wake 위임 (헌법 #4 + 헌법 7 옵션 (b)) 모범 사례.
  - platform-adapter 8회차 (themeStore + chatStore 보강) — Sprint 6 carry-over 1 표준 자연 정착.
  - lint 3 종 (mockup-scope-parity / frozen-flag-audit / directive-tag-audit) + receipt fixture 7 신규 모두 자동 검증. PM 결정 박음 1회 (A안 채택) 외 PM 개입 최소화.
  - Sprint 6 carry-over 5 (Inspector unlink) + 4 (gap policy) + 2 (workspace deps) 3 종 동시 RESOLVED — carry-over 누적 부채 청산.

- **아팠던 것:**
  - team-lead stale directive 5건 발생 — designer 4 (motion / tokens / EmptyState / componentsMeta) + storage 1 (FullJourneyFixture shape 7 사이클 진동). 모두 producer 측 이미 적용 완료된 상태에서 redundant directive. → 헌법 8 영구 박힘으로 흡수.
  - storage T10 FullJourneyFixture shape 7 사이클 oscillation: ① original → ② REVISED named lookup → ③ result-alias → ④ UNION → ⑤ WITHDRAWN (storage 거부) → ⑥ named-aliases 재시도 (storage 거부) → ⑦ team-lead 잘못된 ACK ("원 shape final") → 최종 storage 정정 후 UNION 영구 박힘. team-lead 측 ACK 정확성 부족.
  - conversation T7 send race-flaky 가 tester `loop.test.ts` 50% intermittent 로 노출 — storage Sprint 6 [FROZEN D-S6-storage-listMessages-retracted] (`ORDER BY ts ASC, id ASC`) 와 send 의 user/assistant 동일-ms ts 가 결합한 *cross-package* race. 헌법 5 사전 진단으로도 못 잡음 (cross-package timing).
  - mobile T5 themeStore 가 D-S7-design-system-color-tokens-widen 강요 — designer T2 sub 결정 박음. literal type narrowing vs wider type alias 사이의 patch 비용 8줄.

- **다음에 다르게 할 것:**
  - **헌법 8 즉시 적용** — Sprint 8 의 모든 team-lead directive 발송 직전 producer `tsc --noEmit` + `grep` 의무화. inbox snapshot 신뢰 금지.
  - **storage 시드 fixture 의 shape 결정 = 작업 시작 전 PM 사인오프** — 7 사이클 oscillation 회피. Sprint 8+ 신규 fixture 시드 시 storage 워커가 *작업 시작 직후* shape draft 1회 + team-lead 가 다른 consumer 워커에게 사전 ping (헌법 5) → PM 사인오프 박음.
  - **cross-package timing race 사전 진단 강화** — Sprint 7 의 send/sendStream/listMessages race 가 헌법 5 사전 진단으로 안 잡힌 사례. Sprint 8+ consumer 가 producer §7 계약 gap 진단 시 *시간축 race* 도 항목 추가 (`tsc --noEmit` + `grep` 외 *동일-ms ts 충돌 가능 위치*).
  - **외부 사용자 데이터 수집** — Sprint 7 의 carry-over 7~11 (theme-toggle UI / 4 화면 카피 / Concept dedup / recall_log retention / LLM-based negation) 모두 *데이터 부재로 결정 보류*. Sprint 8 외부 dogfooding 인프라 + 데이터 수집 → 결정 박음.
  - **Sprint 8 의 Goal 자체가 "외부 사용자 dogfooding + 데이터 기반 결정 박음"** — Sprint 7 까지 PM 직접 dogfooding + fixture 시뮬레이션이 한계. 외부 테스터 모집 + 디자인 목업 갱신 + 보류 항목 청산이 본 sprint MVP 의 자연스러운 후속.
