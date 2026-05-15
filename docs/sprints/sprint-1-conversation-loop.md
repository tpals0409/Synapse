# Sprint 1 — Conversation Loop

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`

## 1. Goal
디자인 목업의 Onboarding → FirstChat 흐름을 RN+Expo 로 재현하고, 사용자 입력 → 로컬 Gemma 의 토큰 스트리밍 응답이 화면에 흘러나오며 SQLite 에 영속화되는 엔드투엔드 대화 루프를 완성한다.

## 2. Deliverable & Receipt

**Deliverable:**
- `apps/mobile`: Onboarding 화면 (1~3 step 의 디자인 목업 흐름) + FirstChat 화면 (입력창 + 메시지 리스트 + 스트리밍 응답 표시).
- `packages/conversation`: 스트리밍 API (`sendStream(text, deps): AsyncIterable<string>` 또는 `send(text, { onToken })` — Sprint 1 *Decisions Made* 에서 결정). 기존 `send` 는 보존 (single-shot).
- `packages/llm/gemma`: Ollama `/api/generate stream:true` SSE/NDJSON 파싱 → 토큰 콜백/iterator. `gemma.completeStream(prompt)` 신설.
- `packages/storage`: 마이그 `0002_*.sql` (필요시 conversation_id, parent_id, tokens, latency_ms 등 추가). 변경 시 dev doc §11 에 정당화.
- `packages/design-system`: spacing / radius / shadow / motion 토큰 + COPY 한·영 (`디자인 목업/content.jsx` 의 `COPY`/`DEMO_KO/EN`/`MEMORIES_KO/EN` 1:1) + **`colorsHex.{light,dark}.{paper,ink,synapse}` dual export (Sprint 0 carry-over)**.
- 디자인 충실도: 목업의 ink-rise / synapse-pulse / ghost-breathe 중 *최소 하나* 적용 (어느 것을 적용할지 §11 결정).
- `scripts/receipt/sprint-1.sh`: Sprint 0 의 5 단계 + 스트리밍/UI 검증 추가.

**Receipt (자동 검증 가능한 형태):**
- `pnpm install` 성공 / `pnpm -r test` exit 0 (Sprint 0 22 + 신규 추가, Ollama 가동 시 모두 pass).
- `pnpm --filter @synapse/mobile run build` exit 0 (web bundle 빌드).
- `bash scripts/receipt/sprint-1.sh` 시나리오:
  1. Sprint 0 의 5 단계 그대로 통과.
  2. **스트리밍 검증** — `conversation.sendStream("안녕")` 호출 시 *2개 이상* 의 토큰 청크가 순서대로 도달, 마지막 누적 텍스트와 single-shot `send` 결과가 동등 (또는 최소 길이 ≥ N).
  3. **COPY i18n 검증** — `@synapse/design-system` 의 `copy.ko.firstChat.placeholder` 등 핵심 키가 `디자인 목업/content.jsx` 의 `COPY` 와 1:1 매칭 (테스트 데이터로 자동 비교).
  4. **mobile 시각 회귀 (선택)** — Expo Web 빌드 후 Playwright/Puppeteer 로 Onboarding step 1 의 DOM 핵심 텍스트 + 색 토큰 적용 여부 스냅샷. (시각 회귀 도입은 §11 결정에 따라 Sprint 7 로 미뤄도 됨.)
  5. 모든 단계 통과 후 `messages` 테이블에 user/assistant row + (스키마 변경 시) 추가 컬럼 값 검증 → exit 0.

## 3. Scope
**In:**
- 디자인 목업의 Onboarding (단일 화면, PM (A) 최종 사인오프 2026-04-29) + FirstChat 화면 RN+Expo 재현 (`디자인 목업/screens.jsx` + `content.jsx` 1:1).
- `packages/llm`: `gemma.completeStream(prompt): AsyncIterable<string>` (Ollama `/api/generate stream:true` NDJSON 파싱). 기존 `gemma.complete` 보존.
- `packages/conversation`: `sendStream(text, deps): AsyncIterable<string>` 추가 (DI: `completeStream?` 옵션). 기존 `send` 보존. user append → token yield → 종료시 누적 reply 로 assistant append + latency_ms 기록.
- `packages/storage`: `0002_*.sql` 마이그 — `messages.latency_ms INTEGER NULL` 추가 (단발/스트리밍 양쪽 모두 기록 가능). `appendMessage` 시그니처 확장. **conversation_id / parent_id / tokens 는 Sprint 2 (Concept 진짜 소비자) 로 보류**.
- `packages/design-system`:
  - `colorsHex.{light,dark}.{paper,ink,synapse}` dual export (Sprint 0 carry-over).
  - `spacing` / `radius` / `shadow` 토큰 (`디자인 목업/styles.css` 1:1 추출).
  - `motion` 토큰: 최소 `inkRise` (duration, easing) — Sprint 1 의 1종 애니메이션.
  - `copy.{ko,en}` — `디자인 목업/content.jsx` 의 `COPY` + `DEMO_KO/EN` + `MEMORIES_KO/EN` 1:1 import (단일 진실원).
- `apps/mobile`:
  - Expo Router 멀티 화면 (`app/index.tsx` redirect → `app/onboarding` → `app/chat`).
  - Onboarding 단일 화면 (목업 `screens.jsx` `OnboardingScreen` 1:1, hi+sub+synapse-pulse 도트+hint+cta+tagline 한 페이지; PM (A) 최종 사인오프 2026-04-29).
  - FirstChat: 입력창 + 메시지 리스트 + `sendStream` 구독 + **`ink-rise`** 애니메이션으로 어시스턴트 토큰 등장.
  - Expo Font 로드 (Source Serif 4 / Inter / JetBrains Mono).
  - **inline hex 폴백 제거** → `colorsHex` 사용 (Sprint 0 carry-over).
- `packages/orchestrator`: 기존 silence 디폴트 유지. **Sprint 4 게이트 hook 포인트 주석 추가** (`decide()` 호출 자리만 코멘트로 표시, 실제 분기 없음).
- `scripts/receipt/sprint-1.sh`: Sprint 0 의 5 단계 + 스트리밍 ≥ 2 청크 검증 + COPY i18n 1:1 매칭 + latency_ms 적재 검증.

**Out:**
- Concept 추출 / 임베딩 / 그래프 (Sprint 2).
- 어떤 형태의 Recall (Sprint 3+) — engine stub 호출 금지.
- Inspector / CaptureToast / Suggestion / Ghost / Strong / Failure / Settings 7 화면 (Sprint 2+).
- Orchestrator 의 비-silence 분기 (Sprint 4).
- 시각 회귀 자동화 (Playwright/Puppeteer) — Sprint 7 Polish 로 미룸.
- iOS 네이티브/Android 빌드 (Sprint 7).
- ko ↔ en 런타임 토글 UI (Sprint 7) — Sprint 1 은 `copy` 양쪽 export 만, 화면 표시는 ko 고정.
- conversation_id / parent_id / tokens 컬럼 (Sprint 2 — Concept 가 진짜 소비자).
- `messages_vec` 적재 (Sprint 2).

## 4. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ apps/mobile (Expo Router)                                       │
│   app/index.tsx (redirect)                                      │
│     ↓                                                           │
│   app/onboarding/index.tsx  (디자인 목업 단일 화면)              │
│     ↓ "시작" 탭                                                  │
│   app/chat/index.tsx                                            │
│     ├ chatStore.listMessages() on mount                         │
│     ├ 입력창 → onSubmit(text)                                   │
│     │    │                                                      │
│     │    ▼ for await (chunk of chatStore.sendStream(text))      │
│     │      partial += chunk; setState  (ink-rise 애니메이션)     │
│     └ design-system: colorsHex, spacing, radius, fonts, motion  │
│                                                                 │
│   apps/mobile/src/chatStore.{ts, web.ts}  (platform adapter)    │
│     - native (chatStore.ts): @synapse/storage + sendStream      │
│         직접 위임 (better-sqlite3 + sqlite-vec)                  │
│     - web (chatStore.web.ts): in-memory + 데모 토큰 시퀀스       │
│         (better-sqlite3 web-incompatible → metro 자동 분기)      │
└─────────────────────────────────────────────────────────────────┘
                                ↓ (native 빌드만)
┌─────────────────────────────────────────────────────────────────┐
│ packages/conversation                                           │
│   sendStream(text, { db, completeStream? }):                    │
│     AsyncIterable<string>                                       │
│   ─ id_user = randomUUID, ts0 = Date.now()                      │
│   ─ storage.appendMessage({ user, content:text, ts:ts0 })       │
│   ─ for await (tok of (completeStream ?? gemma.completeStream)) │
│       acc += tok; yield tok                                     │
│   ─ latency_ms = Date.now() - ts0                               │
│   ─ storage.appendMessage({ assistant, content:acc,             │
│                             ts:Date.now(), latency_ms })        │
│   ─ 실패시: user row 보존, assistant 미적재, throw                │
│                                                                 │
│   send(text, deps) — Sprint 0 그대로 보존 (single-shot)          │
└─────────────────────────────────────────────────────────────────┘
        ↓                                        ↓
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ packages/llm                 │    │ packages/storage             │
│  gemma.completeStream(p):    │    │  0002_*.sql:                 │
│    AsyncIterable<string>     │    │   ALTER TABLE messages ADD   │
│   - POST /api/generate       │    │     COLUMN latency_ms        │
│     { stream: true }         │    │     INTEGER NULL             │
│   - NDJSON 라인 단위 파싱      │    │  appendMessage(db, msg)      │
│     done==true 까지          │    │   - msg.latency_ms? optional │
│   - isAvailable 헬스체크      │    │  listMessages 그대로          │
│  gemma.complete (그대로)      │    │  멱등 마이그 (_migrations)    │
└──────────────────────────────┘    └──────────────────────────────┘

orchestrator.decide() — silence 디폴트 유지.
  conversation.sendStream 내부에 // Sprint 4: orchestrator gate here
  주석 1줄로 자리만 표시. 실제 호출은 Sprint 4.

engine — 호출 금지 (Sprint 2 까지 stub throw 그대로).
```

**스트리밍 시그니처 결정**: `AsyncIterable<string>` 채택. 이유 — RN UI 의 `for await` 구독이 자연스럽고, 토큰 단위 테스트가 콜백보다 깔끔. `onToken` 콜백은 호출자가 종료 / 에러 처리를 별도 props 로 주고받아야 해서 표면적이 더 큼. (§11 *Open Issues* 에 PM 변경 자유 명시.)

**Receipt 종단 흐름**: `scripts/receipt/sprint-1.sh` 단계 3-2 (스트리밍) 가 `for await (tok of sendStream(...))` 로 수신, 청크 ≥ 2 + 마지막 누적 = single-shot 결과 (또는 길이 임계). 단계 3-3 (COPY) 가 `design-system.copy.ko` 의 핵심 키와 `디자인 목업/content.jsx` 의 `COPY`/`DEMO_KO`/`MEMORIES_KO` 가 1:1 일치하는지 비교.

**Platform-adapter 보정 (mobile T11 reality, team-lead 2026-04-29)**: 위 다이어그램의 *"app/chat/index.tsx → packages/conversation"* 화살표는 reality 에서 `apps/mobile/src/chatStore.{ts,web.ts}` 어댑터 1 단계를 경유한다. metro 가 web 빌드에서 `.web.ts` 자동 선택 → web bundle 에 `better-sqlite3` / `sqlite-vec` 0 hits (grep 검증), native 빌드는 `chatStore.ts` 가 `@synapse/storage` + `@synapse/conversation` 직접 위임. receipt 의 `streamSend.mjs` 는 node 환경이라 어댑터를 우회해 `@synapse/conversation` 직접 호출 — web/native 양쪽이 분리 검증됨. 이 platform-adapter 패턴은 Sprint 2+ 의 storage 소비자 모두 강제 (§11 Decisions Made + §12 Carry-over).

## 5. File Ownership

| Agent | Files |
|---|---|
| team-leader | `docs/sprints/_current.txt`, `docs/sprints/sprint-1-conversation-loop.md` (라이브 갱신), `SPRINTS.md` (마감 시) |
| designer | `packages/design-system/src/{tokens.ts,colorsHex.ts,spacing.ts,radius.ts,shadow.ts,motion.ts,copy.ts}`, `packages/design-system/__tests__/{tokens,colorsHex,spacing,motion,copy}.test.ts`, `packages/design-system/index.ts` (re-export) |
| storage | `packages/storage/schema/0002_latency.sql`, `packages/storage/src/messages.ts` (latency_ms 시그니처), `packages/storage/__tests__/migrate.test.ts` (or 기존 테스트 확장) |
| conversation | `packages/llm/src/gemma.ts` (`completeStream` 추가), `packages/llm/__tests__/gemma-stream.test.ts`, `packages/conversation/src/loop.ts` (`sendStream` 추가), `packages/conversation/__tests__/loop-stream.test.ts`, `packages/conversation/.receipt-runner/{streamSend.mjs,verify-stream.mjs}` (tester 와 협의) |
| orchestrator | `packages/orchestrator/src/decide.ts` (Sprint 4 hook 주석만, 동작 변경 없음) |
| engine | (변경 없음 — stub 그대로) |
| mobile | `apps/mobile/app/index.tsx` (redirect), `apps/mobile/app/onboarding/index.tsx` (단일 화면, PM (A) 최종 사인오프), `apps/mobile/app/chat/{index.tsx,_layout.tsx}`, `apps/mobile/app/_layout.tsx` (Font 로드 + Stack 라우팅), `apps/mobile/src/chatStore.{ts,web.ts}` (platform adapter), `apps/mobile/package.json` (expo-font 의존) |
| tester | `scripts/receipt/sprint-1.sh`, `packages/conversation/.receipt-runner/streamSend.mjs`, `packages/conversation/.receipt-runner/verify-stream.mjs`, `packages/design-system/.receipt-runner/verify-copy.mjs`, `e2e/scenarios/sprint-1-streaming.md`, dev doc §7-9 라이브 큐레이션 |

## 6. Tasks

| ID | Description | Owner | Blocked By |
|---|---|---|---|
| T0 | `_current.txt → 1`, Sprint 1 dev doc §3-6 채우기 (이 작업), `SPRINTS.md` 상태 일관성 점검 | team-leader | — |
| T1 | `design-system.colorsHex.{light,dark}.{paper,ink,synapse}` dual export — Sprint 0 oklch 와 동일한 시각 매핑의 hex 값 (paper=`#F5F0E8`, ink=`#2A2620`, synapse oklch→hex 추출). 테스트 (5 케이스, light/dark/synapse 동일성) | designer | T0 |
| T2 | `design-system.spacing` (xs/sm/md/lg/xl) + `radius` (sm/md/lg) + `shadow` (sm/md) 토큰. `디자인 목업/styles.css` 의 `--space-*`, `--radius-*`, `--shadow-*` 1:1 추출. 테스트로 핵심 키 존재성 검증 | designer | T0 |
| T3 | `design-system.motion.inkRise` 토큰 (duration ms, easing string). `디자인 목업/styles.css` `@keyframes ink-rise` 와 `animation-timing-function` 추출. RN `Animated`/`react-native-reanimated` 호환 형태 (duration:number, easing:'ease-out' 등). 테스트 | designer | T0 |
| T4 | `design-system.copy.{ko,en}` — `디자인 목업/content.jsx` 의 `COPY`/`DEMO_KO`/`DEMO_EN`/`MEMORIES_KO`/`MEMORIES_EN` 를 그대로 import 가능한 TS 모듈로 변환. Sprint 1 화면 (Onboarding + FirstChat) 에 필요한 키 *최소* 셋. 테스트로 ko/en 키 동일성 + 핵심 키 존재성 검증 | designer | T0 |
| T5 | `storage` 마이그 `0002_latency.sql` (`ALTER TABLE messages ADD COLUMN latency_ms INTEGER`). `appendMessage` 시그니처에 `latency_ms?: number` optional 추가. `0001` 만 적용된 DB 와 `0001+0002` DB 둘 다 멱등 통과 검증 | storage | T0 |
| T6 | `llm.gemma.completeStream(prompt): AsyncIterable<string>` — Ollama POST `/api/generate stream:true`, NDJSON 라인 단위 파싱, `done===true` 까지 yield. 환경: `SYNAPSE_GEMMA_MODEL`/`SYNAPSE_OLLAMA_URL` 그대로. 테스트: mock `fetch` (ReadableStream) 로 ≥3 청크 + done 라인 검증 | conversation | T0 |
| T7 | `conversation.sendStream(text, { db, completeStream? }): AsyncIterable<string>` — user append → for-await yield → 종료 시 누적 reply 로 assistant append + latency_ms. Sprint 4 hook 포인트 주석 1줄. 테스트 3 케이스 (golden / error mid-stream / latency_ms 적재) | conversation | T5, T6 |
| T8 | `orchestrator.decide` Sprint 4 hook 주석 추가 (`// Sprint 4: trigger/silence rules go here`). 동작 변경 없음, silence 디폴트 유지. 기존 테스트 통과 | orchestrator | T0 |
| T9 | `apps/mobile` Expo Font 로드 (`expo-font` 의존 추가, `app/_layout.tsx` 에서 Source Serif 4 / Inter / JetBrains Mono 로드 + 로딩 동안 Splash). `app/index.tsx` 의 inline hex 폴백 제거 → `colorsHex.light` 사용 | mobile | T1 |
| T10 | `apps/mobile` Onboarding **단일 화면** (`app/onboarding/index.tsx`, PM (A) 최종 사인오프 2026-04-29). 디자인 목업 `screens.jsx` `OnboardingScreen` 1:1 — 텍스트 = `copy.ko.onboarding.{hi,sub,hint,cta}` + `copy.ko.tagline`, 한 페이지에 hi→sub→synapse-pulse 도트+hint→cta+tagline 흐름. spacing/radius/shadow/font role 적용. CTA 탭 시 `/chat` push. 진행 인디 / 「다음」 CTA / step 분할 *없음* (목업 충실도) | mobile | T1, T2, T4, T9 |
| T11 | `apps/mobile` FirstChat 화면 (`app/chat/index.tsx`). 입력창(KeyboardAvoidingView) + 메시지 리스트(FlatList, listMessages 초기 로드) + onSubmit 시 `for await (tok of conversation.sendStream(text, { db }))` 구독 → assistant 메시지 토큰 누적 + `motion.inkRise` 애니메이션 적용. user/assistant 영속 메시지가 재마운트 후에도 보임 | mobile | T3, T4, T7, T10 |
| T12 | `tester` `scripts/receipt/sprint-1.sh` — Sprint 0 의 5 단계 + (a) 스트리밍 ≥ 2 청크 + 누적=single-shot (또는 길이 임계) + (b) `copy.ko` ↔ `디자인 목업/content.jsx` 핵심 키 1:1 + (c) latency_ms 적재 (`listMessages().assistant.latency_ms != null`). `packages/conversation/.receipt-runner/{streamSend,verify-stream}.mjs` workspace alias 함정 회피 | tester | T4, T5, T7 |
| T13 | `tester` 진행 중 dev doc §7 (Interfaces) + §8 (Test Scenarios) 라이브 큐레이션 — 워커들이 결정/테스트를 적으면 즉시 dev doc 에 정리. 끝나면 §9 Demo Script 초안 | tester | T6, T7, T11 |

**의존 그래프**: T0 (즉시) → T1/T2/T3/T4 (designer 직렬), T5 (storage), T6 (llm), T8 (orchestrator) 병렬 → T7 (conversation, T5+T6) + T9 (mobile, T1) 병렬 → T10 (mobile, T1+T2+T4+T9) → T11 (mobile, T3+T4+T7+T10) → T12 (tester, T4+T5+T7) → T13 (tester, T6+T7+T11).

## 7. Interfaces / Contracts
*(라이브 갱신)*

### `@synapse/design-system` (T1 완료)
```ts
// src/colorsHex.ts
export const colorsHex: {
  light: { paper: '#F5F0E8'; ink: '#2A2620'; synapse: '#CB7229' };
  dark:  { paper: '#1A1511'; ink: '#F1EAE3'; synapse: '#CB7229' };
};
export type ColorHexTheme = 'light' | 'dark';
export type ColorHexToken = 'paper' | 'ink' | 'synapse';
```
- 진입점: `import { colorsHex } from '@synapse/design-system'`
- mobile 의 inline hex 폴백 (`PAPER_HEX`, `INK_HEX`) 을 `colorsHex.light.paper / .ink` 로 교체 가능 — T9 unblock.

### `@synapse/design-system` copy (T4 완료, 2026-04-29)
```ts
// src/copy.ts — 진실원: 디자인 목업/content.jsx COPY (ko/en).
export interface OnboardingCopy { hi: string; sub: string; cta: string; hint: string }
export interface FirstChatCopy {
  placeholder: string; captured: string; capturedSub: string;
  empty: string; emptySub: string; error: string; errorSub: string; retry: string; typing: string;
}
export interface CopyShape { appName: string; tagline: string; onboarding: OnboardingCopy; firstChat: FirstChatCopy }
export const copy: { ko: CopyShape; en: CopyShape };
export type CopyLang = 'ko' | 'en';
```
- 진입점: `import { copy } from '@synapse/design-system'`
- ko/en parity 보장 (재귀 키 동등성 테스트).
- Sprint 1 화면 범위만 노출 — 목업 COPY 의 ghost/suggestion/strong/hyper/inspector/dismiss/expand 등은 *의도적으로 제외* (Sprint 2+ 화면에서 동일 진실원으로 확장).
- 소비자: mobile T10 (Onboarding 단일 화면), T11 (FirstChat placeholder/empty/error/typing), tester T12 (`copy.ko` ↔ `디자인 목업/content.jsx` 핵심 키 1:1 매칭).

### `@synapse/design-system` spacing/radius/shadow (T2 완료, 2026-04-29)
```ts
// src/spacing.ts — RN dp number, 4dp grid.
export const spacing: { xs: 4; sm: 8; md: 12; lg: 16; xl: 24 };

// src/radius.ts — RN dp number.
export const radius: { sm: 4; md: 12; lg: 18; xl: 22; pill: 999 };

// src/shadow.ts — RN-호환 shadow style 객체 (NOT css string).
export const shadow: {
  sm: { shadowColor: '#CB7229'; shadowOffset: { width: 0; height: 0 }; shadowOpacity: 0.5;  shadowRadius: 10; elevation: 2 };
  md: { shadowColor: '#CB7229'; shadowOffset: { width: 0; height: 0 }; shadowOpacity: 0.55; shadowRadius: 14; elevation: 4 };
};
```
- 진입점: `import { spacing, radius, shadow } from '@synapse/design-system'`
- 진실원: `디자인 목업/synapse-ui.jsx` 인라인 padding/gap/borderRadius/boxShadow 빈도 분석 (styles.css 에 `--space-*`/`--radius-*`/`--shadow-*` 변수가 없어 실 사용처에서 추출 — §11 출처 정정).
- shadow 는 RN style 객체 (iOS shadow* + Android elevation). CSS string export 금지 — RN 이 파싱 못함.
- 소비자: mobile T10 (Onboarding step padding/gap/CTA radius), T11 (FirstChat 메시지 버블 radius/padding, synapse glow shadow).

### `@synapse/design-system` motion (T3 완료, 2026-04-29)
```ts
// src/motion.ts — Sprint 1 의 1종 애니메이션. 진실원: styles.css @keyframes ink-rise.
export const motion: {
  inkRise: {
    duration: 400;        // ms (mockup: 0.4s)
    easing: 'ease-out';   // string — RN Animated/reanimated 매핑은 소비자 책임.
    from: { opacity: 0; translateY: 6 };
    to:   { opacity: 1; translateY: 0 };
  };
};
```
- 진입점: `import { motion } from '@synapse/design-system'`
- Sprint 1 사용처: mobile T11 의 FirstChat 어시스턴트 토큰 등장 (`for await` chunk 마다 ink-rise 적용).
- 추후 (Sprint 3+): `recallEmerge`, `synapsePulse`, `ghostBreathe`, `threadDraw`, `nodeOrbit` 동일 모양 (`{duration, easing, from, to}`) 으로 확장.

### `@synapse/llm` (T6 완료, 2026-04-29)
```ts
// packages/llm/index.ts
export * as gemma from './src/gemma.ts';

// packages/llm/src/gemma.ts
export async function complete(prompt: string): Promise<string>;                    // Sprint 0 그대로
export async function* completeStream(prompt: string): AsyncIterable<string>;       // T6 신규
export async function isAvailable(): Promise<boolean>;
export const config: { model: string; endpoint: string };
```
- `completeStream`: Ollama POST `/api/generate { model, prompt, stream: true }` → `res.body.getReader()` → UTF-8 decode → 개행(`\n`) 분할 → `JSON.parse({response, done})` → `response` yield. 라인 미완성(partial)은 내부 buffer 로 다음 read 까지 보류. `done: true` 만나면 즉시 return. 비-2xx → `Error('gemma <status>: <body>')`. fetch reject → 그대로 throw.
- env: `SYNAPSE_GEMMA_MODEL` (default `gemma3:4b`), `SYNAPSE_OLLAMA_URL` (default `http://localhost:11434`).
- 소비자: conversation T7 (`sendStream` 의 기본 LLM 어댑터).

### `@synapse/conversation` (T7 완료, 2026-04-29)
```ts
// packages/conversation/index.ts
export { send, sendStream } from './src/loop.ts';
export type { SendDeps, SendStreamDeps } from './src/loop.ts';

export type SendStreamDeps = {
  db: Database;
  completeStream?: (prompt: string) => AsyncIterable<string>;
};

export async function* sendStream(
  text: string,
  deps: SendStreamDeps,
): AsyncIterable<string>;
```
- 흐름: `ts0 = Date.now()` → user row append (ts=ts0) → `for await chunk of (deps.completeStream ?? gemma.completeStream)(text)` → `acc += chunk; yield chunk` → 종료 시 `ts1 = Date.now()`, assistant row append `{content: acc, ts: ts1, latency_ms: ts1 - ts0}`.
- 에러: 스트리밍 중 throw 시 user row 유지, assistant row 미적재, throw 전파. 호출자는 이미 yield 받은 청크를 가짐.
- Sprint 4 hook: `for await` 직전 한 줄 주석 — `// Sprint 4: orchestrator.decide(...) gate goes here — silence default keeps yield path open`.
- DI 패턴: `completeStream?` 옵션 함수 (Sprint 0 `complete?` 와 동일 패턴, 클래스/싱글톤 금지). 미주입 시 `gemma.completeStream` 사용.
- 기존 `send` (single-shot) Sprint 0 시그니처 그대로 보존.
- 소비자: mobile T11 (FirstChat `for await` 구독 + ink-rise), tester T12 (receipt 스트리밍 ≥ 2 청크 + latency_ms 적재 검증).

### `@synapse/protocol` + `@synapse/storage` (T5 완료, 2026-04-29)
```ts
// packages/protocol/src/message.ts
export type Role = 'user' | 'assistant';
export type Message = {
  id: string;
  role: Role;
  content: string;
  ts: number;
  latency_ms?: number; // Sprint 1: sendStream 가 user→last-token 까지 ms 적재. single-shot send 는 미지정 (NULL).
};
```
- 마이그: `packages/storage/schema/0002_latency.sql` — `ALTER TABLE messages ADD COLUMN latency_ms INTEGER` (NULL 허용). SQLite ALTER 는 IF NOT EXISTS 미지원 → 멱등성은 `_migrations` 트래킹.
- `appendMessage(db, msg: Message): void` — `msg.latency_ms` 미지정 시 NULL 로 INSERT.
- `listMessages(db): Message[]` — DB NULL ↔ TS `latency_ms` 필드 자체 생략 (round-trip 시 `=== undefined`).
- 기존 0001-only DB 도 migrate 1회 호출로 자동 0002 적용, `_migrations` 2 행 (`0001_init.sql`, `0002_latency.sql`). 재호출 멱등.
- 소비자: conversation T7 (`sendStream` 가 assistant 메시지에 `latency_ms` 채움), tester T12 (`listMessages().assistant.latency_ms != null` 검증), mobile T11 (FirstChat 마운트 시 `listMessages` 그대로 사용 — 추가 변경 없음).

### `apps/mobile` (T9+T10+T11 완료, 2026-04-29)
- **Expo Font 로드** (`apps/mobile/app/_layout.tsx`): `@expo-google-fonts/{source-serif-4,inter,jetbrains-mono}` 패키지에서 Source Serif 4 (400/600), Inter (400/500/600), JetBrains Mono (400/500) weight 를 `useFonts()` 로 로드. 폰트 family 키는 `design-system.fonts.{serif,sans,mono}` 와 동일한 'Source Serif 4' / 'Inter' / 'JetBrains Mono' 로 등록 — RN 의 `fontFamily` prop 가 같은 키로 조회. Bold weight 는 `${family}_600SemiBold` 와 같은 변형 키로 추가 등록.
- **Splash 처리**: `expo-splash-screen.preventAutoHideAsync()` 로딩 중 유지 → `useEffect` 가 `fontsLoaded || fontError` 시 `hideAsync()`. 폰트 미로딩 시 `null` 렌더 (web 빌드는 폰트 캐싱 후 즉시 마운트).
- **inline hex 폴백 제거** (T9, `apps/mobile/app/index.tsx`): Sprint 0 의 `PAPER_HEX`/`INK_HEX` 상수 삭제. 현재 `index.tsx` 는 `Redirect href="/onboarding"` 으로 단순화 (T10 의 라우팅 진입점). design-system 단일 진실원 일관성 회복.
- **Onboarding 단일 화면** (T10, `app/onboarding/index.tsx`, PM (A) 최종 사인오프 2026-04-29): 디자인 목업 `screens.jsx:30-78` (OnboardingScreen) 1:1 — SynapseGlyph 자리표시 (ink-dot 42dp, Sprint 7 polish 에서 정식 SVG) → `copy.ko.onboarding.hi` (Source Serif 4 40/600, -1.2 letterSpacing, ink) → `copy.ko.onboarding.sub` (Serif 19, opacity 0.66, -0.3 letterSpacing) → synapse-pulse 도트 3 (RN `Animated.loop`, opacity 0.4↔1.0, 1200ms half cycle ease-in-out, stagger 400ms — 목업 2.4s ease-in-out infinite 재현) + `copy.ko.onboarding.hint` (JetBrains Mono 10, uppercase) → bottom CTA `copy.ko.onboarding.cta` ("시작하기", Serif 17/600, ink bg + paper text, `radius.pill`, 100% width) + `copy.ko.tagline` (Mono 9.5, uppercase, opacity 0.32). `colorsHex.light.paper` 배경 + `padding 100/28/60` + `flex:1 + justifyContent:'space-between'`. CTA → `/chat`. 진행 인디 / 「다음」 CTA / step 분할 *없음* (목업 충실도).
- **FirstChat** (T11, `app/chat/{_layout.tsx,index.tsx}`): KeyboardAvoidingView (iOS padding) + `ChatHeader` (SynapseGlyph 자리표시 ink-dot + `copy.ko.appName` + "첫 대화" 서브타이틀) + `FlatList` 메시지 리스트 + `Composer` (TextInput multiline + 전송 버튼). UserBubble = ink bg / paper text / radius 18-18-18-4 / paddingV 10 paddingH 14, AIBubble = paper bg / ink text / synapse glyph dot 옆 / paddingV 8. 빈 상태 = `copy.ko.firstChat.{empty,emptySub}`. placeholder = `copy.ko.firstChat.placeholder`.
- **sendStream 구독**: onSubmit → user row 추가 + assistant placeholder 추가 (pending=true) → `for await (tok of sendStream(text)) { acc += tok; setMessages(...placeholder.content=acc) }` → 종료 시 placeholder.pending=false. 에러 시 placeholder 제거 + ErrorBanner (`copy.ko.firstChat.error`).
- **ink-rise 애니메이션**: `motion.inkRise` 토큰 (duration 400ms, easing ease-out, opacity 0↔1, translateY 6→0) 을 `<InkRise>` 컴포넌트로 감싼 RN `Animated.timing` 으로 매핑. `Easing.out(Easing.ease)` 매핑 (디자이너 가이드 — string identifier → RN Easing 매핑은 소비자 책임). 새 메시지 mount 시 0→1 progress, `interpolate` 로 opacity/translateY 동시 변환.
- **Platform adapter (chatStore)**: `apps/mobile/src/chatStore.ts` (native, `@synapse/storage` + `@synapse/conversation` 직접 사용) + `apps/mobile/src/chatStore.web.ts` (web stub, in-memory + 데모 토큰 시퀀스 yield). metro 의 platform extension 자동 분기 — web 빌드는 `.web.ts` 가 선택되어 `better-sqlite3` / `sqlite-vec` 가 *bundle 에 포함되지 않음* (`grep` 검증 0 hits). Sprint 7 native 빌드에서 진짜 SQLite 영속화 활성화.
- **package.json 추가 의존**: T9 — `expo-font@~13.0.1`, `expo-splash-screen@~0.29.0`, `@expo-google-fonts/{source-serif-4,inter,jetbrains-mono}@^0.2.3`. T11 — 추가 의존 없음 (RN core `Animated/Easing/FlatList/KeyboardAvoidingView/TextInput`).
- **빌드 검증**: `pnpm --filter @synapse/mobile run build` (= `expo export --platform web`) exit 0. dist/ entry-*.js ≈969 kB (T9 시 958 → T11 FirstChat 추가). 폰트 .ttf 정상 emit, native sqlite deps 미포함.
- 소비자: tester T12 (receipt 의 mobile build 단계 + sendStream node 검증), tester T13 (§9 Demo Script 의 시연 흐름 — `/` redirect → Onboarding 단일 화면 → "시작하기" 탭 → `/chat` 입력 → 어시스턴트 토큰 ink-rise 등장).

## 8. Test Scenarios
*(라이브 갱신)*

### llm (T6) — `packages/llm/__tests__/gemma-stream.test.ts`, 4 케이스 모두 pass
1. NDJSON 3줄 (`'안','녕','!'`, 마지막 라인 `done:true`) 스트림 → 토큰 순서대로 yield, 청크 ≥ 2.
2. **Partial chunk 버퍼링** — `'{"response":"hel'` + `'lo","done":false}\n{"resp'` 처럼 라인이 read 경계를 가로지르는 4 청크 → `['hello',' world','!']` (라인 재조립 검증).
3. 비-2xx (503) → `Error('gemma 503: …')` reject.
4. fetch 자체 throw (`ECONNREFUSED`) → 그대로 reject.
- (Sprint 0 회귀) `gemma.complete` 라이브 + `gemma.config` 2 케이스 그대로 통과.

### conversation (T7) — `packages/conversation/__tests__/loop-stream.test.ts`, 3 케이스 모두 pass
1. **Golden** — `completeStream` 주입 (`['안','녕','!']`) → 토큰 순서대로 yield, `messages` 2 row (`user='안녕'`, `assistant='안녕!'`), `user.ts <= assistant.ts`.
2. **Mid-stream error** — 첫 청크 후 stub 이 throw → 호출자는 첫 청크 받음 (`['안']`), user row 보존, assistant row 미적재, throw 전파 (`/gemma down mid-stream/`).
3. **latency_ms 적재** — 12ms+8ms sleep 가 들어간 stub stream → `assistant.latency_ms ≥ 15` 정량 검증, 단위 = ms (`Date.now()` 차).
- (Sprint 0 회귀) `send` golden + error 2 케이스 그대로 통과.

### storage (T5)
- `packages/storage/__tests__/db.test.ts` — 4 케이스 모두 `node:test` 통과:
  1. messages + messages_vec 존재성, append + list ts ASC round-trip (Sprint 0 회귀).
  2. migrate 멱등 — 재호출 후 `_migrations` 행 수 불변, `>= 2` (0001 + 0002).
  3. `latency_ms` 컬럼 존재 + round-trip — user(미지정) → undefined, assistant(`1234`) → `1234`.
  4. forward compat — Sprint 0 0001-only DB 시뮬레이션 후 migrate 호출 → 0002 적용 + legacy row 보존 + 재호출 멱등.

### design-system (T1+T2+T3+T4) — `packages/design-system/__tests__/*.test.ts`, 29 케이스 모두 pass
- `colorsHex.test.ts` (5): light/dark hex 형식, light.paper/ink 가 Sprint 0 mobile 폴백과 일치, synapse 가 light↔dark 동일, 키 parity.
- `copy.test.ts` (5): ko/en 재귀 키 shape 동등성, 최상위 langs 정확히 `{ko,en}`, Sprint 1 화면 필수 키 존재성, ko/en 핵심 카피 ↔ `디자인 목업/content.jsx` COPY 1:1 spot check.
- `spacing.test.ts` (8): spacing/radius/shadow 통합. spacing 5단 number + 단조 증가 + 4의 배수, radius 5단 number + pill≥999 + lg=18, shadow sm/md RN style 객체 + CSS string 미export.
- `motion.test.ts` (6): inkRise 존재 + duration=400 + easing='ease-out' + from `{opacity:0, translateY:6}` + to `{opacity:1, translateY:0}` + duration 이 number (CSS string 아님).
- `tokens.test.ts` (5): Sprint 0 회귀 — colors oklch 형식, light.paper styles.css 매칭, synapse light↔dark 동일, fonts family, role 매핑.

### orchestrator (T8) — `packages/orchestrator/__tests__/decide.test.ts`, 2 케이스 (Sprint 0 회귀, T8 동작 변경 0)
1. `decide()` 디폴트 → silence (Sprint 0 헌법).
2. `recentMessages` / `candidates` 무시 (Sprint 4 hook 자리표시 주석 추가 후에도 silence 동결).

