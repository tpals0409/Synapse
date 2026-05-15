# Sprint 3 — memory-formation

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`

## 1. Goal
사용자 발화에서 LLM 함수 호출로 Concept(≤3개/발화)을 추출하고 임베딩(768d, sqlite-vec)을 적재해 Graph(co_occur/semantic 엣지)를 형성, FirstChat 의 CaptureToast 로 "방금 기억됨" 시각 피드백을 닫아 Sprint 4 Recall 의 입력 그래프를 완성한다.

## 2. Deliverable & Receipt

**Deliverable:**
- `packages/engine/src/extractConcepts.ts` — `extractConcepts(message, {complete?}): Promise<Concept[]>`. LLM 함수 호출(JSON 모드)로 발화 → ≤3 Concept. Sprint 0 stub 의 throw 제거.
- `packages/engine/src/embed.ts` — `embedConcept(concept, {embed?}): Promise<Concept & {embedding: Float32Array}>`. 768d 임베딩(어댑터 함수 DI, 미주입 시 Gemma `/api/embeddings` 사용). storage 가 적재.
- `packages/engine/src/buildEdges.ts` — `buildEdges(newConcept, {db}): Promise<GraphEdge[]>`. co_occur(같은 메시지 묶음) + semantic(top-k cosine ≥ threshold) 엣지 생성. Sprint 0 stub 제거.
- `packages/storage/schema/0003_graph.sql` — `concepts(id,label,embedding BLOB,created_at)` + `edges(from_id,to_id,weight,kind)` + sqlite-vec virtual table `vec_concepts`. WAL/idempotent.
- `packages/storage/src/repo/{graph.ts,embed.ts}` — `appendConcept(db, concept)`, `appendEdge(db, edge)`, `nearestConcepts(db, vec, k)`. 트랜잭션 명시.
- `packages/conversation/src/loop.ts` — `sendStream` 의 assistant append 직후 `engine.extractConcepts` 비동기 hook (fire-and-forget) → embed → buildEdges → storage. `for await` 직전의 Sprint 4 hook 주석 보존.
- `packages/design-system/src/components/CaptureToast.tsx` — 디자인 목업 `screens.jsx` `FirstChatScreen` 의 CaptureToast 1:1 (paper bg + ink-rise + 2.4s 후 ghost-breathe out). copy.{ko,en}.firstChat.{captured,capturedSub} 사용.
- `apps/mobile/src/conceptStore.{ts,web.ts}` (platform adapter) — Sprint 1 carry-over 1번 강제. native = `@synapse/storage` 위임, web = in-memory.
- `apps/mobile/app/chat/index.tsx` — assistant 응답 종료 시 conceptStore subscribe → CaptureToast 표시(≤3 concept).

**Receipt (자동 검증 가능한 형태):**
- `pnpm install` / `pnpm -r test` exit 0 (Sprint 1 53 + Sprint 2 lint 9 + Sprint 3 신규: extractConcepts unit, embed shape, buildEdges co_occur+semantic, storage 0003 마이그 + nearestConcepts).
- `pnpm --filter @synapse/mobile run build` exit 0 (web bundle 에 better-sqlite3 / sqlite-vec 0 hits — `conceptStore.{ts,web.ts}` 분기 검증).
- `bash scripts/receipt/sprint-3.sh` 시나리오:
  1. Sprint 2 의 14 단계 그대로 통과 (Sprint 1 e2e + Sprint 2 메타).
  2. **0003 마이그 멱등성** — empty DB 에 두 번 마이그 실행 → exit 0, `concepts`/`edges`/`vec_concepts` 존재.
  3. **e2e: Concept 추출** — "어제 산책 중 들은 노래가 좋았어" 입력 → Sprint 1 sendStream → Concept ≥ 1 (label 비어있지 않음) 적재.
  4. **e2e: 그래프 형성** — 두 메시지 연속 입력 → `concepts` ≥ 2, `edges` co_occur ≥ 1.
  5. **e2e: nearestConcepts** — embedding 적재 후 cosine 쿼리 top-3 반환, score 내림차순.
  6. **CaptureToast i18n** — `verify-copy.mjs` ok=8 (Sprint 1 의 6 + Sprint 3 신규 captured/capturedSub).
  7. **mockup-scope-parity (Sprint 3 dev doc)** — §3 In 의 FirstChat + CaptureToast 등장 ↔ Sprint 2 §7.1 표(env override 또는 동일 표) 매칭.
  8. **directive-tag-audit + frozen-flag-audit (Sprint 3 dev doc)** — 각각 0 violations.
- 모든 단계 통과 → exit 0, "✅ Sprint 3 receipt PASSED".

## 3. Scope

**In:**
- **storage 0003 마이그** — `packages/storage/schema/0003_graph.sql` 가 `concepts(id TEXT PK, label TEXT NOT NULL, embedding BLOB, created_at INTEGER)` + `edges(from_id TEXT, to_id TEXT, weight REAL, kind TEXT CHECK(kind IN ('co_occur','semantic')), PRIMARY KEY(from_id,to_id,kind))` + sqlite-vec virtual table `vec_concepts USING vec0(embedding float[768])` 정의. WAL/idempotent (`CREATE TABLE IF NOT EXISTS`).
- **storage repo** — `packages/storage/src/repo/graph.ts` 의 `appendConcept(db, concept)` (트랜잭션 + INSERT OR IGNORE + vec_concepts 동기 INSERT) / `appendEdge(db, edge)` (트랜잭션 + INSERT OR IGNORE). `packages/storage/src/repo/embed.ts` 의 `nearestConcepts(db, vec: Float32Array, k: number, opts?: {excludeId?: string}): Promise<Array<{id: string, score: number}>>` (sqlite-vec `MATCH` + `ORDER BY distance` + score = `1 - distance`).
- **engine extractConcepts** — `packages/engine/src/extractConcepts.ts` 의 `extractConcepts(message: string, opts?: {complete?: CompleteFn}): Promise<Concept[]>`. Gemma JSON 모드 함수 호출 (system prompt = "사용자 발화에서 핵심 Concept ≤3 개 추출, label 한국어 명사구"). 미주입 시 Gemma `/api/chat` 에 `format: "json"`. 결과 검증 → label 비어있지 않은 항목만, ≤3 으로 절단. Sprint 0 stub `throw` 제거.
- **engine embed** — `packages/engine/src/embed.ts` 의 `embedConcept(concept, opts?: {embed?: EmbedFn}): Promise<Concept & {embedding: Float32Array}>`. embed DI 미주입 시 Gemma `/api/embeddings` (`model: "gemma3:4b"`, 768d). 차원 검증 (length === 768).
- **engine buildEdges** — `packages/engine/src/buildEdges.ts` 의 `buildEdges(newConcept, opts: {db, prevMessageConceptIds?: string[], nearest?: NearestFn, threshold?: number}): Promise<GraphEdge[]>`. `prevMessageConceptIds` 와 1:1 곱 → `co_occur` weight=1.0. `nearestConcepts(top-k=5, excludeId=newConcept.id)` → score ≥ threshold(default 0.7) 인 것만 `semantic` weight=score. Sprint 0 stub 제거.
- **conversation hook** — `packages/conversation/src/loop.ts` 의 `sendStream` 가 assistant append 완료 직후 *fire-and-forget* `engine.extractConcepts(userMessage) → Promise.all(embed) → forEach(appendConcept + buildEdges + appendEdge*)` chain. DI 옵션 `extractConcepts?`, `embed?`, `buildEdges?` 추기 (`feedback_di_pattern.md` 패턴 재사용). 실패 시 `.catch(logger.warn)` — user reply 흐름과 분리. 기존 *Sprint 4 hook 주석* 보존 위치 정확히 보존.
- **CaptureToast 컴포넌트** — `packages/design-system/src/components/CaptureToast.tsx` 가 목업 `FirstChatScreen` 의 CaptureToast 1:1: paper bg + `ink-rise` 0.4s 진입 + 2.4s 노출 + `ghost-breathe` 0.6s out. props = `{concepts: Concept[]}` (≤3). copy 의 `firstChat.captured` / `firstChat.capturedSub` 사용. `index.ts` export.
- **i18n copy** — `packages/design-system/src/copy.ko.ts` / `copy.en.ts` 에 `firstChat.captured` (예: ko "방금 기억됨", en "Just remembered") + `firstChat.capturedSub` (예: ko "{count}개의 개념", en "{count} concept(s)") 추기. `verify-copy.mjs ok=8`.
- **mobile platform adapter (carry-over 5 첫 시범)** — `apps/mobile/src/conceptStore.ts` (native, `@synapse/storage` 위임 — 기존 chatStore 패턴 재사용) + `apps/mobile/src/conceptStore.web.ts` (web, in-memory `Map<id, Concept>` + observer set). web bundle 에 `better-sqlite3`/`sqlite-vec` 0 hits 검증.
- **mobile chat 화면 hook** — `apps/mobile/app/chat/index.tsx` 가 assistant 응답 종료 시점에 conceptStore subscribe → 신규 Concept[] (≤3) 도착 시 `<CaptureToast concepts={...} />` 마운트. 디자인 목업 `FirstChatScreen` 흐름 1:1.
- **단위 테스트** — `packages/engine/src/__tests__/{extractConcepts,embed,buildEdges}.test.ts` (LLM/embed/nearest stub) + `packages/storage/src/__tests__/graph.test.ts` (0003 마이그 + repo + nearestConcepts) + `packages/conversation/src/__tests__/loop.test.ts` 의 hook 호출 검증 추기.
- **receipt 자동화** — `scripts/receipt/sprint-3.sh` 가 Sprint 2 의 14 단계 wrap + 신규 8 단계 (0003 멱등성, e2e Concept 추출, e2e 그래프 형성, e2e nearestConcepts, CaptureToast i18n ok=8, mockup-scope-parity Sprint 3 dev doc, frozen-flag-audit Sprint 3, directive-tag-audit) 추기. `SKIP_OLLAMA=1` 환경변수로 Ollama 의존 단계 (Sprint 1 e2e + 신규 e2e 3 종) skip — 메타-검증(0003 멱등성, lint 4 종, i18n) 만으로 dev mode 가능.
- **화면 단위 (목업 ↔ §3)** — Sprint 3 가 활성화하는 화면 = **first-chat** (CaptureToast 포함, 목업 #2). Sprint 1 의 onboarding 은 변경 없이 살아있음 — Sprint 3 §3 In 은 *추가되는* 화면만 명시: `first-chat`. mockup 표 단일 진실원 = Sprint 2 §7.1 (env override `MOCKUP_TABLE_DOC` 미설정).

**Out:**
- **Recall 전 단계** (Ghost Hint L1 / Suggestion L2 / Strong L3) — Sprint 4. 본 sprint 는 *Recall 의 입력 그래프 완성* 까지만. orchestrator Trigger/Silence rule 도 Sprint 4. 본 sprint 의 orchestrator 는 코드 변경 0, DecisionAct enum 슈퍼셋 (`silence/ghost/suggestion/strong`) 시그니처 동결 유지만 (`decision_orchestrator_enum.md`).
- **Hyper-Recall** (Bridge / Temporal / Domain Crossing) — Sprint 5.
- **Inspector / HumbleScreen / DemoScreen / EmptyStateScreen** — Sprint 4+ / Sprint 6+ / Sprint 7. 본 sprint 가 신규 활성화하는 화면은 first-chat 만.
- **Concept dedup / alias merge** — Sprint 4+. 본 sprint 는 모든 추출 concept 신규 생성 (id = UUID). 같은 label 의 중복은 허용 — 다음 스프린트가 dedup 정책 결정.
- **임계값 튜닝 자동화** — semantic threshold = 0.7 시작 (정적). 실측 후 조정은 `/end` 의 carry-over.
- **Forgetting / Humble Retraction** — Sprint 6.
- **Concept 추출 다국어 균형** — 본 sprint 는 한국어 1차. 영어 입력 시 동작은 검증하지 않음 (LLM 책임 영역, fallback 없음).
- **mockup 표 변경** — Sprint 3 신규 화면 없음 → Sprint 2 §7.1 그대로 사용. designer 가 별표 추가/별칭 갱신 필요 없음.
- **Receipt 임계 강화** — Sprint 1 carry-over 8 / Sprint 2 carry-over 9. **본 sprint 는 보수적 시작 유지**: 신규 임계 (concepts ≥ 1, edges ≥ 1, nearest top-3 = 1 row 이상) 모두 ≥ 1 로 시작. 본 sprint receipt 통과 후 `/end` 가 *Sprint 4 receipt 헌법 강화* 결정 (chunks ≥ 2 length ≥ 5 + concepts ≥ 2 edges ≥ 1 등). 결정-id 후보 = `D-S3-receipt-threshold-recovery`.
- **DecisionAct enum 슈퍼셋 변경** — 절대 금지. Concept / GraphEdge / Embedding 타입도 Sprint 0 정의 그대로 사용 (시그니처 *처음으로 사용*, 변경 아님).
- **packages/orchestrator/src/ 코드 변경** — 0 byte. 본 sprint 비대상.
- **`apps/mobile/src/chatStore.{ts,web.ts}` *외부 시그니처* 변경** — Sprint 1 동결 (`sendStream(text)` / `listMessages()` 등 외부 호출자 시그니처 무변경). 단 *내부 구현* wiring 1줄 (`conversation.sendStream` 옵션 인자 `prevMessageConceptIds: conceptStore.getPrevTurnConceptIds()` + `onConcepts: conceptStore.notify` 자동 주입) 허용 — Sprint 3 한정, 결정 `D-S3-chatStore-internal-wiring`. `conceptStore.{ts,web.ts}` 는 *별도 파일* 로 추가 (carry-over 5 의 패턴 첫 시범).

## 4. Architecture & Data Flow

**핵심 원칙**: Sprint 1 의 `sendStream` 흐름을 *건드리지 않고* assistant append 직후에 비동기 hook 만 박는다. user-facing reply 와 memory formation 은 *시간/실패 격리*. CaptureToast 미표시 = 정상 fallback (LLM/storage 실패 흡수).

**End-to-end flow** (`first-chat` 화면 시점):

```
user 입력 → chat/index.tsx
  └─ conversation.sendStream(userMessage, { persist, complete })
       ├─ for await chunk → chatStore.appendDelta (Sprint 1 그대로)
       └─ assistant append 완료
            └─ (fire-and-forget — await 안 함)
                 engine.extractConcepts(userMessage, { complete })
                   ↓ Concept[] (≤3, label 검증)
                 Promise.all(concepts.map(c → engine.embedConcept(c, { embed })))
                   ↓ Concept & {embedding: Float32Array(768)}[]
                 for each c:
                   storage.appendConcept(db, c)         // tx + vec_concepts INSERT
                   edges = engine.buildEdges(c, {
                     db, prevMessageConceptIds, nearest, threshold: 0.7
                   })
                   edges.forEach(e → storage.appendEdge(db, e))
                 conceptStore.notify(concepts)
                   ↓ subscribe (chat/index.tsx)
                 <CaptureToast concepts={...} />  → ink-rise 0.4s + 2.4s 노출 + ghost-breathe out
            └─ .catch(logger.warn)   // 실패는 로그만, user 미노출
```

**그래프 모델**:
| Table | 컬럼 | 비고 |
|---|---|---|
| `concepts` | `id TEXT PRIMARY KEY, label TEXT NOT NULL, embedding BLOB, created_at INTEGER` | id = UUID. embedding 은 Float32Array 768d 의 BLOB 직렬화. |
| `edges` | `from_id TEXT, to_id TEXT, weight REAL, kind TEXT CHECK(kind IN ('co_occur','semantic')), PRIMARY KEY(from_id, to_id, kind)` | 무방향 (저장 한 방향, 조회 시 OR). weight ∈ [0, 1]. |
| `vec_concepts` (virtual) | `USING vec0(embedding float[768])` | sqlite-vec. INSERT 시 `concepts.id` rowid 매핑. SELECT MATCH cosine top-k. |

**Edge 종류**:
- **co_occur**: 같은 sendStream 내 user message 의 Concept[] vs *직전 user message 의 concept ids* (`prevMessageConceptIds` 옵션, conversation 이 chatStore 마지막 turn 에서 계산해서 전달). 1:1 곱, weight = 1.0.
- **semantic**: 신규 concept embedding 으로 `nearestConcepts(k=5, excludeId=self)` → score = `1 - distance` ≥ 0.7 인 것만, weight = score. 첫 발화 (DB empty) 시 0 edges.

**platform adapter (carry-over 5 첫 시범)**:
```
apps/mobile/src/conceptStore.ts          (native — @synapse/storage 위임)
apps/mobile/src/conceptStore.web.ts      (web — in-memory Map + observer Set)
```
Metro 의 platform extension 자동 분기. web bundle 에 `better-sqlite3`/`sqlite-vec` 0 hits → receipt step 3 검증.

**비대상 경계**:
- Recall 알고리즘 (그래프 traversal / nearestConcepts → trigger 결정) — Sprint 4 가 본 sprint 의 `nearestConcepts` + `edges` 테이블을 *읽기 전용* 으로 소비.
- Concept dedup — 같은 label 중복 허용 (Sprint 4+ alias merge).
- 임계값 튜닝 — semantic 0.7 정적. 실측 후 조정은 `/end` carry-over.

**lint 호출 토폴로지** (Sprint 2 가 박은 헌법 그대로):
```
/start (Sprint 3)
  └─ mockup-scope-parity.sh docs/sprints/sprint-3-memory-formation.md
       (PM 사인오프 전, §3 In 화면 별칭 ↔ Sprint 2 §7.1 표 매칭)

/end (Sprint 3)
  ├─ frozen-flag-audit.sh docs/sprints/sprint-3-memory-formation.md
  └─ scripts/receipt/sprint-3.sh
       ├─ Sprint 2 14 단계 wrap (SKIP_OLLAMA=1 시 Sprint 1 e2e skip)
       ├─ 0003 마이그 멱등성
       ├─ e2e: Concept 추출 / 그래프 형성 / nearestConcepts (Ollama 의존)
       ├─ CaptureToast i18n ok=8
       ├─ mockup-scope-parity.sh on Sprint 3
       ├─ frozen-flag-audit.sh on Sprint 3
       └─ directive-tag-audit.ts
