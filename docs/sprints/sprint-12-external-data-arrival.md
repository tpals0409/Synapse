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

> **운영 모드: branch=C 메타 sprint pivot 영구 확정** — PM `/start` 사인오프에서 "오케스트레이터 판단하에 agent view 진행" 위임 (외부 raw 세션 N=0 세 번째 연속 cycle, branch=A 불가 + branch=B "no-op close 워커 dispatch 0건" PM "agent view 진행" 의도 부적합 → branch=C 결정). Sprint 11 retro 1번 + carry-over 3/6/7 4종 메타 항목 영구 박힘 본체.

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

- **외부 데이터 N≥3 수집 / 6 분기 활성 경로 본체 작성** — Sprint 13 (외부 데이터 도착 시) 이월. Sprint 11 §1~§2 raw text 그대로 보존 (reincarnation skeleton).
- **D-S9-* 6 frozen 재갱신 0건** — 5종 보류 (theme-toggle / empty-error-copy / concept-dedup / recall-log-retention / negation-classifier) + 1종 A안 reconfirm (inspector-unlink-recheck) 그대로 보존. Sprint 13 trigger inline 그대로.
- **DecisionAct enum 4원 + runMemoryFormation / runRecallHook / RecallFn / DecideFn / chatStore 기존 메서드 시그니처 + storage migration 0001~0006 + protocol DecisionLogAction union 9종 + 헌법 1~12 = 영구 동결** 그대로.
- **engine / conversation / orchestrator / storage / protocol / llm 코드 변경 0건** — packages/{storage, engine, conversation, orchestrator, protocol, llm} Sprint 9 그대로 보존. dormant code (`dedupConcepts.ts` 175줄 + 17/17 단위 테스트) 그대로 보존.
- **신규 화면 / 신규 패키지 / e2e 시나리오 신규 추가** — 7 패키지 + 9 화면 그대로. e2e/scenarios/ 변경 0건.
- **`docs/sprints/sprint-12-data/` 디렉토리 미생성** — 외부 데이터 부재 (Sprint 13 reincarnation 이월). raw 세션 0건.
- **다른 워커 (storage / engine / conversation / orchestrator / llm) dispatch 0건** — Tier 1 = designer 만, Tier 3 = mobile + tester 만.

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
<실제로 만들어진 파일/함수/엔드포인트 인덱스 — 다음 스프린트가 코드를 찾는 데 사용. /end 가 워커 리포트 §1+§2 통합 + receipt 라인으로 채움.>

## 11. Decisions Made / Open Issues

**Decisions Made:**

- **[FROZEN v2026-05-12 D-S12-branch-c-meta-pivot]** Sprint 12 운영 모드 = branch=C 메타 sprint pivot 영구 확정. 사유: 외부 raw 세션 N=0 세 번째 연속 cycle (`docs/sprints/sprint-12-data/` 디렉토리 부재) + PM `/start` 사인오프 "오케스트레이터 판단하에 agent view 진행" 명시 위임 → branch=A (외부 데이터 부재로 불가) / branch=B (no-op close 워커 dispatch 0건 PM "agent view 진행" 의도 부적합) 모두 부적합 → 오케스트레이터 판단 branch=C 결정. Sprint 11 retro *"다음에 다르게 할 것"* 1번 + carry-over 3 / 6 / 7 4종 항목 영구 박힘 본체. Sprint 10/11 의 reincarnation 체인 (Sprint 10→11→12 = 3중 동일 raw text 체인) 본 sprint 에서 끊고 Sprint 13 으로 외부 데이터 도착 시 reincarnation skeleton 이월 (Sprint 11 §1~§2 raw text 그대로 보존하여 Sprint 13 §1~§2 로 swap 예정). 시간축 분리 패턴 다섯 번째 정합 사례. revert 비용: Sprint 13 reincarnation skeleton swap (≈ 5분).

**Open Issues:**
- *(워커 리포트 수확 후 /end 가 채움)*

## 12. Carry-over + Retrospective
**Carry-over (다음 스프린트가 반드시 알아야 할 것):**
- *(빈 칸 금지. 특이사항 없으면 "직전 스프린트 가정 그대로 유지" 라고 명시. /end 가 워커 리포트 §4 통합 + team-leader 통합 관점 한 줄로 채움.)*

**Retrospective:**
- 잘 된 것:
- 아팠던 것:
- 다음에 다르게 할 것:
