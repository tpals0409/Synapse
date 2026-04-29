# Sprint 1 — Streaming E2E Scenario

> Sprint 1 Conversation Loop receipt (`scripts/receipt/sprint-1.sh`) 의 *시나리오 명세*. PM 이 사이드-바이-사이드 시각 검증 시 이 문서를 따라간다.

## 사전 환경

- macOS / Node 22+ / pnpm 9+ / sqlite3 (시스템 또는 better-sqlite3 자동 빌드).
- Ollama 가동: `brew services start ollama`.
- 모델 풀: `ollama pull gemma3:4b`.
- 헬스체크: `curl -sf http://localhost:11434/api/tags > /dev/null && echo OK`.

## 시나리오 1 — 종단 receipt 자동화

```bash
cd /Users/kimsemin/Desktop/2026/Synapse
bash scripts/receipt/sprint-1.sh
```

### 기대 결과

```
▶ [1/8] pnpm install
▶ [2/8] pnpm -r test
▶ [3/8] mobile bundle export
▶ [4/8] e2e: 안녕 → Gemma single-shot (Sprint 0 회귀)
  single-shot: reply_len=<n>
▶ [5/8] e2e: 안녕 → Gemma stream (sendStream)
  stream: chunks=<n> length=<m> ms=<t>
▶ [6/8] verify: latency_ms 적재
  latency_ms=<t>
▶ [7/8] verify: COPY i18n (design-system.copy.ko ↔ content.jsx COPY.ko)
  ok=6
▶ [8/8] verify SQLite rows
  messages user=2 assistant=2

✅ Sprint 1 receipt PASSED
```

### 실패 모드 + 진단

| 단계 | 실패 원인 | 조치 |
|---|---|---|
| 1/8 | pnpm 미설치 / lockfile 충돌 | `corepack enable && corepack prepare pnpm@latest --activate` |
| 2/8 | 단위 테스트 실패 | `pnpm --filter <pkg> test` 로 좁혀 재현 |
| 3/8 | Expo bundle 빌드 실패 | `pnpm --filter @synapse/mobile run build` 단독 실행 + `apps/mobile/metro.config.js` watchFolders 점검 |
| 4-6/8 | Ollama 미가동 | `brew services start ollama` + `ollama pull gemma3:4b` |
| 5/8 | chunks=0 | `gemma.completeStream` 의 NDJSON 파싱 회귀 — `packages/llm/__tests__/gemma-stream.test.ts` 재실행 |
| 6/8 | latency_ms != number | T7 `sendStream` 가 assistant row 에 latency_ms 채우는지 회귀 — `packages/conversation/__tests__/loop-stream.test.ts` |
| 7/8 | COPY 키 mismatch | `디자인 목업/content.jsx` COPY.ko 변경 시 `packages/design-system/src/copy.ts` 도 동기 — 또는 그 반대 |
| 8/8 | user/assistant row 부족 | `appendMessage` 회귀 — `packages/storage/__tests__/db.test.ts` |

## 시나리오 2 — 인터랙티브 시각 검증 (수동)

```bash
pnpm --filter @synapse/mobile start
```

### Onboarding 단일 화면 (PM (A) 최종 사인오프 2026-04-29)

목업 `screens.jsx` `OnboardingScreen` 와 1:1 비교 (`apps/mobile/app/onboarding/index.tsx` 한 페이지):
- 상단: `SynapseGlyph` 자리표시 (RN ink 도트 42dp — Sprint 7 Polish 정식 SVG).
- 중앙 상단: `copy.ko.onboarding.hi` ("안녕하세요.") — Source Serif 4 40/600 -1.2 letterSpacing.
- 중앙: `copy.ko.onboarding.sub` ("그냥 이야기해보세요.\n나머지는 제가 기억할게요.") — Serif 19/400 -0.3 letterSpacing pre-line.
- 중하단: synapse-pulse 도트 3 개 (RN `Animated.loop`, opacity 0.4↔1.0, half-cycle 1200ms ease-in-out, stagger 400ms — `motion.synapsePulse` 부재 Sprint 3+ 추가 시 인라인 교체).
- 하단 위: `copy.ko.onboarding.hint` ("기억은 자동으로 만들어집니다") — JetBrains Mono 10 uppercase letterSpacing 0.4.
- 하단: CTA `copy.ko.onboarding.cta` ("시작하기") — Serif 17/600 ink bg, paper text, radius=pill, 100% width, 16 vertical padding.
- 푸터: `copy.ko.tagline` ("남긴 건 사라지지 않고...") — JetBrains Mono 9.5 uppercase ink-faint.

