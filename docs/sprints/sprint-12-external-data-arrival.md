# Sprint 12 — Meta Pivot (carry-over 본체화)

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`
>
> **branch=C 메타 sprint pivot 영구 확정 (2026-05-12)**: 외부 raw 세션 N=0 세 번째 연속 cycle (`docs/sprints/sprint-12-data/` 디렉토리 부재). PM `/start` 사인오프에서 "오케스트레이터 판단하에 agent view 진행" 명시 위임 → branch=A (외부 데이터 부재로 불가) / branch=B (no-op close, 워커 dispatch 0건 → PM "agent view 진행" 의도 부적합) 모두 부적합 → **branch=C 메타 sprint pivot** 결정. Sprint 11 retro *"다음에 다르게 할 것"* 1번 + carry-over 3 / 6 / 7 / 4번 4종 항목 영구 박힘 본체로 진행. Sprint 10/11 의 reincarnation 체인 (Sprint 10→11→12 = 3중 동일 raw text 체인) 본 sprint 에서 끊고 **Sprint 13 으로 외부 데이터 도착 시 reincarnation skeleton 이월** (Sprint 11 §1~§2 raw text 그대로 보존하여 Sprint 13 §1~§2 로 swap 예정).
>
> **식별자**: D-S12-* (branch=C 메타 sprint 운영 모드 정합).

## 1. Goal

Sprint 11 retrospective *"다음에 다르게 할 것"* 1번 항목 (`/end §5 마감 마크 직전 실측 강제 정책 영구 박힘`) + carry-over 3번 (`receipt 인프라 path swap 회귀 정책`) + carry-over 6번 (`web 빌드 데모 모드 마이크로 카피`) + carry-over 7번 (`dist 정적 export SPA fallback 인프라 문서`) 4종 항목을 **메타 sprint 본체** 로 영구 박힘. 외부 raw 세션 N=0 세 번째 연속 cycle 에서 PM 위임 (`/start` 사인오프 = "오케스트레이터 판단하에 agent view 진행") 으로 오케스트레이터 판단 결정. 시간축 분리 패턴 **다섯 번째 정합 사례** — Sprint 10/11 의 reincarnation 체인 (no-op close → no-op close) 을 끊고 메타 sprint 로 pivot (branch=C). 외부 데이터 도착 시 Sprint 13 으로 reincarnation 이월 (기존 Sprint 11 §1~§2 raw text 그대로 swap).

## 2. Deliverable & Receipt

**Deliverable:**

- **/end §5 receipt 검증 절차 라이브 모드 본문 갱신** — `.claude/commands/end.md` §5 (Receipt 검증) 본문에 "마감 마크 작성 직전 receipt 실측 강제 + 결과 (pass / partial / fail) 를 Implementation Map 또는 Open Issues 에 그대로 raw text 기록 의무" 정책 영구 박힘. Sprint 9~10 마감 stale 마크 ("Sprint 9 receipt 65/65 PASS" 4 단계 실제 fail) 두 번째 재발 차단. team-leader 단독 영역.
- **/end 마감 직전 receipt/lint 자산 path swap 회귀 정책 영구 박힘** — `.claude/commands/end.md` §4 또는 §5 보강 단계 신규: c460712 류 구조 변경 commit (워커 정의 path 또는 receipt/lint 자산 path swap) 발생 시 `grep -rn "\.claude/commands" scripts/` 자동 검증 의무 명시 — receipt/lint 자산이 stale path 참조하지 않는지 grep 1회. team-leader 단독 영역.
- **dev-infra 문서 신규** (`docs/dev-infra.md`) — `pnpm --filter mobile build` (export) + `npx serve -s apps/mobile/dist -l 3000` (SPA fallback `-s` 의무) + Ollama CORS (`OLLAMA_ORIGINS="http://localhost:3000" ollama serve`) 표준 명시. Sprint 10 사용자 시연 first 발견 carry-over 7 영구 박힘. team-leader 단독 영역.
- **디자인 목업 + design-system `copy.firstChat.empty.demoHint` 신규 카피 키** — 디자인 목업 `content.jsx` 갱신 + `packages/design-system/src/copy.ts` 의 `copy.ko.firstChat.empty.demoHint` / `copy.en.firstChat.empty.demoHint` 키 추가 ("데모 모드 — Gemma 미연결" 류 마이크로 카피) + verify-copy 임계 상향 (Sprint 7 기준 ok=23 → ok=24). Sprint 10 사용자 시연 first 발견 carry-over 6 영구 박힘. designer 영역 (Tier 1).
- **mobile web 빌드 데모 모드 마이크로 카피 mount** — `apps/mobile/src/firstChat.tsx` (또는 web-only 분기) 의 EmptyState 카피에 `copy.firstChat.empty.demoHint` 표시. native iOS/Android 빌드는 `chatStore.ts` 활성이므로 demoHint 슬롯 미표시 (Platform.OS === 'web' 분기). mobile 영역 (Tier 3).
- **`scripts/receipt/sprint-12.sh` 신규** — Sprint 9 65 단계 wrap + 신규 4 단계 메타:
  1. **/end 라이브 모드 §5 마감 마크 직전 실측 강제 정책 박힘** — `.claude/commands/end.md` §5 raw text "마감 마크 작성 직전 receipt 실측 강제" 표현 검사.
  2. **/end 마감 직전 receipt/lint 자산 grep 검증 정책 박힘** — `.claude/commands/end.md` raw text "grep -rn \"\\.claude/commands\" scripts/" 표현 검사.
  3. **`docs/dev-infra.md` SPA fallback + Ollama CORS 표준 명시 박힘** — `docs/dev-infra.md` raw text "serve -s" + "OLLAMA_ORIGINS" 표현 검사.
  4. **web 빌드 데모 모드 마이크로 카피 mount 박힘** — 디자인 목업 `content.jsx` + `copy.ts` + mobile `firstChat.tsx` 의 demoHint 라인 + verify-copy ok=24 raw text 검사.
- **헌법 9~12 영구 보존 회귀** — Sprint 9~11 시점 8 워커 정의 line 9~12 raw text 그대로 보존 (workers_with_constitution=8 회귀 PASS).
- **모노레포 437 PASS 회귀 무결** — protocol 22 + llm 6 + engine 103 + storage 85 + design-system 107 (또는 +1 신규 copy 키 추가로 108) + orchestrator 59 + conversation 52 + e2e 3.

**Receipt (자동 검증 가능한 형태):**

- `bash scripts/receipt/sprint-12.sh` exit 0 + "✅ Sprint 12 receipt PASSED"
- Sprint 9 65 단계 wrap (`SKIP_OLLAMA / SKIP_SPRINT1_E2E` 호환) — D-S11-receipt-infra-hotfix 후 65/65 PASS 안정.
- 신규 4 단계 (위 §2 Deliverable 의 4종 fixture 일대일 검증).
- frozen-flag-audit lint exit 0 (Sprint 12 dev doc 대상).
- mockup-scope-parity lint exit 0 (Sprint 12 dev doc 대상).
- 임계 보강 (D-S12-receipt-threshold-recovery 정합) — Sprint 9 의 65단계 위에 신규 `end_mark_live_measure_pass=1` + `receipt_infra_path_swap_policy_pass=1` + `dev_infra_doc_pass=1` + `web_demo_banner_pass=1` + `verify_copy_ok ≥ 24` + `pakda_term_count = 0` 보존.

## 3. Scope

> **운영 모드: branch=B no-op close 세 번째 cycle (X4 swap)** — `/start` 진행 중 Agent View worktree base = sprint-5 (15f8228) fix point **시스템 결함** 발견 (designer Tier 1 3회 연속 dispatch 모두 무력화). PM 사인오프 X1 (`/.gitignore` 수정 + 영속화 commit f5fa65c) 시도 후에도 Agent View 캐시 메커니즘이 main HEAD 를 따르지 않아 실패. PM 사인오프 X4 결정 = no-op close 세 번째 cycle (Sprint 10/11 패턴 이어받음, **시간축 분리 패턴 다섯 번째 정합 사례 영구 확정**). 메타 sprint pivot (D-S12-branch-c-meta-pivot) 은 `/start` 사인오프 단계 결정이었으나 시스템 결함으로 워커 dispatch 0건 → X4 swap 으로 운영 모드 재확정.
>
> 단, **team-leader 메타 영역 (T1+T2+T3) 은 commit `f5fa65c` 로 영속화 성공** — `.claude/commands/end.md` §5 의 D-S12-end-mark-live-measure + D-S12-receipt-infra-path-swap-policy 두 정책 + `docs/dev-infra.md` 모두 git history 진입. 즉 메타 sprint 본체의 *50%* 는 영속화 완료 (designer 워커 슬라이스만 미수행 → Sprint 13 이월).

**In:**

- **`.claude/commands/end.md` §5 (Receipt 검증) 라이브 모드 본문 갱신** — "마감 마크 작성 직전 receipt 실측 강제 + 결과 raw text 기록 의무" 정책 박힘. team-leader.
- **`.claude/commands/end.md` §4 또는 §5 보강 단계 신규** — c460712 류 구조 변경 commit 발생 시 `grep -rn "\.claude/commands" scripts/` 자동 검증 의무. team-leader.
- **`docs/dev-infra.md` 신규** — `pnpm --filter mobile build` + `npx serve -s apps/mobile/dist -l 3000` + Ollama CORS 표준 명시. team-leader.
- **디자인 목업 `content.jsx` + design-system `copy.ts` `copy.firstChat.empty.demoHint` 신규 카피 키 + verify-copy 임계 상향** (ok=23 → ok=24). designer (Tier 1).
- **mobile `firstChat.tsx` web 분기 demoHint 마운트** — `Platform.OS === 'web'` 일 때만 표시. mobile (Tier 3).
- **`scripts/receipt/sprint-12.sh` + 신규 receipt-runner fixture 4종** — sprint-12-end-mark-live-measure.mjs / sprint-12-receipt-infra-path-swap.mjs / sprint-12-dev-infra-doc.mjs / sprint-12-web-demo-banner.mjs. tester (Tier 3).
- **회귀 검증 영속화** — Sprint 9 receipt 65/65 PASS + 모노레포 437 PASS (또는 +1 신규 copy 키 테스트로 438).
- **dev doc 마감 영속화** — §10 Implementation Map + §11 frozen 4종 + §12 carry-over + retrospective. /end 작성.
- **Sprint 13 skeleton 생성** — `docs/sprints/sprint-13-external-data-arrival.md` (Sprint 11 §1~§2 raw text 그대로 복제 = reincarnation 세 번째, 외부 데이터 도착 trigger 대기). /end 작성.

**Out:**

- **designer Tier 1 슬라이스 본체** (`copy.{ko,en}.firstChat.empty.demoHint` + verify-copy 임계 ≥ 24) — Sprint 13 이월. Agent View 시스템 결함 해소 또는 X2 (manual worktree) / X3 (isolation 미사용) 패턴 강제 필요.
- **mobile Tier 3 슬라이스** (firstChat.tsx web 분기 demoHint mount) + **tester Tier 3 슬라이스** (sprint-12.sh + fixture 4종) — Sprint 13 이월 (designer 머지 후 진행 가능).
- **외부 데이터 N≥3 수집 / 6 분기 활성 경로 본체 작성** — Sprint 13 (외부 데이터 도착 시) 이월. Sprint 11 §1~§2 raw text 그대로 보존 (reincarnation skeleton).
- **D-S9-* 6 frozen 재갱신 0건** — 5종 보류 + 1종 A안 reconfirm 그대로 보존. Sprint 13 trigger inline 그대로.
- **DecisionAct enum 4원 + runMemoryFormation / runRecallHook / RecallFn / DecideFn / chatStore 기존 메서드 시그니처 + storage migration 0001~0006 + protocol DecisionLogAction union 9종 + 헌법 1~12 = 영구 동결** 그대로.
- **engine / conversation / orchestrator / storage / protocol / llm 코드 변경 0건** — Sprint 9 그대로 보존. dormant code (`dedupConcepts.ts` 175줄 + 17/17 단위 테스트) 그대로.
- **신규 화면 / 신규 패키지 / e2e 시나리오 신규 추가** — 7 패키지 + 9 화면 그대로. e2e/scenarios/ 변경 0건.
- **`docs/sprints/sprint-12-data/` 디렉토리 미생성** — 외부 데이터 부재 (Sprint 13 reincarnation 이월). raw 세션 0건.
- **다른 워커 (storage / engine / conversation / orchestrator / llm) dispatch 0건**.

## 4. Architecture & Data Flow

```
[ team-leader 영역 (메타) ]
  .claude/commands/end.md §5 (라이브 모드 본문 갱신)
      ├── "마감 마크 작성 직전 receipt 실측 강제" raw text 박힘
      └── "grep -rn \".claude/commands\" scripts/" raw text 박힘
  docs/dev-infra.md (신규)
      ├── pnpm --filter mobile build
      ├── npx serve -s apps/mobile/dist -l 3000 (SPA fallback `-s` 의무)
      └── OLLAMA_ORIGINS="http://localhost:3000" ollama serve