```

**메시지 태그 (Sprint 2 §11 헌법 그대로)**:
- frozen 결정 prefix: `**[FROZEN v2026-04-29 D-S3-<slug>]**` (sprint 내 unique).
- directive 메시지 prefix: `[DIRECTIVE v2026-04-29 D-S3-<slug>]`.

## 5. File Ownership

| 파일/경로 | 책임 에이전트 | 변경 종류 |
|---|---|---|
| `packages/storage/schema/0003_graph.sql` | storage | 신규 (마이그 멱등성 SQL) |
| `packages/storage/src/repo/graph.ts` | storage | 신규 (`appendConcept`, `appendEdge`) |
| `packages/storage/src/repo/embed.ts` | storage | 신규 (`nearestConcepts`) |
| `packages/storage/src/__tests__/graph.test.ts` | storage | 신규 |
| `packages/storage/src/index.ts` | storage | export 추기 |
| `packages/engine/src/extractConcepts.ts` | engine | Sprint 0 stub `throw` 제거 + 구현 |
| `packages/engine/src/embed.ts` | engine | Sprint 0 stub 제거 + 구현 |
| `packages/engine/src/buildEdges.ts` | engine | Sprint 0 stub 제거 + 구현 |
| `packages/engine/src/types.ts` | engine | (변경 금지) Concept/GraphEdge/Embedding 시그니처 동결 그대로 |
| `packages/engine/src/__tests__/{extractConcepts,embed,buildEdges}.test.ts` | engine | 신규 (LLM/embed/nearest stub) |
| `packages/llm/src/embed.ts` | conversation | (필요 시) Gemma `/api/embeddings` 어댑터 신규 — `engine.embed` 미주입 fallback |
| `packages/conversation/src/loop.ts` | conversation | `sendStream` assistant append 직후 fire-and-forget hook + DI 옵션 추기 |
| `packages/conversation/src/__tests__/loop.test.ts` | conversation | hook 호출 검증 단위 추기 |
| `packages/design-system/src/components/CaptureToast.tsx` | designer | 신규 (목업 1:1) |
| `packages/design-system/src/components/index.ts` | designer | export 추기 |
| `packages/design-system/src/copy.ko.ts` | designer | `firstChat.captured` / `capturedSub` 추기 |
| `packages/design-system/src/copy.en.ts` | designer | `firstChat.captured` / `capturedSub` 추기 |
| `apps/mobile/src/conceptStore.ts` | mobile | 신규 (native — `@synapse/storage` 위임) |
| `apps/mobile/src/conceptStore.web.ts` | mobile | 신규 (web — in-memory Map + observer) |
| `apps/mobile/app/chat/index.tsx` | mobile | assistant 응답 종료 hook → CaptureToast 마운트 (≤3) |
| `apps/mobile/app/chat/__tests__/*` | mobile | hook 단위 (선택, 없을 시 receipt e2e 로 대체) |
| `scripts/receipt/sprint-3.sh` | tester | 신규 (Sprint 2 14 wrap + 신규 8) |
| `scripts/receipt/__tests__/verify-copy.mjs` | tester | (Sprint 1 산출물) ok=8 자동 검증 |
| `docs/sprints/sprint-3-memory-formation.md` §3-§6 | team-leader | 채움 (본 갱신) |
| `docs/sprints/sprint-3-memory-formation.md` §7-§8 | (라이브 작성자) | 결정 책임 에이전트 단독 작성 |
| `docs/sprints/sprint-3-memory-formation.md` §9-§12 | team-leader (`/end`) | `/end` 시 |
| `~/.claude/projects/.../memory/decision_orchestrator_enum.md` | (변경 금지) | Concept/GraphEdge 시그니처 동결 reference |
| `~/.claude/projects/.../memory/feedback_di_pattern.md` | (변경 금지) | DI 패턴 reference |
| `packages/orchestrator/src/` | (없음) | **변경 금지** — Sprint 4 슬라이스 |
| `apps/mobile/src/chatStore.{ts,web.ts}` | mobile (Sprint 3 한정 — 내부 wiring 만) | **외부 시그니처 동결** (Sprint 1 그대로). 내부 wiring 1줄 (`conversation.sendStream` 의 `prevMessageConceptIds` + `onConcepts` 옵션을 `conceptStore` 에서 자동 주입) 허용 — `D-S3-chatStore-internal-wiring`. |

**단일 작성자 시간창**: §3-§6 = team-leader 단독 / §7-§8 = 변경 책임 에이전트 / §9-§12 = `/end`. 충돌 시 후입자 양보 + SendMessage 위임.

## 6. Tasks

| ID | Subject | Owner | Blocks | BlockedBy |
|---|---|---|---|---|
| T1 | storage: `schema/0003_graph.sql` (concepts + edges + `vec_concepts vec0(embedding float[768])`) — WAL/idempotent 검증 (empty DB 두 번 마이그) | storage | T2, T9 | — |
| T2 | storage: `src/repo/graph.ts` (`appendConcept` / `appendEdge`, 트랜잭션) + `src/repo/embed.ts` (`nearestConcepts` cosine top-k) + `index.ts` export + `__tests__/graph.test.ts` | storage | T5, T6, T9 | T1 |
| T3 | engine: `extractConcepts.ts` 구현 (Gemma JSON 모드 함수 호출, `complete` DI, ≤3, label 검증) + `__tests__/extractConcepts.test.ts` (LLM stub fixture) | engine | T5, T6 | — |
| T4 | engine: `embed.ts` 구현 (768d, `embed` DI, 미주입 시 Gemma `/api/embeddings`, 차원 검증) + `__tests__/embed.test.ts` | engine | T5, T6, T9 | — |
| T5 | engine: `buildEdges.ts` 구현 (co_occur via `prevMessageConceptIds`, semantic via `nearestConcepts` ≥0.7) + `__tests__/buildEdges.test.ts` (db + nearest stub) | engine | T6 | T2, T3, T4 |
| T6 | conversation: `loop.ts` `sendStream` assistant append 직후 fire-and-forget hook (extract → embed → buildEdges → storage append) + DI 옵션 (`extractConcepts?`, `embed?`, `buildEdges?`) + `prevMessageConceptIds` 계산 + `__tests__/loop.test.ts` hook 검증 | conversation | T8, T9 | T2, T3, T4, T5 |
| T7 | designer: `CaptureToast.tsx` (목업 `FirstChatScreen` 1:1, `ink-rise` + `ghost-breathe`) + `copy.{ko,en}` `firstChat.captured`/`capturedSub` + `components/index.ts` export | designer | T8, T9 | — |
| T8 | mobile: `conceptStore.{ts,web.ts}` platform adapter (native = `@synapse/storage` 위임, web = in-memory Map+observer) + `app/chat/index.tsx` assistant 응답 종료 hook → conceptStore subscribe → `<CaptureToast concepts/>` 마운트 (≤3) | mobile | T9 | T6, T7 |
| T9 | tester: `scripts/receipt/sprint-3.sh` (Sprint 2 14 단계 wrap + 신규 8: 0003 멱등성 / e2e Concept 추출 / e2e 그래프 형성 / e2e nearestConcepts / CaptureToast i18n ok=8 / mockup-scope-parity Sprint 3 / frozen-flag-audit Sprint 3 / directive-tag-audit) + `SKIP_OLLAMA=1` dev-mode flag + 신규 단위 통합 (`pnpm -r test` 가 잡도록 vitest config 검증) | tester | T10 | T1, T2, T4, T6, T7, T8 |
| T10 | team-leader: receipt 종단 실행 — `bash scripts/receipt/sprint-3.sh` PASS (Ollama UP) → §10 Implementation Map 채움. carry-over 9 임계 회복 결정 (`D-S3-receipt-threshold-recovery`) — 본 sprint receipt 통과 시 Sprint 4 receipt 헌법 강화 후보 §11 Decisions Made 추기 (PM 사인오프 결정으로 `**[FROZEN v...]**` 부착) | team-leader | — | T9 |
| T11 | orchestrator: 코드 변경 0. DecisionAct enum 슈퍼셋 시그니처 동결 유지 검증 (`grep` 으로 `decision_orchestrator_enum.md` ↔ `packages/engine/src/types.ts` ↔ `packages/orchestrator/src/` 의 enum 1 회 비교). dev doc §7 Interfaces 에 *Sprint 4 가 소비할 입력 인터페이스* (Concept/GraphEdge → Recall trigger) 표 1 회 기여 | orchestrator | T9 | T2, T5 |

**의존성 핵심 경로**: T1 → T2 → T5 → T6 → T8 → T9 → T10. T3 / T4 / T7 / T11 병렬 진입 가능.

**parallel 진입점 (5)**: T1, T3, T4, T7, T11.

**T9 의 `BlockedBy` 가 6 task** — receipt 가 모든 슬라이스 종단 검증. T11 (orchestrator) 은 T9 의 직접 BlockedBy 아님 (코드 변경 0) — §7 Interfaces 표 기여만으로 충분.

## 7. Interfaces / Contracts
*(라이브 갱신)*

### 7.engine — Concept extraction / embedding / edge formation (T3, T4, T5 — engine)

`packages/engine/index.ts` re-exports 추가:

```ts
// extractConcepts (T3)
export { extractConcepts } from './src/extractConcepts.ts';
export type { CompleteFn, ExtractOptions } from './src/extractConcepts.ts';

// embed (T4)
export { embedConcept, EMBED_DIM } from './src/embed.ts';
export type { EmbedFn, EmbedOptions, EmbeddedConcept } from './src/embed.ts';

// buildEdges (T5)
export { buildEdges, DEFAULT_SEMANTIC_THRESHOLD, DEFAULT_TOP_K } from './src/buildEdges.ts';
export type { BuildEdgesOptions, NearestFn, NearestHit } from './src/buildEdges.ts';
```

**시그니처 (Sprint 3 동결 — DI 헌법 `feedback_di_pattern.md`)**:
```ts
// T3 — Gemma JSON 모드 함수 호출
type CompleteFn = (opts: { system: string; user: string; format: 'json' }) => Promise<string>;
extractConcepts(message: string, opts?: {
  complete?: CompleteFn;
  now?: () => number;
  newId?: () => string;
}): Promise<Concept[]>
// 동작: system="사용자 발화에서 핵심 Concept ≤3 개 추출, label 한국어 명사구 ..."
//       label 비어있지 않은 항목만, ≤3 으로 절단, malformed JSON → []
// 미주입 시 default = Gemma /api/chat (model: SYNAPSE_GEMMA_MODEL ?? "gemma3:4b", format: "json")

// T4 — Gemma /api/embeddings 어댑터
type EmbedFn = (text: string) => Promise<Float32Array>;
embedConcept(concept: Concept, opts?: { embed?: EmbedFn }): Promise<EmbeddedConcept>
// EmbeddedConcept = Omit<Concept, 'embedding'> & { embedding: Float32Array }
// 동작: vec.length !== 768 → throw. 입력 concept 미돌연변이.
// 미주입 시 default = Gemma /api/embeddings (model: "gemma3:4b") via fetch

// T5 — co_occur + semantic 엣지 형성
type NearestHit = { id: string; score: number };
type NearestFn = (vec: Float32Array, k: number, opts?: { excludeId?: string }) => Promise<NearestHit[]>;
buildEdges(newConcept: Concept | EmbeddedConcept, opts?: {
  prevMessageConceptIds?: string[];
  nearest?: NearestFn;
  threshold?: number;   // default 0.7 (DEFAULT_SEMANTIC_THRESHOLD)
  topK?: number;        // default 5  (DEFAULT_TOP_K)
}): Promise<GraphEdge[]>
// 동작:
// (1) prev 1:1 곱 → kind='co_occur', weight=1.0 (self id 제외)
// (2) embedding 보유 + nearest 주입 → score ≥ threshold 만 kind='semantic', weight=score (self id 제외)
// 첫 발화 (DB empty) / Concept(미임베딩) 입력 → semantic 0
```

**DI 미주입 default**: `complete` / `embed` 둘 다 Sprint 1 `packages/llm` 패턴과 동일하게 fetch 기반 함수. 별도 클래스/싱글톤 없음. 환경변수 `SYNAPSE_OLLAMA_URL` (default `http://localhost:11434`), `SYNAPSE_GEMMA_MODEL` (default `gemma3:4b`).

**conversation T6 가 호출할 typical chain**:
```ts
const concepts = await extractConcepts(userMessage, { complete });
const embedded = await Promise.all(concepts.map((c) => embedConcept(c, { embed })));
for (const c of embedded) {
  storage.appendConcept(db, { ...c, embedding: Array.from(c.embedding) });
  const edges = await buildEdges(c, {
    prevMessageConceptIds,
    nearest: (vec, k, o) => storage.nearestConcepts(db, vec, k, o),
    threshold: 0.7,
  });
  edges.forEach((e) => storage.appendEdge(db, e));
}
```
*※ `appendConcept` 의 `Concept.embedding` 은 Sprint 0 정의상 `number[]?` — `Array.from(Float32Array)` 변환 필요. types 변경 금지 헌법 준수.*

**Sprint 0 stub 처리**: `packages/engine/src/extract.ts`, `packages/engine/src/graph.ts` 두 파일 *삭제*. 신규 파일 = `extractConcepts.ts`, `embed.ts`, `buildEdges.ts`. `__tests__/types.test.ts` 의 stub-rejects 케이스 3 종 제거 (recall stub 1 종만 잔존 — Sprint 4 까지 유지).

**테스트 위치 결정** (code > task subject > dev doc): `package.json` 의 `test` glob 가 `__tests__/*.test.ts` 이므로 신규 테스트는 `packages/engine/__tests__/{extractConcepts,embed,buildEdges}.test.ts` 에 위치 (dev doc §5/§6 의 `src/__tests__/` 표기와 차이 — 코드 헌법 우선).

**Sprint 3 engine 단위 테스트 결과**: `pnpm --filter @synapse/engine test` → 27 PASS / 0 FAIL. `tsc --noEmit` → 0 error.

**T5 통합 합류 시점**: storage T2 (`packages/storage/src/repo/embed.ts` 의 `nearestConcepts`) 완료 후, conversation T6 가 두 슬라이스를 `nearest` 어댑터로 결합. T5 자체는 단위 stub 만으로 검증 가능 — 코드 결합 없음.

### 7.storage — 0003 graph 마이그 + repo (T1, T2 — storage)

**파일 인벤토리**:
- `packages/storage/schema/0003_graph.sql` (신규) — concepts / edges / vec_concepts.
- `packages/storage/src/repo/graph.ts` (신규) — `appendConcept`, `appendEdge`.
- `packages/storage/src/repo/embed.ts` (신규) — `nearestConcepts`, type `NearestConcept`.
- `packages/storage/index.ts` — 위 4 심볼 + `NearestConcept` 타입 re-export.
- `packages/storage/__tests__/graph.test.ts` (신규) — 7 테스트 (멱등성 / appendConcept / blob-null / appendEdge / top-k 정렬 / excludeId / k=0).
- `packages/storage/__tests__/db.test.ts` — forward-compat 테스트의 migration 목록 비교를 0003 추가에 둔감하게 수정 (lexical-sorted assertion).
- `packages/storage/package.json` — `@synapse/engine` workspace devDependency 추가 (type-only import).

**시그니처 (Sprint 3 동결)**:
```ts
import type { Concept, GraphEdge } from '@synapse/engine';
import type { Database } from './src/db.ts';

export function appendConcept(db: Database, concept: Concept): void;
//  트랜잭션 안에서 INSERT OR IGNORE INTO concepts → 새로 INSERT 된 경우에만
//  vec_concepts (rowid, embedding) INSERT. embedding 미보유 concept 는 vec_concepts 에 미적재.
//  duplicate id → no-op (라벨/임베딩 갱신 없음 — 첫 적재가 우선).

export function appendEdge(db: Database, edge: GraphEdge): void;
//  트랜잭션 안에서 INSERT OR IGNORE INTO edges. PK = (from_id, to_id, kind).
//  duplicate (from,to,kind) → 첫 weight 보존, no-op.

export type NearestConcept = { id: string; score: number };
export function nearestConcepts(
  db: Database,
  vec: Float32Array,
  k: number,
  opts?: { excludeId?: string },
): Promise<NearestConcept[]>;
//  vec_concepts MATCH KNN → concepts JOIN by rowid → score = 1 - distance.
//  내림차순 정렬. excludeId 있으면 over-fetch (k+1) 후 client-side 제거.
//  k <= 0 → [].
```

**vec0 INSERT 주의 (구현 노트)**: sqlite-vec `vec0` 가상 테이블은 rowid 를 *bound parameter* 로 받을 때 SQLite INTEGER 타입 strict — better-sqlite3 의 default `number` bind 는 거부됨 ("Only integers are allowed for primary key values on vec_concepts"). 해결: `result.lastInsertRowid` 를 `BigInt` 로 강제 (`BigInt(...)`) 후 bind. 테스트 검증.

**embedding 직렬화**: `Concept.embedding: number[]?` (engine types.ts 동결) → BLOB 변환 = `Buffer.from(new Float32Array(arr).buffer)`. 768 * 4 = 3072 bytes little-endian. conversation T6 에서 `Array.from(Float32Array)` 변환 (dev doc §7.engine line 271 정합).

**검증 결과 (2026-04-29)**:
- `pnpm --filter @synapse/storage test` → 11 PASS / 0 FAIL.
  - 0003 멱등성: `_migrations` row count 재실행 불변, 3 표 모두 존재.
  - appendConcept: row + vec 1:1, duplicate no-op, no-embedding null path.
  - appendEdge: (from,to,kind) PK, kind 다르면 별도 row.
  - nearestConcepts: self 가 score≈1 (1 - 0 distance), 내림차순, excludeId, k=0.
- `pnpm --filter @synapse/storage typecheck` → 0 error.

**카비엇 (carry-over 후보)**:
- `appendConcept` duplicate 시 *no-op* — 라벨 갱신/임베딩 보강이 필요해지면 별도 `updateConcept` 신설 (Sprint 6 forgetting 정책에서 다시 검토).
- `pnpm install` 시 `WARN cyclic workspace dependencies: engine ↔ storage` 1줄 발생 — `@synapse/engine` 을 type-only devDependency 로 추가했기 때문. 런타임 cycle 0 (storage src 가 engine 코드 import 0; types 만). 차후 `Concept`/`GraphEdge` 를 `@synapse/protocol` 로 이전하면 해소 — Sprint 4 이후 검토.
- engine T5 `NearestFn` 시그니처와 storage `nearestConcepts` 시그니처 정확히 일치 (vec, k, opts.excludeId 모두) — conversation T6 에서 `(vec, k, o) => storage.nearestConcepts(db, vec, k, o)` 어댑터 0 변환.

### 7.designer — CaptureToast + i18n (T7 — designer)

`packages/design-system/src/components/CaptureToast.tsx` 신규 + `packages/design-system/src/components/index.ts` 신규 (sub-entry) + `package.json` `exports` 에 `./components` sub-path 추가.

**컴포넌트 시그니처 (Sprint 3 동결)**:
```ts
import type { Concept } from '@synapse/engine';

export interface CaptureToastProps {
  concepts: Concept[];          // ≤3 (mobile T8 가 호출 시 보장)
  lang?: 'ko' | 'en';            // default 'ko'
  onDismiss?: () => void;       // out-fade 종료(0.6s) 시 1회 호출
}

export function CaptureToast(props: CaptureToastProps): JSX.Element;
```

**라이프사이클 (디자인 목업 1:1)**:
1. 진입: `motion.inkRise` (0.4s ease-out) — opacity 0→1, translateY 6→0.
2. 노출: 2.4s 정착.
3. 퇴장: `motion.ghostBreathe` out-fade (0.6s ease-in-out, 1→0) → `onDismiss?()` 1회.
   합계 ≈ 3.4s.

**카피 (`copy.ts` 단일 파일)**:
- 메인 = `copy[lang].firstChat.captured` (ko `"방금 기억됨"`, en `"Just remembered"`).
- 서브 = `copy[lang].firstChat.capturedSub` (ko `"이 생각은 당신의 그래프에 연결됐어요"`, en `"Linked into your graph"`).
- concepts = `concepts.map(c => c.label).join(' · ')` (목업의 `"x · y · z"` 형식).
- (Sprint 1 의 6 키 그대로 유지. 본 Sprint 가 `firstChat.captured` / `firstChat.capturedSub` 2 키 *값* 만 신규 — Sprint 1 가 이미 type 자리만 잡아둔 부분을 디자인 목업 카피로 채움.)

**motion 토큰 (`motion.ts`)**:
- 기존 `inkRise` 그대로.
- 신규 `ghostBreathe = { duration: 600, easing: 'ease-in-out', from: { opacity: 1 }, to: { opacity: 0 } }`.
   목업의 무한-호흡 `ghost-breathe` keyframe 은 GhostHint 전용이고, Sprint 3 CaptureToast 는 *out-fade 1방향* 으로 차용 — 동일 이름 재사용은 의도적 (Sprint 4+ GhostHint 활성화 시 from/to 의미가 다르더라도 motion 토큰 1개만 노출).

**RN/web 호환**:
- `react-native` 의 `Animated` + `Easing` API 사용 — RN-Web 자동 매핑.
- `useNativeDriver: true` (opacity / transform 만) — RN-Web 에서 무시되지만 prop 자체 무해.
- design-system 이 첫 컴포넌트 추가 = 패키지 설정 갱신 (team-leader 옵션 A 권장 채택, RN+Expo 17+ 표준):
  - `tsconfig.json` `compilerOptions.jsx = "react-jsx"` (jsx-runtime 의존, classic `import React from 'react'` 불필요).
  - `package.json` `peerDependencies = { react: "*", react-native: "*", @synapse/engine: "workspace:*" }` — 호스트 (mobile) 가 hoist.
  - `package.json` `devDependencies` 에 `@types/react`, `react`, `react-native`, `@synapse/engine` 추가 — design-system 자체 typecheck 통과용 (실제 런타임 의존은 mobile peer hoist).
- `package.json` `exports`:
  ```json
  {
    ".": "./index.ts",
    "./components": "./src/components/index.ts"
  }
  ```
  mobile import = `import { CaptureToast } from '@synapse/design-system/components'`.
- design-system 단위 node test (`__tests__/*.test.ts`) 는 컴포넌트 import 0 — 토큰/카피 검증만. node 환경에서 `react-native` resolve 강제되지 않음.

**카피 검증 — `verify-copy.mjs` ok=8**:
Sprint 1 의 6 keys + Sprint 3 신규 2 keys (`captured` / `capturedSub`).
```
checks = [
  'onboard.hi', 'onboard.sub', 'onboard.cta', 'onboard.hint',
  'placeholder', 'tagline',
  'captured', 'capturedSub',           // ← Sprint 3 추기
];
```
실행: `node --experimental-strip-types packages/design-system/.receipt-runner/verify-copy.mjs` → stdout `ok=8` exit 0.

**Sprint 3 designer 단위 테스트 결과**:
- `pnpm --filter @synapse/design-system test` → 35 PASS / 0 FAIL (Sprint 1 의 ~28 + Sprint 3 신규 7: ghostBreathe 4 + captured/capturedSub 1:1 ko/en 2 + JSX exclude 안전성 ~1).
- `pnpm --filter @synapse/design-system typecheck` → 0 error (jsx: react-jsx + react/react-native peer dep 적용 후 `src/components` 포함 typecheck).
- `verify-copy.mjs` → `ok=8` exit 0.

**비대상 (carry-over)**:
- 다크 테마 변형 — 현재 `colorsHex.light.*` 만 사용. Sprint 7 polish 에서 테마 토글 도입 시 `useColorScheme()` 분기 추가.
- 접근성 voice over 한국어 음성 — `accessibilityLabel` 만 영문/한글 텍스트 연결, TTS 톤은 OS 기본.
- 컴포넌트 단위 RN renderer 테스트 — design-system 은 토큰/카피 검증만, 컴포넌트 동작 검증은 mobile e2e (T8/T9 슬라이스).

### 7.orchestrator — Sprint 4 가 소비할 입력 인터페이스 (T11 — orchestrator)

> 본 sprint 의 orchestrator 코드 변경 = **0 byte**. DecisionAct enum 슈퍼셋 시그니처 동결만 유지 (`'silence' | 'ghost' | 'suggestion' | 'strong'`, `decision_orchestrator_enum.md`). 본 sub-section 은 *Sprint 4 가 본 sprint 산출물을 어떻게 trigger 입력으로 소비할지* 의 인덱스.

**enum 동결 검증 결과 (2026-04-29 T11)**:
| 출처 | 4 원 |
|---|---|
| memory `decision_orchestrator_enum.md` | `'silence' \| 'ghost' \| 'suggestion' \| 'strong'` |
| `packages/orchestrator/src/types.ts:4` | `'silence' \| 'ghost' \| 'suggestion' \| 'strong'` |
| `packages/orchestrator/src/decide.ts:5` (주석) | 동일 4 원 |
| `packages/engine/src/types.ts` | DecisionAct 미정의 — orchestrator → engine `RecallCandidate` 단방향 import 만 (정합) |

**drift 0 확정**. Sprint 3 까지 시그니처 동결 유지. Sprint 4 ghost/suggestion/strong 활성화 시 `decide()` 시그니처 그대로, 본문 분기만 추기.

**Sprint 4 가 소비할 입력 인터페이스**:

| 입력 | 타입 | 출처 (Sprint 3 산출물) | Sprint 4 사용처 |
|---|---|---|---|
| `Concept` | `@synapse/engine` 의 `{ id, label, embedding?, createdAt }` | engine `extractConcepts` → storage `appendConcept` | trigger 후보 노드 (현재 발화의 핵심 개념) |
| `GraphEdge { kind:'co_occur' }` | `@synapse/engine` 의 `{ from, to, weight, kind }` | engine `buildEdges` ← `prevMessageConceptIds` (1:1 곱, weight=1.0) | 시간 인접 신호 (직전 발화 ↔ 현재 발화) |
| `GraphEdge { kind:'semantic' }` | 동상 | engine `buildEdges` ← `nearestConcepts` (cosine ≥ 0.7) | 의미 인접 신호 (Recall 후보 1차 필터) |
| `nearestConcepts(db, vec, k, {excludeId?})` | storage `repo/embed.ts` 의 `Promise<{id, score}[]>` | storage T2 export | Bridge / Domain Crossing 후보 KNN (Sprint 5 까지 커버) |
| `RecallCandidate` | `@synapse/engine` 의 `{ conceptId, score, reason, sourceMessageId? }` (Sprint 0 슈퍼셋) | (현재 미생성 — Sprint 4 가 위 4 입력으로 *조립*) | `Decision.candidates` 채울 후보 |

**enum 슈퍼셋이 *처음으로 사용***: 본 sprint 가 Concept / GraphEdge / RecallReason 세 슈퍼셋을 *변경 없이 처음 채움*. Sprint 0 정의에 빈자리 0 — 호출 사이트 추가만. Sprint 4 의 trigger rule 도 동일 슈퍼셋 위에서 분기만 채운다.

**§7.engine cross-link**: 위 표의 정확한 시그니처는 §7.engine 의 `extractConcepts` / `embedConcept` / `buildEdges` 동결 블록과 storage 의 `nearestConcepts` 시그니처 (dev doc §3 In line 40) 와 1:1.

**비대상 (Sprint 4 슬라이스)**:
- `decide(input): Decision` 본문 ghost/suggestion/strong 분기 — Sprint 4.
- Trigger threshold (예: `score ≥ 0.85` → suggestion, `≥ 0.9` → strong) — Sprint 4 가 receipt 임계 회복 (`D-S3-receipt-threshold-recovery`) 과 함께 결정.
- Silence rule (rate-limit / cooldown / repetition) — Sprint 4.
- `RecallReason='bridge' | 'domain_crossing'` 활성 — Sprint 5 (Hyper-Recall).

### 7.mobile — conceptStore platform adapter + chat hook (T8 — mobile)

**carry-over 5 platform-adapter 첫 시범**: `apps/mobile/src/conceptStore.{ts,web.ts}` 의 *짝* 으로 metro platform extension 자동 분기. 두 파일 모두 시그니처 동일.

```ts
// apps/mobile/src/conceptStore.ts (native) + conceptStore.web.ts (web)
import type { Concept } from '@synapse/engine';

export function notify(concepts: Concept[]): void;
export function subscribe(listener: (concepts: Concept[]) => void): () => void;
export function getPrevTurnConceptIds(): string[];
```

**책임 분담** (dev doc §4 합치):
- `conversation.runMemoryFormation` 가 `storage.appendConcept` / `appendEdge` 를 *직접* 호출 (storage 위임 아님).
- `conceptStore` 의 책임 = (1) 알림 채널 — UI subscribe (2) `lastTurnConceptIds` 보관 — 다음 turn 의 `prevMessageConceptIds` 입력.
- web 어댑터는 in-memory `Map<id, Concept>` + observer Set. native 어댑터는 observer Set + lastTurnConceptIds 만 (storage 호출 0 — conversation 이 들고 있음).
- 두 파일 모두 `better-sqlite3` / `sqlite-vec` import 0 → web bundle 검증 통과.

**chat 화면 hook** (`apps/mobile/app/chat/index.tsx`):
- `useEffect` 로 `subscribeConcepts` → `setCapturedConcepts(concepts.slice(0, 3))`.
- `<CaptureToast concepts={capturedConcepts} onDismiss={() => setCapturedConcepts(null)} />` 가 `FlatList` 의 `ListFooterComponent` (메시지 리스트 마지막 직후 — 디자인 목업 `screens.jsx:104` `FirstChatScreen` 위치 1:1, `feedback_mockup_truth.md` 헌법 적용).
- `key={ids.join('|')}` — 새 turn 의 새 concept set 가 도착하면 컴포넌트 리마운트로 ink-rise 재진입. `onDismiss` 가 ghost-breathe out 0.6s 종료 시 부모 state 정리.

**carry-over 5 platform-adapter 검증 완료**: `pnpm --filter @synapse/mobile run build` exit 0 → `dist/_expo/static/js/web/*.js` 의 `better-sqlite3` 0 hits / `sqlite-vec` 0 hits. T9 receipt step 3 가 종단으로 흡수.

**conversation 와의 결합 — 합의 완료 (2026-04-29)**: `conversation.sendStream` 가 `prevMessageConceptIds?: string[]` / `onConcepts?: (concepts: Concept[]) => void` 를 *옵션* 으로 받는 형태로 동결 (§7.conversation 참고). mobile T8 호출 사이트가 `conceptStore.getPrevTurnConceptIds()` / `conceptStore.notify` 를 1 라인씩 주입. chatStore.{ts,web.ts} 외부 시그니처는 *건드리지 않음* — Sprint 1 동결 헌법 준수. 의존 방향 = mobile → conversation 단방향 유지 (콜백 옵션 패턴).

**Sprint 1 변경 금지**: `apps/mobile/src/chatStore.{ts,web.ts}` 외부 시그니처 동결. T8 가 *추가하는* 파일 = `conceptStore.{ts,web.ts}` 신규 + `app/chat/index.tsx` 의 subscribe + CaptureToast mount.

### 7.conversation — sendStream memory-formation hook (T6 — conversation)

**파일 인벤토리**:
- `packages/conversation/src/loop.ts` — `sendStream` assistant append 직후 fire-and-forget hook 추가. 별도 export `runMemoryFormation(userMessage, deps)` (단위 테스트용 + 향후 Sprint 6 Humble Retraction 재사용 후크).
- `packages/conversation/index.ts` — `runMemoryFormation` 와 신규 타입 (`MemoryFormationDeps`, `ExtractConceptsFn`, `EmbedConceptFn`, `BuildEdgesFn`, `NearestFn`, `Logger`) re-export.
- `packages/conversation/package.json` — `@synapse/engine` workspace dependency 추가 (default DI fallback 을 위해 런타임 import 필요 — `feedback_di_pattern.md` 옵션 함수 패턴 그대로).
- `packages/conversation/__tests__/loop-memory-formation.test.ts` (신규) — 14 테스트 (DI stub 으로 격리 검증).
- `packages/conversation/__tests__/loop-stream.test.ts` — 기존 3 케이스 *동작 변경 0*. 다만 default extractConcepts 가 진짜 Gemma 호출 → 시끄러운 stderr 방지로 stub `extractConcepts: async () => []` 1 라인 주입 (3 군데). hook 동작 자체에는 영향 없음.

**시그니처 (Sprint 3 동결 — `feedback_di_pattern.md` 옵션 함수 패턴)**:
```ts
import type { Database } from '@synapse/storage';
import type { Concept, EmbeddedConcept, GraphEdge, NearestFn as EngineNearestFn } from '@synapse/engine';

type CompleteJsonFn = (opts: { system: string; user: string; format: 'json' }) => Promise<string>;

export type ExtractConceptsFn = (
  message: string,
  opts?: { complete?: CompleteJsonFn },
) => Promise<Concept[]>;

export type EmbedConceptFn = (
  concept: Concept,
  opts?: { embed?: (text: string) => Promise<Float32Array> },
) => Promise<EmbeddedConcept>;

export type BuildEdgesFn = (
  newConcept: Concept | EmbeddedConcept,
  opts: {
    prevMessageConceptIds?: string[];
    nearest?: EngineNearestFn;
    threshold?: number;
    topK?: number;
  },
) => Promise<GraphEdge[]>;

export type Logger = { warn: (...args: unknown[]) => void };

export type MemoryFormationDeps = {
  extractConcepts?: ExtractConceptsFn;       // default: @synapse/engine.extractConcepts
  embedConcept?: EmbedConceptFn;             // default: @synapse/engine.embedConcept
  buildEdges?: BuildEdgesFn;                 // default: @synapse/engine.buildEdges
  completeJson?: CompleteJsonFn;             // forwarded to extractConcepts
  embed?: (text: string) => Promise<Float32Array>;  // forwarded to embedConcept
  nearest?: EngineNearestFn;                 // default: storage.nearestConcepts bound to deps.db
  prevMessageConceptIds?: string[];
  semanticThreshold?: number;                // default: engine.DEFAULT_SEMANTIC_THRESHOLD (0.7)
  onConcepts?: (concepts: Concept[]) => void;
  logger?: Logger;                           // default: console
};

// SendStreamDeps = { db, completeStream? } & MemoryFormationDeps  ← 외부 시그니처 슈퍼셋 확장
// (Sprint 1 SendStreamDeps 외부에서 의존하던 모든 호출은 무변경 — 신규 옵션 모두 optional)

export async function* sendStream(text: string, deps: SendStreamDeps): AsyncIterable<string>;
export async function runMemoryFormation(
  userMessage: string,
  deps: { db: Database } & MemoryFormationDeps,
): Promise<Concept[]>;  // 적재된 concepts 반환 (테스트용; sendStream 은 결과 무시)
```

**Hook chain (assistant append 직후 fire-and-forget — dev doc §4 와 정확히 일치)**:
```
sendStream 종료 시점 (마지막 yield 후 appendMessage(asst))
  └─ void runMemoryFormation(userMessage, deps).catch(logger.warn)
       1. extractConcepts(userMessage, { complete: completeJson })
            ↓ Concept[] (≤3, label 검증은 engine 책임)
            * empty → early return [] (embed/append/edges/notify 모두 skip)
       2. Promise.all(concepts.map(c => embedConcept(c, { embed })))
            ↓ EmbeddedConcept[] (embedding: Float32Array(768))
       3. for each c in embedded:
            a. appendConcept(db, { ...c, embedding: Array.from(c.embedding) })
                 // engine EmbeddedConcept(Float32Array) → storage Concept(number[]) 변환.
                 // dev doc §7.engine line 271 정합. types 변경 0.
            b. edges = buildEdgesFn(c, { prevMessageConceptIds, nearest, threshold })
                 // nearest 미주입 시 (vec, k, opts) => storage.nearestConcepts(deps.db, vec, k, opts) 자동 bind.
                 // EmbeddedConcept 그대로 전달 → engine buildEdges 가 isEmbedded 분기로 semantic 산출.
            c. for each edge in edges: appendEdge(db, edge)
       4. onConcepts?(concepts.map(c => ({ ...c, embedding: Array.from(c.embedding) })))
            // observer 는 plain Concept(number[]) 만 받는다 — Float32Array 가 절대 conceptStore 까지 새지 않음.
```

**격리 헌법** (`feedback_di_pattern.md` reject 동작 재사용):
- `void runMemoryFormation(...).catch((err) => logger.warn(...))` — sendStream generator 는 `appendMessage(asst)` 직후 즉시 종료. user reply 의 `for await yield` 흐름과 시간/실패 격리.
- `runMemoryFormation` 자체는 reject 를 *호출자에 그대로 전파* (단위 테스트가 reject 검증 가능). 격리 책임은 *sendStream 의 `.catch`* 에 있음 — 이 분리가 Sprint 6 Humble Retraction 재사용을 가능케 함 (`runMemoryFormation` 을 다른 트리거에서도 직접 호출 가능).
- `completeStream` 자체가 reject (mid-stream 실패) → assistant append 가 일어나지 않음 → hook 미실행. Sprint 1 의 user 행 보존 + assistant 행 미생성 동작 그대로.

**DI default 자동 결합**:
- `nearest` 미주입 시 `(vec, k, opts) => storage.nearestConcepts(deps.db, vec, k, opts)` 으로 closure 자동 bind. caller 가 `db` 를 두 번 주입할 필요 없음. 테스트는 명시 stub 으로 우회.
- `extractConcepts` / `embedConcept` / `buildEdges` 미주입 시 engine `index.ts` 의 동결 export 그대로.
- `completeJson` / `embed` 는 *engine 의* default fallback (Gemma fetch) 가 자동 발동 — conversation 은 별도 fetch 0.

**`prevMessageConceptIds` 계산 — 책임 mobile 위임 (협의 결과)**:
- conversation 은 `prevMessageConceptIds` 를 *옵션 인자* 로 받기만 함. chatStore 인터페이스 확장 0 (Sprint 1 chatStore 동결 헌법 준수).
- mobile T8 의 `conceptStore.getPrevTurnConceptIds()` 가 단일 진실원. mobile 이 `sendStream(text, { db, prevMessageConceptIds: conceptStore.getPrevTurnConceptIds(), onConcepts: conceptStore.notify, ... })` 로 주입.
- 첫 발화 (prev 없음) → mobile 이 `[]` 또는 `undefined` 전달 → engine `buildEdges` 가 co_occur 0 산출 (정상). dev doc §4 의 "첫 발화 (DB empty) 시 0 edges" 와 일치.

**`onConcepts` 콜백 vs conceptStore 직접 import**:
- conversation 패키지가 mobile 에 의존하면 의존 순환 → mobile → conversation 단방향 유지를 위해 **콜백 옵션** 으로 받음.
- mobile 이 `onConcepts: conceptStore.notify` 를 1 라인 주입. design-system / conversation 어느 쪽도 conceptStore 를 import 하지 않음. carry-over 5 platform-adapter 헌법과 정합.
- 콜백은 plain Concept (number[] embedding) 를 받음 — Float32Array 가 conceptStore 경계를 넘지 않게 conversation 가 변환 책임.

**검증 결과 (2026-04-29)**:
- `pnpm --filter @synapse/conversation typecheck` → 0 error.
- `pnpm --filter @synapse/conversation test` → 19 PASS / 0 FAIL (Sprint 1 의 5 + Sprint 3 신규 14).
  - 신규 14 = `runMemoryFormation` 9 (호출 순서 / empty / prevMessageConceptIds 전달·default / threshold default / nearest auto-bind / extract·embed·buildEdges reject 전파) + `sendStream` hook 5 (extract/embed/buildEdges reject 격리 + 정상 경로 onConcepts + completeStream reject 시 hook 미실행).
- `pnpm -r test` → 102 PASS / 0 FAIL 종합 (protocol 2 + llm 6 + engine 27 + storage 11 + orchestrator 2 + design-system 35 + conversation 19).

**비대상 (carry-over)**:
- `prevMessageConceptIds` *자동* 계산 — mobile T8 책임. conversation 은 옵션으로만 받음. Sprint 4 가 chatStore-conceptStore 결합을 *함수 호출 사이트* 에서 검증.
- Recall trigger gate — Sprint 4 의 `for await` 직전 hook 위치 (Sprint 1 dev doc 에서 약속된 *별도* hook). 본 sprint 의 assistant-append-직후 hook 과 *위치 다름* — 두 hook 공존 약속 보존됨 (`src/loop.ts` 의 `for await` 직전 `// Sprint 4: orchestrator.decide(...)` 주석 그대로 존속).
- `runMemoryFormation` 의 sync vs concurrent 정책 — 본 sprint 는 *순차* (concept 단위 for-loop). 향후 buildEdges 의 nearest 호출이 병목이면 concept 단위 `Promise.all` 로 전환 (단, appendEdge 는 트랜잭션 충돌 회피 위해 순차 유지). 결정 보류.
- Sprint 6 Humble Retraction 의 *역방향* hook (잘못 적재된 concept 제거) — 본 sprint 의 `runMemoryFormation` 시그니처를 *그대로 재사용* 가능하도록 `Promise<Concept[]>` 반환 유지 (적재된 id 목록 = 향후 retract 입력).

### 7.tester — sprint-3 receipt + dev-mode flag (T9 — tester)

**파일 인벤토리**:
- `scripts/receipt/sprint-3.sh` (신규) — Sprint 2 14 단계 wrap + Sprint 3 8 단계 (15..22) + dev-mode flag.
- `packages/storage/.receipt-runner/migrate-twice.mjs` (신규) — empty DB 두 번 migrate, 핵심 표 검증.
- `packages/conversation/.receipt-runner/sprint3-extract.mjs` (신규) — '어제 산책 중 들은 노래가 좋았어' → sendStream 회귀 + runMemoryFormation 결정적 await.
- `packages/conversation/.receipt-runner/sprint3-graph.mjs` (신규) — 두 메시지 + prevMessageConceptIds → concepts ≥ 2 + co_occur ≥ 1.
- `packages/conversation/.receipt-runner/sprint3-nearest.mjs` (신규) — 4 메시지 적재 후 첫 concept embedding 으로 nearestConcepts top-3, score DESC + excludeId.
- `packages/design-system/.receipt-runner/verify-copy.mjs` — Sprint 1 산출물의 checks 배열을 6 → 8 로 확장 (designer T7 의 captured/capturedSub 매칭).

**dev-mode flag (Sprint 3 동결, sprint-3.sh 헤더 주석 단일 진실원)**:
- `SKIP_SPRINT1_E2E=1` — Sprint 2 가 정의한 기존 flag. sprint-2.sh wrap 호출 시 호환.
- `SKIP_OLLAMA=1` — *Sprint 3 신규*. 두 가지 의미를 함의:
  1. `SKIP_SPRINT1_E2E=1` 로 강제 export → sprint-2.sh wrap 안의 sprint-1.sh 호출 skip (Sprint 1 e2e step 4-6 이 Ollama 의존).
  2. Sprint 3 신규 e2e (16/17/18) skip.
- 두 flag 동시 설정 시 의미 동일 (모두 skip). 우선순위 = `SKIP_OLLAMA > SKIP_SPRINT1_E2E`.
- 통과 ≠ `/end` 받음. `/end` 의 종단 검증은 Ollama UP 으로 22 단계 PASS 받아야 마감 (T10 책임).

**dev mode 자체-검증 흐름**:
```
SKIP_OLLAMA=1 bash scripts/receipt/sprint-3.sh
  └─ Sprint 2 wrap (sprint-2.sh)
       └─ Sprint 1 step 1..8 skip
       └─ Sprint 2 step 9..14 (헌법 inject / mockup-scope / FROZEN / directive / lint 단위 / race regression) PASS
  └─ Sprint 3 pre-check — pnpm -r test 명시 실행 (dev mode 에서도 단위 테스트 픽업 보장)
       └─ 102 PASS / 0 FAIL (protocol 2 + llm 6 + engine 27 + storage 11 + orchestrator 2 + design-system 35 + conversation 19)
  └─ step 15 (0003 마이그 멱등성) PASS
  └─ step 16/17/18 SKIP_OLLAMA=1 (skip)
  └─ step 19 (verify-copy ok=8) PASS
  └─ step 20/21/22 (mockup-scope-parity Sprint 3 / frozen-flag-audit Sprint 3 / directive-tag-audit) PASS
```

**임계 (Sprint 1 carry-over 8 / Sprint 2 carry-over 9 헌법 — 보수적 시작)**:
| 단계 | 임계 | 출처 |
|---|---|---|
| 5 (Sprint 1 wrap) | chunks ≥ 1 | Sprint 1 |
| 5 (Sprint 1 wrap) | length ≥ 1 | Sprint 1 |
| 16 | concepts ≥ 1 | Sprint 3 신규 |
| 17 | concepts ≥ 2 | Sprint 3 신규 |
| 17 | co_occur edges ≥ 1 | Sprint 3 신규 |
| 18 | nearest rows ≥ 1 | Sprint 3 신규 |
| 19 | verify-copy ok ≥ 8 | Sprint 3 신규 |

본 sprint receipt 통과 후 `/end` 가 *Sprint 4 receipt 헌법 강화* 결정 (carry-over 9 회복, decision-id 후보 = `D-S3-receipt-threshold-recovery`).

**신규 단위 테스트 픽업 검증** (sprint-3.sh "Sprint 3 pre-check"):
- 5 신규 파일 존재 단언:
  - `packages/engine/__tests__/extractConcepts.test.ts`
  - `packages/engine/__tests__/embed.test.ts`
  - `packages/engine/__tests__/buildEdges.test.ts`
  - `packages/storage/__tests__/graph.test.ts`
  - `packages/conversation/__tests__/loop.test.ts`
- 파일 위치 = `__tests__/*.test.ts` glob 그대로. 각 패키지 `package.json` 의 `test` = `node --test --experimental-strip-types __tests__/*.test.ts` 가 자동 픽업 (별도 vitest config 미필요 — 본 모노레포는 node:test runner 일관 사용).
- dev mode 에서 `pnpm -r test` 명시 실행 → 단위 테스트가 Ollama 비의존이므로 SKIP_OLLAMA=1 모드도 모두 통과.
- *dev doc 표기 vs 코드 헌법*: §5 file ownership 표가 `packages/<pkg>/src/__tests__/` 로 적었으나, code (`package.json` glob = `__tests__/*.test.ts`) 가 진실원. *engine T3 동결 결정* (§7.engine line 275) 그대로 적용.

**검증 결과 (2026-04-29 dev mode)**:
- `SKIP_OLLAMA=1 bash scripts/receipt/sprint-3.sh` → 22 단계 PASS / exit 0.
- `pnpm -r test` (sprint-3.sh pre-check 안에서) → 102 PASS / 0 FAIL.
- `verify-copy.mjs` → `ok=8` (Sprint 1 6 + Sprint 3 신규 captured/capturedSub).
- `migrate-twice.mjs` → `tables=concepts,edges,vec_concepts;migrations=3` (0001/0002/0003 모두 적용 + 두 번째 호출 멱등).
- `mockup-scope-parity.sh docs/sprints/sprint-3-memory-formation.md` → exit 0 (env override 없이 Sprint 2 §7.1 표 그대로 매칭).
- `frozen-flag-audit.sh docs/sprints/sprint-3-memory-formation.md` → exit 0 (§11 Decisions Made 비어있음 → conservative skip).
- `directive-tag-audit.ts` → exit 0.

**Ollama UP 단계 검증 책임 = T10**: `/end` 가 `bash scripts/receipt/sprint-3.sh` (SKIP_OLLAMA 미설정) 으로 step 16/17/18 종단 검증. 본 T9 는 dev mode 자체-검증 + Ollama UP 시 e2e 진입점 (sprint3-{extract,graph,nearest}.mjs) 계약 검증까지.

**비대상 (carry-over)**:
- step 16/17/18 의 임계 강화 — 본 sprint 는 보수적 ≥ 1 시작. Sprint 4 `/end` 결정 (`D-S3-receipt-threshold-recovery`).
- 신규 vitest config — 본 모노레포는 node:test 일관 사용. vitest 도입은 본 sprint 비대상 (도입 시 dev doc 의 "vitest" 표기와 정합).
- mobile T8 의 conceptStore 단위 테스트 (`apps/mobile/__tests__/conceptStore.test.ts`) — §8.mobile M1~M4 의 자동화. 본 sprint 는 dev mode 우선이라 receipt M5 (build + grep) 가 종단 흡수. Sprint 4 가 chatStore-conceptStore 결합 시 추가.

## 8. Test Scenarios
*(라이브 갱신)*

### 8.storage — `packages/storage/__tests__/{db,graph}.test.ts`

| # | 시나리오 | 검증 |
|---|---|---|
| S1 | 0003 마이그 멱등성 | 동일 DB 에 `migrate()` 3회 → `_migrations` row count 변화 0, `concepts`/`edges`/`vec_concepts` 모두 존재 |
| S2 | appendConcept 정상 경로 | 2 개 적재 → `concepts` 2 row + `vec_concepts` 2 row 동기 |
| S3 | appendConcept duplicate id | 동일 id 재적재 → `concepts` row 1 그대로, 라벨 갱신 0, `vec_concepts` 중복 0 |
| S4 | appendConcept embedding 미보유 | `embedding` 미주입 concept → `concepts.embedding` NULL + `vec_concepts` 0 row |
| S5 | appendEdge PK 동작 | 동일 `(from,to,'co_occur')` 중복 → IGNORE (첫 weight 보존). 동일 `(from,to)` + 다른 kind → 별도 row |
| S6 | nearestConcepts top-k 정렬 | 4 concept 적재 후 self 쿼리 → top-3 의 self 1위, score 내림차순, self score > 0.99 |
| S7 | nearestConcepts excludeId | 3 concept + self 쿼리 + `excludeId=self` → 결과 length=k, self 부재 |
| S8 | nearestConcepts k=0 | 빈 배열 즉시 반환 (DB 쿼리 0) |
| S9 | forward-compat (db.test.ts 갱신) | 0001-only legacy DB → migrate → 0001/0002/0003 모두 적용, lexical-sorted, idempotent |

### 8.mobile — `apps/mobile/src/conceptStore.{ts,web.ts}` + `app/chat/index.tsx`

본 sprint 는 카본 단위 테스트 추가 0 — receipt step 3 (`pnpm --filter @synapse/mobile run build` + grep) 가 carry-over 5 검증을 종단으로 흡수한다.

| ID | 시나리오 | 기대 |
|---|---|---|
| M1 | conceptStore web — notify → subscribe 알림 | `subscribe(fn)` 후 `notify([c1, c2])` → fn 1회 호출, 인자 = `[c1, c2]` |
| M2 | conceptStore web — empty notify 무시 | `notify([])` → listener 호출 0, `getPrevTurnConceptIds()` 그대로 |
| M3 | conceptStore web — getPrevTurnConceptIds 갱신 | `notify([c1])` → `getPrevTurnConceptIds() === ['c1']`. 이후 `notify([c2,c3])` → `['c2','c3']` (덮어쓰기). |
| M4 | conceptStore native parity | native 어댑터도 M1~M3 동일 결과 (lastTurnConceptIds 보관 + observer Set) |
| M5 | platform adapter carry-over 5 | `pnpm --filter @synapse/mobile run build` exit 0, web bundle 의 `better-sqlite3` / `sqlite-vec` grep 0 hits (receipt step 3) |
| M6 | chat 화면 mount (시각 회귀) | conceptStore.notify([c1,c2]) → useEffect subscribe → `<CaptureToast concepts={[c1,c2]}>` 마운트. `key` 가 ids join → 새 turn 도착 시 리마운트. `onDismiss` → `setCapturedConcepts(null)` (다음 turn 대기 상태) |

**M1~M4 자동화**: `apps/mobile/__tests__/conceptStore.test.ts` (선택 — 본 sprint 는 dev mode 우선, receipt M5 가 종단 검증). Sprint 4 가 conceptStore 의 lastTurnConceptIds 를 conversation 의 `prevMessageConceptIds` 입력으로 *실제* 결합할 때 추가.

**M6 자동화 보류**: RN UI 테스트는 본 sprint 가 신설 안 함 (Sprint 7 polish 위임 — `app/chat/__tests__/*` dev doc §5 의 "선택, 없을 시 receipt e2e 로 대체" 헌법 그대로). receipt step 3 의 build 통과 + chat/index.tsx 의 import resolve 정상이 종단 회귀 대체.

### 8.conversation — `packages/conversation/__tests__/loop-memory-formation.test.ts`

전 14 케이스 모두 stub DI 만 사용 — Ollama 의존 0 (`SKIP_OLLAMA=1` 안전).

| ID | 시나리오 | 검증 |
|---|---|---|
| C1 | runMemoryFormation 호출 순서 (golden) | 2 concept 입력 → `extract → embed*2 → buildEdges*2 → notify(2)` 순서 deepEqual. concepts 2 row, edges 1 row (co_occur) 적재. |
| C2 | extract empty → 다운스트림 skip | 0 concept → embed/append/buildEdges/notify 모두 0 호출. concepts row 0. |
| C3 | prevMessageConceptIds 전달 | `['x','y']` 주입 → buildEdges 에 그대로 전달 (deepEqual). |
| C4 | prevMessageConceptIds 미주입 | undefined 그대로 buildEdges 에 전달 (첫 발화 시나리오). |
| C5 | semanticThreshold default | 미주입 시 `threshold = 0.7` (engine `DEFAULT_SEMANTIC_THRESHOLD`). |
| C6 | nearest auto-bind | nearest 미주입 시 buildEdges 가 함수 객체 수신 (`typeof === 'function'`). 이는 `(vec, k, opts) => storage.nearestConcepts(deps.db, ...)` closure. |
| C7 | extract reject 전파 | runMemoryFormation 호출자에 reject. concepts row 0. |
| C8 | embed reject 전파 + 격리 | concepts row 0 (embed 단계에서 fail-fast — appendConcept 미호출). |
| C9 | buildEdges reject 전파 | runMemoryFormation 호출자에 reject (격리는 sendStream 의 .catch 책임). |
| C10 | sendStream — extract reject 흡수 | tokens 정상 yield, assistant row 정상 적재, logger.warn 1회, concepts row 0. |
| C11 | sendStream — 정상 경로 | tokens 정상 + onConcepts 1회 호출 (인자 = ≤3 concept) + concepts row 적재. |
| C12 | sendStream — embed reject 흡수 | tokens 정상, logger.warn 1회. |
| C13 | sendStream — buildEdges reject 흡수 | tokens 정상, logger.warn 1회. |
| C14 | sendStream — completeStream reject 시 hook 미실행 | mid-stream 실패 → assistant append 미발생 → extract 호출 0 (Sprint 1 동작 보존). |

**flushHook 헬퍼**: `for (i<8) await Promise.resolve(); await setTimeout(5)` — sendStream 의 fire-and-forget chain 이 결정성 있게 settle. stub 만 사용하므로 마이크로태스크 + 짧은 매크로태스크 한 번이면 충분.

**격리 검증의 의미**: C10/C12/C13 모두 *user reply (tokens) 가 정상* + *logger.warn 1회* + *concepts/edges 적재 적절히 0/부분*. user 가 hook 실패를 알 길이 없는 게 본 sprint 의 침묵 헌법 (`기획서.md` §16 silence default).

## 9. Demo Script

전제: macOS, Ollama UP (`brew services start ollama`), `gemma3:4b` (chat) + `embeddinggemma:latest` (embeddings, 768d) 모두 로드, repo 루트.

**Step 1 — 의존성 + 빌드**:
```bash
pnpm install
pnpm -r test                                    # 102 PASS
pnpm --filter @synapse/mobile run build         # 973 kB, exit 0, web bundle 에 better-sqlite3/sqlite-vec 0 hits
```

**Step 2 — Sprint 3 dev mode 단독 검증 (Ollama 불요)**:
```bash
SKIP_OLLAMA=1 bash scripts/receipt/sprint-3.sh
# → 단계 9-15, 19-22 PASS, 4-6 + 16-18 skip
```

**Step 3 — 종단 receipt (Ollama UP)**:
```bash
bash scripts/receipt/sprint-3.sh
# 1-3:   pnpm install / -r test / mobile build
# 4-8:   Sprint 1 e2e (single-shot reply_len=22, stream chunks=10 length=22 ms=630, latency=628, COPY ok=8, SQLite user=1 assistant=1)
# 9-14:  Sprint 2 메타 (헌법 inject 10/10, mockup-scope-parity Sprint 1, frozen-flag-audit Sprint 1, directive-tag-audit, lint harness 9/9, race-regression 5)
# 15:    0003 마이그 멱등성 → tables=concepts,edges,vec_concepts;migrations=3
# 16:    e2e Concept 추출 → concepts=1;label0=산책
# 17:    e2e 그래프 형성 → concepts=4;co_occur=3;total_edges=3
# 18:    e2e nearestConcepts → rows=3;sorted=true;top0=d01b52a3
# 19:    CaptureToast i18n → ok=8
# 20:    mockup-scope-parity Sprint 3 → PASS
# 21:    frozen-flag-audit Sprint 3 → PASS (D-S3-chatStore-internal-wiring 인식)
# 22:    directive-tag-audit → PASS
# → "✅ Sprint 3 receipt PASSED"
```

**Step 4 — Memory Formation 단독 시연**:
```bash
node packages/conversation/.receipt-runner/sprint3-extract.mjs    # Concept 추출 1 회
node packages/conversation/.receipt-runner/sprint3-graph.mjs      # 두 메시지 → co_occur 형성
node packages/conversation/.receipt-runner/sprint3-nearest.mjs    # nearestConcepts top-3
```

## 10. Implementation Map

**Receipt 검증 결과 (2026-04-29, Ollama UP)**: ✅ **22/22 PASS**.

**실측**:
- Sprint 1 stream: `chunks=10 length=22 ms=630` (Sprint 1: 594, Sprint 2: 608, Sprint 3: 630 — 안정).
- 단계 15 (0003 멱등성): `tables=concepts,edges,vec_concepts;migrations=3` (empty DB 두 번 마이그 → exit 0).
- 단계 16 (Concept 추출): 입력 = '어제 산책 중 들은 노래가 좋았어' → `concepts=1, label0=산책` (≥1 임계 충족).
- 단계 17 (그래프 형성): 두 메시지 연속 → `concepts=4, co_occur=3, total_edges=3` (≥2 / ≥1 임계 충족).
- 단계 18 (nearestConcepts top-3): `rows=3, sorted=true (DESC), top0=d01b52a3` (≥1 임계 충족).
- 단계 19 (i18n): `ok=8` (Sprint 1 6 + 신규 captured/capturedSub).
- 단계 21 (frozen-flag-audit): `D-S3-chatStore-internal-wiring` prefix 인식 PASS.

**`packages/storage/`** (T1+T2, storage):
- `schema/0003_graph.sql` — concepts(id PK, label, embedding BLOB, created_at) + edges(from_id, to_id, weight, kind CHECK, PK(from_id,to_id,kind)) + `vec_concepts USING vec0(embedding float[768])`. WAL/idempotent + idx_concepts_created_at + idx_edges_from/to.
- `src/repo/graph.ts` — `appendConcept(db, concept)` (TX + INSERT OR IGNORE + vec_concepts BigInt rowid bind 동기 INSERT), `appendEdge(db, edge)` (TX + INSERT OR IGNORE).
- `src/repo/embed.ts` — `nearestConcepts(db, vec, k, opts?)` (sqlite-vec MATCH KNN + concepts JOIN, score = `1 - distance`, DESC, excludeId 시 over-fetch).
- `index.ts` — appendConcept / appendEdge / nearestConcepts + NearestConcept 타입 re-export.
- `__tests__/graph.test.ts` (7 신규) + `__tests__/db.test.ts` (forward-compat assertion 갱신).
- `package.json` — `@synapse/engine` workspace devDependency (type-only Concept/GraphEdge import).
- 검증: `pnpm --filter @synapse/storage test` 11/11 PASS.

**`packages/engine/`** (T3+T4+T5, engine):
- `src/extractConcepts.ts` — `extractConcepts(message, opts?: {complete?})` Gemma `/api/chat` JSON 모드, ≤3 절단, malformed JSON → []. DI = `complete?` 옵션 함수.
- `src/embed.ts` — `embedConcept(concept, opts?: {embed?})` Gemma `/api/embeddings` 768d. **default model = `embeddinggemma:latest`** (env override `SYNAPSE_EMBED_MODEL`). 차원 mismatch throw.
- `src/buildEdges.ts` — `buildEdges(newConcept, opts: {db, prevMessageConceptIds?, nearest?, threshold?})` co_occur (prev 1:1 weight 1.0) + semantic (≥0.7 weight=score, top-k=5, self exclude). DI = `nearest?` 옵션 함수.
- `index.ts` — 신규 export. `extract.ts` / `graph.ts` (Sprint 0 stub) **삭제**.
- `__tests__/{extractConcepts,embed,buildEdges}.test.ts` (8+5+9 = 22 신규) + `types.test.ts` 갱신.
- 검증: `pnpm --filter @synapse/engine test` 27/27 PASS, typecheck 0 error.

**`packages/conversation/`** (T6, conversation):
- `src/loop.ts` — `sendStream` 가 assistant append 직후 fire-and-forget `runMemoryFormation(userMessage, deps)` 별도 export 호출 (Sprint 6 Humble Retraction 재사용 후크). DI 옵션 9 종 (`extractConcepts?`, `embedConcept?`, `buildEdges?`, `completeJson?`, `embed?`, `nearest?`, `prevMessageConceptIds?`, `semanticThreshold?`, `onConcepts?`, `logger?`). 실패 `.catch(logger.warn)` — user reply 흐름과 분리. Sprint 4 hook 주석 위치 보존 (별도 위치).
- 호출 패턴: `Array.from(c.embedding)` 으로 Float32Array → number[] 변환 후 `appendConcept` (Concept.embedding: number[]? 동결 준수).
- `package.json` — `@synapse/engine` workspace dep.
- `__tests__/loop-memory-formation.test.ts` (14 신규) + `loop-stream.test.ts` (silent stub 추기). 19 PASS / 0 FAIL.

**`packages/design-system/`** (T7, designer):
- `src/components/CaptureToast.tsx` 신규 — 디자인 목업 `FirstChatScreen` 1:1, props = `{concepts: Concept[], onDismiss?}`, paper bg + ink-rise 0.4s + 2.4s 노출 + ghost-breathe 0.6s out.
- `src/components/index.ts` 신규 + export.
- `src/copy.ts` — `firstChat.captured` / `capturedSub` ko/en 추기 (verify-copy ok=8).
- `package.json` — `peerDependencies: {react, react-native}` + devDeps `@types/react`, `@types/react-native` (option A 첫 컴포넌트 추가 시 표준).
- `tsconfig.json` — `jsx: "react-jsx"` 추가.
- 35 단위 테스트 PASS.

**`apps/mobile/`** (T8, mobile):
- `src/conceptStore.ts` (native) — `notify` / `subscribe` / `getPrevTurnConceptIds` 인터페이스. observer Set + lastTurnConceptIds 보관.
- `src/conceptStore.web.ts` (web) — in-memory `Map<id, Concept>` + observer Set, native-only 모듈 import 0.
- `src/chatStore.ts` (native) — `sendStream` *내부* 의 conversation.sendStream 호출 사이트에 `prevMessageConceptIds: conceptStore.getPrevTurnConceptIds()` + `onConcepts: conceptStore.notify` 자동 주입 (`D-S3-chatStore-internal-wiring`). 외부 시그니처 무변경.
- `src/chatStore.web.ts` (web) — 동일 wiring + 데모 시퀀스 종료 시 `conceptStore.notify(demoConcepts)` 호출 (label = '멈춤 / 일의 리듬 / 정리하고 싶음', 디자인 목업 `screens.jsx:106` 1:1).
- `app/chat/index.tsx` — `subscribeConcepts` useEffect → `setCapturedConcepts(slice(0,3))` → `<CaptureToast>` `FlatList.ListFooterComponent` 마운트 + `key={ids.join('|')}` 리마운트 + `onDismiss → setCapturedConcepts(null)`.
- 빌드: `pnpm --filter @synapse/mobile run build` 973 kB, exit 0. **carry-over 5 검증**: web bundle 의 `better-sqlite3` 0 hits + `sqlite-vec` 0 hits — platform-adapter 첫 시범 성공.

**`packages/orchestrator/`** (T11, orchestrator):
- 코드 변경 0 byte. DecisionAct enum 슈퍼셋 4 원 (`silence/ghost/suggestion/strong`) 시그니처 동결 검증 — 3 출처 (메모리 / `orchestrator/types.ts` / `decide.ts` 주석) drift 0.
- dev doc §7.orchestrator 표 1 회 기여 (Sprint 4 가 소비할 입력 인터페이스 — Concept / GraphEdge co_occur / GraphEdge semantic / nearestConcepts / RecallCandidate 5 행).

**`scripts/receipt/sprint-3.sh`** (T9, tester):
- Sprint 2 14 단계 wrap (`SKIP_SPRINT1_E2E=1` 호환) + 신규 8 단계 (15-22).
- `SKIP_OLLAMA=1` env 신규 도입 — Sprint 1 e2e (4-6) + 신규 e2e (16-18) skip 가능. 우선순위 `SKIP_OLLAMA > SKIP_SPRINT1_E2E`.
- `.receipt-runner/` 디렉토리 — `migrate-twice.mjs`, `sprint3-{extract,graph,nearest}.mjs`, `verify-copy.mjs` (ok 6→8).
- 임계 보수적 ≥1 시작 (carry-over 9 그대로).
- 22/22 PASS (Ollama UP).

**`docs/sprints/sprint-3-memory-formation.md`** (team-leader):
- §1-§2 (`/end` Sprint 2 시 생성), §3-§6 (`/start` PM 사인오프 직후 채움), §7-§8 (라이브 작성자 시간창), §9-§12 (본 T10 마감).
- §3 Out (line 65) + §5 ownership (line 173) 갱신 — `D-S3-chatStore-internal-wiring` PM 사인오프 후 dev doc 모순 해소.
- §11 Decisions Made: 2 결정 (`D-S3-chatStore-internal-wiring`, `D-S3-receipt-threshold-recovery`) 모두 `**[FROZEN v2026-04-29 D-S3-...]**` prefix.

**비변경 (검증)**:
- `packages/{protocol,llm}/src/` — Sprint 1 그대로.
- `packages/orchestrator/src/` — 0 byte (Sprint 4 슬라이스).
- `apps/mobile/src/chatStore.{ts,web.ts}` *외부 시그니처* — Sprint 1 동결 (내부 wiring 1줄만 추가).

## 11. Decisions Made / Open Issues
**Decisions Made:**
- **[FROZEN v2026-04-29 D-S3-chatStore-internal-wiring]** **`apps/mobile/src/chatStore.{ts,web.ts}` 외부 시그니처 동결 + 내부 wiring 1줄 허용 (Sprint 3 한정)**. mobile T8 가 `conversation.sendStream` 호출 시 `prevMessageConceptIds: conceptStore.getPrevTurnConceptIds()` + `onConcepts: conceptStore.notify` 옵션 자동 주입. 외부 호출자 (`sendStream(text)` / `listMessages()`) 시그니처 무변경 — Sprint 1 동결 헌법 준수. 사유: §3 Out (line 65) + §5 ownership (line 173) ↔ §7.mobile 합의 단락 (line 467/469) 사이 *해석 모순* (엄격 vs 유연) 발생 → 유연 해석 (외부 시그니처만 동결) 채택, dev doc 갱신으로 모순 해소. 결정 본질 = chatStore 의 *외부 호출자 보호* 의도 보존, conceptStore platform-adapter 첫 시범 (carry-over 5) 자연 정합. *옵션 D* 채택 (옵션 A: 엄격 위반 / B: native db handle 컴포넌트 노출 거절 / C: conversation→mobile 역의존 거절). (PM 사인오프 + team-leader/conversation/mobile 합의.)
- **[FROZEN v2026-04-29 D-S3-receipt-threshold-recovery]** **본 sprint receipt 22/22 PASS 통과 → Sprint 4 receipt 헌법 강화 후보 동결**. 실측 안정 (chunks=10 length=22 ms=630, concepts ≥ 1, co_occur ≥ 1, nearest ≥ 1) 기반으로 Sprint 4 receipt 의 임계를 `chunks ≥ 2 length ≥ 5 ms ≤ 5000 + concepts ≥ 2 co_occur ≥ 1 nearest ≥ 1` 로 강화 결정. carry-over 8 (Sprint 1) / carry-over 9 (Sprint 2) 의 보수적 시작 + 실측 후 회복 헌법 (`feedback_receipt_threshold.md`) 정확 적용. Sprint 4 의 `/start` 가 receipt 작성 시 본 임계 박음. (team-leader 결정 + tester 협의.)

**Open Issues:**
- *(없음. 본 sprint 의 모든 deliverable 통과. 종단 receipt 22/22 PASS.)*

## 12. Carry-over + Retrospective

**Carry-over (Sprint 4 가 반드시 알아야 할 것):**

### Sprint 4 즉시 적용 (Recall L1~L3 진입)
1. **Recall 입력 그래프 완성** — `concepts` (id, label, embedding number[]?, created_at) + `edges` (from_id, to_id, weight, kind 'co_occur'|'semantic') + sqlite-vec `vec_concepts` 모두 적재됨. Sprint 4 Recall 알고리즘은 `nearestConcepts(vec, k)` + 그래프 traversal (edges) 을 *읽기 전용* 으로 소비.
2. **DecisionAct enum 4 원 (`silence/ghost/suggestion/strong`) 동결 유지** — Sprint 3 가 처음 사용. orchestrator §7 표 (Sprint 3 dev doc) 가 입력 인터페이스 인덱스. Sprint 4 가 *처음으로 의사결정* — 시그니처 변경 시 `decision_orchestrator_enum.md` 메모리 동결 위반.
3. **`runMemoryFormation` Sprint 6 재사용 후크** — conversation 의 별도 export 가 Humble Retraction reject 동작 재사용 기반. 시그니처 (`Promise<Concept[]>` 반환) 유지 — 적재된 concept id 가 향후 retract 입력.
4. **§7.orchestrator 표 (Sprint 3 dev doc)** — Sprint 4 가 처음 소비. Concept / GraphEdge co_occur / GraphEdge semantic / nearestConcepts / RecallCandidate 5 행이 Sprint 4 의 input contract.

### Sprint 4 platform-adapter 강제 (carry-over 5 그대로 살아있음)
5. **모든 native-only 모듈 소비자 platform-adapter 패턴** — `<feature>.{ts,web.ts}` 짝 필수. Sprint 3 의 `conceptStore.{ts,web.ts}` 첫 시범 PASS. Sprint 4 의 신규 store / Recall hook 도 동일 적용. 위반 시 receipt step 3 web bundle build 실패로 잡음.

### Sprint 3 신규 carry-over
6. **vec0 BigInt rowid 강제** — better-sqlite3 default `number` bind 가 vec0 PK 검증에서 거부 → `BigInt(lastInsertRowid)` 강제. 향후 messages_vec / 차후 vec table 모두 동일 패턴 (storage T2 카비엇).
7. **engine ↔ storage type-only cyclic warning** (`pnpm install` 1줄) — 런타임 cycle 0 (type-only). 깨끗한 해소 = `Concept` / `GraphEdge` → `@synapse/protocol` 이전. **Sprint 4 이후 검토**.
8. **`appendConcept` duplicate = no-op** — 라벨 갱신/임베딩 보강 필요 시 `updateConcept` 신설. **Sprint 6 forgetting 정책** 검토.
9. **테스트 위치 root `__tests__/` 헌법** — engine 이 `package.json` test glob (`__tests__/*.test.ts` root) 채택. 다른 패키지도 동일. dev doc 의 `src/__tests__/` 표기와 차이 — `code > task subject > dev doc` 헌법으로 root 채택. Sprint 4+ 의 모든 신규 단위 테스트 동일 위치.
10. **`Concept.embedding: number[]?` (Sprint 0 동결) ↔ `EmbeddedConcept.Float32Array` (engine 내부)** — boundary 변환 = `Array.from(c.embedding)` 으로 storage append. Sprint 4 이후 protocol 이전 시점에 type 일원화 검토.
11. **design-system 첫 컴포넌트 = peer dep + jsx flag 패키지 설정 변경** — 향후 컴포넌트 추가 sprint 의 표준 절차. peerDependencies (react, react-native) + tsconfig.json `jsx: "react-jsx"` + components/ 디렉토리.
12. **embedding 모델 분리** — `gemma3:4b` (chat) ≠ `embeddinggemma:latest` (embeddings 768d). engine `embed.ts` 의 default = `embeddinggemma:latest` (env override `SYNAPSE_EMBED_MODEL`). T10 종단 receipt 단계 16 fail → engine fix 1 줄 → PASS 의 incident 학습. Sprint 4+ 에서 모델 다양성 (다국어 / 차원) 검토 시 임베딩 모델 어댑터 분리.
13. **decision-id 명명 표준** — `D-<sprint>-<영향 받는 대상 파일>-<행위>` 형식 (예: `D-S3-chatStore-internal-wiring`). audit grep 친화 + 변경 주체 명시. Sprint 3 진행 중 워커별 분기 (mobile `conceptstore-wiring` vs conversation `chatStore-internal-wiring`) 발생 → team-lead 가 단일화. Sprint 4+ 부터 *영향 받는 대상 파일* 명명 표준 채택.
14. **`SKIP_OLLAMA=1` dev mode** — Sprint 3 receipt 신규 도입. Ollama 의존 단계 (4-6, 16-18) skip. 우선순위 `SKIP_OLLAMA > SKIP_SPRINT1_E2E`. Sprint 4 receipt 가 본 패턴 그대로 wrap.
15. **Receipt 임계 강화 (Sprint 1 carry-over 8 / Sprint 2 carry-over 9 회복)** — `D-S3-receipt-threshold-recovery` 결정 그대로: Sprint 4 receipt 의 임계 = `chunks ≥ 2 length ≥ 5 ms ≤ 5000 + concepts ≥ 2 co_occur ≥ 1 nearest ≥ 1`. Sprint 4 `/start` 가 receipt 작성 시 박음.

### Sprint 7+ Polish 위임 (그대로 살아있음)
16. **synapse-pulse 토큰** (Sprint 1 carry-over 6) — Sprint 4+ 가능 (Recall 의 ghost-breathe / synapse-pulse 가 본격 사용).
17. **SynapseGlyph 자리표시** (Sprint 1 carry-over 7) — Sprint 7 polish.
18. **chatStore `@synapse/*` LSP 진단 노이즈** (Sprint 1 carry-over 8) — 빌드/런타임/receipt 무관. Sprint 7 polish 또는 carry-over 7 의 protocol 이전 시점에 자동 해소.

### TaskList API 휘발성 (Sprint 1/2 회고 그대로 살아있음)
19. **TaskList API 휘발 재발생 가능** — Sprint 2 carry-over 13 그대로. 본 sprint 시작 시점에는 살아있었음. Sprint 4 시작 시점 휘발 가능 — dev doc + 워커 보고 fallback.

### 가정 보존
- Sprint 0/1/2 의 모든 다른 가정은 직전 스프린트 그대로 유지.
- Sprint 4 가 처음 소비할 시그니처 (Concept / GraphEdge / RecallCandidate / DecisionAct enum) 모두 동결 — 변경 시 PM HOLD 발송.

**Retrospective:**

*잘 된 것*:
- **종단 receipt 22/22 PASS** — Sprint 1 8 + Sprint 2 메타 6 + Sprint 3 신규 8 = 모두 통과. Memory Formation 의 종단 흐름 (LLM Concept 추출 + 768d 임베딩 + 그래프 형성 + UI CaptureToast) 안정 작동 검증. 임계 모두 보수적 ≥1 충족 (concepts=1/4, co_occur=3, nearest top-3 sorted).
- **HOLD-DECIDE-RESUME 첫 가동** — `D-S3-chatStore-internal-wiring` PM 결정 분기에서 헌법 4 패턴 #1 정확 작동. mobile + conversation 동시 차단 → PM 사인오프 → directive 발송 → RESUME 후 wiring 1줄 추가 + 종단. Sprint 1 (A)/(B') race 의 *시스템 수준 봉쇄* 가 실전에서 입증.
- **워커 9 슬라이스 race 0** — storage / engine / conversation / designer / mobile / orchestrator / tester 7 워커 + team-leader 가 9 task 종단. dev doc §7-§8 라이브 갱신 시 단일 작성자 시간창 헌법으로 충돌 0. 워커 간 SendMessage peer DM 으로 시그니처 정합 자체 해소 (designer↔mobile onDismiss, conversation↔mobile wiring 패턴, engine↔conversation type 충돌).
- **type 충돌 LSP 캐시 noise 인식** — conversation `Concept.embedding: number[]?` ↔ `EmbeddedConcept.Float32Array` 미스매치 LSP 진단이 *이미 해소된 코드* 의 stale 캐시였음을 conversation 워커가 명확히 통지. team-lead 가 race 로 오인하지 않음.
- **embedding 모델 결함 receipt 가 잡음** — engine `embed.ts` default = `gemma3:4b` 결함이 단위 테스트 (stub) 통과 + receipt 단계 16 (e2e) fail 의 정확한 위치에서 노출. 1 줄 fix → 22/22 PASS. *receipt 가 실제 결함을 잡는다는 신호*.
- **platform-adapter 첫 시범 PASS** — `conceptStore.{ts,web.ts}` 짝 + chatStore wiring 까지 web bundle 의 `better-sqlite3` / `sqlite-vec` 0 hits 검증. carry-over 5 헌법이 실전 통과.

*아팠던 것*:
- **embedding 모델 default 미세설정** — engine 워커가 `gemma3:4b` 를 chat 과 embeddings 양쪽에 박았음. Sprint 0 / Sprint 1 의 chat 어댑터 패턴이 너무 자연스러워 *embeddings 모델 분리 필요* 가 워커 시야에서 누락. receipt 가 잡았지만 종단 검증 round trip 1 회 추가 비용 발생. carry-over 12.
- **decision-id 명명 표준 사전 합의 부재** — `D-S3-chatStore-internal-wiring` (conversation) vs `D-S3-conceptstore-wiring` (mobile) 두 명명 분기. team-lead 가 단일화 (chatStore-internal-wiring 채택) 했지만 PM 사인오프 직전 noise. carry-over 13.
- **engine T5 자가-마킹 미발생** — engine 워커가 BlockedBy 해소 후 자동 마킹 약속했으나 idle notification 만 보냄. team-lead 가 직접 #31 completed 마킹. TaskUpdate API 의 자동 BlockedBy 알림이 워커 측 trigger 가 안 됐을 가능성.
- **TaskList API 휘발성 재발 가능성** — Sprint 1/2 carry-over 그대로 살아있음. 본 sprint 시작 시 살아있어 영향 0 였지만 Sprint 4 시작 시점 재발 시 dev doc fallback 계속 의존.
- **`@synapse/*` LSP 진단 노이즈** (Sprint 1 carry-over 그대로) — Sprint 3 동안 6+ 회 LSP 진단 알림. 빌드/런타임/receipt 무관이지만 noise. Sprint 4 이후 protocol 이전 (carry-over 7) 또는 Sprint 7 polish.

*다음에 다르게 할 것*:
- **Sprint 4 진입 직전 default 모델 dry-run** — `gemma3:4b` (chat) + `embeddinggemma:latest` (embeddings) 2 모델 1회씩 직접 호출 검증. `pnpm -r test` 가 stub 만 사용해서 default 모델 결함을 못 잡음 → receipt 가 마지막 방어선이지만 더 일찍 잡으려면 `pnpm dev:check-models` 같은 스크립트 추가 검토.
- **decision-id 명명 표준 carry-over 13 채택** — Sprint 4+ 부터 워커 spawn prompt 에 `D-<sprint>-<영향 받는 대상 파일>-<행위>` 형식 명시. 분기 발생 시 team-lead 가 *영향 받는 대상 파일* 명명 우선 채택.
- **임계 강화** — Sprint 4 receipt 가 `D-S3-receipt-threshold-recovery` 결정 그대로 박음 (chunks ≥ 2 length ≥ 5 ms ≤ 5000 + concepts ≥ 2 co_occur ≥ 1 nearest ≥ 1). carry-over 8 (Sprint 1) → carry-over 9 (Sprint 2) → carry-over 15 (Sprint 3) 의 누적 회복 약속.
- **워커 자가-마킹 표준** — engine T5 case 학습. BlockedBy 해소 후 *자체 cron 또는 idle 시점* 에 TaskGet 호출하여 자기 task status 갱신. 안 되면 team-lead 가 직접 마킹 fallback 정책 명시.