### mobile (T9, T10, T11)
*(RN 환경 부담으로 단위 테스트는 보류 — receipt step 3 의 `pnpm --filter @synapse/mobile run build` 통과로 갈음. T11 ink-rise 시각 회귀는 Sprint 7 Polish 로 위임.)*
- T9 검증: `apps/mobile/dist/_expo/static/js/web/entry-*.js` (≈958kB) + 폰트 .ttf emit 확인. inline `PAPER_HEX`/`INK_HEX` 상수 부재 (`grep -r 'PAPER_HEX' apps/mobile/app` → 0건).
- T10 검증: `pnpm --filter @synapse/mobile start` 후 시뮬레이터에서 Onboarding 단일 화면 시각 비교 (목업 `screens.jsx` `OnboardingScreen` 와 1:1, hi+sub+synapse-pulse 도트+hint+cta+tagline 한 페이지; PM (A) 최종 사인오프).
- T11 검증: 입력 "안녕" → 어시스턴트 토큰이 `motion.inkRise` 로 등장 → 재마운트 후 메시지 유지.

### receipt (T12) — `scripts/receipt/sprint-1.sh`, 8 단계 (자동화, Sprint 0 5단계 → 8단계 확장)
1. `pnpm install --frozen-lockfile=false`.
2. `pnpm -r test` — Sprint 0 22 + 신규 (gemma-stream 4 + loop-stream 3 + design-system 29 + storage +2) 모두 pass.
3. `pnpm --filter @synapse/mobile run build` exit 0 (Expo Web bundle).
4. e2e single-shot — Sprint 0 의 `send.mjs` 그대로 보존, `send("안녕", {db})` 실행 + 응답 non-empty.
5. e2e stream — `streamSend.mjs`: `for await tok of sendStream("안녕", { db })` 청크 카운트 + 누적, `chunks ≥ 1 AND length ≥ 1`. (실측 `chunks=10, length=22, ms=594` — 헌법 `≥ 2 AND ≥ 5` 도 자연 만족. 짧은 답 false-negative 리스크 회피 위해 `≥ 1` 로 시작, 연속 receipt 통과 후 강화 가능.)
6. verify latency_ms — `verify-stream.mjs`: 마지막 assistant row 의 `latency_ms` 가 number AND > 0.
7. verify COPY i18n — `verify-copy.mjs`: `@synapse/design-system.copy.ko` 와 `디자인 목업/content.jsx` 의 핵심 키 (`onboard.hi/sub/cta/hint`, `placeholder`, `tagline`) 1:1 raw-text 매칭. `Object.assign(window, ...)` 가 ESM import 막으므로 `fs.readFile` + 정규식 추출.
8. verify SQLite rows — Sprint 0 step 5 보존 (user ≥ 1 AND assistant ≥ 1).
- Ollama 미가동 시 step 4/5/6 → 친절 fail (`brew services start ollama` + `ollama pull gemma3:4b` 안내). step 1/2/3/7/8 은 가동 무관 통과.
- workspace alias 함정 회피: 모든 inline node 호출은 `packages/conversation/.receipt-runner/*.mjs` 진입점 + `node --experimental-strip-types`. `node -e` 금지.

## 9. Demo Script
*(receipt 재현용 step-by-step — PM 이 그대로 따라할 수 있어야 함. Sprint 0 6 단계 → Sprint 1 형태로 갱신.)*

### 0. 사전 환경
- macOS / Node 22+ / pnpm 9+ / sqlite3 (시스템 또는 better-sqlite3 자동 빌드).
- Ollama: `brew install ollama` → `brew services start ollama` → `ollama pull gemma3:4b`.
- 헬스체크: `curl -sf http://localhost:11434/api/tags > /dev/null && echo OK`.

### 1. 의존성 설치
```bash
cd /Users/kimsemin/Desktop/2026/Synapse
pnpm install
```
기대: 워크스페이스 7 패키지 (mobile + conversation + llm + engine + orchestrator + storage + design-system + protocol) 링크. lockfile 갱신 OK.

### 2. 단위 테스트 일괄
```bash
pnpm -r test
```
기대: 모든 패키지 `node:test` 통과. 합산 ≈ Sprint 0 22 + 신규 ~38 ≈ 60 케이스 (gemma-stream 4 + loop-stream 3 + design-system 29 + storage +2).

### 3. 모바일 번들 빌드
```bash
pnpm --filter @synapse/mobile run build
```
기대: Expo Web bundle (`apps/mobile/dist/_expo/static/js/web/entry-*.js`) 생성, 폰트 .ttf emit, exit 0. (Native 빌드는 Sprint 7.)

### 4. 종단 receipt
```bash
bash scripts/receipt/sprint-1.sh
```
기대: 8 단계 모두 `▶ [n/8] ...` 진행 후 마지막 줄 `✅ Sprint 1 receipt PASSED`. 어느 단계에서 죽었는지 명확히 표시.
- step 4/5/6 가 가장 변동성 큼 (Ollama 가동 + 모델 로드 시간 — 첫 응답 5~30s 정상). 미가동시 즉시 친절 fail.

### 5. 인터랙티브 시각 검증 (Expo Dev Server)
```bash
pnpm --filter @synapse/mobile start
```
- 시뮬레이터 / 웹 / Expo Go 에서 Onboarding 단일 화면 (hi+sub+synapse-pulse 도트+hint+cta+tagline 한 페이지) 확인 (목업 `screens.jsx` `OnboardingScreen` 와 1:1; PM (A) 최종 사인오프).
- "시작하기" 탭 → FirstChat 진입.
- 입력창에 "안녕" 입력 → 어시스턴트 토큰이 `motion.inkRise` 애니메이션으로 등장 (blur→clear, 위로 살짝 떠오름).
- 앱 종료 후 재진입 → user/assistant 메시지 모두 보임 (SQLite 영속화 확인).

### 6. 디자인 목업 사이드-바이-사이드 비교 (수동 시각 회귀)
```bash
python3 -m http.server -d "디자인 목업"
```
- 브라우저로 `http://localhost:8000` 열기.
- Onboarding/FirstChat 화면을 RN 빌드와 픽셀 단위로 비교 — 색 (`paper #F5F0E8`, `ink #2A2620`, `synapse #CB7229`), font role (serif=Source Serif 4 / ui=Inter / meta=JetBrains Mono), spacing/radius 일치 확인.
- 자동 시각 회귀 (Playwright/Puppeteer DOM 스냅샷) 는 Sprint 7 Polish 로 위임.

## 10. Implementation Map

**Receipt 검증 결과 (2026-04-29, PM 환경, Ollama gemma3:4b UP)**: ✅ **PASS** (8/8 단계). 53 단위 테스트 (storage 4 + llm 6 + conversation 5 + orchestrator 2 + engine 7 + design-system 29) all green. mobile web bundle 969 kB. e2e stream `chunks=10 length=22 ms=594`. latency_ms=593 적재. COPY i18n ok=6. PM (A) 최종 확정 후 코드 변경 0 → /end 시점 재실행 불필요.

**`packages/protocol`** (`@synapse/protocol`):
- `src/message.ts` — `Message {id, role, content, ts, latency_ms?: number}` (Sprint 1 `latency_ms` optional 추가, T5).

**`packages/storage`** (`@synapse/storage`, deps: better-sqlite3 / sqlite-vec):
- `schema/0001_init.sql` (Sprint 0) + `schema/0002_latency.sql` — `ALTER TABLE messages ADD COLUMN latency_ms INTEGER`. SQLite ALTER 멱등성은 `_migrations` 트래킹.
- `src/{db.ts,migrate.ts,messages.ts}` — `openDb` / `migrate` / `appendMessage(db, msg)` (latency_ms? optional INSERT) / `listMessages` (round-trip latency_ms 노출).
- `__tests__/db.test.ts` 4 케이스 (Sprint 0 회귀 1 + 멱등성 + latency_ms round-trip + 0001-only forward compat).

**`packages/llm`** (`@synapse/llm`):
- `src/gemma.ts` — Sprint 0 의 `complete` / `isAvailable` / `config` 보존 + **`completeStream(prompt): AsyncIterable<string>`** 신규 (T6). Ollama POST `/api/generate {stream:true}` → `res.body.getReader()` → utf-8 decode → 개행 분할 (partial chunk 버퍼링) → `JSON.parse({response, done})` → `response` yield, `done:true` 만나면 즉시 return. 비-2xx → `Error('gemma <status>: <body>')`, fetch reject 그대로 전파.
- `__tests__/{gemma.test.ts,gemma-stream.test.ts}` — 6 케이스 (Sprint 0 2 회귀 + Sprint 1 4 신규: NDJSON 청크 / partial 라인 버퍼링 / 503 / ECONNREFUSED).

**`packages/conversation`** (`@synapse/conversation`, deps: protocol/storage/llm):
- `src/loop.ts` — Sprint 0 `send(text, {db, complete?})` 보존 + **`sendStream(text, {db, completeStream?}): AsyncIterable<string>`** 신규 (T7). user append (ts0) → for-await yield → 종료 시 `latency_ms = Date.now() - ts0` 와 함께 assistant append. Sprint 4 hook 1줄 주석 (`for await` 직전).
- `__tests__/{loop.test.ts,loop-stream.test.ts}` — 5 케이스 (Sprint 0 2 회귀 + Sprint 1 3: golden / mid-stream error / latency_ms 정량).
- `.receipt-runner/{streamSend.mjs,verify-stream.mjs}` — receipt step 5/6 인라인 진입점 (workspace alias 함정 회피).

**`packages/engine`** (`@synapse/engine`):
- 변경 없음 — Sprint 0 stub 유지 (`extractConcepts` / `buildEdges` / `recall` 모두 throw `'not implemented in sprint 0'`).
- `__tests__/types.test.ts` 7 케이스 그대로 통과.

**`packages/orchestrator`** (`@synapse/orchestrator`, T8):
- `src/decide.ts` — `decide()` 본문 첫 줄에 Sprint 4 hook 주석 1줄 추가 (`// Sprint 4: trigger/silence rules go here (DecisionAct enum 동결)`). silence 디폴트 + DecisionAct enum (`'silence'|'ghost'|'suggestion'|'strong'`) 동결. 동작 변경 0.
- `__tests__/decide.test.ts` 2 케이스 그대로 통과.

**`packages/design-system`** (`@synapse/design-system`, T1+T2+T3+T4):
- `src/colorsHex.ts` (T1) — `colorsHex.{light,dark}.{paper,ink,synapse}` hex dual export. light = Sprint 0 mobile 폴백 매칭 (`#F5F0E8 / #2A2620 / #CB7229`), dark = oklch 변환 (`#1A1511 / #F1EAE3`), dark.synapse = light 와 동일 (styles.css `--synapse` 미재정의).
- `src/spacing.ts` (T2) — `spacing.{xs:4, sm:8, md:12, lg:16, xl:24}` (4dp grid, RN dp number).
- `src/radius.ts` (T2) — `radius.{sm:4, md:12, lg:18, xl:22, pill:999}`.
- `src/shadow.ts` (T2) — `shadow.{sm,md}` RN style 객체 (shadowColor=`#CB7229` + offset/opacity/radius/elevation).
- `src/motion.ts` (T3) — `motion.inkRise = {duration:400, easing:'ease-out', from:{opacity:0,translateY:6}, to:{opacity:1,translateY:0}}`. 1종만 (Sprint 1 정책).
- `src/copy.ts` (T4) — `copy.{ko,en}` 트리: `appName` / `tagline` / `onboarding.{hi,sub,cta,hint}` / `firstChat.{placeholder,captured,capturedSub,empty,emptySub,error,errorSub,retry,typing}`. 진실원 = `디자인 목업/content.jsx`.
- `src/{tokens.ts,fonts.ts}` — Sprint 0 그대로 (oklch colors + fonts/role).
- `__tests__/{colorsHex,copy,spacing,motion,tokens}.test.ts` — 29 케이스.
- `.receipt-runner/verify-copy.mjs` — receipt step 7 (`copy.ko` ↔ content.jsx 핵심 키 1:1 raw-text 매칭, ok=6).

**`apps/mobile`** (`@synapse/mobile`, T9+T10+T11):
- `app/_layout.tsx` (T9) — `expo-font` + `expo-splash-screen` + `@expo-google-fonts/{source-serif-4,inter,jetbrains-mono}` 로드. fonts.{serif,sans,mono} 키로 매핑.
- `app/index.tsx` (T9+T10) — Sprint 0 폴백 hex 제거. `Redirect href="/onboarding"`.
- `app/onboarding/index.tsx` (T10, **PM (A) 최종 사인오프**) — 디자인 목업 `screens.jsx:30-78` `OnboardingScreen` 1:1 단일 화면. SynapseGlyph (ink dot 42dp 자리표시) → hi → sub → synapse-pulse 도트 3 + hint → CTA "시작하기" (radius.pill, ink bg) → tagline. CTA → `/chat`.
- `app/chat/{_layout.tsx,index.tsx}` (T11) — KeyboardAvoidingView + ChatHeader (글리프 + appName + "첫 대화") + FlatList (UserBubble 18-18-18-4 ink, AIBubble 18-18-4-18 paper) + Composer (TextInput multiline + 전송). onSubmit → `for await tok of sendStream` → assistant placeholder content 누적 + ink-rise 매핑 (`<InkRise>` Animated.timing + Easing.out + interpolate, useNativeDriver true). 에러 시 placeholder 제거 + ErrorBanner.
- `src/chatStore.ts` (T11 native) — `@synapse/storage` + `@synapse/conversation` 직접 사용 (openDb/migrate/listMessages/sendStream 위임).
- `src/chatStore.web.ts` (T11 web) — in-memory 메시지 배열 + 데모 토큰 시퀀스 yield. metro platform extension 자동 분기 — web bundle 에 better-sqlite3/sqlite-vec 0 hits.
- `package.json` 추가 의존: `expo-font@~13.0.1`, `expo-splash-screen@~0.29.0`, `@expo-google-fonts/{source-serif-4,inter,jetbrains-mono}@^0.2.3`.
- 빌드: `pnpm --filter @synapse/mobile run build` exit 0, dist 969 kB.

**`scripts/receipt/sprint-1.sh`** (T12, 8 단계):
1. `pnpm install`
2. `pnpm -r test` (53 케이스)
3. `pnpm --filter @synapse/mobile run build`
4. e2e single-shot (Sprint 0 보존)
5. e2e stream (`streamSend.mjs` — chunks ≥ 1 AND length ≥ 1; 실측 chunks=10 length=22)
6. verify latency_ms (`verify-stream.mjs` — number > 0; 실측 593)
7. verify COPY i18n (`verify-copy.mjs` — ok=6)
8. verify SQLite rows (Sprint 0 보존)
- Ollama 미가동 시 step 4/5/6 친절 fail (`brew services start ollama` 안내).

**`e2e/scenarios/sprint-1-streaming.md`** — 시나리오 + 실패 모드 매트릭스 (T13 작성).

**`docs/`**:
- `sprints/_current.txt` — `2` (이 /end 직후).
- `sprints/sprint-1-conversation-loop.md` — 본 문서 (마감).
- `sprints/sprint-2-agent-workflow-hardening.md` — 다음 스프린트 스켈레톤 (이 /end 가 생성).

**메모리 영속화** (이 sprint 회고 → 다음 사이클 헌법):
- `~/.claude/projects/-Users-kimsemin-Desktop-2026-Synapse/memory/feedback_decision_serialization.md` (이 sprint 신규) — HOLD-DECIDE-RESUME / Decision-version 태그 / Source-of-truth 우선순위 / 단일 작성자 시간창 4 패턴.
- `feedback_mockup_truth.md` (designer 가 sprint 중 영속화) — dev doc task description vs 디자인 목업 충돌 시 목업 우선.
- `feedback_receipt_threshold.md` (이 sprint 신규) — 정량 임계 (chunks/length/latency) 는 ≥ 1 로 시작, 연속 receipt 통과 후 헌법 권장값으로 회복.