[ designer (Tier 1, producer) ]
  디자인 목업/content.jsx
      └── COPY.{ko,en}.demoHint 신규 (또는 firstChat.empty 분기)
  packages/design-system/src/copy.ts
      └── copy.{ko,en}.firstChat.empty.demoHint 신규 키
  verify-copy 임계 상향 (ok=23 → ok=24)
              │
              ▼
[ mobile (Tier 3, consumer) ]
  apps/mobile/src/firstChat.tsx (또는 EmptyState 컴포넌트 wrap)
      └── Platform.OS === 'web' 일 때만 copy.firstChat.empty.demoHint 마운트
      (native iOS/Android: chatStore.ts 활성 → 실 Gemma + SQLite → demoHint 미표시)

[ tester (Tier 3, 회귀 검증) ]
  scripts/receipt/sprint-12.sh (신규)
      └── Sprint 9 65 단계 wrap + 신규 4 단계
  scripts/receipt/.receipt-runner/sprint-12-end-mark-live-measure.mjs
  scripts/receipt/.receipt-runner/sprint-12-receipt-infra-path-swap.mjs
  scripts/receipt/.receipt-runner/sprint-12-dev-infra-doc.mjs
  scripts/receipt/.receipt-runner/sprint-12-web-demo-banner.mjs
```

워커 간 직접 통신 없음 — designer 의 Tier 1 머지 완료 후 mobile + tester 의 Tier 3 worktree 가 갱신된 main 위에서 새로 생성. 헌법 5 (Consumer 사전 진단) / 헌법 6 (Root index grep) 의 기준점 = Tier 1 머지 직후 main.

## 5. File Ownership

| Agent | Tier | Files |
|---|---|---|
| team-leader | - (메타 영역) | `.claude/commands/end.md` (§5 본문 갱신 + §4 또는 §5 보강 단계) · `docs/dev-infra.md` (신규) · `docs/sprints/sprint-12-external-data-arrival.md` (dev doc 단독) · `SPRINTS.md` · `docs/sprints/_current.txt` |
| designer | 1 | `디자인 목업/content.jsx` (COPY 갱신) · `packages/design-system/src/copy.ts` (`copy.{ko,en}.firstChat.empty.demoHint` 신규 키) · `packages/design-system/.receipt-runner/verify-copy.mjs` 임계 상향 (선택, 또는 sprint-7.sh 임계 갱신) |
| mobile | 3 | `apps/mobile/src/firstChat.tsx` (또는 EmptyState 마운트 위치) · `apps/mobile/__tests__/firstChat-web-demo-hint.test.tsx` (선택) |
| tester | 3 | `scripts/receipt/sprint-12.sh` (신규) · `scripts/receipt/.receipt-runner/sprint-12-end-mark-live-measure.mjs` (신규) · `scripts/receipt/.receipt-runner/sprint-12-receipt-infra-path-swap.mjs` (신규) · `scripts/receipt/.receipt-runner/sprint-12-dev-infra-doc.mjs` (신규) · `scripts/receipt/.receipt-runner/sprint-12-web-demo-banner.mjs` (신규) |

> **Tier 정의** (Sprint 11+, Agent View 단계별 dispatch 용):
> - **Tier 1 (producer-only)**: 다른 워커가 의존하는 영향력 있는 변경 — protocol 타입, storage 마이그레이션, design tokens breaking change. 동시 dispatch OK (서로 충돌 안 함).
> - **Tier 2 (의존 + 자체 export)**: Tier 1 결과를 import 하면서 자기도 새 export 제공 — engine / conversation / orchestrator 의 일반 슬라이스. *본 Sprint 12 에서는 Tier 2 워커 dispatch 0건.*
> - **Tier 3 (소비자만)**: 모든 producer 결과를 consume — mobile UI, tester e2e.
>
> `/start` 가 Tier 1 dispatch → 모두 Completed → main squash merge → (Tier 2 skip) → Tier 3 dispatch 순으로 진행. 헌법 5 / 헌법 6 의 grep 기준점이 자동으로 최신 main 보장. team-leader 의 메타 영역 작업은 워커 dispatch 와 병렬 (`.claude/commands/end.md` + `docs/dev-infra.md` 는 designer / mobile / tester worktree 와 충돌 없음).

## 5.5 Worker Slices

<!-- 워커 슬라이스 본문. /start 가 sed 로 추출해 dispatch prompt 에 결정적 주입.
     워커가 dispatch 대상이 아니면 해당 slice 블록 통째 생략.
     본 Sprint 12 = designer (Tier 1) + mobile (Tier 3) + tester (Tier 3) 3 워커.
     storage / engine / conversation / orchestrator / llm slice 블록 통째 생략 (dispatch 대상 아님). -->

<!-- slice-begin: designer -->
**Tier**: 1
**Slice**: 디자인 목업 `content.jsx` 갱신 + design-system `copy.{ko,en}.firstChat.empty.demoHint` 신규 카피 키 + verify-copy 임계 상향 (Sprint 10/11 carry-over 6 영구 박힘, web 빌드 데모 모드 마이크로 카피).
**Completion**:
1. `디자인 목업/content.jsx` 의 `COPY.ko` / `COPY.en` 트리에 `demoHint` (또는 `firstChat.empty.demoHint` 분기) 키 추가. 본문 = ko: "데모 모드 — Gemma 미연결" / en: "demo mode — Gemma not connected" 또는 동등 표현 (디자인 톤 정합).
2. `packages/design-system/src/copy.ts` 의 `copy.ko.firstChat.empty.demoHint` / `copy.en.firstChat.empty.demoHint` 키 추가 (디자인 목업 1:1 매핑).
3. `pnpm --filter design-system test` 통과 (ko/en parity 회귀).
4. `node --experimental-strip-types packages/design-system/.receipt-runner/verify-copy.mjs` 출력 `ok=24` 이상 (Sprint 7 ok=23 기준 +1).
**Dependencies**: none (Tier 1 producer-only).
**Detail**:
- 단일 진실원 = `디자인 목업/content.jsx` (헌법 1). 디자인 목업 우선 갱신 후 `copy.ts` 가 1:1 따라감.
- demoHint 는 `firstChat.empty` 분기 안에 두는 것이 자연스러움 (`copy.ko.firstChat.empty = { title, subtitle, ... }` 구조에 `demoHint` 필드 추가). 단, 디자인 목업이 다른 구조 (예: `recall.demo`) 라면 목업 편 (헌법 1 [[feedback_mockup_truth]]).
- verify-copy.mjs 출력 `ok=N` 만 본다. Sprint 7 기준 ok=23 → demoHint ko+en 추가 = ok=25 가능. Sprint 12 Receipt 임계 = ok ≥ 24 (보수적, [[feedback_receipt_threshold]] 정합).
- Sprint 7 의 `scripts/receipt/sprint-7.sh` step [49/53] verify-copy 임계 (≥ 17) 는 그대로 보존 (회귀 wrap 정합). Sprint 12 신규 step 만 ≥ 24 검사.
- copy 키 변경 = breaking-producer 가능 — mobile 의 EmptyState 컴포넌트가 기존 `copy.ko.firstChat.empty.title` / `subtitle` 등 사용 중인 경우 `demoHint` 는 *추가* only (제거 / rename 금지). 헌법 5 (Consumer 사전 진단) 정합.
<!-- slice-end: designer -->

<!-- slice-begin: mobile -->
**Tier**: 3
**Slice**: `apps/mobile/src/firstChat.tsx` (또는 EmptyState 마운트 위치) 의 web 분기 데모 모드 마이크로 카피 마운트. `Platform.OS === 'web'` 일 때만 `copy.firstChat.empty.demoHint` 표시 (native iOS/Android = `chatStore.ts` 활성, 실 Gemma + SQLite → demoHint 미표시).
**Completion**:
1. `apps/mobile/src/firstChat.tsx` (또는 EmptyState wrap 위치) 에 `Platform.OS === 'web'` 분기 추가. 분기 안에 `copy[lang].firstChat.empty.demoHint` 텍스트 표시.
2. native 빌드 (iOS / Android) 영향 0 — `Platform.OS === 'ios'` / `'android'` 분기는 demoHint 슬롯 미표시.
3. 단위 테스트 신규 1건 (선택): `apps/mobile/__tests__/firstChat-web-demo-hint.test.tsx` — `Platform.OS = 'web'` 모킹 + demoHint 텍스트 렌더 검증.
4. `pnpm --filter mobile build` 통과 (web 번들 변동 ±5KB 이내).
**Dependencies**: Tier 1 designer (copy.ts 의 `copy.firstChat.empty.demoHint` 키 추가 완료) 머지 main.
**Detail**:
- web 분기 = `chatStore.web.ts` 의 `DEMO_REPLY_KO` 5토큰 cycle 가 활성 (Sprint 1 D-S1-* 의도된 동작, better-sqlite3 native-only 우회). 사용자 첫 진입 시 LLM 응답으로 오해될 수 있다는 사용자 시연 first 신호 (Sprint 10 carry-over 6).
- `Platform.OS === 'web'` 분기는 React Native 의 `Platform` 모듈 활용 (이미 사용 중인 import 패턴 회귀).
- demoHint 마이크로 카피는 EmptyState 카피 영역 (firstChat 화면이 처음 열렸을 때 메시지가 0개일 때 표시되는 영역) 안에 sub-line 으로 표시. 별도 토스트 / 모달 / 별도 화면 추가 금지 (디자인 목업 9 화면 그대로 보존, 헌법 1 정합).
- `chatStore.web.ts` 자체 코드 변경 0건 — DEMO_REPLY_KO 5토큰 cycle 그대로 보존 (Sprint 1 D-S1-* 영구 동결 정합). web 분기 표면 인식만 보강.
- 헌법 6 (Root index grep) 사전 검증: `apps/mobile/src/firstChat.tsx` 가 `copy` 를 import 하는 경로 grep — `import { copy } from '@synapse/design-system'` 또는 동등 패턴 확인. 머지된 Tier 1 main 위에서 `copy.firstChat.empty.demoHint` 가 root index export 에 포함되었는지 grep 1회.
- 보고 직전 grep 1회 의무 ([[feedback_root_index_grep]]) — `grep -n "firstChat\.empty\.demoHint" packages/design-system/index.ts packages/design-system/src/index.ts` (어느 한 쪽 또는 양쪽 .ts 의 export 트리에 노출 확인).
<!-- slice-end: mobile -->

<!-- slice-begin: tester -->
**Tier**: 3
**Slice**: `scripts/receipt/sprint-12.sh` 신규 + 신규 receipt-runner fixture 4종 (end-mark-live-measure / receipt-infra-path-swap / dev-infra-doc / web-demo-banner) + Sprint 9 65 단계 wrap.
**Completion**:
1. `scripts/receipt/sprint-12.sh` exit 0 + "✅ Sprint 12 receipt PASSED" 표시.
2. Sprint 9 65 단계 그대로 wrap (`SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-9.sh` 호출). D-S11-receipt-infra-hotfix 후 65/65 PASS 안정 정합.
3. 신규 4 fixture 단계 PASS:
   - `[66/69] end-mark-live-measure` — `.claude/commands/end.md` §5 raw text 안에 "마감 마크 작성 직전 receipt 실측 강제" (또는 의미적 동등 표현) 토큰 검사.
   - `[67/69] receipt-infra-path-swap` — `.claude/commands/end.md` raw text 안에 `grep -rn "\.claude/commands" scripts/` (또는 동등 표현) 토큰 검사.
   - `[68/69] dev-infra-doc` — `docs/dev-infra.md` raw text 안에 `serve -s` + `OLLAMA_ORIGINS` 두 토큰 검사.
   - `[69/69] web-demo-banner` — 디자인 목업 `content.jsx` + `packages/design-system/src/copy.ts` + `apps/mobile/src/firstChat.tsx` 3 파일 모두에서 `demoHint` (또는 동등 키) 라인 검사 + verify-copy ok ≥ 24.
4. `pnpm -r test` 통과 (437 PASS 이상, 신규 mobile demo-hint 단위 테스트 1건 합산 시 438).
5. frozen-flag-audit lint + mockup-scope-parity lint exit 0 (Sprint 12 dev doc 대상).
**Dependencies**: team-leader (`.claude/commands/end.md` 갱신 + `docs/dev-infra.md` 신규) + Tier 1 designer (copy 키) + mobile (firstChat.tsx mount) 머지 완료.
**Detail**:
- receipt-runner fixture 4종 = `.receipt-runner/` 디렉토리에 `.mjs` 신규 (Sprint 9 의 sprint9-pakda-term-zero.mjs / sprint9-spawn-prompt-update.mjs 패턴 회귀). raw text fs 매칭 ([[feedback_receipt_external_contract]] 정합 — root index 경로로 import).
- fixture 의 토큰 boundary 정책 = Sprint 9 carry-over 5 + Sprint 10 carry-over 3 + Sprint 11 carry-over 5 의 "정책 자체 라인 패턴 컨텍스트 인식 제외 의무" 6번째 룰 후보 적용 — fixture 자체 라인 또는 메타 인용 영역 (예: 본 dev doc 의 §2 Deliverable / §3 Scope / fixture 자기 자신) 은 검사 대상에서 제외.
- 헌법 9 (외부 데이터 독립성 1차 분류): 본 fixture 4종 모두 외부 데이터 (`docs/sprints/sprint-12-data/`) 미참조 — 외부 데이터 N=0 정합.
- 헌법 10 (dormant code valid 4 조건): 본 sprint 신규 fixture 4종 모두 즉시 활성화 (dormant 아님). `dedupConcepts.ts` 175줄 dormant 는 Sprint 13+ 이월 정합.
- 헌법 11 (directive 진단 mismatch 보고): team-leader directive 가 stale 한 경우 즉시 재진단 + 정신만 적용 + stale 명시 보고 ([[feedback_team_lead_stale_directive]]).
- 헌법 12 ("박다" 0건 강제, [[feedback_no_pakda_term]]): 본 fixture 4종 생성 raw text 의 신규 작성 영역 모두 "박다" 동사 활용형 0건. fixture *자체가 검사하는* 영역은 메타 인용 제외 (헌법 12 [[feedback_no_pakda_term]] 의 메타 인용 + 정책 정의 + 검증 토큰 + 대체어 매핑 4종 제외 영역 컨텍스트 인식 정합).
- Sprint 7 `scripts/receipt/sprint-7.sh` step [49/53] verify-copy 임계 (≥ 17) 는 그대로 보존. Sprint 12 신규 step [69/69] 만 ok ≥ 24 검사 (이중 검증 정합).
- 보고 직전 grep 1회 의무 ([[feedback_root_index_grep]]) — receipt 자산이 stale path 참조 안 하는지 `grep -rn "\.claude/commands" scripts/receipt/ scripts/lint/` 자체 실행 + 결과 0건 확인.
- `[FROZEN v2026-05-12 D-S12-receipt-threshold-recovery]` 정합 ([[feedback_receipt_threshold]]) — 신규 4 fixture 모두 토큰 ≥ 1 보수적 임계.
<!-- slice-end: tester -->

## 6. Tasks

| ID | Description | Owner | Tier | Blocked By |
|---|---|---|---|---|
| T1 | `.claude/commands/end.md` §5 (Receipt 검증) 라이브 모드 본문 갱신 — "마감 마크 작성 직전 receipt 실측 강제 + 결과 raw text 기록 의무" 정책 박힘 | team-leader | - (메타) | - |
| T2 | `.claude/commands/end.md` §4 또는 §5 보강 단계 신규 — c460712 류 구조 변경 commit 발생 시 `grep -rn "\.claude/commands" scripts/` 자동 검증 의무 명시 | team-leader | - (메타) | - |
| T3 | `docs/dev-infra.md` 신규 — `pnpm --filter mobile build` + `npx serve -s apps/mobile/dist -l 3000` + `OLLAMA_ORIGINS="http://localhost:3000" ollama serve` 표준 명시 | team-leader | - (메타) | - |
| T4 | 디자인 목업 `content.jsx` 갱신 + `copy.{ko,en}.firstChat.empty.demoHint` 신규 카피 키 + verify-copy 임계 상향 (ok ≥ 24) | designer | 1 | - |
| T5 | mobile `firstChat.tsx` web 분기 demoHint 마운트 + (선택) 단위 테스트 1건 | mobile | 3 | T4 (designer 머지) |
| T6 | `scripts/receipt/sprint-12.sh` + 신규 receipt-runner fixture 4종 + Sprint 9 65 단계 wrap | tester | 3 | T1, T2, T3, T4, T5 |

## 7. Interfaces / Contracts

- `copy.{ko,en}.firstChat.empty.demoHint: string` — design-system root index export. mobile 의 firstChat.tsx 가 import. 신규 키 (Sprint 12 designer T4).
- `.claude/commands/end.md` §5 raw text 의 "마감 마크 작성 직전 receipt 실측 강제" 토큰 — receipt fixture sprint-12-end-mark-live-measure.mjs 가 검사. team-leader 메타.
- `.claude/commands/end.md` raw text 의 `grep -rn "\.claude/commands" scripts/` 토큰 — receipt fixture sprint-12-receipt-infra-path-swap.mjs 가 검사. team-leader 메타.
- `docs/dev-infra.md` raw text 의 `serve -s` + `OLLAMA_ORIGINS` 두 토큰 — receipt fixture sprint-12-dev-infra-doc.mjs 가 검사. team-leader 메타.

## 8. Test Scenarios

- **시나리오 1 — web 빌드 데모 모드 마이크로 카피 시연**: `pnpm --filter mobile build` + `npx serve -s apps/mobile/dist -l 3000` 진입 후 onboarding → firstChat 첫 화면 EmptyState 에서 "데모 모드 — Gemma 미연결" 마이크로 카피 가시. native iOS/Android 빌드 진입 시 demoHint 미표시 (Platform.OS 분기 정합).
- **시나리오 2 — /end 마감 마크 직전 실측 정책 박힘 검증**: Sprint 13 (또는 다음 sprint) /end 가 receipt 실측 없이 stale 마크 작성 시도 시, 헌법 본문이 막음. team-leader 페르소나 self-check.
- **시나리오 3 — receipt 인프라 path swap 회귀 검증**: c460712 류 구조 변경 commit 발생 시뮬레이션 (예: `.claude/agents/` → 다른 path swap) → /end §4 또는 §5 보강 단계가 `grep -rn "\.claude/commands" scripts/` 실행 → stale path 참조 발견 시 즉시 정정 의무.

## 9. Demo Script

```bash
# 1. Sprint 9 회귀 wrap
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-9.sh
# 기대: 65/65 PASS

# 2. Sprint 12 신규 4 단계
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-12.sh
# 기대: 69/69 PASS + "✅ Sprint 12 receipt PASSED"

# 3. 모노레포 회귀
pnpm -r test
# 기대: 437 PASS (또는 +1 신규 mobile 단위 테스트로 438)

# 4. web 빌드 + SPA fallback 시연 (선택, 사용자 검증용)
pnpm --filter mobile build
OLLAMA_ORIGINS="http://localhost:3000" ollama serve &
npx serve -s apps/mobile/dist -l 3000
# 브라우저 http://localhost:3000 진입 → onboarding → firstChat → demoHint 카피 가시
```

## 10. Implementation Map

### team-leader 메타 영역 (영속화 성공)

- **`f5fa65c chore(sprint-12): persist dev docs + agent/command definitions (X1 fix)`** — `.gitignore` 수정 + 33 파일 영속화 commit. PM 사인오프 X1 정합.
  - `.gitignore` 변경: `.claude/*` + `!.claude/agents/` + `!.claude/commands/` + `docs/sprints/sprint-*-data/` only ignore. 기존 광범위 ignore (`.claude/`, `CLAUDE.md`, `SPRINTS.md`, `docs/sprints/`) 4 라인 제거.
  - 33 파일 add: sprint-0~12 dev doc 13개 + `_template.md` + `_templates/report.md` + `_current.txt` + `.claude/agents/{conversation,designer,engine,mobile,orchestrator,storage,team-leader,tester}.md` 8개 + `.claude/commands/{start,end}.md` 2개 + `CLAUDE.md` + `SPRINTS.md` + `docs/dev-infra.md` + `docs/sprints/sprint-12/reports/.gitkeep`.
  - 효과: sprint dev doc / 워커 정의 영속성 회복 (이전엔 모든 sprint dev doc 이 git history 에 한 번도 commit 안 됨). CLAUDE.md "단일 진실원" 원칙 강화 (clone 후 재현 가능).
  - 미해소: Agent View worktree base 결정 메커니즘은 commit 영속화로 갱신 안 됨 — cmux 외부 fix point.

- **`.claude/commands/end.md` §5 (Receipt 검증) 라이브 모드 본문 갱신** — D-S12-end-mark-live-measure + D-S12-receipt-infra-path-swap-policy 두 정책 영구 박힘 (이전 세션 작성, X1 commit 으로 git 진입). T1+T2 합산.
  - "마감 마크 작성 직전 receipt 실측 강제" raw text 박힘.
  - "grep -rn \"\\.claude/commands\" scripts/" raw text 박힘.

- **`docs/dev-infra.md` 신규** — D-S12-dev-infra-readme. `serve -s` (SPA fallback) + `OLLAMA_ORIGINS="http://localhost:3000" ollama serve` (web 빌드 CORS) 표준 명시. T3 정합.

### designer Tier 1 (3회 dispatch 시도, 모두 base mismatch 무력화)

- **1차 (이전 세션 잔재)** — worktree `agent-ade4a67b811381928`, commit `fac4733`. base = `15f8228 sprint-5` (main `a966699` 보다 6 commit stale). verify-copy worktree 14 vs main 23 mismatch. /start 진입 시 발견 → PM 사인오프 B1 옵션 (worktree 폐기 + 재dispatch).
- **2차 (Agent tool 재dispatch)** — worktree `agent-a9530acee5ccf15d0`, commit `0678594`. base 동일 (`15f8228`). designer 가 §0.5 검증 의무 따라 즉시 작업 중단 + 리포트 작성 후 종료. PM 사인오프 X1 옵션.
- **3차 (X1 영속화 commit `f5fa65c` 후 재dispatch)** — worktree `agent-a487f0f102d55da90`. base **여전히 `15f8228`** (X1 commit 으로도 갱신 안 됨). designer 가 §0.5 검증 + verify-copy 실측 (`ok=13`) 으로 mismatch 정량 확정 후 종료. PM 사인오프 X4 결정 트리거.

### Receipt 실측 (D-S12-end-mark-live-measure 정합, /end 마감 마크 직전 실측 강제)

- **Sprint 9 receipt 65/65 PASS** — `SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-9.sh` exit 0 + `✅ Sprint 9 receipt PASSED`. 핵심 게이트: spawn_prompt_update_pass=1 / workers_with_constitution=8 / pakda_term_zero_pass=1 / pakda_term_count=0 / decisions_re_frozen_pass=1 / frozen_decisions_updated=5 / sprint10_trigger_marks=5 / inspector_unlink_reconfirm_pass=1 / reject_layer_marks=2 / sprint10_b_marks=1 / sprint_8_wrap_pass=1 / sprint_8_fixtures=7. Sprint 11 D-S11-receipt-infra-hotfix 후 안정 유지.
- **모노레포 `pnpm -r test` PASS** — protocol 22 + llm 6 + engine 103 + storage 85 + design-system 107 + orchestrator 59 + conversation 52 + e2e 3 = **437 PASS** (Sprint 11 close 시점과 동일, 코드 변경 0건 정합). mobile = skip (정책).
- **`scripts/receipt/sprint-12.sh` 미존재** — D-S12-receipt-script-deferred 정합 (no-op close 정합으로 sprint 작업 본체 0건 → receipt 자체 무의미, Sprint 13 활성 경로 이월).
- **frozen-flag-audit lint exit 0** — sprint-12 dev doc §11 의 PM 사인오프 결정 모두 `**[FROZEN v<date> <id>]**` 부착 정합.
- **mockup-scope-parity lint exit 0** — sprint-12 dev doc 대상.
- **path swap grep (`grep -rn "\.claude/commands" scripts/`)** — hit 다수 발견하지만 모두 메타 인용 또는 정합 라인 (`scripts/receipt/sprint-2.sh:39` 의 `.claude/agents + .claude/commands` 결합 10 파일 검증, Sprint 11 D-S11-receipt-infra-hotfix 정합 / `directive-tag-audit.ts:6` Sprint 11 hotfix 코멘트 / `sprint-9.sh:7` 헤더 코멘트 / `sprint-3.sh`, `sprint-4.sh` 의 `directive-tag-audit — .claude/commands/*.md` 라벨 = 정합 검사 대상). 무시 가능.

### 코드 영역 변경 0 (no-op close 세 번째 cycle 정합)

- `packages/storage/`, `packages/engine/`, `packages/conversation/`, `packages/orchestrator/`, `packages/design-system/`, `packages/protocol/`, `packages/llm/` — Sprint 9 그대로 보존. `dedupConcepts.ts` 175줄 + 17/17 단위 테스트 + root export = dormant 그대로.
- `apps/mobile/` — Sprint 9 그대로 보존. `firstChat.tsx` web 분기 demoHint mount 미작업 (Sprint 13 이월).
- `e2e/scenarios/` — 변경 0건.
- `scripts/receipt/sprint-12.sh` 미작성 + `scripts/receipt/.receipt-runner/sprint-12-*.mjs` fixture 4종 미작성 (D-S12-receipt-script-deferred 정합).

### Sprint 13 skeleton (생성)

- `docs/sprints/sprint-13-external-data-arrival.md` — `_template.md` 복사 + Sprint 11/12 §1~§2 raw text 그대로 복제 (**세 번째 reincarnation, 4중 동일 raw text 체인**). Sprint 13 §1~§2 trigger = raw 세션 N≥3 도착. 다음 `/start` PM 사인오프 후 §3 Scope 확정.

## 11. Decisions Made / Open Issues

**Decisions Made:**

- **[FROZEN v2026-05-12 D-S12-branch-c-meta-pivot]** Sprint 12 `/start` 사인오프 단계 운영 모드 = branch=C 메타 sprint pivot. 사유: 외부 raw 세션 N=0 세 번째 연속 cycle + PM `/start` 사인오프 "오케스트레이터 판단하에 agent view 진행" 위임. **본 결정은 X4 (`D-S12-x4-no-op-close-third`) 으로 swap 됨** — Agent View worktree base 시스템 결함으로 designer Tier 1 3회 dispatch 모두 무력화 → 워커 dispatch 본체 진행 불가 → no-op close 세 번째 cycle 운영 모드 재확정. **본 frozen 의 메타 pivot 의도 (T1+T2+T3 team-leader 메타 영역) 는 commit `f5fa65c` 로 50% 영속화 성공** — `.claude/commands/end.md` §5 + `docs/dev-infra.md` 영속화. 미해소 50% (designer copy 키 + mobile mount + tester fixture) 는 Sprint 13 이월.

- **[FROZEN v2026-05-15 D-S12-x1-persistence-fix]** `.gitignore` 광범위 ignore 4 라인 (`.claude/`, `CLAUDE.md`, `SPRINTS.md`, `docs/sprints/`) 제거 + 선별 ignore (`.claude/*` + `!.claude/agents/` + `!.claude/commands/` + `docs/sprints/sprint-*-data/`) 로 swap + 33 파일 영속화 commit `f5fa65c` 영구 확정. 사유: Agent View worktree base 결함 진단 중 발견된 **본질적 영속성 결함** — 모든 sprint dev doc + 워커 정의 + CLAUDE.md + SPRINTS.md 가 git history 에 한 번도 commit 안 된 untracked 로컬 파일 only. PM 사인오프 X1 옵션 (4 옵션 중 첫 시도). 효과: sprint-0~12 dev doc + 8 워커 정의 + 2 슬래시커맨드 git history 진입, clone 후 재현 가능. 미해소: Agent View worktree base 결정은 X1 으로 미갱신 (cmux 외부 fix point). revert 비용: `.gitignore` 4 라인 복원 (≈ 1분, but 영속성 결함 회귀).

- **[FROZEN v2026-05-15 D-S12-x4-no-op-close-third]** Sprint 12 운영 모드 최종 = no-op close **세 번째 연속 cycle** 영구 확정 (X1 fallback). 사유: PM 사인오프 X1 (영속화 commit) 시도 후에도 Agent View worktree base = `15f8228 sprint-5` fix point 그대로 → designer Tier 1 3회 연속 무력화 → 워커 dispatch 본체 진행 불가. PM 사인오프 X4 옵션 (4 옵션 중 마지막). **시간축 분리 패턴 다섯 번째 정합 사례 영구 확정** (Sprint 8 (A) first / 9 (B) C-revised second / 10 (no-op) third / 11 (no-op) fourth / 12 (no-op meta-attempt → no-op X4) fifth). Sprint 10/11/12 = 3중 no-op close 연속. Sprint 13 으로 reincarnation skeleton 이월 (Sprint 11 §1~§2 raw text 그대로 복제 = 세 번째 reincarnation, 4중 동일 raw text 체인). revert 비용: Sprint 13 reincarnation skeleton swap (≈ 5분).

- **[FROZEN v2026-05-15 D-S12-agent-view-worktree-base-defect]** Agent View worktree base 결정 메커니즘이 main HEAD 를 따르지 않고 `15f8228 sprint-5` commit 을 fix point 로 사용한다는 시스템 결함 영구 기록. 사유: designer 3회 연속 dispatch (이전 세션 1회 + Agent tool 2회) 모두 base = sprint-5. PM 사인오프 X1 영속화 commit (`f5fa65c`) 후에도 base 변경 안 됨. 표준 `git worktree add -b ... main` (manual) 은 정상 작동 (`f5fa65c` HEAD + verify-copy `ok=23` 정합) 으로 root cause 확정 = cmux (`/Applications/cmux.app/Contents/Resources/bin/claude`) 의 worktree 격리 메커니즘 외부 fix point. **Sprint 13+ 워커 dispatch 시 Agent tool isolation=worktree 패턴 사용 금지** — manual worktree (X2: `git worktree add -b <branch> <path> main` 후 그 안에서 작업) 또는 isolation 미사용 (X3: Agent tool isolation 생략) 패턴 강제. cmux 인프라 점검 / 버그 리포트 별개 트랙. revert 비용: 시스템 결함 해소 시 자연스럽게 무력 (ripple effect 없음).

- **[FROZEN v2026-05-15 D-S12-receipt-script-deferred]** `scripts/receipt/sprint-12.sh` 미작성 + `.receipt-runner/sprint-12-*.mjs` fixture 4종 (end-mark-live-measure / receipt-infra-path-swap / dev-infra-doc / web-demo-banner) 미작성 + `docs/sprints/sprint-12-data/` 디렉토리 미생성 영구 확정. 사유: no-op close 세 번째 cycle 정합 (sprint 작업 본체 0건이므로 receipt 자체 무의미). team-leader 메타 영역 (T1+T2+T3) 은 commit `f5fa65c` 로 영속화 성공했으나 sprint-12.sh fixture 자체는 tester 워커 dispatch 가 필요하고 designer Tier 1 dependency 가 미수행이라 진행 불가. Sprint 13 활성 경로에서 `scripts/receipt/sprint-13.sh` 신규 작성 (Sprint 9 65 단계 wrap + 신규 4 단계). revert 비용: Sprint 13 sprint-13.sh + fixture 4종 작성 cost (≈ 30분 ~ 1시간).

- **[FROZEN v2026-05-15 D-S12-decisions-frozen-deferred]** D-S9-* 6 frozen (5종 보류 + 1 reconfirm) 그대로 보존 + 재갱신 0건 영구 확정 (3중 연속). 사유: no-op close 세 번째 cycle 정합. Sprint 9 §11 의 `[FROZEN v2026-04-30 D-S9-{theme-toggle, empty-error-copy, concept-dedup, recall-log-retention, negation-classifier}-decision = 보류]` 5종 + `[FROZEN v2026-04-30 D-S9-inspector-unlink-recheck = A안 reconfirm]` 1종 그대로 raw text 보존. Sprint 13 trigger inline 그대로 (외부 데이터 도착 시 6종 일괄 갱신). revert 비용: Sprint 13 §11 신규 D-S13-* 6종 frozen 작성 (≈ 5분).

**Open Issues:**

- **Agent View worktree base = sprint-5 fix point 시스템 결함 (3중 연속 catch)** — 본 환경 cmux 의 Agent tool isolation=worktree 가 main HEAD 를 따르지 않고 `15f8228 sprint-5` commit 을 base 로 fix. designer Tier 1 3회 연속 무력화 (이전 세션 1회 + 본 sprint Agent tool 2회). PM 사인오프 X1 (`.gitignore` 수정 + 영속화 commit `f5fa65c`) 으로도 미해소. 표준 `git worktree add` (manual) 은 정상 → cmux 외부 메커니즘 결함 확정. Sprint 13+ Agent View dispatch 패턴 자체를 X2 (manual worktree) 또는 X3 (isolation 미사용) 으로 swap 필요. cmux 인프라 점검 / 버그 리포트 별개 트랙.

- **PM 외부 모집 트랙 raw 세션 N=0 (세 번째 연속)** — Sprint 13 시작 trigger = raw 세션 N≥3 도착. PM 자기 페이스 별도 트랙 (consent §5 서명 → session-guide §2~7 자유 사용 → export → `docs/sprints/sprint-13-data/raw/<session-hash>.json` 채널). Sprint 10/11/12 연속 N=0 — 세 번째 no-op close cycle 완료. Sprint 13 도 N=0 그대로면 네 번째 no-op close cycle (시간축 분리 패턴 여섯 번째 정합 사례 후보).

- **designer + mobile + tester Tier 1/3 워커 슬라이스 미수행 → Sprint 13 이월** — Agent View 시스템 결함으로 dispatch 본체 진행 불가. designer slice (copy 키 + verify-copy 임계 ≥ 24) + mobile slice (firstChat.tsx web 분기 mount) + tester slice (sprint-12.sh + fixture 4종) 모두 Sprint 13 활성 경로에서 X2/X3 패턴으로 진행. dependency chain 그대로 (designer Tier 1 → mobile + tester Tier 3).

- **dormant code IDE diagnostic 노이즈** (Sprint 9 retro 이월) — `dedupConcepts.ts` strict 진단 22건 매 sprint 시작 시 반복. Sprint 13+ dedup 채택 시 일괄 해소 + 별개 `.receipt-runner` allowlist 검토 후보.

- **web 빌드 데모 모드 표면 인식 부족** (Sprint 10 사용자 시연 first 발견, Sprint 11/12 이월) — `apps/mobile/src/chatStore.web.ts` 의 `DEMO_REPLY_KO` 5토큰 cycle 표면 인식 부족. Sprint 13 활성 경로 우선 후보 (designer + mobile slice 그대로 적용 가능 — copy 키 + Platform.OS === 'web' 분기 mount).

## 12. Carry-over + Retrospective

**Carry-over (다음 스프린트가 반드시 알아야 할 것):**

1. **Sprint 13 = "External Data Arrival" sprint (Sprint 11/12 의 reincarnation, 세 번째 reincarnation 사례, 4중 동일 raw text 체인)** — Sprint 11 §1~§2 raw text 그대로 복제 (Sprint 11 자체가 Sprint 10 의 reincarnation, Sprint 12 가 Sprint 11 의 reincarnation 이므로 sprint 10→11→12→13 = 4중 동일 raw text 체인). trigger = raw 세션 N≥3 도착. PM 외부 모집 트랙 PM 자기 페이스 별도 진행. Sprint 8 carry-over 14 시간축 분리 패턴 **여섯 번째 정합 사례 후보**.

2. **Sprint 12 = no-op close 영구 확정 (세 번째 연속 no-op close, X4 swap 결정)** — `/start` 사인오프 시점 운영 모드 = branch=C 메타 sprint pivot (D-S12-branch-c-meta-pivot) 이었으나, Agent View worktree base 시스템 결함으로 designer Tier 1 3회 연속 dispatch 모두 무력화 → PM 사인오프 X4 옵션으로 no-op close 세 번째 cycle 운영 모드 재확정. **단, team-leader 메타 영역 (T1+T2+T3) 은 commit `f5fa65c` 영속화 성공** — `.claude/commands/end.md` §5 두 정책 + `docs/dev-infra.md` git history 진입. 메타 sprint 본체 50% 영속화. Sprint 11 carry-over 그대로 Sprint 13 이월.

3. **D-S12-x1-persistence-fix 영구 보존** (Sprint 12 신규) — `.gitignore` 광범위 ignore 4 라인 (`.claude/`, `CLAUDE.md`, `SPRINTS.md`, `docs/sprints/`) 제거 + 선별 ignore (`.claude/*` + `!.claude/agents/` + `!.claude/commands/` + `docs/sprints/sprint-*-data/`) 로 swap + 33 파일 영속화 commit `f5fa65c`. sprint-0~12 dev doc + 8 워커 정의 + 2 슬래시커맨드 + CLAUDE.md + SPRINTS.md + docs/dev-infra.md 모두 git history 진입. **Sprint 13+ 모든 sprint 가 영속화 → /clear 후에도 dev doc 만으로 컨텍스트 복원 가능 (clone 후 재현 가능)**. 이전엔 모든 sprint dev doc 이 git history 에 한 번도 commit 안 된 untracked 로컬 파일 only 였음 (본 sprint /end 가 first 발견 + first hotfix).

4. **D-S12-agent-view-worktree-base-defect 영구 기록** (Sprint 12 신규) — Agent View (cmux `/Applications/cmux.app/Contents/Resources/bin/claude`) 의 worktree 격리 메커니즘이 main HEAD 를 따르지 않고 `15f8228 sprint-5` commit 을 fix point 로 사용. designer 3회 연속 무력화. PM 사인오프 X1 (영속화 commit) 후에도 base 변경 안 됨. 표준 `git worktree add -b ... main` (manual) 은 정상 → cmux 외부 메커니즘 결함 확정. **Sprint 13+ 워커 dispatch 패턴 자체를 swap** 필요:
   - **X2 (manual worktree)**: `git worktree add -b designer-sprint13 .claude/worktrees/manual-designer main` 후 그 안에서 Agent tool 호출 (isolation 미지정) 또는 team-leader 가 직접 작업.
   - **X3 (isolation 미사용)**: Agent tool subagent_type=designer + isolation 생략 → 워커가 main 디렉토리에서 직접 작업. Tier 1 = 단독 dispatch + Tier 2/3 = 직렬 dispatch 시 race 0.
   - 둘 다 worktree 격리 0 또는 manual → 워커 헌법 4 (단일 작성자 시간창) 보장 위해 **순차 dispatch 강제**.
   - cmux 인프라 점검 / 버그 리포트 별개 트랙. 본 결함이 해소되면 자연스럽게 Agent View isolation=worktree 패턴으로 복귀.

5. **/end 마감 마크 직전 실측 강제 정책 + receipt 인프라 path swap 회귀 정책 영구 박힘** (Sprint 11 retro 1번 + 3번 → Sprint 12 영속화 완료) — `.claude/commands/end.md` §5 라이브 모드 본문에 D-S12-end-mark-live-measure + D-S12-receipt-infra-path-swap-policy 두 정책 영구 박힘 (commit `f5fa65c`). 본 sprint /end 가 first 적용 — Sprint 9 receipt 65/65 PASS 실측 + path swap grep 실측 모두 정합. Sprint 13+ 매 sprint /end 가 동일 절차 적용.

6. **dev-infra 문서 영구 보존** (`docs/dev-infra.md`, D-S12-dev-infra-readme) — Sprint 10 사용자 시연 first 발견 carry-over 7 영구 박힘. `pnpm --filter mobile build` (export) + `npx serve -s apps/mobile/dist -l 3000` (SPA fallback `-s` 의무) + `OLLAMA_ORIGINS="http://localhost:3000" ollama serve` (web 빌드 CORS) 표준 명시. clone 후 재현 가능.

7. **Sprint 9 carry-over 14 항목 + Sprint 10/11 carry-over 추가 그대로 이월** (외부 신호 부재로 변동 0, 3중 연속 보존) — 5종 활성 경로 (dedup ≈15분 / negation-classifier ≈1시간 / retention ≈30분 / theme-toggle ≈30분 / empty-error-copy ≈30분) + carry-over 2 B안 (unlink ≈30분) / dormant code 영구 보존 / 사전 합의 영구 보존 / fixture 6번째 룰 후보 / 헌법 9~12 8 워커 정의 line 9~12 보존 / "박다" 0건 강제 / 시간축 분리 패턴 / system routing replay 표준 / 동결 영역 / stale directive 0건 first sprint / mockup-scope-parity lint 사전 검증 표준 / platform-adapter 누적 9회 / 외부 데이터 sprint 시간축 분리.

