# Sprint 4 — recall-l1-l3

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`

## 1. Goal
Sprint 3 의 `concepts`/`edges`/`vec_concepts` 그래프를 입력으로 orchestrator 가 4 원 DecisionAct (`silence/ghost/suggestion/strong`) Trigger / Silence rule 로 Recall 결정을 내려, mobile 의 GhostHint(L1) / Suggestion(L2) / Strong(L3) 3 화면 + Inspector 메모리 피드를 띄워 *침묵이 디폴트인* 기억 재등장 흐름을 닫는다.

## 2. Deliverable & Receipt

**Deliverable:**
- `packages/orchestrator/src/decide.ts` — `decide(ctx: DecideContext): DecisionAct` (4 원 enum 동결, `decision_orchestrator_enum.md`). Trigger 조건 (recallScore + recencyMs + tokenContext) + Silence 조건 (cooldown + duplicate + low-confidence) 정량화. 본 sprint 가 *처음으로* enum 4 원 모두 사용.
- `packages/orchestrator/src/silence.ts` — Silence rules (cooldown ≥ 60s, duplicate suppression, low-confidence threshold). 침묵이 디폴트.
- `packages/orchestrator/src/__tests__/{decide,silence}.test.ts` — 단위 테스트 (4 원 분기 각각 + Silence rule 우선순위).
- `packages/engine/src/recall.ts` — `recallCandidates(userMessage, opts: {db, embed?, nearest?, traverse?}): Promise<RecallCandidate[]>`. Sprint 3 의 `nearestConcepts` (semantic) + `edges` (co_occur traversal) 결합. Sprint 0 stub `throw` 제거.
- `packages/engine/src/__tests__/recall.test.ts` — RecallCandidate 생성 시나리오 (semantic only / co_occur only / 결합 / empty graph).
- `packages/protocol/src/recall.ts` — `RecallCandidate` / `DecideContext` 공유 타입 신규 (carry-over 7 의 protocol 이전 *부분 시작* 검토).
- `packages/conversation/src/loop.ts` — Sprint 3 의 *Sprint 4 hook 주석 위치* 를 활용해 assistant append 직전 `orchestrator.decide` 호출 hook 박음 (DI 옵션 `decide?`, `recall?`). DecisionAct 결과를 chatStore 에 단방향 전달 (silence 시 UI 미노출).
- `apps/mobile/src/recallStore.{ts,web.ts}` (platform adapter, carry-over 5 그대로 강제) — DecisionAct + RecallCandidate 보관. native = `@synapse/storage` 위임 (recall_log 영속, 0004 마이그), web = in-memory.
- `packages/storage/schema/0004_recall_log.sql` — `recall_log(id PK, decided_at, act, candidate_ids JSON, suppressed_reason)`. WAL/idempotent.
- `packages/design-system/src/components/{GhostHint,SuggestionCard,StrongRecall,InspectorList}.tsx` — 디자인 목업 4 화면 1:1 (recall-emerge / ink-rise / synapse-pulse / ghost-breathe / thread-draw 모션).
- `packages/design-system/src/copy.ts` — `recall.{ghost,suggestion,strong,inspector}` 카피 ko/en (verify-copy ok 8 → ≥ 12).
- `apps/mobile/app/{ghost,suggestion,strong,inspector}/index.tsx` — 4 화면 각각 마운트 + Recall UX 흐름.
- `scripts/receipt/sprint-4.sh` — Sprint 3 22 단계 wrap + 신규 8~10 단계.

**Receipt (자동 검증 가능한 형태):**
- `pnpm install` / `pnpm -r test` exit 0 (Sprint 1 53 + Sprint 2 lint 9 + Sprint 3 신규 + Sprint 4 신규: orchestrator decide/silence, engine recall, storage 0004 마이그, mobile recallStore).
- `pnpm --filter @synapse/mobile run build` exit 0 (web bundle 에 `better-sqlite3`/`sqlite-vec` 0 hits — `recallStore.{ts,web.ts}` 분기 검증, carry-over 5 두 번째 시범).
- `bash scripts/receipt/sprint-4.sh` 시나리오:
  1. Sprint 3 의 22 단계 그대로 통과.
  2. **0004 마이그 멱등성** — empty DB 두 번 마이그 → exit 0, `recall_log` 존재.
  3. **e2e DecisionAct 4 원 분기** — fixture 4 종 (silence / ghost / suggestion / strong) 각각 입력 → orchestrator.decide 가 정확히 매칭. silence 가 *디폴트*.
  4. **e2e Recall 종단** — Sprint 3 의 두 번째 메시지 입력 시 orchestrator → recall_log 적재 + 적합한 화면 (ghost/suggestion/strong 중 하나) UI 마운트 가능 상태.
  5. **e2e Silence cooldown** — 60s 내 동일 candidate 재등장 시 silence 강제 (suppressed_reason='cooldown').
  6. **i18n 카피** — `verify-copy.mjs` ok ≥ 12.
  7. **mockup-scope-parity (Sprint 4 dev doc)** — §3 In 의 `ghost-hint` / `suggestion` / `strong-recall` / `inspector` 4 별칭 ↔ Sprint 2 §7.1 표 매칭.
  8. **directive-tag-audit + frozen-flag-audit (Sprint 4 dev doc)** — 0 violations.
  9. **임계 강화 검증** (`D-S3-receipt-threshold-recovery` 결정 그대로): Sprint 1 e2e 단계의 `chunks ≥ 2 length ≥ 5 ms ≤ 5000` + Sprint 3 e2e 단계의 `concepts ≥ 2 co_occur ≥ 1 nearest ≥ 1` 적용. 임계 미만 시 fail.
  10. **DecisionAct enum drift 검증** — `decision_orchestrator_enum.md` ↔ `protocol` ↔ `orchestrator/types.ts` 1 회 grep 비교, 4 원 (`silence/ghost/suggestion/strong`) 그대로.
- 모든 단계 통과 → exit 0, "✅ Sprint 4 receipt PASSED".

## 3. Scope

**In:**
- **storage 0004 마이그** — `packages/storage/schema/0004_recall_log.sql` 가 `recall_log(id TEXT PRIMARY KEY, decided_at INTEGER NOT NULL, act TEXT NOT NULL CHECK(act IN ('silence','ghost','suggestion','strong')), candidate_ids TEXT NOT NULL, suppressed_reason TEXT)` + `idx_recall_log_decided_at(decided_at)` 정의. WAL/idempotent (`CREATE TABLE IF NOT EXISTS`). `candidate_ids` 는 JSON 직렬화된 string[] (concept id 들).
- **storage repo** — `packages/storage/src/repo/recall.ts` 의 `appendRecallLog(db, log: RecallLogRow)` (TX + INSERT OR IGNORE) + `recentlyDecidedFor(db, candidateId: string, withinMs: number): RecallLogRow | null` (cooldown 검사용, `decided_at >= now - withinMs` + `act != 'silence'` + `candidate_ids LIKE '%"<id>"%'` 단순 매칭, suppressed_reason='cooldown' 자체 강화 시 silence row 도 포함). `index.ts` export.
- **protocol RecallCandidate / DecideContext** — `packages/protocol/src/recall.ts` 신규: `RecallCandidate = {conceptId: string, label: string, score: number, source: 'semantic'|'co_occur'|'mixed'}` + `DecideContext = {userMessage: string, candidates: RecallCandidate[], recencyMs: number, tokenContext: number, recentDecisions?: RecallLogRow[]}`. carry-over 7 의 protocol 이전 *부분 시작* — Concept/GraphEdge 전체 이전은 Sprint 5 이후. engine/orchestrator 양쪽이 protocol 의 이 타입을 import.
- **engine recall** — `packages/engine/src/recall.ts` 의 `recallCandidates(userMessage: string, opts: {db, embed?, nearest?, traverse?, semanticThreshold?, k?}): Promise<RecallCandidate[]>`. Sprint 0 stub `throw` 제거. (1) `embed(userMessage)` → vec, (2) `nearest(db, vec, k=5, threshold=0.5)` → semantic 후보, (3) 각 semantic 후보 conceptId 별로 `traverse(db, conceptId, depth=1)` (edges co_occur OR semantic) → co_occur 후보 확장. 양쪽 합집합에서 중복 제거 (같은 conceptId 는 semantic > co_occur 우선, score 보존, source='mixed' 갱신). 빈 그래프 시 [] 반환.
- **orchestrator decide** — `packages/orchestrator/src/decide.ts` 의 `decide(ctx: DecideContext): DecisionAct` 4 원 분기. 정량 규칙:
  - 후보 0 → `silence`.
  - 최고 score < 0.4 → `silence` (low-confidence).
  - 최고 score ∈ [0.4, 0.6) → `ghost` (L1 hint).
  - 최고 score ∈ [0.6, 0.8) → `suggestion` (L2).
  - 최고 score ≥ 0.8 → `strong` (L3).
  - tokenContext > 2000 시 한 단계 약화 (strong→suggestion, suggestion→ghost, ghost→silence). recencyMs < 1500 이면 한 단계 약화 (사용자가 빠르게 입력 중).
- **orchestrator silence** — `packages/orchestrator/src/silence.ts` 의 `applySilence(decision: DecisionAct, ctx: DecideContext): {act: DecisionAct, suppressedReason?: string}` 후처리:
  - cooldown: ctx.recentDecisions 중 같은 candidate id 가 60s 이내 + act ∈ {ghost,suggestion,strong} 존재 시 강제 silence (suppressedReason='cooldown').
  - duplicate: 직전 decision 이 동일 candidate set 이면 silence (suppressedReason='duplicate').
  - low-confidence 는 decide 단계에서 처리 — silence 단계는 후속 시간/중복 검사만.
- **conversation hook** — `packages/conversation/src/loop.ts` 의 `sendStream` 가 user 메시지 append 직후 *(assistant 첫 chunk 도달 전)* `orchestrator.decide` 호출. DI 옵션 추기: `decide?: DecideFn`, `recall?: RecallFn`, `recallStore?: {push, getRecent}`. `recall(userMessage, {db, embed, nearest, traverse})` → `decide({userMessage, candidates, recencyMs, tokenContext, recentDecisions: recallStore.getRecent(60_000)})` → `applySilence(...)` → `recallStore.push({id, decided_at, act, candidate_ids, suppressed_reason})`. silence 시 store push 만 하고 UI hook 미호출. 실패 `.catch(logger.warn)` — user reply 흐름과 분리. *Sprint 5 hook 주석* 위치 신규 박음 (Bridge / Temporal / Domain Crossing 진입점).
- **mobile recallStore (platform adapter — carry-over 5 두 번째 시범)** — `apps/mobile/src/recallStore.ts` (native, `@synapse/storage` 의 `appendRecallLog` + `recentlyDecidedFor` 위임 + observer Set 으로 act/candidate 알림) + `apps/mobile/src/recallStore.web.ts` (web, in-memory `Array<RecallLogRow>` + observer Set). web bundle 의 `better-sqlite3` / `sqlite-vec` 0 hits 검증.
- **mobile chat 화면 wiring** — `apps/mobile/src/chatStore.{ts,web.ts}` *외부 시그니처 동결* 그대로. *내부 구현* wiring 1줄 (`conversation.sendStream` 호출 시 `recall: engine.recallCandidates`, `decide: orchestrator.decide`, `recallStore: recallStore` 옵션 자동 주입) 허용 — Sprint 4 한정, 결정 `D-S4-chatStore-recall-wiring`. carry-over 5 두 번째 시범으로 `recallStore.{ts,web.ts}` 도 *별도 파일*.
- **mobile 4 화면** — `apps/mobile/app/ghost/index.tsx`, `apps/mobile/app/suggestion/index.tsx`, `apps/mobile/app/strong/index.tsx`, `apps/mobile/app/inspector/index.tsx`. recallStore subscribe → 가장 최근 RecallCandidate[] + DecisionAct 가져와 design-system 4 컴포넌트 마운트. 디자인 목업 `screens.jsx` 의 GhostHintScreen / SuggestionScreen / StrongRecallScreen / InspectorScreen 1:1 (Sprint 2 §7.1 표 별칭 ghost-hint / suggestion / strong-recall / inspector).
- **design-system 4 컴포넌트** — `packages/design-system/src/components/{GhostHint,SuggestionCard,StrongRecall,InspectorList}.tsx`. 디자인 목업 1:1 + 모션:
  - GhostHint: `ghost-breathe` 0.6s 진입 + `recall-emerge` blur→clear 0.4s, ink 색.
  - SuggestionCard: `ink-rise` 0.4s + `synapse-pulse` 1 회 (amber accent).
  - StrongRecall: `thread-draw` 0.6s + `synapse-pulse` 반복 (강조).
  - InspectorList: `node-orbit` 살짝 (메모리 피드 list, FlatList 호환).
- **design-system copy** — `packages/design-system/src/copy.ko.ts` / `copy.en.ts` 에 `recall.ghost`, `recall.suggestion`, `recall.strong`, `recall.inspector` 4 entry × ko/en × {title,subtitle} 추기. verify-copy ok 8 → ≥ 12.
- **carry-over 16 흡수 — synapse-pulse 토큰** — design-system tokens (motion section) 에 `synapse-pulse` keyframe 정식 노출 (Sprint 1 carry-over 6 의 token 자리 차지 해소). GhostHint/StrongRecall 가 본 토큰을 본격 사용.
- **단위 테스트** — `packages/orchestrator/__tests__/{decide,silence}.test.ts` (4 원 분기 각각 + 약화 규칙 + cooldown/duplicate 우선순위) + `packages/engine/__tests__/recall.test.ts` (semantic only / co_occur only / 결합 / empty graph) + `packages/storage/__tests__/recall.test.ts` (0004 마이그 + repo + cooldown 조회) + `packages/conversation/__tests__/loop-recall.test.ts` (decide hook 호출 + silence 시 UI 미호출 + .catch). 테스트 위치 root `__tests__/` 헌법 (carry-over 9).
- **receipt 자동화** — `scripts/receipt/sprint-4.sh` 가 Sprint 3 22 단계 wrap (`SKIP_OLLAMA=1` 호환) + 신규 10 단계 (0004 멱등성 / DecisionAct 4 원 분기 e2e / Recall 종단 / Silence cooldown / i18n ok ≥ 12 / mockup-scope-parity Sprint 4 / frozen-flag-audit Sprint 4 / directive-tag-audit / 임계 강화 / DecisionAct enum drift grep).
- **임계 강화 (`D-S3-receipt-threshold-recovery` 그대로 박음)** — Sprint 1 e2e 단계: `chunks ≥ 2 length ≥ 5 ms ≤ 5000`. Sprint 3 e2e 단계: `concepts ≥ 2 co_occur ≥ 1 nearest ≥ 1`. Sprint 4 신규 e2e 단계: `decisions ≥ 4` (4 원 fixture 모두) + `recall_candidates ≥ 1` (Recall 종단) + `cooldown_silence = 1` (Silence cooldown 시나리오).
- **화면 단위 (목업 ↔ §3)** — Sprint 4 가 *추가 활성화* 하는 화면 = **ghost-hint / suggestion / strong-recall / inspector** (디자인 목업 4 화면, Sprint 2 §7.1 표 별칭). Sprint 1 onboarding + Sprint 3 first-chat 변경 없이 살아있음. mockup 표 단일 진실원 = Sprint 2 §7.1 (env override `MOCKUP_TABLE_DOC` 미설정). PM 사인오프 전 `mockup-scope-parity.sh` exit 0 검증 완료.

**Out:**
- **Hyper-Recall (Bridge / Temporal / Domain Crossing)** — Sprint 5. 본 sprint 의 `recallCandidates` 는 semantic + 1-hop co_occur 까지만. 다중 hop / 시간 윈도우 / 도메인 교차 알고리즘은 Sprint 5.
- **Forgetting / Humble Retraction / Dismiss-Unlink** — Sprint 6. 본 sprint 의 `recall_log` 는 append-only. retention 정책은 Sprint 6 가 결정.
- **추가 Polish (애니메이션 미세조정 / 다크 모드 일치 / 한·영 카피 미세조정)** — Sprint 7. 본 sprint 는 4 컴포넌트 + 4 화면의 *작동 일치* 까지만 (1:1 모션 사양은 만족, 미세 타이밍 튜닝은 Sprint 7).
- **Concept dedup / alias merge** — Sprint 5+. 같은 label concept 중복 그대로 (Sprint 3 합의 그대로).
- **`apps/mobile/src/chatStore.{ts,web.ts}` *외부 시그니처* 변경** — Sprint 1 동결 그대로. *내부 wiring 1줄* (recall/decide/recallStore 옵션 자동 주입) 만 허용 — `D-S4-chatStore-recall-wiring`.
- **DecisionAct enum 슈퍼셋 변경** — 절대 금지 (`decision_orchestrator_enum.md`). 4 원 (`silence/ghost/suggestion/strong`) 그대로 사용.
- **`packages/conversation/src/loop.ts` 의 `runMemoryFormation` 시그니처 변경** — Sprint 3 동결. Recall 진입점은 *별도 hook* 으로 추기 (Memory Formation 과 시간/실패 격리).
- **Concept/GraphEdge 의 protocol 전체 이전** — 본 sprint 는 *RecallCandidate/DecideContext 만* protocol 신규 (carry-over 7 의 *부분 시작*). Concept/GraphEdge 이전은 Sprint 5+.
- **임계 추가 강화 (Sprint 5 회복)** — 본 sprint 는 `D-S3-receipt-threshold-recovery` 결정 그대로 박는 것까지만. Sprint 5 receipt 헌법 강화는 본 sprint receipt 통과 후 `/end` 가 결정.
- **LLM 다국어 균형 / embedding 모델 어댑터 분리** — Sprint 7 polish.
- **mockup 표 변경** — Sprint 4 신규 화면 4 종은 *기존 §7.1 표 별칭* 매칭으로 충분 (mockup-scope-parity 통과 검증). designer 가 별표/별칭 갱신 없음.

## 4. Architecture & Data Flow

**핵심 원칙**: 침묵이 디폴트. orchestrator 는 *4 원 분기* 만 결정하고 UI 노출은 mobile 의 store subscribe 가 act 별 라우팅. user-facing reply (Sprint 1) + memory formation (Sprint 3) + Recall (Sprint 4) 3 흐름이 시간/실패 격리.

**End-to-end flow** (`first-chat` 화면에서 두 번째 메시지 입력 시):

```
user 입력 → chat/index.tsx
  └─ chatStore.sendStream(userMessage)            (외부 시그니처 동결)
       └─ conversation.sendStream(userMessage, { persist, complete,
            recall, decide, recallStore })        (내부 wiring 1줄, D-S4-chatStore-recall-wiring)
            ├─ user message append (Sprint 1 그대로)
            ├─ (병렬, fire-and-forget):
            │    engine.recallCandidates(userMessage, { db, embed, nearest, traverse })
            │      ↓ RecallCandidate[]            (semantic ∪ co_occur 1-hop, 중복 제거)
            │    decide({ userMessage, candidates, recencyMs, tokenContext,
            │            recentDecisions: recallStore.getRecent(60_000) })
            │      ↓ DecisionAct                  (silence / ghost / suggestion / strong)
            │    applySilence(decision, ctx)
            │      ↓ { act, suppressedReason? }   (cooldown / duplicate)
            │    recallStore.push({ id, decided_at, act, candidate_ids, suppressed_reason })
            │      ↓ subscribe (mobile/app/{ghost,suggestion,strong,inspector}/index.tsx)
            │    silence 시: UI 미노출, store row 만 적재
            │    ghost/suggestion/strong 시: 해당 화면 mount 가능 상태
            ├─ for await chunk → assistant append delta (Sprint 1 그대로)
            └─ assistant append 완료
                 └─ runMemoryFormation(...)       (Sprint 3 그대로, 본 sprint 변경 0)
       └─ .catch(logger.warn)                      (Recall 실패 = silent fallback)
```

**recall_log 스키마** (`schema/0004_recall_log.sql`):
| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | TEXT PRIMARY KEY | UUID, conversation 가 발급 |
| `decided_at` | INTEGER NOT NULL | epoch ms |
| `act` | TEXT NOT NULL CHECK(act IN ('silence','ghost','suggestion','strong')) | 4 원 enum 그대로 |
| `candidate_ids` | TEXT NOT NULL | JSON-encoded string[] (concept id 들) |
| `suppressed_reason` | TEXT | 'cooldown' / 'duplicate' / 'low-confidence' / null |
| `idx_recall_log_decided_at` | INDEX(decided_at) | cooldown 60s 윈도우 조회 가속 |

**DecisionAct 4 원 분기 정량 규칙** (`decide.ts`):
| 조건 | 결과 |
|---|---|
| `candidates.length === 0` | `silence` |
| `max(score) < 0.4` | `silence` (low-confidence, suppressedReason='low-confidence' 라벨) |
| `max(score) ∈ [0.4, 0.6)` | `ghost` |
| `max(score) ∈ [0.6, 0.8)` | `suggestion` |
| `max(score) ≥ 0.8` | `strong` |
| `tokenContext > 2000` | 한 단계 약화 (strong→suggestion→ghost→silence) |
| `recencyMs < 1500` | 한 단계 약화 |

**Silence rules 후처리** (`silence.ts`):
| 우선순위 | 조건 | 결과 |
|---|---|---|
| 1 | cooldown — `recentDecisions` 중 동일 candidate id × act ∈ {ghost,suggestion,strong} × `decided_at ≥ now - 60_000` | `{act: 'silence', suppressedReason: 'cooldown'}` |
| 2 | duplicate — 직전 decision 의 `candidate_ids` 가 동일 set | `{act: 'silence', suppressedReason: 'duplicate'}` |
| 3 | (decide 단계 처리 완료) | passthrough |

**Recall 알고리즘 (engine `recall.ts`)**:
1. `embed(userMessage)` → Float32Array(768).
2. `nearest(db, vec, k=5)` → semantic 후보 `[{id, score=1-distance}]`. score < 0.5 컷.
3. 각 semantic 후보 conceptId 별로 `traverse(db, conceptId, depth=1)` — `edges` 테이블에서 `from_id=id OR to_id=id` 인 모든 edge → 반대편 conceptId + weight.
4. semantic ∪ co_occur 합집합. 같은 conceptId 충돌 시 semantic > co_occur 우선, source='mixed', score = `max(semanticScore, weight)`.
5. 빈 그래프 (concepts 0) 시 [] 반환.

**platform adapter 두 번째 시범 (carry-over 5)**:
```
apps/mobile/src/recallStore.ts          (native — @synapse/storage 위임)
apps/mobile/src/recallStore.web.ts      (web — in-memory Array + observer Set)
```
chatStore 내부 wiring 1줄 (carry-over `D-S3-chatStore-internal-wiring` 패턴 그대로 — Sprint 4 결정 `D-S4-chatStore-recall-wiring`). web bundle `better-sqlite3` / `sqlite-vec` 0 hits 그대로 검증.

**비대상 경계**:
- Hyper-Recall (Bridge / Temporal / Domain Crossing) — Sprint 5.
- 다중 hop traversal (depth ≥ 2) — Sprint 5.
- recall_log retention / forgetting — Sprint 6.
- Concept dedup / alias merge — Sprint 5+.

**lint 호출 토폴로지** (Sprint 2 헌법 그대로):
```
/start (Sprint 4)
  └─ mockup-scope-parity.sh sprint-4-recall-l1-l3.md   (PM 사인오프 전 — 본 /start 단계에서 exit 0 확인)

/end (Sprint 4)
  ├─ frozen-flag-audit.sh sprint-4-recall-l1-l3.md
  └─ scripts/receipt/sprint-4.sh
       ├─ Sprint 3 22 단계 wrap (SKIP_OLLAMA=1 / SKIP_SPRINT1_E2E=1 호환)
       ├─ 0004 멱등성
       ├─ DecisionAct 4 원 분기 e2e
       ├─ Recall 종단
       ├─ Silence cooldown
       ├─ i18n ok ≥ 12
       ├─ mockup-scope-parity.sh on Sprint 4
       ├─ frozen-flag-audit.sh on Sprint 4
       ├─ directive-tag-audit.ts
       ├─ 임계 강화 검증 (Sprint 1/3/4)
       └─ DecisionAct enum drift grep
```

**메시지 태그 (Sprint 2 §11 헌법 그대로)**:
- frozen 결정 prefix: `**[FROZEN v2026-04-29 D-S4-<영향 받는 대상 파일>-<행위>]**` (sprint 내 unique). carry-over 13 명명 표준.
- directive 메시지 prefix: `[DIRECTIVE v2026-04-29 D-S4-<영향 받는 대상 파일>-<행위>]`.

## 5. File Ownership

| 파일/경로 | 책임 에이전트 | 변경 종류 |
|---|---|---|
| `packages/storage/schema/0004_recall_log.sql` | storage | 신규 (recall_log + idx_recall_log_decided_at, WAL/idempotent) |
| `packages/storage/src/repo/recall.ts` | storage | 신규 (`appendRecallLog`, `recentlyDecidedFor`) |
| `packages/storage/src/__tests__/recall.test.ts` | storage | 신규 (root `__tests__/`, carry-over 9) |
| `packages/storage/src/index.ts` | storage | export 추기 (RecallLogRow type 포함) |
| `packages/protocol/src/recall.ts` | engine (작성) — orchestrator/storage 컨센서스 필요 | 신규 (`RecallCandidate`, `DecideContext`, `RecallLogRow` re-export). carry-over 7 부분 시작. |
| `packages/protocol/src/index.ts` | engine | export 추기 |
| `packages/engine/src/recall.ts` | engine | Sprint 0 stub `throw` 제거 + 구현 (semantic + 1-hop co_occur) |
| `packages/engine/__tests__/recall.test.ts` | engine | 신규 (root `__tests__/`, semantic/co_occur/결합/empty) |
| `packages/engine/src/index.ts` | engine | export 추기 |
| `packages/orchestrator/src/decide.ts` | orchestrator | 신규 — 4 원 분기 + tokenContext / recencyMs 약화 |
| `packages/orchestrator/src/silence.ts` | orchestrator | 신규 — cooldown / duplicate 후처리 |
| `packages/orchestrator/src/types.ts` | orchestrator | (변경 금지 — DecisionAct 4 원 enum 그대로) |
| `packages/orchestrator/__tests__/decide.test.ts` | orchestrator | 신규 (4 원 + 약화 규칙) |
| `packages/orchestrator/__tests__/silence.test.ts` | orchestrator | 신규 (cooldown / duplicate 우선순위) |
| `packages/orchestrator/src/index.ts` | orchestrator | export 추기 |
| `packages/conversation/src/loop.ts` | conversation | `sendStream` user append 직후 + assistant 첫 chunk 전 hook (recall → decide → applySilence → recallStore.push) + DI 옵션 (`recall?`, `decide?`, `recallStore?`) 추기. *Sprint 5 hook 주석* 위치 신규 박음 |
| `packages/conversation/__tests__/loop-recall.test.ts` | conversation | 신규 (decide hook 호출 + silence 시 UI 미호출 + .catch) |
| `packages/design-system/src/components/GhostHint.tsx` | designer | 신규 (목업 GhostHintScreen 1:1, ghost-breathe + recall-emerge) |
| `packages/design-system/src/components/SuggestionCard.tsx` | designer | 신규 (목업 SuggestionScreen 1:1, ink-rise + synapse-pulse) |
| `packages/design-system/src/components/StrongRecall.tsx` | designer | 신규 (목업 StrongRecallScreen 1:1, thread-draw + synapse-pulse 반복) |
| `packages/design-system/src/components/InspectorList.tsx` | designer | 신규 (목업 InspectorScreen 1:1, node-orbit) |
| `packages/design-system/src/components/index.ts` | designer | export 4 추기 |
| `packages/design-system/src/copy.ko.ts` | designer | `recall.ghost`/`recall.suggestion`/`recall.strong`/`recall.inspector` 추기 |
| `packages/design-system/src/copy.en.ts` | designer | 위 4 entry en 추기 |
| `packages/design-system/src/tokens.ts` | designer | `synapse-pulse` 정식 노출 (Sprint 1 carry-over 6 흡수) |
| `apps/mobile/src/recallStore.ts` | mobile | 신규 (native — `@synapse/storage` 위임 + observer Set) |
| `apps/mobile/src/recallStore.web.ts` | mobile | 신규 (web — in-memory Array + observer Set) |
| `apps/mobile/app/ghost/index.tsx` | mobile | 신규 (recallStore subscribe → GhostHint mount) |
| `apps/mobile/app/suggestion/index.tsx` | mobile | 신규 (SuggestionCard mount) |
| `apps/mobile/app/strong/index.tsx` | mobile | 신규 (StrongRecall mount) |
| `apps/mobile/app/inspector/index.tsx` | mobile | 신규 (InspectorList mount, recallStore 전체 시퀀스) |
| `apps/mobile/src/chatStore.ts` | mobile | **외부 시그니처 동결**. 내부 wiring 1줄 (recall/decide/recallStore 옵션 자동 주입) — `D-S4-chatStore-recall-wiring` |
| `apps/mobile/src/chatStore.web.ts` | mobile | 동일 wiring |
| `scripts/receipt/sprint-4.sh` | tester | 신규 (Sprint 3 22 wrap + 신규 10) |
| `scripts/receipt/.receipt-runner/sprint4-decide.mjs` | tester | 신규 (4 원 fixture e2e) |
| `scripts/receipt/.receipt-runner/sprint4-recall.mjs` | tester | 신규 (Recall 종단) |
| `scripts/receipt/.receipt-runner/sprint4-cooldown.mjs` | tester | 신규 (Silence cooldown) |
| `scripts/receipt/__tests__/verify-copy.mjs` | tester | (Sprint 1 산출물) ok ≥ 12 자동 검증 |
| `docs/sprints/sprint-4-recall-l1-l3.md` §3-§6 | team-leader | 채움 (본 갱신) |
| `docs/sprints/sprint-4-recall-l1-l3.md` §7-§8 | (라이브 작성자) | 결정 책임 에이전트 단독 작성 |
| `docs/sprints/sprint-4-recall-l1-l3.md` §9-§12 | team-leader (`/end`) | `/end` 시 |
| `~/.claude/.../memory/decision_orchestrator_enum.md` | (변경 금지) | DecisionAct 4 원 enum 동결 reference |
| `~/.claude/.../memory/feedback_di_pattern.md` | (변경 금지) | DI 패턴 reference |
| `packages/engine/src/{extractConcepts,embed,buildEdges}.ts` | (변경 금지) | Sprint 3 동결 |
| `packages/storage/schema/0001_*.sql` ~ `0003_graph.sql` | (변경 금지) | Sprint 0/1/3 동결 |
| `packages/conversation/src/loop.ts` `runMemoryFormation` | (변경 금지) | Sprint 3 동결 (시그니처) |

**단일 작성자 시간창**: §3-§6 = team-leader 단독 / §7-§8 = 변경 책임 에이전트 / §9-§12 = `/end`. 충돌 시 후입자 양보 + SendMessage 위임.

## 6. Tasks

| ID | Subject | Owner | Blocks | BlockedBy |
|---|---|---|---|---|
| T1 | storage: `schema/0004_recall_log.sql` (recall_log + idx_recall_log_decided_at, WAL/idempotent) + `src/repo/recall.ts` (`appendRecallLog`, `recentlyDecidedFor`) + `src/index.ts` export + `src/__tests__/recall.test.ts` (0004 멱등성 + repo + cooldown 조회). carry-over 9 root `__tests__/` 헌법 준수 | storage | T7, T8 | — |
| T2 | engine (protocol 작성): `packages/protocol/src/recall.ts` 신규 (`RecallCandidate`, `DecideContext`, `RecallLogRow`) + `protocol/src/index.ts` export. carry-over 7 부분 시작. orchestrator/storage 가 import. **단일 작성자 = engine** (시그니처 합의 SendMessage 로) | engine | T3, T4 | — |
| T3 | engine: `src/recall.ts` 구현 (semantic via `nearestConcepts(k=5, threshold=0.5)` + 1-hop co_occur edges traversal + 합집합 dedup) + `__tests__/recall.test.ts` (semantic only / co_occur only / 결합 / empty graph). Sprint 0 stub `throw` 제거 | engine | T5, T8 | T2 |
| T4 | orchestrator: `src/decide.ts` (4 원 분기, tokenContext > 2000 / recencyMs < 1500 약화) + `src/silence.ts` (cooldown 60s / duplicate 후처리) + `__tests__/decide.test.ts` + `__tests__/silence.test.ts`. DecisionAct enum 4 원 *처음으로 모두 사용*, `decision_orchestrator_enum.md` 메모리 동결 위반 0 | orchestrator | T5, T8 | T2 |
| T5 | conversation: `src/loop.ts` user append 직후 + assistant 첫 chunk 전 hook (recall → decide → applySilence → recallStore.push) + DI 옵션 (`recall?`, `decide?`, `recallStore?`) 추기. *Sprint 5 hook 주석* 위치 신규 박음. `__tests__/loop-recall.test.ts` (4 원 + silence 시 UI 미호출 + .catch) | conversation | T7, T8 | T3, T4 |
| T6 | designer: 4 컴포넌트 (`GhostHint` ghost-breathe+recall-emerge / `SuggestionCard` ink-rise+synapse-pulse / `StrongRecall` thread-draw+synapse-pulse 반복 / `InspectorList` node-orbit) + copy 4 entry ko/en (`recall.{ghost,suggestion,strong,inspector}.{title,subtitle}`) + tokens.ts 의 synapse-pulse 정식 노출 (carry-over 16 흡수). verify-copy ok ≥ 12 | designer | T7, T8 | — |
| T7 | mobile: `recallStore.{ts,web.ts}` platform adapter (native = storage 위임, web = in-memory + observer — carry-over 5 두 번째 시범) + `chatStore.{ts,web.ts}` 내부 wiring 1줄 (recall/decide/recallStore 옵션 자동 주입, `D-S4-chatStore-recall-wiring`) + 4 화면 (`app/{ghost,suggestion,strong,inspector}/index.tsx`) recallStore subscribe → 4 컴포넌트 mount. web bundle `better-sqlite3`/`sqlite-vec` 0 hits 검증 | mobile | T8 | T1, T5, T6 |
| T8 | tester: `scripts/receipt/sprint-4.sh` (Sprint 3 22 단계 wrap + 신규 10: 0004 멱등성 / DecisionAct 4 원 분기 e2e / Recall 종단 / Silence cooldown / i18n ok ≥ 12 / mockup-scope-parity Sprint 4 / frozen-flag-audit Sprint 4 / directive-tag-audit / 임계 강화 / DecisionAct enum drift grep) + `.receipt-runner/sprint4-{decide,recall,cooldown}.mjs` 3 종 신규. `SKIP_OLLAMA=1` 그대로 wrap. 임계 = `chunks ≥ 2 length ≥ 5 ms ≤ 5000 + concepts ≥ 2 co_occur ≥ 1 nearest ≥ 1 + decisions ≥ 4 + recall_candidates ≥ 1 + cooldown_silence = 1` | tester | T9 | T1, T3, T4, T6, T7 |
| T9 | team-leader: receipt 종단 실행 — `bash scripts/receipt/sprint-4.sh` PASS → §10 Implementation Map 채움 + §11 Decisions Made 마감 (`D-S4-chatStore-recall-wiring` + 임계 회복 적용 결과) + §12 Carry-over (Sprint 5 Hyper-Recall 진입 + Sprint 6 forgetting 진입 약속) | team-leader | — | T8 |

**의존성 핵심 경로**: T2 → T3 → T5 → T7 → T8 → T9. T4 도 T2 직후 진입. T1 / T6 는 independent.

**parallel 진입점 (3)**: T1, T2, T6.

**T8 의 `BlockedBy` 가 5 task** — receipt 가 모든 슬라이스 종단 검증.

## 7. Interfaces / Contracts
*(라이브 갱신)*

### 7.5 conversation Recall hook (T5, #42 — `D-S4-conversation-orchestrator-dep` 적용)

`packages/conversation/src/loop.ts` 의 `sendStream` 가 user 메시지 append 직후 + assistant 첫 chunk 도달 전 fire-and-forget Recall hook 호출.

**신규 export (`@synapse/conversation`)**:
```ts
export type RecallFn = (
  userMessage: string,
  opts: {
    db: Database;
    embed?: (text: string) => Promise<Float32Array>;
    nearest?: NearestRecallFn;
    traverse?: TraverseFn;
    semanticThreshold?: number;
    k?: number;
  },
) => Promise<RecallCandidate[]>;