`colorsHex.light.paper` 배경 + `padding 100/28/60` + `flex:1 + justifyContent:'space-between'`. CTA 탭 → `/chat`. 진행 인디 / 「다음」 CTA / step 분할 *없음* (목업 충실도).

### FirstChat

목업 `synapse-ui.jsx` 의 `FirstChatScreen` 와 1:1 비교:
- 상단 헤더: `copy.ko.appName` ("Synapse").
- 메시지 리스트: `storage.listMessages(db)` 로 마운트 시 초기 로드. user 버블 (ink bg, paper text, right-aligned), assistant 버블 (paper bg, ink text, left-aligned).
- 빈 상태: `copy.ko.firstChat.empty` ("아직 기억이 없어요") + `copy.ko.firstChat.emptySub`.
- 입력창: KeyboardAvoidingView. placeholder = `copy.ko.firstChat.placeholder` ("무엇이든 말해보세요…").
- 입력 후 onSubmit:
  - user 버블 즉시 추가.
  - "생각하는 중" 인디케이터 (`copy.ko.firstChat.typing`).
  - assistant 버블이 `motion.inkRise` 애니메이션 (duration 400ms, easing 'ease-out', from `{opacity:0, translateY:6}`, to `{opacity:1, translateY:0}`) 으로 등장.
  - `for await tok of conversation.sendStream(text, { db })` 가 토큰 단위로 누적, RN state 업데이트 → 텍스트가 흘러나옴.
- 종료 후 앱 재마운트 → user/assistant 메시지 모두 보임 (SQLite 영속화 확인).

### 에러 모드

- Ollama 미가동: `copy.ko.firstChat.error` ("잠시 길을 잃었어요") + `copy.ko.firstChat.errorSub` + retry 버튼.
- (Sprint 1 은 retry UI 만 노출, 동작은 Sprint 6 Failure & Hygiene 에서 본격 구현.)

## 시나리오 3 — 디자인 목업 사이드-바이-사이드

```bash
python3 -m http.server -d "디자인 목업"
# 브라우저: http://localhost:8000
```

목업 vs RN 빌드 시각 비교:
- 색: `paper #F5F0E8`, `ink #2A2620`, `synapse #CB7229`.
- 폰트: serif=Source Serif 4 / ui=Inter / meta=JetBrains Mono.
- 간격/라운드: spacing/radius 토큰 (RN 4dp 그리드 정규화 — 일부 정확값과 미세 차이 허용).

자동 시각 회귀 (Playwright/Puppeteer DOM 스냅샷) 는 Sprint 7 Polish 로 위임.

## 적재된 파일 (T12 ownership)

- `scripts/receipt/sprint-1.sh` — 8 단계 자동화.
- `packages/conversation/.receipt-runner/streamSend.mjs` — step 5.
- `packages/conversation/.receipt-runner/verify-stream.mjs` — step 6.
- `packages/design-system/.receipt-runner/verify-copy.mjs` — step 7. (design-system 패키지 안에 두는 이유: `@synapse/design-system` 이 conversation 의 dep 이 아니므로 design-system 자기 패키지에서 상대 import 로 self-검증.)
- `e2e/scenarios/sprint-1-streaming.md` — 본 문서.

## 의도적 보류 (Sprint 7 Polish 로)

- 시각 회귀 자동화 (Playwright/Puppeteer DOM 스냅샷).
- 색·폰트·spacing 토큰 적용 여부의 픽셀-단위 검증.
- iOS 네이티브 / Android 빌드 receipt.