## 11. Decisions Made / Open Issues
**Decisions Made:**
- **[FROZEN v2026-04-29 D-T1-colorsHex]** **T1 colorsHex 매핑 출처**: light.paper/light.ink 는 Sprint 0 mobile 폴백 hex (`#F5F0E8`/`#2A2620`) 채택. 정확한 oklch→sRGB 변환은 `#F8F2EB`/`#211912` 이지만, 사용자 시각 검증을 거친 폴백을 진실로 둠 (mobile T9 의 inline 상수와 동일하게 유지하여 시각 회귀 0). synapse 는 신규 토큰이라 정확 변환값 (`#CB7229`) 사용. dark.paper/ink 는 styles.css `[data-theme="dark"]` oklch 정확 변환 (`#1A1511`/`#F1EAE3`). dark.synapse 는 styles.css 가 dark 에서 `--synapse` 미재정의 → light 와 동일 (`#CB7229`).
- **[FROZEN v2026-04-29 D-T8-unchanged]** **T8 orchestrator unchanged** — Sprint 4 hook 자리표시 주석 1줄 추가 (`packages/orchestrator/src/decide.ts`). silence 디폴트 + DecisionAct enum (`'silence' | 'ghost' | 'suggestion' | 'strong'`) Sprint 3 까지 동결 유지. 기존 테스트 2/2 pass, 동작 변경 없음.
- **[FROZEN v2026-04-29 D-T5-protocol-latency]** **T5 `Message.latency_ms` 는 protocol 단일 진실원 (옵션 A 채택, 2026-04-29).** `packages/protocol/src/message.ts` 의 `Message` 에 `latency_ms?: number` optional 추가. 이유: (1) latency 는 `ts` 처럼 메시지의 자연스러운 메타, (2) Sprint 2 의 `tokens` 컬럼도 같은 자리에 합류 예정 — protocol 한 곳에서 진화, (3) storage / conversation / mobile 이 같은 타입을 유통 → DI 경계의 형변환 0. 트레이드오프: protocol 이 storage 메타를 인지함 — 허용. (storage 에이전트 결정.)
- **[FROZEN v2026-04-29 D-T5-migration-0002]** **T5 0002 마이그는 단 1줄 ALTER.** `ALTER TABLE messages ADD COLUMN latency_ms INTEGER`. SQLite 가 컬럼 단위 IF NOT EXISTS 를 미지원 → 멱등성은 전적으로 `_migrations` 트래킹에 의존. 0001-only legacy DB 도 forward compat 테스트로 검증 (test #4).
- **[FROZEN v2026-04-29 D-T4-copy-scope]** **T4 copy 범위**: Sprint 1 화면 (Onboarding + FirstChat) 에 직접 필요한 키만 노출 — `appName`, `tagline`, `onboarding.{hi,sub,cta,hint}`, `firstChat.{placeholder,captured,capturedSub,empty,emptySub,error,errorSub,retry,typing}`. 목업 COPY 의 나머지 키 (ghost/suggestion/strong/hyper/inspector/dismiss/expand 등) 는 *의도적으로 제외* — Sprint 2+ 화면 owner 가 추가할 때 동일 진실원 (디자인 목업/content.jsx) 에서 확장. 이유: Sprint 1 receipt 스코프를 좁혀 i18n 회귀 표면 최소화.
- **[FROZEN v2026-04-29 D-T4-copy-onboarding]** **T4 onboarding 카피 구조**: designer 는 카피를 목업 그대로 `onboarding.{hi,sub,cta,hint}` + 최상위 `tagline` 으로 노출 (디자인 목업 `screens.jsx` `OnboardingScreen` 의 단일 화면 흐름 hi → sub → hint+cta+tagline 1:1). PM (A) 최종 사인오프로 mobile T10 도 단일 화면 — 카피 키와 화면 구조가 일치.
- **[FROZEN v2026-04-29 D-T2-token-source]** **T2 spacing/radius/shadow 출처**: styles.css 에 `--space-*`/`--radius-*`/`--shadow-*` CSS 변수가 정의되어 있지 않아, dev doc §3 In 의 "styles.css 1:1 추출" 표현은 *실제로는 synapse-ui.jsx 인라인 값 빈도 분석* 으로 정정됨. designer 가 grep 으로 빈도 추출 → 4dp grid 정규화 → 토큰화. spacing 5단 (xs/sm/md/lg/xl), radius 5단 (sm/md/lg/xl/pill), shadow 2단 (sm/md). 정규화로 일부 정확값 (예: bubble 10/14 padding) 이 가까운 토큰으로 이동 — Sprint 1 receipt 가 시각 회귀 미포함이라 허용. 다음 스프린트 carry-over 에 진실원 표현 정정 권장.
- **[FROZEN v2026-04-29 D-T2-shadow-rn]** **T2 shadow 는 RN 객체.** 목업 boxShadow `0 0 10px var(--synapse-glow)` 같은 CSS string 은 RN 미파싱 → RN style 객체 (`shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius`/`elevation`) 로 export. shadow 색은 `colorsHex.light.synapse` (`#CB7229`) — 목업 `--synapse-glow` 의 oklch 보다 살짝 진하지만 RN 단순화 채택.
- **[FROZEN v2026-04-29 D-T3-motion-single]** **T3 motion 은 1종만 (`inkRise`).** Sprint 1 의 1종 애니메이션 정책 (dev doc §3 + CLAUDE.md). 나머지 5종 (recall-emerge / synapse-pulse / ghost-breathe / thread-draw / node-orbit) 은 Sprint 3+ 에서 추가. 시그니처 모양은 `{ duration: number, easing: string, from: object, to: object }` 로 동결 — 추가 토큰도 동일 모양으로 확장.
- **[FROZEN v2026-04-29 D-T6-stream-signature]** **T6 `gemma.completeStream` 시그니처 = `AsyncIterable<string>` (async generator).** 이유: §4 Architecture 의 결정과 일치 — RN UI `for await` 구독 자연스럽고 토큰 단위 테스트가 콜백보다 깔끔. `onToken` 콜백 미채택. NDJSON 라인 재조립은 utf-8 stream-decoder + 개행 분할 + 내부 buffer (read 경계 가로지르는 라인 보존). `done:true` 만나면 즉시 return — 이후 트레일링 데이터 무시. 비-2xx 는 `Error('gemma <status>: <body>')`, fetch 자체 throw 는 그대로 전파.
- **[FROZEN v2026-04-29 D-T7-sendstream-signature]** **T7 `sendStream` 시그니처 = `(text, { db, completeStream? }) → AsyncIterable<string>` (Sprint 1 Decisions 동결).** Sprint 0 `send(text, {db, complete?})` 와 동일 DI 패턴 (옵션 함수 주입, 클래스/싱글톤 금지). 미주입 시 `gemma.completeStream` 기본 사용. memory `feedback_di_pattern` 일관 — Sprint 6 Humble Retraction 의 reject 동작도 같은 패턴 재사용 예정.
- **[FROZEN v2026-04-29 D-T7-latency-measurement]** **T7 `latency_ms` 측정 = `Date.now()` 차 (ms).** `ts0` 는 user row append 직전, `ts1` 은 스트림 종료 직후. user→last-token 전체 구간. 단발 `complete` 평균 5.7s (Sprint 0) 대비 첫 토큰 latency 분리 측정은 Sprint 7 ghost-emerge 애니메이션 타이밍 결정 시 별도 도입 (현재는 종단 latency 만).
- **[FROZEN v2026-04-29 D-T7-error-policy]** **T7 에러 정책: 스트리밍 중 throw 시 user row 보존, assistant row 미적재, throw 전파.** 호출자는 이미 yield 받은 청크를 그대로 가짐 (소비된 토큰은 UI 에 남겨도 무방). 부분 스트림으로 인한 assistant row 무결성 깨짐 방지. (Sprint 0 `send` 의 동일 약속 — single-shot/streaming 양쪽 일관.)
- **[FROZEN v2026-04-29 D-T7-sprint4-hook]** **T7 Sprint 4 hook 주석은 정확히 한 줄, `for await` 직전:** `// Sprint 4: orchestrator.decide(...) gate goes here — silence default keeps yield path open`. 동작 변경 0, 자리만 표시. engine/orchestrator import 금지 약속 유지.
- **[FROZEN v2026-04-29 D-T11-platform-adapter]** **T11 mobile platform adapter — `apps/mobile/src/chatStore{,.web}.ts` (mobile 결정, 2026-04-29; team-lead 승격 2026-04-29).** dev doc §4 는 FirstChat 가 `@synapse/storage` + `@synapse/conversation` 를 *직접 import* 한다고 명시하지만, `@synapse/storage` 가 `better-sqlite3` 네이티브 의존이라 web bundle 에 포함되면 빌드 실패. metro 의 platform extension (`.web.ts` 우선 resolution) 으로 *얇은 어댑터 2 파일* 도입: native (default) `chatStore.ts` 가 `openDb/migrate/listMessages/sendStream` 위임, web `chatStore.web.ts` 가 in-memory 메시지 배열 + 짧은 데모 토큰 시퀀스 yield (web 빌드의 영속화 검증은 receipt 의 `streamSend.mjs` 가 node 환경에서 별도로 담당). 결과: web bundle 에 `better-sqlite3` / `sqlite-vec` 0 hits (grep 검증). Sprint 7 native 빌드에서 native 어댑터가 자동 활성화. dev doc §4 의 "직접 import" 는 *경계가 mobile 어댑터 1 단계 추가됨* 으로 정정. **Sprint 2+ 강제: mobile 에서 `@synapse/storage` / `@synapse/engine` 등 native-only 모듈을 (간접적으로라도) 끌어들이는 모든 모듈은 `<feature>.{ts,web.ts}` 어댑터 짝 필수** — Concept/Graph/Recall (Sprint 2) 도입 시 `apps/mobile/src/conceptStore.{ts,web.ts}` / `graphStore.{ts,web.ts}` 형태. 위반 시 web bundle 빌드 실패로 receipt step 3 가 잡음.
- **[FROZEN v2026-04-29 D-T11-ink-rise]** **T11 ink-rise 매핑 = `Easing.out(Easing.ease)` (mobile 결정, 2026-04-29).** `motion.inkRise.easing` 은 `'ease-out'` string identifier — designer T3 의 의도 그대로 "RN Animated/reanimated 매핑은 소비자 책임". `easingFor(name)` 헬퍼가 `'ease-out' | 'ease-in' | 'ease-in-out'` 3 종을 RN `Easing` 함수로 매핑. progress 0→1 `Animated.timing` 후 `interpolate` 로 `from {opacity:0, translateY:6}` → `to {opacity:1, translateY:0}` 동시 적용. `useNativeDriver: true` — 60fps 보장.
- **[FROZEN v2026-04-29 D-T10-onboarding-A]** **T10 Onboarding 최종 = 단일 화면 (PM 사인오프 2026-04-29 [v-PM-A-FINAL]).** 디자인 목업 `screens.jsx` `OnboardingScreen` 1:1 (`copy.ko.onboarding.{hi,sub,hint,cta}` + `copy.ko.tagline`). 진행 인디 / 「다음」 CTA / step 분할 *없음*. (B') 3-step 시도는 timing collision 으로 폐기 — §12 carry-over. 파일 = `apps/mobile/app/onboarding/index.tsx` (단일). 잔여 충실도 항목 (synapse-pulse 토큰화 / SynapseGlyph 정식 SVG) 은 §12 Sprint 7 carry-over.

**Open Issues:**
- *(Onboarding (A) PM 최종 사인오프 완료. 신규 issue 없음.)*

## 12. Carry-over + Retrospective
**Carry-over (다음 스프린트가 반드시 알아야 할 것):**

### Sprint 2 액션 필수
1. **Storage 소비자 platform-adapter 패턴 강제** (T11, team-lead 승격 2026-04-29): `apps/mobile/src/chatStore.{ts,web.ts}` 분기. metro 가 web 빌드에서 `.web.ts` 자동 선택 → web bundle 에 native-only 모듈 0 hits (grep 검증). Sprint 2 의 `@synapse/engine` (Concept/Graph/Recall) 어댑터도 mobile 호출 시 동일 패턴 필수 — `apps/mobile/src/conceptStore.{ts,web.ts}` / `graphStore.{ts,web.ts}` 등. 위반 시 web bundle 빌드 실패로 receipt step 3 가 잡음.
4. **mobile `@types/node` 미설치** (T9, team-lead 지시 2026-04-29): `apps/mobile/tsconfig.json` 의 `"types": ["node", "expo"]` 가 `@types/node` 미설치로 typecheck fail. 코드 자체 TS 오류 0, 빌드/런타임/receipt 의존 없음. Sprint 2 시작 직후 `apps/mobile/devDependencies` 에 `@types/node` 1 줄 추가.
7. **Decision serialization 패턴** (Sprint 1 회고 → Sprint 2 도입, team-lead 지시 2026-04-29): Sprint 2 부터 **HOLD-DECIDE-RESUME** 패턴 + Decision-version 태그 + Source-of-truth 우선순위 (`code > task subject > frozen dev doc > inbox`) 강제. PM 결정 진행 *도중* dev doc 편집 / 메시지 발송 동시 진행 금지 — HOLD 신호 받으면 모든 에이전트 잠금. Sprint 1 의 (A)/(B') 4 회 reversal 의 직접 원인.

### Sprint 3+ Polish 위임
2. **synapse-pulse 토큰 미존재** (T10, Sprint 3+): T3 가 `motion.inkRise` 만 노출 — Onboarding 의 도트 펄스는 `app/onboarding/index.tsx` 의 `PulseDot` 인라인 (`Animated.loop`, opacity 0.4↔1.0, half-cycle 1200ms ease-in-out, stagger 400ms — 목업 `@keyframes synapse-pulse` 2.4s ease-in-out infinite 재현). Sprint 3+ `motion.synapsePulse` 토큰 추가 시 인라인 교체.
8. **Receipt 헌법 chunks/length 임계 강화** (T12 측정, team-lead 지시 2026-04-29): 현 receipt step 5 헌법 = `chunks ≥ 1 AND length ≥ 1` (짧은 답 false-negative 회피). Sprint 1 실측 `chunks=10 length=22 ms=594` 로 헌법의 `≥ 2 AND ≥ 5` 자연 만족 — 다음 Sprint receipt 가 연속 통과하면 강화 (`≥ 2 AND ≥ 5`) 회복.

### Sprint 7 Polish 위임
3. **SynapseGlyph 자리표시** (T10/T11, Sprint 7): Onboarding + FirstChat ChatHeader 의 SynapseGlyph 가 `colorsHex.light.ink` 원형 dot 으로 단순화 (42dp / 26dp). Sprint 7 polish 에서 `react-native-svg` 도입 시 목업 SVG (`synapse-ui.jsx`) 정식 이식.
5. **chatStore `@synapse/*` LSP 진단 노이즈** (T11, Sprint 7): TS LSP 가 workspace alias resolve 를 부분 인식 못해 `@synapse/storage` / `@synapse/conversation` 에 진단 띄움. 빌드/런타임/receipt 무관. Sprint 7 polish (혹은 더 일찍) 에서 mobile `tsconfig.json` 에 path mapping 추가로 해결.

### Sprint 1 회고 → Sprint 2 표준 절차 도입
6. **(A)/(B') timing collision 회고 — `/start` 표준 절차 보강** (team-lead 지시 2026-04-29): Sprint 1 중 PM (A) → mobile retrofit (B') → team-lead (B') 지시 → mobile re-retrofit (A) → PM (A) 재확정 → mobile (B') flip → PM (A) 최종 → mobile (A) 최종 의 **4 회 reversal** 발생. 원인: `/start` 의 §3 Scope 분해가 *디자인 목업과 1:1 검증* 을 거치지 않으면 다운스트림에서 timing 충돌이 ripple, 동시에 dev doc 동시 편집으로 race. designer `feedback_mockup_truth.md` + (예정) team-lead `feedback_decision_serialization.md` 메모리로 영속화. **`/start` 직후 designer 의 *목업 ↔ §3 Scope 정합성 점검* 을 표준 절차로 도입** — Sprint 2 부트 시 즉시 적용.
9. **dev doc 동시 편집 — 단일 작성자 시간창** (Sprint 1 회고 → Sprint 2 도입): Sprint 1 §3-§12 가 team-lead / tester / mobile 동시 편집으로 race + (A)/(B') flip 의 충돌 비용 증폭. **Sprint 2 부터 한 섹션 한 작성자 + 충돌 시 후입자가 SendMessage 로 위임** — file lock 의 사회적 버전. dev doc 라이브 큐레이션 (tester T13) 도 동일 규칙 적용.

### 로드맵 시프트 (PM 사인오프 2026-04-29)
10. **Sprint 2 = Agent Workflow Hardening (신규 삽입), Memory Formation 은 Sprint 3 으로 시프트, 후속 sprint 모두 1씩 시프트, 총 sprint 7 → 8.** 사유: 본 sprint 의 (A)/(B') 5중 timing collision 회고 — Sprint 3+ Memory Formation / Recall / Hyper-Recall 처럼 *결정 surface 가 커지는 단계* 에서 race ripple 비용이 지수적이라, 워크플로우 부채를 먼저 갚는 게 ROI 큼. 본 sprint 의 `feedback_decision_serialization.md` 메모리가 Sprint 2 의 4 패턴 헌법화의 단일 진실원.

### 가정 보존
- Sprint 0 / Sprint 1 의 다른 모든 가정은 직전 스프린트 그대로 유지.

**Retrospective:**

*잘 된 것*:
- **Receipt 8/8 PASS** (53 단위 테스트, mobile 969 kB, e2e stream chunks=10/length=22/ms=594, COPY i18n 1:1) — 7 패키지 + mobile 의 종단 흐름이 안정적으로 호흡.
- **dev doc §7 라이브 큐레이션 패턴이 안착** — 워커들이 시그니처 결정을 즉시 §7 에 박은 덕에 /end 가 거의 큐레이션만 함. tester T13 의 verify-copy 도 같은 진실원 위에서 자동 매칭.
- **DI 패턴 일관 (Sprint 0 → Sprint 1)** — `send` 의 `complete?` 옵션 → `sendStream` 의 `completeStream?` 옵션. 클래스/싱글톤 0, memory `feedback_di_pattern` 그대로 확장.
- **mobile chatStore.{ts,web.ts} platform adapter** — better-sqlite3 가 web bundle 에 빌드되는 함정을 metro 의 platform extension 으로 자동 우회. Sprint 2+ 의 native-only 의존 모듈에 동일 패턴 강제 → §12 carry-over 1번.
- **storage `Message.latency_ms` protocol 단일 진실원 채택** — Sprint 2 `tokens` 컬럼도 같은 자리에 합류 예정, DI 경계 형변환 0.
- **(A)/(B') saga 의 disclosure 정직함** — mobile 이 4번 reversal 동안 §11 / §12 에 *honest disclosure* 를 매번 남김. tester 도 충돌 발견 즉시 옵션 A/B/C 명시 후 PM 위임. 정보 손실 0.

*아팠던 것*:
- **(A)/(B') Onboarding 결정 5중 timing collision** — mobile 이 Onboarding 화면을 4번 재작성, dev doc 이 6번 정정. 직접 원인 4가지: (1) team-lead 가 PM 결정 *도중에도* dev doc §3-6 편집 → mobile 이 중간 상태를 PM directive 로 misread, (2) 발송한 stale 메시지가 PM 의 새 directive 보다 *늦게* 워커 inbox 에 도착, (3) tester 가 stale "(B') 정렬" 메시지 처리 + mobile 이 retrofit 했다고 인지 → dev doc 을 (B') 로 잘못 정렬, (4) 한 dev doc 파일을 team-lead/tester/mobile 셋이 동시 편집 → "File modified since read" 다수 + 부분 적용 잔재.
- **dev doc §3 표현 "1~3 step" 이 /start 분해 시 임의 도입됨** — 디자인 목업 OnboardingScreen 단일 화면 정합성 점검 부재. designer 가 §11 권장으로 흡수했지만, *워커가 잘못된 명세 위에 작업 시작* 하는 패턴은 Sprint 3+ 에서 ripple 비용 지수적.
- **Metro pnpm 호이스팅 + RN/oklch 미지원** 같은 *런타임-제약 사실* 을 발견 시점에야 노출 — Sprint 0 carry-over 에서 inline hex 폴백 부채로 넘겼고 Sprint 1 에서 깔끔히 갚았지만, 사전 조사 부재가 위험. Sprint 2+ 도 동일 함정 가능.
- **TaskList API 의 휘발성** — sprint 도중 TaskList 가 비어진 채 발견됨 (TaskUpdate 시 "Task not found"). 작업 추적은 dev doc 에 의존하므로 큰 영향은 없었지만 디버깅 비용 발생.

*다음에 다르게 할 것*:
- **Sprint 2 가 본 회고를 헌법으로 박는다** — `feedback_decision_serialization.md` 의 4 패턴 (HOLD-DECIDE-RESUME / Decision-version 태그 / Source-of-truth 우선순위 / 단일 작성자 시간창) 을 모든 `.claude/commands/<role>.md` frontmatter 에 inject. /start 의 spawn prompt 에도 헌법으로 박음.
- **/start 직후 designer 의 *목업 ↔ §3 Scope 정합성 점검* 표준 절차 도입** — designer 의 `feedback_mockup_truth.md` 메모리가 정확히 이 패턴을 위해 영속화됨. Sprint 2 부트 시 즉시 적용.
- **PM 결정 위임 직전 영향 워커 모두에 HOLD 1줄 발송 + dev doc / 메시지 일체 동결** — PM 답 받기 전 어떤 편집/메시지도 발송 금지. directive 메시지 첫 줄에 `[v<date> <decision-id>]` 태그 박음, 워커는 자기 inbox 메시지가 dev doc / task subject 의 frozen 마커보다 stale 하면 행동 전 reconcile 요청.
- **dev doc 단일 작성자 시간창** — 한 섹션 한 작성자, 충돌 시 후입자 양보 + SendMessage 위임. tester 라이브 큐레이션도 동일.
- **mobile 환경 의존 사전 조사 정형화** — Sprint 2 `/start` 시 mobile 의 dev 의존 (metro / pnpm / RN modules / @types/node 등) 점검을 designer 의 정합성 점검 다음 단계로 추가.