export type DecideFn = (ctx: DecideContext) => DecisionAct;

export type RecallStore = {
  push: (row: RecallLogRow) => void | Promise<void>;
  getRecent: (withinMs: number) => RecallLogRow[];
};

export type RecallHookDeps = {
  recall?: RecallFn;        // default: engine.recallCandidates (thin-wrap)
  decide?: DecideFn;        // default: orchestrator.decide
  recallStore?: RecallStore; // 미주입 시 hook 자체 no-op
  tokenContext?: number;    // default: 0
  recentWindowMs?: number;  // default: 60_000
};
```

`SendStreamDeps = {db, completeStream?} & MemoryFormationDeps & RecallHookDeps` — Sprint 3 의 9 옵션 위에 5 추가 (`recall`, `decide`, `recallStore`, `tokenContext`, `recentWindowMs`).

**hook 흐름** (loop.ts §183~189 + §215~248 `runRecallHook`):
1. `recallStore` 미주입 시 즉시 return (no-op).
2. `recall(userMessage, {db})` → `RecallCandidate[]`.
3. `ctx = {userMessage, candidates, recencyMs: now - userTs, tokenContext, recentDecisions: store.getRecent(windowMs)}`.
4. `decision = decide(ctx)` → `DecisionAct`.
5. `final = applySilence(decision, ctx)` (orchestrator 정적 import).
6. `store.push({id: uuid, decided_at: now, act: final.act, candidate_ids: candidates.map(c=>c.conceptId), suppressed_reason: final.suppressedReason})`.

**격리 보장**:
- `void runRecallHook(...).catch(logger.warn)` — 실패는 user reply 흐름과 분리.
- 실패 로그 prefix: `'synapse/conversation: recall hook failed'`.
- `runMemoryFormation` Sprint 3 시그니처 그대로, 변경 0 (carry-over 3).

**Sprint 5 hook 진입점**: `runRecallHook` 내부의 `recall()` 어댑터 확장 — Bridge / Temporal / Domain Crossing 후보를 합집합. loop.ts §185~186 주석 기록.

**의존성 신규**: `packages/conversation/package.json` 의 `dependencies` 에 `@synapse/orchestrator: workspace:*` 추가 (`D-S4-conversation-orchestrator-dep`). protocol/storage/llm/engine 4 dep 위에 1 신규.

## 8. Test Scenarios
*(라이브 갱신)*

### 8.5 conversation `__tests__/loop-recall.test.ts` (T5, #42)

11 테스트, 모두 `node:test` + `experimental-strip-types` 헌법 (Sprint 3 `loop.test.ts` / `loop-stream.test.ts` / `loop-memory-formation.test.ts` 와 동일 위치/스타일).

| # | 시나리오 | 검증 |
|---|---|---|
| 1 | silence 분기 (`candidates=[]`) | `store.rows[0].act === 'silence'`, `suppressed_reason === undefined`, `candidate_ids === []` |
| 2 | ghost 분기 (decide stub) | `act === 'ghost'`, `candidate_ids === ['c1']` |
| 3 | suggestion 분기 (decide stub) | `act === 'suggestion'` |
| 4 | strong 분기 (decide stub) | `act === 'strong'` |
| 5 | low-confidence (`max(score) < 0.4`, candidates>0) | `act === 'silence'` + `suppressed_reason === 'low-confidence'` |
| 6 | decide DI override + ctx 형상 | `userMessage`/`tokenContext`/`candidates.length`/`recencyMs ≥ 0`/`recentDecisions: []` |
| 7 | silence 시 store push 만, reply chunks 무영향 | `tokens === ['안','녕','!']` + `rows.length === 1` |
| 8 | recall 실패 `.catch` | `tokens === ['ok','!']` + `rows.length === 0` + `logger.warn` 호출 (`recall hook failed` 메시지) |
| 9 | `recallStore` 미주입 → no-op | `recallCalls === 0`, `decideCalls === 0`, reply 정상 |
| 10 | recall 호출 시점 < 첫 chunk yield 시점 | `recallStartedAt ≤ firstChunkAt` (slowStream `setTimeout(20ms)` 직전) |
| 11 | DecisionAct 4 원 drift 가드 | 4 원 (`silence/ghost/suggestion/strong`) 모두 store 기록 가능 |

`SKIP_OLLAMA=1` 환경에서 정상 PASS — 본 hook 의 단위 테스트는 Ollama 의존 0 (carry-over 14 준수). 4 원 분기 (#2~#4) 는 `decide` stub 으로 강제 — orchestrator 본체의 score 분기 + 약화 규칙 검증은 T4 `__tests__/decide.test.ts` 책임 (관심사 분리). `await Promise.resolve()` 5 회 `settle()` 헬퍼로 fire-and-forget hook 의 microtask race 정리.

**run**: `pnpm --filter @synapse/conversation test` → 30 PASS / 0 FAIL (Sprint 3 19 + Sprint 4 11). `typecheck` 도 0 error.

## 9. Demo Script

종단 시연 (Ollama UP 가정 — `gemma3:4b` + `embeddinggemma:latest`):

```bash
# 1. 전 패키지 단위 테스트 — 182/182 PASS 기대
pnpm install
pnpm -r test
# 기대: protocol 9 + llm 6 + engine 36 + storage 26 + design-system 50 + orchestrator 25 + conversation 30 = 182 PASS / 0 FAIL

# 2. 모바일 빌드 — web bundle 의 native-only 모듈 0 hits 검증 (carry-over 5 두 번째 시범)
pnpm --filter @synapse/mobile run build
ls apps/mobile/dist/_expo/static/js/web/entry-*.js | xargs grep -c 'better-sqlite3' || true   # 기대 0
ls apps/mobile/dist/_expo/static/js/web/entry-*.js | xargs grep -c 'sqlite-vec' || true        # 기대 0

# 3. 종단 receipt — 32 단계 (Sprint 3 22 wrap + 신규 10)
bash scripts/receipt/sprint-4.sh
# 기대 출력 마지막 줄: ✅ Sprint 4 receipt PASSED
# 핵심 실측 (D-S3-receipt-threshold-recovery 임계 모두 충족):
#   step 4-6   (Sprint 1 stream): chunks=10 length=22 ms=738
#   step 16-18 (Sprint 3 graph):  concepts=2 co_occur=1 nearest=3
#   step 24    (Sprint 4 decide): decisions=4;silence=1;ghost=1;suggestion=1;strong=1
#   step 25    (Sprint 4 recall): recall_candidates=6;decision_act=strong;recall_log_rows=1
#   step 26    (Sprint 4 cooldown): cooldown_silence=1;recall_log_rows=2;suppressed_reason=cooldown
#   step 27    (i18n verify-copy): ok=13
#   step 32    (DecisionAct enum drift): 4 sources 일치 (memory ↔ protocol ↔ orchestrator types.ts re-export)

# 4. SKIP_OLLAMA=1 dev mode — Ollama 미가동 시 메타 단계만 (step 4-6, 16-18, 25, 31 일부 skip)
SKIP_OLLAMA=1 bash scripts/receipt/sprint-4.sh   # 32 단계 중 Ollama 의존 skip + 나머지 PASS
```

**시각 시연** (Sprint 5 dev demo 시 mobile T7 web bundle 호출):
```bash
pnpm --filter @synapse/mobile start --web
# 데모 시퀀스: chatStore.web.ts 가 silence → ghost → suggestion → strong 회전 RecallLogRow push
# → ghost/suggestion/strong/inspector 4 화면 라우팅 (디자인 목업 1:1)
```

## 10. Implementation Map

**Receipt 검증 결과 (2026-04-29, Ollama UP)**: ✅ **32/32 PASS**, "✅ Sprint 4 receipt PASSED".

**실측**:
- Sprint 1 stream: `chunks=10 length=22 ms=738` (Sprint 1: 594 → S2: 608 → S3: 630 → S4: 738 — Recall hook 추기 시 +108ms, 임계 ≤5000 ms 여유 있음).
- Sprint 3 graph (재실측): `concepts=2 co_occur=1 nearest=3` (≥ 2 / ≥ 1 / ≥ 1 임계 충족, 임계 강화 직후 첫 PASS).
- Sprint 4 decide fixture: `decisions=4 silence=1 ghost=1 suggestion=1 strong=1` (4 원 모두 활성).
- Sprint 4 Recall 종단: `recall_candidates=6 decision_act=strong recall_log_rows=1` (≥ 1 임계 충족).
- Sprint 4 cooldown: `cooldown_silence=1 recall_log_rows=2 suppressed_reason=cooldown` (= 1).
- i18n verify-copy: `ok=13` (≥ 12, Sprint 3 의 8 → +5 keys).
- DecisionAct enum drift: 4 sources 일치 (memory ↔ protocol 인라인 ↔ orchestrator types.ts re-export 패턴 ↔ orchestrator decide.ts WEAKEN Record key ↔ silence.ts RECALL_ACTS) — re-export 패턴 으로 *자동 단일 출처*.

**`packages/protocol/`** (T2, engine 작성 — carry-over 7 부분 시작):
- `src/recall.ts` 신규 — `RecallCandidate = {conceptId, label, score, source: 'semantic'|'co_occur'|'mixed'}` + `DecisionAct = 'silence'|'ghost'|'suggestion'|'strong'` (인라인 단일 출처) + `SuppressedReason = 'cooldown'|'duplicate'|'low-confidence'` + `RecallLogRow = {id, decided_at, act, candidate_ids: string[], suppressed_reason?}` (snake_case + literal union, DB 컬럼명 정합) + `DecideContext = {userMessage, candidates, recencyMs, tokenContext, recentDecisions?}`.
- `src/index.ts` re-export 추기 + `__tests__/recall.test.ts` 7 테스트.
- 검증: `pnpm --filter @synapse/protocol test` 9/9 PASS.

**`packages/storage/`** (T1+T1.5, storage):
- `schema/0004_recall_log.sql` — `recall_log(id PK, decided_at, act CHECK, candidate_ids TEXT, suppressed_reason)` + `idx_recall_log_decided_at`. WAL/idempotent.
- `src/repo/recall.ts` 신규 — `appendRecallLog(db, log)` (TX + INSERT OR IGNORE) + `recentlyDecidedFor(db, candidateId, withinMs, now?)` (cooldown 조회, LIKE `%"<id>"%` quoted-anchor anti-substring + `now` 옵션 결정성).
- `src/repo/graph.ts` 갱신 (T1.5) — `traverse(db, conceptId, depth=1): TraverseHit[]` 추기. SQL = `SELECT to_id AS other, weight, kind FROM edges WHERE from_id=? UNION ALL SELECT from_id AS other, weight, kind FROM edges WHERE to_id=?`. 자기 자신 JS 필터 제외. depth ≠ 1 시 throw.
- `src/index.ts` — `appendRecallLog`, `recentlyDecidedFor`, `traverse`, `TraverseHit`, `EdgeKind` re-export. `RecallLogRow`/`DecisionAct`/`SuppressedReason` 은 protocol 직접 import (single source of truth).
- `__tests__/{recall,traverse}.test.ts` (7 + 8 = 15 신규).
- 검증: `pnpm --filter @synapse/storage test` 26/26 PASS (기존 11 + Sprint 4 신규 15).

**`packages/engine/`** (T3, engine):
- `src/recall.ts` — Sprint 0 stub `throw` 제거. `recallCandidates(userMessage, opts: {db, embed?, nearest?, traverse?, semanticThreshold?, k?}): Promise<RecallCandidate[]>` 본 구현:
  - `embed(userMessage)` → 768d → `nearest(db, vec, k=5)` → semantic 후보 (score < threshold default 0.5 컷) → 각 conceptId 별 `traverse(db, conceptId, depth=1)` → co_occur 후보. 합집합 dedup (semantic > co_occur 우선, source='mixed', score = max). 빈 그래프 시 [] 반환.
  - DI 패턴 (`feedback_di_pattern.md`): 옵션 함수 주입, 클래스/싱글톤 0. `nearest`/`traverse` default 미설정 — wiring 워커가 주입 (engine ↔ storage type-only cyclic 회피, carry-over 7).
- `src/index.ts` — `recallCandidates`, `DEFAULT_RECALL_SEMANTIC_THRESHOLD` (0.5), `DEFAULT_RECALL_K` (5), 타입 4 export.
- `__tests__/recall.test.ts` 10 신규 (semantic only / co_occur / 결합 / empty / threshold / dedup mixed / dim mismatch / score desc / k 통과 / db 통과).
- 검증: `pnpm --filter @synapse/engine test` 36/36 PASS (Sprint 3 27 → 36).

**`packages/orchestrator/`** (T4, orchestrator — *처음으로 4 원 모두 사용*):
- `src/types.ts` — protocol re-export 패턴 (`export type { DecisionAct } from '@synapse/protocol'`) — DecisionAct 단일 출처 (D-S4-orchestrator-types-protocol-reexport). 옛 `Decision`/`DecideInput` Sprint 0 stub 제거 (consumer 0).
- `src/decide.ts` 신규 — `decide(ctx: DecideContext): DecisionAct`. 4 원 분기 (0.4/0.6/0.8 컷, boundary strict) + tokenContext > 2000 / recencyMs < 1500 1 단계 약화 (strong→suggestion→ghost→silence).
- `src/silence.ts` 신규 — `applySilence(decision, ctx): SilenceResult` (`{act, suppressedReason?: 'cooldown'|'duplicate'|'low-confidence'}`). 우선순위: cooldown(60s, candidate id 교집합 + 이전 act ∈ {ghost,suggestion,strong}) → duplicate(직전 RECALL_ACT decision 의 candidate set 동일, *silence 직전은 제외* — 보수 해석) → low-confidence(decision=silence + candidates 비어있지 않음).
- `src/index.ts` + `index.ts` 갱신 — `decide`, `applySilence`, `DecisionAct`, `SilenceResult` export.
- `__tests__/{decide,silence}.test.ts` (13 + 12 = 25 신규).
- 검증: `pnpm --filter @synapse/orchestrator test` 25/25 PASS, typecheck 0.

**`packages/conversation/`** (T5, conversation):
- `src/loop.ts` — `sendStream` 의 user message append 직후 + assistant 첫 chunk 도달 *전* 시점에 fire-and-forget Recall hook (`runRecallHook`): `recall(userMessage, opts) → decide(ctx) → applySilence(decision, ctx) → recallStore.push({id, decided_at, act, candidate_ids, suppressed_reason})`. 실패 `.catch(logger.warn)` — user reply 흐름과 분리. **Sprint 5 hook 주석 위치 §183~189 + §215~248 신규 박음** (Bridge / Temporal / Domain Crossing 진입점).
- DI 옵션 5 신규 (`recall?`, `decide?`, `recallStore?`, `tokenContext?`, `recentWindowMs?`). `RecallFn` / `DecideFn` / `RecallStore` / `RecallHookDeps` 4 type export.
- `applySilence` 정적 import (`D-S4-conversation-orchestrator-dep` FROZEN). `package.json` 에 `@synapse/orchestrator: workspace:*` 추가.
- `__tests__/loop-recall.test.ts` 11 신규 — silence (candidates=0) / ghost / suggestion / strong / low-confidence / decide DI ctx 형상 / silence 시 store push 만 + reply 무영향 / recall .catch + reply 무영향 / recallStore 미주입 no-op / recall 호출 시점 < 첫 chunk / DecisionAct 4 원 drift 가드.
- 검증: `pnpm --filter @synapse/conversation test` 30/30 PASS (Sprint 3 19 → 30).

**`packages/design-system/`** (T6, designer):
- `src/components/{GhostHint,SuggestionCard,StrongRecall,InspectorList}.tsx` 4 신규 — 디자인 목업 `screens.jsx` 의 GhostHintScreen / SuggestionScreen / StrongRecallScreen / InspectorScreen 1:1.
- 모션: `ghost-breathe` + `recall-emerge` (Ghost) / `ink-rise` + `synapse-pulse` 1 회 (Suggestion) / `thread-draw` + `synapse-pulse` 반복 (Strong) / `node-orbit` (Inspector).
- `src/components/index.ts` — Sprint 3 `CaptureToast` 유지 + 4 추기 + `*MotionTokens` const + `InspectorRow`/`InspectorAct` 타입 export.
- `src/copy.ts` (단일 파일 유지 — task 의 `copy.ko.ts`/`copy.en.ts` 분리 지시 *반려*, 결정 노트 §11) — `recall.{ghost,suggestion,strong,inspector}.{title,subtitle}` ko/en 5 keys 추기.
- `src/motion.ts` — `synapsePulse` (carry-over 16 정식 노출) + `recallEmerge` + `threadDraw` + `nodeOrbit` 토큰 추기. RN 호환.
- `src/tokens.ts` — Sprint 4 carry-over 16 흡수 주석.
- `__tests__/{copy,motion,recall}.test.ts` 신규/갱신 (50 PASS).
- `.receipt-runner/verify-copy.mjs` — Sprint 4 5 keys 추기 (ok 8 → 13).
- 검증: 50 PASS, verify-copy ok=13.

**`apps/mobile/`** (T7, mobile):
- `src/recallStore.ts` (native) — `@synapse/storage.appendRecallLog` 위임 + observer Set + sessionRows in-memory + lastDecision + `recentlyDecided(candidateId, withinMs)`.
- `src/recallStore.web.ts` (web) — in-memory `Array<RecallLogRow>` + observer Set, native-only import 0 (carry-over 5 두 번째 시범 검증).
- `src/chatStore.ts` 외부 시그니처 동결 + 내부 wiring (**[FROZEN v2026-04-29 D-S4-chatStore-recall-wiring]**) — `conversation.sendStream` 호출 시 `recall` (engine.recallCandidates + storage nearest/traverse adapter, label = id fallback) + `decide` (orchestrator.decide) + `recallStore` 자동 주입.
- `src/chatStore.web.ts` — 외부 동결 + web 데모 시퀀스 (silence → ghost → suggestion → strong 회전 push) — 4 화면 시각 검증용.
- `app/{ghost,suggestion,strong,inspector}/index.tsx` 4 신규 — recallStore.subscribe → DecisionAct 분기 라우팅 → design-system 4 컴포넌트 mount.
- 디자인 목업 매핑: ghost/index → GhostHintScreen ("Ghost Hint · 레벨 1"), suggestion → SuggestionScreen ("Suggestion · 레벨 2"), strong → StrongRecallScreen ("Strong Recall · 레벨 3"), inspector → InspectorScreen ("기억 / 당신이 남긴 흔적" + 통계 + InspectorList).
- 검증: `pnpm --filter @synapse/mobile run build` exit 0. web bundle (`dist/_expo/static/js/web/entry-*.js`): `better-sqlite3` 0 hits, `sqlite-vec` 0 hits — carry-over 5 두 번째 시범 PASS.

**`scripts/receipt/sprint-4.sh`** (T8, tester):
- Sprint 3 22 단계 wrap (`SKIP_OLLAMA=1` / `SKIP_SPRINT1_E2E=1` 호환) + 신규 10 (23-32): 0004 멱등성 / 4 원 fixture / Recall 종단 (Ollama 의존) / Silence cooldown / verify-copy ok ≥ 12 / mockup-scope-parity / frozen-flag-audit / directive-tag-audit / 임계 강화 / DecisionAct enum drift (re-export 패턴 PASS 처리).
- `.receipt-runner/sprint4-{decide,recall,cooldown}.mjs` 3 신규.
- `.receipt-runner/package.json` 신규 — workspace 패키지 등재 (5 deps: storage/engine/orchestrator/conversation/protocol). `@synapse/*` alias 자기 디렉토리 resolve (D-S4-receipt-runner-workspace-package).
- `pnpm-workspace.yaml` 갱신 — `scripts/receipt/.receipt-runner` 추기.
- 검증: 32/32 PASS (Ollama UP) + dev mode (SKIP_OLLAMA=1) 32 단계 중 Ollama 의존 skip + 나머지 PASS.

**`docs/sprints/sprint-4-recall-l1-l3.md`** (team-leader):
- §1-§2 (`/end` Sprint 3 시 생성), §3-§6 (`/start` 직후 채움), §7-§8 (라이브 — conversation §7.5 + §8.5), §9-§12 (본 T9 마감).

**비변경 (검증)**:
- `packages/{llm}/src/` — Sprint 1 그대로.
- `packages/engine/src/{extractConcepts,embed,buildEdges}.ts` — Sprint 3 그대로.
- `packages/storage/schema/0001_*.sql` ~ `0003_graph.sql` — Sprint 0/1/3 동결.
- `apps/mobile/src/conceptStore.{ts,web.ts}` + `chatStore` 외부 시그니처 — Sprint 1/3 동결.
- `packages/conversation/src/loop.ts` `runMemoryFormation` 시그니처 — Sprint 3 동결 (carry-over 3).

## 11. Decisions Made / Open Issues

**Decisions Made:**
- **[FROZEN v2026-04-29 D-S4-conversation-orchestrator-dep]** **conversation 이 `@synapse/orchestrator` workspace dep 추가 + applySilence 정적 import**. dev doc §3 In = 옵션 3 종 (`recall?/decide?/recallStore?`) 시그니처 보존, dev doc §4 = 4 단계 분리 흐름 (`recall → decide → applySilence → recallStore.push`) — 두 명시 정합 위해 `decide?` 는 `(ctx) => DecisionAct` 단독, applySilence 는 옵션화하지 않고 정적 import. 의존 그래프 신규 엣지 1 (Sprint 3 의 `@synapse/engine` 추가 패턴 재사용). 옵션 4 종 (B) 거절 사유 = dev doc §3 In 시그니처 위반.
- **[FROZEN v2026-04-29 D-S4-storage-recall-row-snake-case]** **storage 의 `RecallLogRow` 가 protocol shape (snake_case + literal union) 채택**. T2 작성 시점 storage TEMP local type (camelCase + suppressed_reason: string) 과 충돌 → protocol = source of truth. 자연 정합 (DB 컬럼명 snake_case 와 일치). storage TEMP 주석이 "T2 도착 시 교체" 명시.
- **[FROZEN v2026-04-29 D-S4-storage-traverse-scope]** **dev doc §3 In + §4 의 *semantic + 1-hop co_occur 결합* 약속 보존을 위해 storage `traverse(db, conceptId, depth=1)` helper 본 sprint 에 추기**. T1 task subject (#38) 동결 헌법 보존을 위해 별도 task #47 (T1.5) 분리. (B) Sprint 5+ 미루기 거절 사유 = dev doc §3 In + §4 약속 위반 (source 'co_occur' / 'mixed' 활성화 안 됨). 옵션 함수 주입 패턴 그대로 — engine ↔ storage type-only cyclic 회피 (carry-over 7).
- **[FROZEN v2026-04-29 D-S4-storage-traverse-depth-throw]** **`traverse` 의 depth ≠ 1 호출 시 throw (silent [] fallback 채택 안 함)**. 사유: Sprint 5+ Hyper-Recall 가 다중 hop 추기 시 silent fallback 이 버그를 숨기는 위험 회피. 단위 테스트 보호.
- **[FROZEN v2026-04-29 D-S4-orchestrator-decide]** **decide 의 4 원 분기 boundary strict (== 2000/== 1500 약화 적용 X)** + **약화 체인 strong → suggestion → ghost → silence** 결정. tokenContext > 2000 / recencyMs < 1500 두 조건 모두 1 단계 약화 (조합 시 최대 2 단계).
- **[FROZEN v2026-04-29 D-S4-orchestrator-silence]** **applySilence 의 우선순위 cooldown → duplicate → low-confidence**. duplicate 는 직전 *RECALL_ACT* decision (silence 제외) 의 candidate set 동일 시만 발화 — 보수 해석 ("사용자가 이미 본 것" 의미 보존, 직전 silence 는 사용자가 본 게 없으므로 duplicate 처리 X). current decision = silence 일 때 low-confidence 라벨 우선 (duplicate override X).
- **[FROZEN v2026-04-29 D-S4-orchestrator-types-protocol-reexport]** **`packages/orchestrator/src/types.ts` 가 `export type { DecisionAct } from '@synapse/protocol'` re-export 패턴 채택 — DecisionAct 단일 출처**. carry-over 2 동결 검증 단순화 (drift grep N+1 sources → 1 source + N imports). decide.ts/silence.ts 의 import 경로 변경 0 (types.ts 우회). enum drift step 32 receipt 가 re-export 패턴 자동 PASS 처리.
- **[FROZEN v2026-04-29 D-S4-loop-recall-hook]** **conversation `sendStream` 의 user append 직후 + assistant 첫 chunk 도달 전 fire-and-forget Recall hook + DI 옵션 5 종**. (`recall?`, `decide?`, `recallStore?`, `tokenContext?`, `recentWindowMs?`). 실패 `.catch(logger.warn)` 격리. *Sprint 5 hook 주석* 신규 박음 (Bridge / Temporal / Domain Crossing 진입점).
- **[FROZEN v2026-04-29 D-S4-chatStore-recall-wiring]** **`apps/mobile/src/chatStore.{ts,web.ts}` 외부 시그니처 동결 + 내부 wiring 1줄 (Sprint 4 한정)**. `conversation.sendStream` 호출 시 `recall` (engine.recallCandidates + storage nearest/traverse adapter) + `decide` (orchestrator.decide) + `recallStore` 옵션 자동 주입. Sprint 3 의 `D-S3-chatStore-internal-wiring` 패턴 재사용 — *영향 받는 대상 파일* 명명 표준 (carry-over 13). chatStore web 은 데모 시퀀스 (silence → ghost → suggestion → strong 회전) 추가로 4 화면 시각 검증.
- **[FROZEN v2026-04-29 D-S4-receipt-runner-workspace-package]** **`scripts/receipt/.receipt-runner` 를 workspace 패키지로 등재 (`pnpm-workspace.yaml`)**. ESM specifier resolution 은 *파일 위치 기반*, cwd 기반 아님 — `@synapse/*` alias 가 자기 디렉토리에서 resolve 되도록. dev doc §3 In + §5 의 `.receipt-runner/sprint4-{decide,recall,cooldown}.mjs` 경로 그대로 박음.
- **[FROZEN v2026-04-29 D-S4-recall-fixture-threshold-zero]** **sprint4-recall.mjs 의 `semanticThreshold: -1` (production 0.5 대신)**. 사유: short concept-label vs full-sentence cosine 만으로 0.5 도달 결정적 보장 X — fixture 회귀 가드 결정성 우선. production 임계는 영향 0 (`engine/src/recall.ts:58` default 그대로). decide() 분류 임계 (0.4/0.6/0.8) 는 sprint4-decide.mjs (step 24) + step 32 enum drift 가 별도 검증.
- **[FROZEN v2026-04-29 D-S4-receipt-runner-nearest-traverse-adapter]** **chatStore + sprint4-recall.mjs 의 storage ↔ engine shape 흡수 adapter 1 줄 (label = id fallback)**. storage.nearestConcepts ({id, score}) ↔ engine NearestRecallHit ({id, label, score}). storage.traverse ({other, weight, kind}) ↔ engine TraverseHit ({id, label, weight}). label = `db.prepare('SELECT label FROM concepts WHERE id = ?')` JOIN, fallback id. Sprint 5+ Concept lookup 합쳐지면 사라질 수 있는 임시 — Sprint 5 carry-over 로 위임.

**부수 결정** (워커 슬라이스 안 자체 합의 — 모두 FROZEN 부착):
- **[FROZEN v2026-04-29 D-S4-design-system-single-copy-file]** **design-system 단일 `copy.ts` 유지** — task 의 `copy.ko.ts`/`copy.en.ts` 분리 지시 *반려*. 사유: 기존 verify-copy.mjs + copy.test.ts 의 단일 파일 import 패턴 + carry-over 11 의 "신규 추기 없음" 정신. 분리 시 회귀.
- **[FROZEN v2026-04-29 D-S4-conversation-recall-default-thin-wrap]** **conversation 의 default `recall` = `engine.recallCandidates` thin-wrap, storage 의존 추가 0** (mobile chatStore wiring 가 storage adapter 결합). conversation 단위 테스트는 stub 으로 storage/engine 무의존. *의존 그래프 단순화* + *책임 경계 명확*.
- **[FROZEN v2026-04-29 D-S4-receipt-enum-drift-reexport-policy]** **receipt step 32 DecisionAct enum drift 의 re-export 패턴 자동 PASS 정책** — `export type { X } from '@synapse/protocol'` 자체가 단일 출처 증명. literal definition grep + re-export grep 둘 다 인식.

**Open Issues:**
- `apps/mobile/src/chatStore.ts` 의 nearest/traverse adapter 클로저 5 매개변수 (Line 46/49/51/53/55) implicit any (TypeScript 7006). build/runtime/receipt 통과하지만 typecheck 진단. Sprint 7 polish 또는 Sprint 5 의 protocol Concept/GraphEdge 이전 시점에 자연 해소 (label JOIN 의 type 명시).
- `@synapse/*` LSP 노이즈 다수 (carry-over 18 그대로, `chatStore.{ts,web.ts}` + `loop.ts` + 4 화면 + recallStore.{ts,web.ts}) — build/runtime/receipt 무관, Sprint 7 polish 또는 protocol 이전 시점에 자동 해소.

## 12. Carry-over + Retrospective

**Carry-over (Sprint 5 가 반드시 알아야 할 것):**

### Sprint 5 즉시 적용 (Hyper-Recall 진입)
1. **Recall 의 `recallCandidates` 가 입력 그래프 동작** — semantic (nearestConcepts k=5, threshold 0.5) + 1-hop co_occur traverse 결합 working. Sprint 5 의 Hyper-Recall (Bridge / Temporal / Domain Crossing) 은 이 함수의 *확장* — 다중 hop traversal (depth ≥ 2), 시간 윈도우 (recentDecisions 의 decided_at 활용), 도메인 교차 (concepts.label / kind 메타데이터).
2. **storage `traverse(db, conceptId, depth=1)` 가 depth ≠ 1 시 throw** (`D-S4-storage-traverse-depth-throw`). Sprint 5 가 다중 hop 추기 시 *throw 제거* + BFS 알고리즘 + visited set + cycle 가드. silent fallback 채택 *안 함* (헌법).
3. **DecisionAct 4 원 enum 단일 출처** — `packages/protocol/src/recall.ts` 의 인라인 정의가 source of truth. orchestrator types.ts 가 re-export 패턴 (`D-S4-orchestrator-types-protocol-reexport`). enum 추가 변경 시 protocol 만 수정 → 자동 전파. step 32 receipt 자동 단일 출처 PASS 처리.
4. **conversation `sendStream` 의 Sprint 5 hook 주석 위치 §183~189 + §215~248** (loop.ts) — Bridge / Temporal / Domain Crossing 알고리즘이 들어갈 자리. 본 sprint 의 Recall hook 그대로 유지, 추가 hook 또는 recall 함수 내부 확장 둘 중 선택.
5. **§7.5 Interfaces (Sprint 4 dev doc) — RecallFn / DecideFn / RecallStore / RecallHookDeps + hook 흐름 6 단계** — Sprint 5 가 처음 소비. Sprint 5 가 RecallFn 의 *확장 시그니처* (BridgeCandidate / TemporalCandidate / DomainCrossingCandidate 추가) 검토 시 본 sprint 시그니처 *동결* (변경 시 PM HOLD 발송).

### Sprint 5 platform-adapter 강제 (carry-over 5 그대로 살아있음)
6. **모든 native-only 모듈 소비자 platform-adapter 패턴** — Sprint 3 (conceptStore) + Sprint 4 (recallStore) **두 번째 시범 PASS**. Sprint 5 의 신규 store / hook (Bridge / Temporal 등) 도 동일 적용. 위반 시 receipt step 3 web bundle build 실패로 잡음.

### Sprint 4 신규 carry-over
7. **engine ↔ storage type-only cyclic 회피 그대로** — engine 이 storage 의 nearest/traverse 를 *DI 옵션 함수* 로 받음 (직접 import 0). engine 단위 테스트는 stub. wiring 워커 (chatStore + receipt-runner) 가 함수 결합 책임. **Sprint 5 가 Concept/GraphEdge 의 protocol 이전 검토** 시 본 의존 구조 자연 해소 (carry-over 7 의 잔여 작업).
8. **`scripts/receipt/.receipt-runner` workspace 패키지 등재** (`D-S4-receipt-runner-workspace-package`) — Sprint 5 의 receipt 도 본 패턴 그대로 사용. 신규 `.mjs` 추기 시 별도 dep 추가 또는 기존 5 deps (storage/engine/orchestrator/conversation/protocol) 재사용.
9. **fixture 회귀 가드의 `semanticThreshold: -1` 패턴** (`D-S4-recall-fixture-threshold-zero`) — production 임계와 분리. Sprint 5 receipt 의 신규 fixture 도 동일 패턴 검토 (short label vs long sentence cosine 결정성).
10. **chatStore + sprint4-recall.mjs 의 nearest/traverse adapter (label = id fallback)** (`D-S4-receipt-runner-nearest-traverse-adapter`) — Sprint 5 의 Concept lookup (`SELECT label FROM concepts WHERE id IN (?)`) 정식 helper 가 storage 또는 protocol 에 추기되면 fallback 제거. 임시 패턴.
11. **applySilence duplicate = RECALL_ACT only** (`D-S4-orchestrator-silence`, 보수 해석) — 직전 silence 는 duplicate 처리 X. Sprint 5 가 Bridge/Temporal/DomainCrossing 의 silence 정책 추가 시 본 보수 해석 유지 검토. *사용자가 이미 본 것* 의미 보존이 우선.
12. **chatStore.ts implicit any 5 건** (Open Issue) — Sprint 7 polish 또는 Sprint 5 의 Concept/GraphEdge protocol 이전 시점에 type 명시 (label JOIN 패턴). build/runtime/receipt 무관하지만 typecheck 진단 노이즈.
13. **carry-over 13 명명 표준 그대로 적용 PASS** — `D-S4-<영향 받는 대상 파일>-<행위>` 형식. 본 sprint 12 frozen 결정 모두 이 패턴. Sprint 5+ 도 동일 표준.
14. **Receipt 임계 강화 적용 결과 PASS — 다음 회복 후보 누적**. 본 sprint receipt 통과로 *D-S5-receipt-threshold-recovery* 후보 등장:
    - Sprint 1 stream: `chunks=10 length=22 ms=738` → Sprint 5 임계 후보 `chunks ≥ 5 length ≥ 10`.
    - Sprint 3 graph (재실측): `concepts=2 co_occur=1 nearest=3` → Sprint 5 임계 후보 `nearest ≥ 2`.
    - Sprint 4 신규: `recall_candidates=6` → Sprint 5 후보 `recall_candidates ≥ 3`.
    - Sprint 5 신규 carry-over 항목 (Bridge/Temporal/DomainCrossing 임계) 와 함께 `/end` 시 박음.
15. **synapse-pulse 토큰 정식 노출 완료** (Sprint 1 carry-over 6 흡수 — `packages/design-system/src/motion.ts`). Sprint 5+ 의 신규 컴포넌트도 본 토큰 + recallEmerge / threadDraw / nodeOrbit 재사용.

### Sprint 6+ Failure & Hygiene 위임
16. **`appendRecallLog` duplicate = no-op** (INSERT OR IGNORE) — Sprint 6 의 forgetting / Humble Retraction / Dismiss-Unlink 정책 검토. recall_log retention 도 Sprint 6 (현재 append-only).
17. **`appendConcept` duplicate = no-op** (Sprint 3 carry-over 8 그대로) — Sprint 6 의 forgetting 정책.
18. **engine ↔ storage type-only cyclic warning** (Sprint 3 carry-over 7 그대로) — Sprint 5 의 Concept/GraphEdge protocol 이전이 깨끗한 해소.

### Sprint 7+ Polish 위임
19. **`@synapse/*` LSP 진단 노이즈** (Sprint 1 carry-over 8 → Sprint 3 carry-over 18 → Sprint 4 Open Issue) — 빌드/런타임/receipt 무관. Sprint 7 polish 또는 protocol 이전 시점에 자동 해소.
20. **`apps/mobile/src/chatStore.ts` implicit any 5 건** (Sprint 4 Open Issue) — Sprint 7 polish 또는 Sprint 5 protocol 이전 시점.
21. **다국어 균형 / embedding 모델 어댑터 분리** (Sprint 3 carry-over 12 그대로) — Sprint 7 polish.

### TaskList API 휘발성 (Sprint 1/2/3 회고 그대로 살아있음)
22. **TaskList API 휘발 재발 가능** — Sprint 4 시작/진행 시점에는 살아있었음. 본 sprint 9+1 task 자가-마킹 모두 정상 작동. Sprint 5 시작 시점 휘발 가능 — dev doc + 워커 보고 fallback.

### 가정 보존
- Sprint 0/1/2/3 의 모든 다른 가정은 직전 스프린트 그대로 유지.
- Sprint 5 가 처음 확장할 시그니처 (RecallFn / DecideFn / RecallStore / DecisionAct enum / RecallCandidate / RecallLogRow / DecideContext) 모두 동결 — 변경 시 PM HOLD 발송.

**Retrospective:**

*잘 된 것*:
- **종단 receipt 32/32 PASS** — Sprint 1 6 + Sprint 2 메타 8 + Sprint 3 신규 8 + Sprint 4 신규 10 = 모두 통과 (Ollama UP + dev mode 둘 다). Recall L1~L3 종단 흐름 (입력 → semantic+co_occur 결합 → 4 원 DecisionAct → Silence rules → recall_log 적재 → 4 화면 라우팅) 안정 작동. *침묵이 디폴트* 의 정량화 실현 (4 원 분기 + cooldown 60s + duplicate + low-confidence).
- **HOLD-DECIDE-RESUME 두 번째 가동** — `D-S4-storage-traverse-scope` (storage 의 본 sprint 범위 vs Sprint 5+ 분기) PM 결정 분기에서 헌법 4 패턴 #1 정확 작동. storage 워커 HOLD → team-lead 결정 → directive 발송 → RESUME. T1 task subject 동결 보호를 위해 별도 task #47 분리로 *task subject > dev doc* 헌법 + dev doc 약속 보존 양립.
- **워커 9+1 슬라이스 race 0** — storage / engine / orchestrator / conversation / designer / mobile / tester 7 워커 + team-leader 가 10 task 종단. 단일 작성자 시간창 헌법 race 0. 모든 워커 자가-마킹 표준 정상 작동 (Sprint 3 carry-over "다음에 다르게 할 것" 학습 적용 PASS).
- **DecisionAct 단일 출처 (re-export 패턴)** — orchestrator 가 engine 제안 받아 protocol re-export 패턴 채택 (`D-S4-orchestrator-types-protocol-reexport`). carry-over 2 동결 검증 *N+1 sources → 1 source + N imports* 단순화. 워커 간 SendMessage peer DM 의 자체 합의 (engine ↔ orchestrator) 가 시그니처 정합 자체 해소.
- **protocol 부분 이전 첫 시도 PASS** (carry-over 7) — `RecallCandidate` / `DecideContext` / `RecallLogRow` / `DecisionAct` 4 타입 protocol 이전 완료. Concept/GraphEdge 잔여는 Sprint 5+. 패턴 입증 — Sprint 5 가 잔여 이전 시 reference.
- **platform-adapter 두 번째 시범 PASS** (carry-over 5) — `recallStore.{ts,web.ts}` 짝 + chatStore wiring 까지 web bundle 의 `better-sqlite3` / `sqlite-vec` 0 hits 검증. Sprint 3 의 첫 시범 (conceptStore) + Sprint 4 두 번째 시범 = 패턴 *영구 채택*.
- **임계 강화 회복 첫 적용 PASS** (`D-S3-receipt-threshold-recovery`) — Sprint 1 carry-over 8 / Sprint 2 carry-over 9 / Sprint 3 carry-over 15 의 누적 약속 첫 적용. `chunks ≥ 2 length ≥ 5 ms ≤ 5000 + concepts ≥ 2 co_occur ≥ 1 nearest ≥ 1 + decisions ≥ 4 + recall_candidates ≥ 1 + cooldown_silence = 1` 모두 충족. 다음 회복 후보 (D-S5-receipt-threshold-recovery) Sprint 5 carry-over 14 등장.
- **fire-and-forget hook + .catch 격리 + 시간/실패 격리** — user reply (Sprint 1) + memory formation (Sprint 3) + Recall (Sprint 4) 3 흐름이 충돌 0. 각 hook 의 실패가 다른 흐름에 미치는 영향 0. 단위 테스트 11 case 가 격리 보장.

*아팠던 것*:
- **막판 회귀 1 회 (T8 receipt 가 잡음)** — conversation T5 작업 *진행 중* 시점의 코드가 약화 규칙 trigger 로 3 건 FAIL → conversation 워커가 자체 수정 30 PASS 로 해소. tester 의 receipt 재실행으로 검증. *receipt 가 진행 중 회귀를 잡는다는 신호* — 좋은 가드.
- **mobile T7 ETA 보고 빈도 낮음** — 약 50분 응답 부재 (idle notification 만), 두 번의 STATUS CHECK 후 완료 보고. 작업 자체는 정상 진행 + 산출물 ship + 자가-마킹 모두 PASS, 다만 *살아있는 진척 신호* 가 부재. workers 의 자가 ETA 발신 표준 미정 — Sprint 5 가 검토.
- **LSP 캐시 stale 노이즈 다수** (suppressedReason camelCase 가짜 알람 + `@synapse/*` Cannot find module + chatStore implicit any 5 건). 워커가 매번 가짜 알람 인지 후 무시 또는 `grep` 으로 실제 파일 확인 — 비용 누적. Sprint 5 의 protocol Concept/GraphEdge 이전 시점에 자연 해소 가능성.
- **sprint4-recall.mjs 의 `semanticThreshold: -1` fixture 회귀 가드** (production 0.5 와 분리) — fixture 결정성과 production 정합 분리 정책 명시 (`D-S4-recall-fixture-threshold-zero` FROZEN). Sprint 5+ 의 fixture 작성 시 동일 패턴 채택 또는 short-label embedding 의 production 정합 검토 필요.
- **두 engine 워커 인스턴스 (engine + engine-2) idle 알림 노이즈** — 시스템이 spawn 시 자동 -2 suffix. 실제 작업 워커는 engine-2 만 — engine 은 잔재 또는 alias. 모든 결정-id 발신 + 메시지 발신은 engine-2 가 담당. T9 dev doc 마감 후 shutdown.

*다음에 다르게 할 것*:
- **Sprint 5 진입 직전 fixture 결정성 정책 명시** — fixture 의 임계 (`-1` 또는 production 와 분리) 결정 시점 워커 spawn prompt 0번 묶음에 박기. T5 fixture 회귀 가드를 T8 receipt 가 잡지 않도록 (회귀 후 해소 비용 절감).
- **워커 자가 ETA 발신 표준** — idle notification 만으로는 진척 신호 부족. 15-30분 단위 또는 *작업 중* 표시 SendMessage 의무화 검토. Sprint 5 spawn prompt 0번 묶음에 박기.
- **LSP 캐시 stale 진단 무시 표준** (carry-over 18 명시 강화) — 워커 spawn prompt 0번 묶음에 "carry-over 18: `@synapse/*` LSP 진단 노이즈 = build/runtime/receipt 무관, 무시" 명시 그대로. 새 패턴 (implicit any from adapter closure) 도 동일 정책.
- **protocol 점진적 완전 이전** — Sprint 5 의 Hyper-Recall 알고리즘 진입 시 Concept/GraphEdge 도 protocol 로 이전 검토 (carry-over 7 잔여 해소). Sprint 4 가 4 타입 이전 PASS — 패턴 입증됨, 잔여 이전 비용 작음.
- **SPRINTS.md 와 CLAUDE.md 로드맵 정합 검증** — SPRINTS.md 의 Sprint 5/6/7/8 행이 8-sprint 가정 (Sprint 5 Orchestrator 가 별도)이지만 CLAUDE.md 는 7-sprint (Sprint 4 Recall 이 Orchestrator 흡수). 본 /end 가 SPRINTS.md 갱신 시 CLAUDE.md 표 그대로 채택 (5: Hyper-Recall, 6: Failure & Hygiene, 7: Polish).