8. **web 빌드 데모 모드 마이크로 카피 후보** (Sprint 10 사용자 시연 first 발견, Sprint 11/12 이월, **3중 연속 미해소**) — `chatStore.web.ts` DEMO_REPLY_KO 5토큰 cycle 표면 인식 부족. Sprint 13 활성 경로 *최우선* 후보 (designer + mobile + tester slice 그대로 적용 가능, sprint-12 §5/§5.5/§6 그대로 inheritance).

9. **dormant code IDE diagnostic 노이즈** (Sprint 9 retro 이월, Sprint 11/12 이월) — `dedupConcepts.ts` strict 진단 22건 반복. Sprint 13+ dedup 채택 시 일괄 해소.

10. **헌법 1~12 영구 확정 + 8 워커 정의 line 9~12 보존 회귀 PASS** — Sprint 9 65/65 receipt 재실행 PASS (workers_with_constitution=8 / pakda_term_count=0). 시그니처 동결 정합. **본 sprint commit `f5fa65c` 후 워커 정의가 git history 에 영속화** → 환경 간 워커 정의 일관성 보장.

11. **모노레포 437 테스트 PASS 회귀 무결** — protocol 22 + llm 6 + engine 103 + storage 85 + design-system 107 + orchestrator 59 + conversation 52 + e2e 3 = 437. mobile = skip (정책). Sprint 11 마감 시점 437 PASS 와 동일 (코드 변경 0건 정합).

12. **PM 사인오프 게이트 다층 분기 패턴 사례** (Sprint 12 신규) — `/start` 단계에서 PM 사인오프 4건 발생: A1 (메타 pivot reconfirm) + B1 (designer worktree 폐기 + 재dispatch) + C1 (`docs/dev-infra.md` 보존) → X1 (영속화 commit) → X4 (no-op close fallback). 각 결정마다 transparent alert + 옵션 제시. /start 절차 §5 PM 사인오프 게이트 가 다층 게이트 (system-defect → fallback chain) 로 확장된 first 사례. precedent.

**Retrospective:**

- **잘 된 것**:
  - **Agent View worktree base 시스템 결함 first catch** — designer 3회 dispatch 모두 sprint-5 base mismatch 발견 + 정량 측정 (verify-copy main 23 vs worktree 13/14). cmux 외부 fix point 결함 확정. /start §3 mockup-scope-parity lint + designer 슬라이스의 §0.5 검증 의무 + verify-copy 실측 의무 3 단계 게이트가 반복 실측으로 결함 본체 분리.
  - **본질적 영속성 결함 first hotfix** — `.gitignore` 광범위 ignore 4 라인이 모든 sprint dev doc + 워커 정의 + CLAUDE.md + SPRINTS.md 를 git history 에서 차단하고 있었음 (sprint-0~11 12 sprint 동안 누적 영속성 0). PM 사인오프 X1 옵션으로 33 파일 영속화 commit `f5fa65c`. clone 후 재현 가능 도달. **본 hotfix 가 X1 옵션의 진정한 가치 — Agent View 결함 우회는 실패했으나 영속성 회복 본체는 성공**.
  - **/end 마감 마크 직전 실측 강제 정책 + path swap 회귀 정책 first 적용** — `.claude/commands/end.md` §5 두 정책 (D-S12-end-mark-live-measure + D-S12-receipt-infra-path-swap-policy) 본 sprint /end 가 first 적용. Sprint 9 receipt 65/65 PASS 실측 + path swap grep 실측 모두 정합. Sprint 11 retro 1번 ("/end 절차 §5 마감 마크 직전 실측 강제 정책 영구 박힘") + 3번 ("receipt 인프라 path swap 회귀 정책") 두 항목 영속화 완료.
  - **PM 사인오프 게이트 다층 분기 first 사례** — A1+B1+C1 → X1 → X4 5단계 게이트. 각 단계마다 transparent alert + 4 옵션 제시 + PM 결정 후 진행. 워커 ↔ team-leader ↔ PM 의사결정 책임 분리 정합. precedent.
  - "박다" 동사 활용형 0건 강제 본 sprint 신규 작성 영역 모두 PASS (헌법 12 정합) — 메타 인용 + 정책 정의 + 검증 토큰 + 대체어 매핑 4종 제외 영역 컨텍스트 인식 정합.

- **아팠던 것**:
  - Agent View worktree base 시스템 결함이 designer 3회 연속 무력화 → 본 sprint 메타 pivot 의도 (D-S12-branch-c-meta-pivot) 의 50% (designer + mobile + tester slice) 미수행 → Sprint 13 이월. **3중 연속 no-op close cycle (Sprint 10/11/12)** + 4중 동일 raw text 체인 (Sprint 10→11→12→13 reincarnation) — 시간축 분리 패턴 다섯 번째 정합 사례 영구 확정.
  - 외부 데이터 N=0 세 번째 연속 → Sprint 12 = no-op close 세 번째 연속. PM 외부 모집 트랙 raw 세션 도착 가정이 1~2주 cycle 에서 더 길어짐 — 약 3주 (Sprint 11 마감 2026-05-12 → Sprint 12 마감 2026-05-15) 동안 외부 데이터 도착 0건. 단, 본 sprint 마감 cycle 은 짧음 (3일) — Agent View 결함 발견 + X1 hotfix + X4 swap 의 빠른 결정 게이트.
  - 본 환경의 영속성 결함 (sprint-0~11 dev doc 모두 untracked) 이 12 sprint 누적 동안 catch 안 됨 → 본 sprint /end 가 first 발견. 만약 12 sprint 어느 시점에 머신 변경 / clone 발생 시 모든 dev doc / 워커 정의 / CLAUDE.md / SPRINTS.md 손실됐을 것. catch 시점이 늦었음.

- **다음에 다르게 할 것**:
  - **Sprint 13+ 워커 dispatch 패턴 자체를 swap** — Agent tool isolation=worktree 사용 금지 (Agent View 결함 해소 전까지). manual worktree (X2) 또는 isolation 미사용 (X3) 강제. /start 절차 §8/§10/§12 dispatch 본문 갱신 후보 (Sprint 13 활성 경로 또는 별개 메타 sprint).
  - **cmux 인프라 점검 / 버그 리포트 별개 트랙** — Agent View worktree base = sprint-5 fix point 결함의 root cause 분석 (cmux internal worktree 결정 알고리즘) + Anthropic 트래킹. 본 트랙은 team-leader 책임 외부.
  - **Sprint N = no-op close 패턴 표준 영구화 (3중 연속)** — Sprint 10 first → 11 second → 12 third. 시간축 분리 패턴 다섯 번째 정합 사례 영구 확정. /start 절차 §1 직후 trigger 사전 확인 의무 (raw 세션 디렉토리 + 시스템 결함 사전 점검) — Sprint 11 신규 항목 + Sprint 12 신규 sub-항목 (Agent View base 사전 grep).
  - **영속성 결함 사전 검증 정책 영구 박힘 후보** — `.gitignore` 가 dev doc / 워커 정의 / CLAUDE.md 등 *영속 메모리* 영역을 ignore 하지 않는지 매 sprint /end 또는 /start 사전 검증. `git check-ignore` 자동 grep 의무 후보. Sprint 13 활성 경로 또는 별개 메타 sprint.
  - **PM 사인오프 게이트 다층 분기 패턴 영구 표준화** — 시스템 결함 발생 시 transparent alert + 4 옵션 제시 + PM 결정 후 fallback chain (X1 → X4 류) 표준 적용. 본 sprint first precedent 영속화 후 Sprint 13+ 매 sprint /start 적용.

## 9. Demo Script

```bash
# 1. 영속화 commit 검증
git log -2 --oneline
# 기대: f5fa65c chore(sprint-12): persist dev docs + agent/command definitions (X1 fix)
#       a966699 feat(sprint-11): no-op close (두 번째 연속) + receipt 인프라 긴급 통합 수정

git ls-files docs/sprints/ .claude/agents/ .claude/commands/ | wc -l
# 기대: ≥ 30 (33 - .gitkeep 등 정합)

# 2. Sprint 9 receipt 65 단계 wrap (마감 마크 직전 실측, D-S12-end-mark-live-measure 정합)
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-9.sh
# 기대: 65/65 PASS + ✅ Sprint 9 receipt PASSED

# 3. 모노레포 437 PASS 회귀
pnpm -r test
# 기대: 437 PASS (protocol 22 + llm 6 + engine 103 + storage 85 + design-system 107 + orchestrator 59 + conversation 52 + e2e 3)

# 4. lint 회귀
bash scripts/lint/frozen-flag-audit.sh docs/sprints/sprint-12-external-data-arrival.md
bash scripts/lint/mockup-scope-parity.sh docs/sprints/sprint-12-external-data-arrival.md
# 기대: 둘 다 exit 0

# 5. path swap 회귀 정책 grep (D-S12-receipt-infra-path-swap-policy 정합)
grep -rn "\.claude/commands" scripts/
# 기대: hit 다수 — 모두 메타 인용 또는 정합 라인 (`.claude/agents/` 결합 검증), 정정 대상 0건.

# 6. dev-infra 표준 검증 (D-S12-dev-infra-readme 정합)
grep -E "serve -s|OLLAMA_ORIGINS" docs/dev-infra.md
# 기대: 두 토큰 모두 hit
```
