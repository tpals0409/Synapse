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
- 

**Out:**
- 

## 4. Architecture & Data Flow
*(/start 시 채움)*

## 5. File Ownership
*(/start 시 채움)*

## 6. Tasks
*(/start 시 채움)*

## 7. Interfaces / Contracts
*(라이브 갱신)*

## 8. Test Scenarios
*(라이브 갱신)*

## 9. Demo Script
<step-by-step 시연 스크립트 — receipt 재현용>

## 10. Implementation Map
<실제로 만들어진 파일/함수/엔드포인트 인덱스 — 다음 스프린트가 코드를 찾는 데 사용>

## 11. Decisions Made / Open Issues
**Decisions Made:**
- 

**Open Issues:**
- 

## 12. Carry-over + Retrospective
**Carry-over (다음 스프린트가 반드시 알아야 할 것):**
- *(빈 칸 금지. 특이사항 없으면 "직전 스프린트 가정 그대로 유지" 라고 명시.)*

**Retrospective:**
- 잘 된 것:
- 아팠던 것:
- 다음에 다르게 할 것:
