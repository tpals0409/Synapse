# Sprint 5 — hyper-recall

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`

## 1. Goal
Sprint 4 의 `recallCandidates` (semantic + 1-hop co_occur) + `recall_log` 적재 흐름 위에 **Hyper-Recall 3 알고리즘** — Bridge (다중 hop traversal, 두 distant concept 간 매개 노드 발견) / Temporal (시간 윈도우 기반 recentDecisions 활용, 같은 시기 발화 묶음 부상) / Domain Crossing (다른 도메인 concept 간 의외의 연결 부상) — 을 추가해, `recallCandidates` 의 출력을 풍부화하고 `BridgeCandidate` / `TemporalCandidate` / `DomainCrossingCandidate` 3 신규 source 를 활성화한다. *침묵이 디폴트* + 4 원 DecisionAct 동결 그대로 유지.

## 2. Deliverable & Receipt

**Deliverable:**
- `packages/engine/src/hyperRecall.ts` 신규 — `bridgeCandidates(seedConceptId, opts: {db, traverse, depth?: number, maxBridges?: number}): Promise<BridgeCandidate[]>` (다중 hop BFS, depth ≥ 2, visited set + cycle 가드) + `temporalCandidates(opts: {db, recentDecisions, windowMs}): Promise<TemporalCandidate[]>` (recall_log 의 decided_at 윈도우 + 같은 시기 conceptId 묶음) + `domainCrossingCandidates(seedConceptId, opts: {db, traverse, kindWeight?}): Promise<DomainCrossingCandidate[]>` (edge kind 'co_occur' vs 'semantic' 비대칭 활용, 의외 연결 점수화).
- `packages/engine/src/recall.ts` 갱신 — `recallCandidates` 의 합집합에 Hyper-Recall 3 source 추가. source 우선순위 = `mixed > semantic > co_occur > bridge > temporal > domain_crossing` (또는 score 기반 동등 처리, /start 결정).
- `packages/storage/src/repo/graph.ts` 갱신 — `traverse(db, conceptId, depth)` 의 depth ≥ 2 구현 (Sprint 4 의 throw 제거, BFS + cycle 가드, max-depth 가드). storage carry-over 7 의 잔여 해소도 함께 — Concept/GraphEdge protocol 이전 검토.
- `packages/protocol/src/recall.ts` 갱신 — `BridgeCandidate` / `TemporalCandidate` / `DomainCrossingCandidate` 타입 추기 + `RecallCandidate.source` enum 확장 (`'bridge' | 'temporal' | 'domain_crossing'` 추가). `Concept` / `GraphEdge` 의 protocol 이전 (carry-over 7 잔여) 1-stage 마무리 검토.
- `packages/orchestrator/src/decide.ts` 갱신 — Hyper-Recall source 의 `tokenContext` 약화 정책 (강한 source 일수록 약화 면제 또는 임계 조정).
- `packages/conversation/src/loop.ts` 갱신 — Sprint 4 §183~189 + §215~248 의 *Sprint 5 hook 주석* 위치를 활성화. 본 sprint 가 그 자리를 채움.
- `apps/mobile/app/{ghost,suggestion,strong,inspector}/index.tsx` 갱신 — 신규 source 표시 (Inspector 가 source 별 색/모션 구분, 디자인 목업 InspectorScreen 의 source-pill).
- `packages/design-system/src/components/InspectorList.tsx` 갱신 — `source` 별 visual 구분 (bridge=thread-draw / temporal=node-orbit / domain_crossing=synapse-pulse 강조).
- `scripts/receipt/sprint-5.sh` — Sprint 4 32 단계 wrap + 신규 6~8 단계 (Bridge / Temporal / DomainCrossing 각각 + 다중 hop traverse 단위 + Concept lookup 정식 helper 정합 + /end 가 결정한 추가 단계).

**Receipt (자동 검증 가능한 형태):**
- `pnpm install` / `pnpm -r test` exit 0 (Sprint 4 182 + Sprint 5 신규: hyperRecall unit, 다중 hop traverse, recall.test 갱신).
- `pnpm --filter @synapse/mobile run build` exit 0 (web bundle 의 `better-sqlite3` / `sqlite-vec` 0 hits 그대로 — carry-over 5 *세 번째* 시범).
- `bash scripts/receipt/sprint-5.sh` 시나리오:
  1. Sprint 4 의 32 단계 그대로 통과.
  2. **다중 hop traverse 멱등성** — `traverse(db, id, 1)` ↔ `traverse(db, id, 2)` 결과 정합 (depth=2 가 depth=1 의 superset, cycle 0).
  3. **e2e Bridge** — fixture (3 noun 그래프, A-B / B-C edges) → seedA → bridge=C 발견 (depth=2 hop B 매개).
  4. **e2e Temporal** — recall_log 의 decided_at 윈도우 (예: 24h) 안 같은 시기 conceptId 묶음 ≥ 1 부상.
  5. **e2e DomainCrossing** — 두 다른 kind ('co_occur' / 'semantic') edge 의 비대칭 score 발견 ≥ 1.
  6. **임계 강화 회복** (`D-S5-receipt-threshold-recovery` 후보, Sprint 4 carry-over 14 의 누적 약속): `chunks ≥ 5 length ≥ 10 + nearest ≥ 2 + recall_candidates ≥ 3 + bridge_candidates ≥ 1 + temporal_candidates ≥ 1` (Sprint 4 receipt 통과 후 회복).
  7. **DecisionAct enum drift 그대로** — 4 원 (`silence/ghost/suggestion/strong`) 동결 + re-export 패턴 그대로 PASS.
  8. **mockup-scope-parity + frozen-flag-audit + directive-tag-audit** Sprint 5 dev doc — 0 violations.
- 모든 단계 통과 → exit 0, "✅ Sprint 5 receipt PASSED".

## 3. Scope

**In:**

- **storage `traverse(db, id, depth ≥ 2)` BFS** — `packages/storage/src/repo/graph.ts` 의 `traverse(db, conceptId, depth=1)` 에서 depth ≠ 1 throw 제거. depth ≥ 2 시 BFS + visited Set + cycle 가드 + max-depth 가드 (default depth ≤ 3, opts override). depth=1 결과/시그니처 동결 (Sprint 4 회귀 0). depth=N 결과 = 1..N hop 모든 hit (depth=2 가 depth=1 의 superset, 자기 자신 제외, 중복 제외, 가장 짧은 경로 우선). `D-S4-storage-traverse-depth-throw` 의 헌법 (silent fallback 절대 X) 그대로 — depth ≤ 0 또는 depth > maxDepth 호출 시 throw.
- **protocol Concept / GraphEdge 이전 (carry-over 7 잔여 1-stage 마무리)** — `packages/protocol/src/concept.ts` 신규 (또는 `recall.ts` 확장): `Concept = {id: string, label: string, kind?: string, embedding?: number[]}` + `GraphEdge = {fromId: string, toId: string, kind: 'co_occur'|'semantic', weight: number}` + `EdgeKind = 'co_occur'|'semantic'`. engine ↔ storage type-only cyclic 자연 해소. chatStore implicit any 5 건 (Sprint 4 Open Issue) 자연 해소. **[FROZEN v2026-04-29 D-S5-protocol-concept-edge-migration]** = 본 sprint 포함 (T1.5 활성).
- **protocol 신규 source 타입 + enum 확장** — `packages/protocol/src/recall.ts` 갱신:
  - `BridgeCandidate = {conceptId, label, score, source: 'bridge', viaConceptId: string, depth: number}`
  - `TemporalCandidate = {conceptId, label, score, source: 'temporal', windowMs: number, coDecidedIds: string[]}`
  - `DomainCrossingCandidate = {conceptId, label, score, source: 'domain_crossing', edgeKindFrom: EdgeKind, edgeKindTo: EdgeKind}`
  - `RecallCandidate.source` enum 확장: `'semantic'|'co_occur'|'mixed'|'bridge'|'temporal'|'domain_crossing'`.
- **engine `hyperRecall.ts` 신규 3 함수** — `packages/engine/src/hyperRecall.ts`:
  - `bridgeCandidates(seedConceptId, opts: {db, traverse, depth?: number, maxBridges?: number}): Promise<BridgeCandidate[]>` — BFS depth=2 (default) 로 seed 의 1-hop 이웃의 1-hop 이웃 발견. seed 자신 + 1-hop 이웃 제외. score = 매개 노드의 weight 곱 또는 평균 (워커 결정, 단위 테스트 결정성 보장).
  - `temporalCandidates(opts: {db, recentDecisions, windowMs?: number}): Promise<TemporalCandidate[]>` — recall_log 의 decided_at 윈도우 (default 24h, ms) 안 같은 시기 conceptId 묶음. recentDecisions 가 옵션 (DI). 빈 입력 시 [] 반환.
  - `domainCrossingCandidates(seedConceptId, opts: {db, traverse, kindWeight?: {co_occur: number, semantic: number}}): Promise<DomainCrossingCandidate[]>` — seed 의 1-hop 중 edge kind 가 다른 두 종류 모두 등장하는 노드 발견. score = 비대칭 정도 (kindWeight default `{co_occur: 0.5, semantic: 1.0}`).
- **engine `recall.ts` 합집합 갱신** — `recallCandidates` 가 hyperRecall 3 함수 호출 결과를 합집합. **[FROZEN v2026-04-29 D-S5-recall-source-priority]** = primary sort by source enum order (`mixed > semantic > co_occur > bridge > temporal > domain_crossing`), secondary sort by score desc. dedup conceptId 단일 (semantic > co_occur > bridge > temporal > domain_crossing 순으로 우선, 두 source 모두 hit 시 source='mixed' 갱신 + score = max). DI 옵션 (`bridge?`, `temporal?`, `domainCrossing?`) 추가, default 미설정 시 hyperRecall 함수 직접 호출.
- **orchestrator `decide.ts` source 가중치 약화 정책** — `packages/orchestrator/src/decide.ts` 의 tokenContext > 2000 / recencyMs < 1500 약화 규칙에 source 가중치 추가. strong source (mixed/semantic) 약화 그대로, weak source (bridge/temporal/domain_crossing) 의 *최고 score* 가 결정에 반영될 때 1 단계 추가 약화 (또는 임계 +0.05 상향). 4 원 enum 동결 그대로. 결정 분기 동일 (0.4/0.6/0.8).
- **conversation `loop.ts` Sprint 5 hook 활성화** — `packages/conversation/src/loop.ts` 의 §183~189 + §215~248 *Sprint 5 hook 주석* 위치 활성화. RecallFn 시그니처 동결 (변경 시 PM HOLD). Hyper-Recall 은 recall 함수 내부 확장 (engine.recallCandidates 가 hyperRecall 3 source 자동 합집합) — 추가 hook 없음.
- **mobile 4 화면 source 표시** — `apps/mobile/app/{ghost,suggestion,strong,inspector}/index.tsx`. ghost/suggestion/strong 은 source 별 분기 (visual 메타 표시 또는 그대로 유지, 본 sprint 는 InspectorList 만 source 별 시각). Inspector 가 source-pill 5 종 (semantic / co_occur / mixed / bridge / temporal / domain_crossing — mixed 는 design-system 결정).
- **design-system InspectorList source-pill** — `packages/design-system/src/components/InspectorList.tsx` row 에 source-pill 추기. visual 매핑: semantic/co_occur/mixed = Sprint 4 그대로 (또는 ink+amber accent), bridge = thread-draw 모션 + amber accent, temporal = node-orbit 모션 + ink secondary, domain_crossing = synapse-pulse 모션 + amber. 디자인 목업 InspectorScreen 의 source-pill 1:1.
- **chatStore wiring 정합** — `apps/mobile/src/chatStore.{ts,web.ts}` 외부 시그니처 동결 (Sprint 1 헌법). 내부 wiring 갱신: engine.recallCandidates 가 hyperRecall 자동 합집합. **Concept/GraphEdge protocol 이전 후 nearest/traverse adapter 의 `label = id fallback` 제거** (carry-over 10 해소) — protocol Concept 단일 출처가 label 직접 노출. chatStore implicit any 5 건 자연 해소.
- **receipt 자동화** — `scripts/receipt/sprint-5.sh` 가 Sprint 4 32 단계 wrap (`SKIP_OLLAMA=1` / `SKIP_SPRINT1_E2E=1` 호환) + 신규 6~8 단계: 다중 hop traverse 멱등성 / e2e Bridge / e2e Temporal / e2e DomainCrossing / 임계 회복 / DecisionAct enum drift (re-export 자동 PASS) / mockup-scope-parity + frozen-flag-audit + directive-tag-audit. `.receipt-runner/sprint5-{bridge,temporal,domain-crossing,traverse-depth}.mjs` 4 신규 fixture (workspace 패키지 그대로, 5 deps 재사용).
- **임계 회복 (`D-S5-receipt-threshold-recovery` FROZEN)** — Sprint 4 실측 베이스라인 (`chunks=10 length=22 ms=738 / concepts=2 co_occur=1 nearest=3 / decisions=4 / recall_candidates=6 / cooldown_silence=1 / verify-copy ok=13`) 위 회복: `chunks ≥ 5 length ≥ 10 + nearest ≥ 2 + recall_candidates ≥ 3 + bridge_candidates ≥ 1 + temporal_candidates ≥ 1`. fixture 결정성 (`semanticThreshold: -1` 또는 production 정합) carry-over 9 패턴 그대로.
- **단위 테스트** — `packages/storage/__tests__/traverse.test.ts` 갱신 (depth ≥ 2 BFS / visited / cycle 가드 / max-depth, 5+ 신규) + `packages/engine/__tests__/hyperRecall.test.ts` 신규 (Bridge / Temporal / DomainCrossing 각각 + dedup + empty graph, 12+ 신규) + `packages/engine/__tests__/recall.test.ts` 갱신 (3 신규 source 합집합, 3+ 신규) + `packages/protocol/__tests__/recall.test.ts` 갱신 (3 신규 type + enum 확장, 3+ 신규) + `packages/protocol/__tests__/concept.test.ts` 신규 (Concept/GraphEdge type 검증, 2+ 신규) + `packages/orchestrator/__tests__/decide.test.ts` 갱신 (source 가중치 약화, 3+ 신규) + `packages/conversation/__tests__/loop-recall.test.ts` 갱신 (3 신규 source 통과, 1+ 신규).
- **화면 단위 (목업 ↔ §3)** — Sprint 5 가 *추가 활성화* 하는 화면 = **0 종** (Sprint 4 4 화면 + InspectorList source-pill 만 추기). Sprint 1 onboarding + Sprint 3 first-chat + Sprint 4 4 화면 변경 없이 살아있음. mockup 표 단일 진실원 = Sprint 2 §7.1. PM 사인오프 전 `mockup-scope-parity.sh` exit 0 검증 완료 (2026-04-29).

**Out:**

- **Forgetting / Humble Retraction / Dismiss-Unlink** — Sprint 6. `recall_log` 는 append-only 그대로. retention 정책은 Sprint 6.
- **추가 Polish (애니메이션 미세조정 / 다크 모드 일치 / 한·영 카피 미세조정)** — Sprint 7. 본 sprint 는 InspectorList source-pill *작동 일치* 까지만.
- **Concept dedup / alias merge** — Sprint 6+. 같은 label concept 중복 그대로 (Sprint 3 합의).
- **`apps/mobile/src/chatStore.{ts,web.ts}` *외부 시그니처* 변경** — Sprint 1 동결 그대로. *내부 wiring* (hyperRecall 자동 합집합 + adapter `label fallback` 제거) 만 허용.
- **DecisionAct enum 슈퍼셋 변경** — 절대 금지. 4 원 (`silence/ghost/suggestion/strong`) 그대로.
- **`runMemoryFormation` / `runRecallHook` / `RecallFn` / `DecideFn` 시그니처 변경** — Sprint 3/4 동결. 변경 필요 시 PM HOLD 발송.
- **임계 추가 강화 (Sprint 6 회복)** — 본 sprint 는 carry-over 14 회복 그대로 박는 것까지만. Sprint 6 회복은 본 sprint receipt 통과 후 `/end` 결정.
- **LLM 다국어 균형 / embedding 모델 어댑터 분리** — Sprint 7.
- **mockup 표 변경** — 본 sprint 신규 화면 0 종, 기존 §7.1 표 그대로.
- **`appendRecallLog` retention** — Sprint 6.
- **다중 hop > maxDepth (default 3)** — 본 sprint 의 BFS max-depth 가드. 더 깊은 traverse 는 Sprint 6+.
- **Bridge depth ≥ 3** — 본 sprint 는 default depth=2 (1-hop의 1-hop). depth ≥ 3 (multi-hop bridge) 는 Sprint 6+.
- **DomainCrossing kind 추가** — 본 sprint 는 `'co_occur'|'semantic'` 두 kind. 새 kind 추기 (예: 'temporal-edge') 는 Sprint 6+.

## 4. Architecture & Data Flow

```
[user input]
  → conversation.sendStream
    → user msg append
    → fire-and-forget Recall hook (Sprint 4 hook 그대로)
      → engine.recallCandidates(userMessage, opts)
        ├─ embed(userMessage) → 768d vec
        ├─ nearest(db, vec, k=5) → semantic candidates
        ├─ for each semantic candidate:
        │   └─ traverse(db, conceptId, depth=1) → co_occur candidates
        ├─ [Sprint 5 신규] for each semantic candidate (또는 top-1):
        │   └─ hyperRecall.bridgeCandidates(seedConceptId, {db, traverse, depth=2})
        │       └─ traverse(db, id, 2) BFS → 1-hop 이웃의 1-hop 이웃 - {seed, 1-hop} → BridgeCandidate[]
        ├─ [Sprint 5 신규] hyperRecall.temporalCandidates({db, recentDecisions, windowMs=24h})
        │   └─ recall_log decided_at 윈도우 같은 시기 conceptId 묶음 → TemporalCandidate[]
        ├─ [Sprint 5 신규] for each semantic candidate (또는 top-1):
        │   └─ hyperRecall.domainCrossingCandidates(seedConceptId, {db, traverse})
        │       └─ 1-hop 중 두 kind 모두 등장하는 노드 비대칭 score → DomainCrossingCandidate[]
        └─ 합집합 dedup
            primary: source enum order (mixed > semantic > co_occur > bridge > temporal > domain_crossing)
            secondary: score desc
            same conceptId: source='mixed' 갱신 + score=max
      → orchestrator.decide(ctx)
        ├─ 4 원 분기 (0.4/0.6/0.8)
        ├─ tokenContext>2000 / recencyMs<1500 약화 (Sprint 4 그대로)
        └─ [Sprint 5 신규] weak source (bridge/temporal/domain_crossing) 추가 약화
      → orchestrator.applySilence(decision, ctx)
        └─ cooldown → duplicate → low-confidence (Sprint 4 그대로)
      → recallStore.push({id, decided_at, act, candidate_ids, suppressed_reason})
        └─ @synapse/storage.appendRecallLog (native) / in-memory (web)
      → mobile 4 화면 subscribe → DecisionAct 분기 라우팅 → design-system 4 컴포넌트 mount
        └─ [Sprint 5 신규] InspectorList row 에 source-pill (5 종 시각 구분)
    → assistant first chunk
    → assistant streaming
    → assistant complete
  → user reply (사용자에게 노출)
```

핵심 변경:
- `hyperRecall.ts` 가 `recall.ts` 의 internal helper. 외부 hook 시그니처 (RecallFn) 동결 — 신규 source 는 RecallCandidate.source enum 확장으로 노출.
- `traverse(db, id, depth)` 의 depth ≥ 2 가 BFS + visited Set + cycle 가드 + max-depth 가드. depth=1 결과/시그니처 동결.
- `protocol/src/concept.ts` 신규 → `Concept` / `GraphEdge` / `EdgeKind` 단일 출처 (carry-over 7 잔여 해소). engine ↔ storage type-only cyclic 자연 해소.
- `RecallCandidate.source` enum 6 종 (`semantic|co_occur|mixed|bridge|temporal|domain_crossing`).
- Inspector 의 source-pill 5+ 종 시각 구분 (semantic|co_occur|mixed 시각 그대로 + bridge/temporal/domain_crossing 신규).

의존 그래프 신규 엣지 0 — 기존 `engine ↔ protocol`, `storage ↔ protocol`, `orchestrator ↔ protocol`, `conversation ↔ orchestrator` 그대로.

## 5. File Ownership

| 파일/디렉토리 | 작성자 | 비고 |
|---|---|---|
| `packages/protocol/src/concept.ts` 신규 | engine | Concept / GraphEdge / EdgeKind 이전 (carry-over 7 잔여) |
| `packages/protocol/src/recall.ts` | engine | 3 신규 Candidate 타입 + source enum 확장 |
| `packages/protocol/src/index.ts` | engine | re-export 갱신 |
| `packages/protocol/__tests__/concept.test.ts` 신규 | engine | Concept/GraphEdge type 검증 |
| `packages/protocol/__tests__/recall.test.ts` | engine | 3 신규 type + enum 확장 |
| `packages/storage/src/repo/graph.ts` | storage | traverse depth ≥ 2 BFS + visited + cycle + max-depth |
| `packages/storage/src/repo/concepts.ts` (필요 시) | storage | protocol Concept import 경로 갱신 |
| `packages/storage/src/index.ts` | storage | Concept/GraphEdge re-export 제거 (protocol 단일 출처) |
| `packages/storage/__tests__/traverse.test.ts` | storage | depth ≥ 2 / visited / cycle / max-depth 5+ 신규 |
| `packages/engine/src/hyperRecall.ts` 신규 | engine | Bridge / Temporal / DomainCrossing 3 함수 |
| `packages/engine/src/recall.ts` | engine | 합집합 갱신 + source 우선순위 |
| `packages/engine/src/index.ts` | engine | hyperRecall export |
| `packages/engine/__tests__/hyperRecall.test.ts` 신규 | engine | 12+ 신규 |
| `packages/engine/__tests__/recall.test.ts` | engine | 3 신규 source 합집합 갱신 |
| `packages/orchestrator/src/decide.ts` | orchestrator | source 가중치 약화 |
| `packages/orchestrator/__tests__/decide.test.ts` | orchestrator | 3+ 신규 |
| `packages/conversation/src/loop.ts` | conversation | Sprint 5 hook 활성화 (RecallFn 동결) |
| `packages/conversation/__tests__/loop-recall.test.ts` | conversation | 3 신규 source 통과 1+ 신규 |
| `apps/mobile/app/inspector/index.tsx` | mobile | source-pill 표시 |
| `apps/mobile/app/{ghost,suggestion,strong}/index.tsx` | mobile | (필요 시 source 메타 표시, 그대로 유지 가능) |
| `apps/mobile/src/chatStore.{ts,web.ts}` | mobile | 외부 시그니처 동결 + 내부 wiring + adapter `label fallback` 제거 (carry-over 10) |
| `packages/design-system/src/components/InspectorList.tsx` | designer | source-pill 5 종 시각 구분 |
| `packages/design-system/src/copy.ts` | designer | source-pill 카피 (필요 시 ko/en, verify-copy ok 유지/증가) |
| `packages/design-system/__tests__/recall.test.ts` | designer | InspectorList source-pill 갱신 |
| `scripts/receipt/sprint-5.sh` | tester | Sprint 4 32 wrap + 신규 6~8 |
| `scripts/receipt/.receipt-runner/sprint5-{bridge,temporal,domain-crossing,traverse-depth}.mjs` 신규 | tester | 4 fixture |
| `docs/sprints/sprint-5-hyper-recall.md` | team-leader | §3-§6 본 게이트 (완료), §7-§8 라이브, §9-§12 /end |
| `SPRINTS.md` | team-leader | /end 시 갱신 |

비변경 (검증):
- `packages/llm/src/` — Sprint 1 그대로.
- `packages/engine/src/{extractConcepts,embed,buildEdges}.ts` — Sprint 3 그대로.
- `packages/storage/schema/0001_*.sql` ~ `0004_recall_log.sql` — Sprint 0/1/3/4 동결.
- `packages/orchestrator/src/silence.ts` + `types.ts` — Sprint 4 동결.
- `packages/conversation/src/loop.ts` 의 `runMemoryFormation` 시그니처 — Sprint 3 동결.
- `apps/mobile/src/recallStore.{ts,web.ts}` — Sprint 4 동결.

## 6. Tasks

| # | Task ID | 책임 | addBlockedBy | 완료 조건 |
|---|---|---|---|---|
| T0 | spawn-and-inject | team-leader | - | 8 워커 spawn 완료 + 0번 묶음 4 패턴 + carry-over 22 항목 inject |
| T1 | protocol-recall-source-enum | engine | T0 | `RecallCandidate.source` 6 종 + 3 Candidate type + protocol unit PASS |
| T1.5 | protocol-concept-edge-migration | engine | T1 | `Concept`/`GraphEdge`/`EdgeKind` protocol 이전 + engine/storage import 경로 갱신 + typecheck PASS |
| T2 | storage-traverse-bfs | storage | T1.5 | `traverse(db, id, depth ≥ 2)` BFS + visited + cycle + max-depth + depth=1 결과 동결 + 5+ unit |
| T3 | engine-hyper-recall | engine | T1, T2 | `hyperRecall.ts` 3 함수 + `recall.ts` 합집합 + source 우선순위 + 12+ unit + recall.test 갱신 |
| T4 | orchestrator-decide-source-weight | orchestrator | T3 | source 가중치 약화 + 4 원 동결 + decide.test 3+ 신규 |
| T5 | conversation-hook-activation | conversation | T3, T4 | Sprint 5 hook 활성화 + RecallFn 시그니처 동결 + loop-recall.test 1+ 신규 |
| T6 | mobile-source-display | mobile | T5, T7 | 4 화면 source 표시 + chatStore wiring + adapter label fallback 제거 + mobile build PASS + web bundle 0 hits |
| T7 | designer-inspector-source-pill | designer | T1 | InspectorList source-pill 5 종 + design-system test PASS + verify-copy ok 유지/증가 |
| T8 | tester-receipt-sprint5 | tester | T2, T3, T4 (부분 검증 가능) | sprint-5.sh exit 0 + 4 신규 fixture + 임계 회복 PASS |
| T9 | dev-doc-live-and-close | team-leader | T1~T8 | §7-§8 라이브 갱신 (워커 보고 흡수) + §9-§12 /end 마감 (carry-over 자가완결) |

의존 그래프:
```
T0 → T1 → T1.5 → T2 → T3 → T4 → T5 → T6
                       ↘  T7 ─────────↗
                       T3 → T8 (부분), T4 → T8
```

**HOLD-DECIDE-RESUME 후보 (헌법 #1)**:
- RecallFn / DecideFn / RecallStore / RecallHookDeps 시그니처 변경 필요 시 → conversation 워커 즉시 PM HOLD 발송.
- `traverse` depth=1 결과/시그니처 변경 시 → storage 워커 즉시 PM HOLD 발송 (Sprint 4 회귀 위험).
- DecisionAct enum 추가/제거 시 → orchestrator 워커 즉시 PM HOLD 발송 (`decision_orchestrator_enum.md` 동결).
- mockup 표 신규 별칭 필요 시 (본 sprint 0 종 가정) → designer 워커 즉시 PM HOLD 발송.

**spawn prompt 0번 묶음 inject 사항 (Sprint 5)**:
1. 헌법 4 패턴 (HOLD-DECIDE-RESUME / Decision-version 태그 / SoT 우선순위 / 단일 작성자 시간창)
2. carry-over 18 LSP 노이즈 무시 정책 + 신규 implicit any 동일 정책
3. carry-over 14 임계 회복 후보값 (위 §2 receipt 6번)
4. carry-over 9 fixture 결정성 정책 (`semanticThreshold: -1` 패턴)
5. 워커 자가 ETA 발신 의무 (15-30분 단위 또는 *작업 중* SendMessage — Sprint 4 회고)
6. 명명 표준 `D-S5-<영향 받는 대상 파일>-<행위>`
7. carry-over 22 TaskList API 휘발성 — dev doc + 워커 보고 fallback
8. **Decisions Made 후보** 즉시 dev doc §11 에 메모 (워커가 결정 즉시)
9. **3 frozen decisions 미리 박힘**: D-S5-recall-source-priority / D-S5-protocol-concept-edge-migration / D-S5-receipt-threshold-recovery

## 7. Interfaces / Contracts
*(라이브 갱신)*

### engine T1 + T1.5 + T3 — protocol 시그니처 + hyperRecall + recall 합집합 (2026-04-29 진행)

**T1 — protocol RecallSource 6 종 + 3 신규 source 타입 (PASS)**:
```ts
// packages/protocol/src/recall.ts
export type RecallSource =
  | 'semantic' | 'co_occur' | 'mixed'
  | 'bridge'   | 'temporal' | 'domain_crossing';

export type RecallCandidate = { conceptId, label, score, source: RecallSource };  // Sprint 4 동결 시그니처에 source 만 enum 확장.
export type BridgeCandidate          = { conceptId, label, score, source: 'bridge',          viaConceptId,    depth };
export type TemporalCandidate        = { conceptId, label, score, source: 'temporal',        windowMs,        coDecidedIds: string[] };
export type DomainCrossingCandidate  = { conceptId, label, score, source: 'domain_crossing', edgeKindFrom: EdgeKind, edgeKindTo: EdgeKind };
```

**T1.5 — protocol Concept/GraphEdge 이전 (PASS)**:
```ts
// packages/protocol/src/concept.ts (신규)
export type EdgeKind = 'co_occur' | 'semantic';                 // 단일 정의 (recall.ts 가 import + re-export)
export type Concept   = { id, label, kind?, embedding?: number[], createdAt };  // D-S5-concept-createdAt-retain (CONFIRM v2026-04-29)
export type GraphEdge = { fromId, toId, kind: EdgeKind, weight };               // D-S5-graph-edge-field-naming
```

`packages/engine/src/types.ts` 는 protocol re-export shim (D-S5-engine-types-thin-shim) — 외부 (mobile/design-system) 의 `from '@synapse/engine'` import 호환 유지 + engine 내부는 protocol 직접 import.

**T3 — engine hyperRecall.ts 신규 + recall.ts 합집합 (PASS)**:
```ts
// packages/engine/src/hyperRecall.ts (신규)
export type HyperTraverseHit = { id, label, weight, kind: EdgeKind };
export type HyperTraverseFn  = (db, conceptId, depth) => Promise<HyperTraverseHit[]>;

export const DEFAULT_BRIDGE_DEPTH        = 2;
export const DEFAULT_BRIDGE_MAX          = 5;
export const DEFAULT_TEMPORAL_WINDOW_MS  = 24*60*60*1000;
export const DEFAULT_KIND_WEIGHT         = { co_occur: 0.5, semantic: 1.0 };

export async function bridgeCandidates(seedId, opts: {db, traverse, depth?, maxBridges?})         : Promise<BridgeCandidate[]>;
export async function temporalCandidates(opts: {db, recentDecisions, windowMs?, resolveLabel?}) : Promise<TemporalCandidate[]>;
export async function domainCrossingCandidates(seedId, opts: {db, traverse, kindWeight?})         : Promise<DomainCrossingCandidate[]>;
```

- **bridge**: BFS depth=2 default. 1-hop 이웃 N1 의 1-hop 이웃 - {seed} - N1. score = max(weight*weight) over multi-path. via = max-path 의 매개 노드. tiebreak = score desc + conceptId asc.
- **temporal**: windowMs default 24h (cutoff = max(decided_at) - windowMs). hit count → score (1→0.4, 2→0.7, 3+→0.9). coDecidedIds = 같은 row 의 다른 conceptId 합집합 (sorted asc). label = `resolveLabel?.(id) ?? id` (carry-over 10 fallback).
- **domain_crossing**: seed 의 1-hop 중 두 EdgeKind (`co_occur`+`semantic`) 모두 hit 노드 추출. score = `co_w*kindWeight.co_occur + sem_w*kindWeight.semantic`. 동일 kind 다중 hit → max weight.

```ts
// packages/engine/src/recall.ts 신규 DI 옵션 (시그니처 동결 + 추가 only)
export type RecallCandidatesOptions = {
  db, embed?, nearest?, traverse?, semanticThreshold?, k?,
  hyperTraverse?: HyperTraverseFn,                // bridge + domain_crossing 활성 트리거
  recentDecisions?: RecallLogRow[],               // temporal 활성 트리거
  bridge?: BridgeFn, temporal?: TemporalFn, domainCrossing?: DomainCrossingFn,  // DI override
};
```

- 합집합 정렬 [FROZEN D-S5-recall-source-priority]: `SOURCE_PRIORITY = {mixed:0, semantic:1, co_occur:2, bridge:3, temporal:4, domain_crossing:5}`, secondary = score desc.
- dedup conceptId — 두 source hit 시 `source='mixed'` + `score=max` (Sprint 4 패턴 보존).
- seed = semantic-hit conceptIds (merged 의 'semantic'/'mixed' source).

### engine ↔ storage interface gap (호출처 책임 — T5/T6)
storage T2 의 `traverse(db, id, depth) → {conceptId, weight, kind}[]` 와 engine `HyperTraverseFn` 의 `{id, label, weight, kind}` 시그니처 불일치 → **conversation T5 또는 mobile T6 에서 adapter** 로 label 주입 필요. Sprint 4 carry-over 10 패턴: `label = labelLookup(conceptId) ?? conceptId` fallback.

### storage T2 — traverse(db, id, depth ≥ 2) BFS (2026-04-29 완료)

**파일**: `packages/storage/src/repo/graph.ts`, `packages/storage/__tests__/traverse.test.ts`. (`packages/storage/index.ts` 의 EdgeKind re-export 갱신은 T1.5 가 처리 완료.)

**시그니처 (Sprint 4 회귀 0 + D-S5-storage-label-expose ACCEPT 라벨 확장)**:
```ts
import type { EdgeKind } from '@synapse/protocol';

// [D-S5-storage-label-expose ACCEPT v2026-04-29] label 직접 노출 — chatStore adapter fallback 제거 (carry-over 10 해소).
export type TraverseHit = {
  conceptId: string;
  label: string;
  weight: number;
  kind: EdgeKind;
};

export type TraverseOptions = { maxDepth?: number };

const DEFAULT_MAX_DEPTH = 3;

// sync, native — chatStore/conversation 어댑터가 engine HyperTraverseFn (async) 로 흡수.
export function traverse(
  db: Database,
  conceptId: string,
  depth: number = 1,
  opts?: TraverseOptions,
): TraverseHit[];
```

**알고리즘**:
- **depth=1**: SQL UNION ALL (Sprint 4 동결, 회귀 0). `traverseOneHop` private 헬퍼로 추출 — depth ≥ 2 BFS 도 같은 헬퍼 재사용 (코드 중복 0).
- **depth ≥ 2**: BFS — `visited: Set<string>` (seed 자기 자신 초기 등록) + `frontier: string[]`. 각 hop 마다 frontier 의 1-hop 이웃 조회, visited 가 아닌 이웃만 결과 + 다음 frontier 추가. 빈 frontier 시 조기 종료.
- **가장 짧은 경로 우선**: visited Set 이 같은 conceptId 의 hop ≥ 2 등장을 자동 무시 → hop 1 의 weight/kind 보존.
- **default `maxDepth = 3`**, `opts.maxDepth` 로 override. depth ≥ 4 또는 multi-hop bridge 는 Sprint 6+.
- **silent fallback 절대 X** (`D-S4-storage-traverse-depth-throw` 헌법 그대로):
  - `depth ≤ 0` → `Error("traverse: depth=N not supported (must be >= 1)")`.
  - `depth > maxDepth` → `Error("traverse: depth=N exceeds maxDepth=M")`.

**EdgeKind 출처**: `import type { EdgeKind } from '@synapse/protocol'` (T1.5 D-S5-engine-types-thin-shim 적용 후 protocol 단일 출처).

### designer T7 — InspectorList source-pill 5+ 종 (2026-04-29 완료)

**파일**: `packages/design-system/src/components/InspectorList.tsx`, `packages/design-system/src/components/index.ts`, `packages/design-system/__tests__/recall.test.ts`.

**시그니처 추기**:
```ts
export type InspectorSource =
  | 'semantic' | 'co_occur' | 'mixed'
  | 'bridge' | 'temporal' | 'domain_crossing';

export interface InspectorRow {
  id: string;
  label: string;
  decided_at: number;
  act: InspectorAct;
  source?: InspectorSource;   // [Sprint 5 T7 신규] optional, default 'semantic'
}

export const InspectorListMotionTokens = ['nodeOrbit', 'threadDraw', 'synapsePulse'] as const;
```

**시각/모션 매핑** (디자인 목업 InspectorScreen 의 kind 라벨 슬롯 1:1 재해석):
| source | 라벨 색 | 추가 모션 |
|---|---|---|
| semantic / co_occur / mixed | synapse-deep (Sprint 4 그대로) | 0 (Sprint 4 회귀 0) |
| bridge | synapse (amber) | thread-draw 단발 stroke (좌→우 14px) |
| temporal | ink-mute (ink secondary) | node-orbit 회전 dot (반복) |
| domain_crossing | synapse (amber) | synapse-pulse 호흡 dot (반복) |

**accessibilityLabel hooks** (mobile / e2e 가 source-pill 분기 검증 시 사용):
- 라벨: `source-{semantic|co_occur|mixed|bridge|temporal|domain_crossing}`
- 모션: `motion-thread-draw` / `motion-node-orbit` / `motion-synapse-pulse`

**카피**: `copy.ts` 갱신 0 — 디자인 목업 content.jsx 에 source 분기 라벨 자체가 없어 "디자인 목업에 없는 카피 추가 금지" 헌법 (`D-S4-design-system-single-copy-file`) 그대로. SOURCE_LABELS_KO 는 컴포넌트 내부 상수 ('의미'/'동시'/'복합'/'다리'/'시기'/'교차'). verify-copy ok=13 유지 (Sprint 4 기준).

## 8. Test Scenarios
*(라이브 갱신)*

### engine T1 + T1.5 + T3 — protocol 19 + engine 60 PASS (2026-04-29)

**protocol 19 PASS** (Sprint 4 7 + T1 6 + T1.5 5 + 추가 1):
- T1 신규: 6-source enum / EdgeKind 2-narrow / Bridge·Temporal·DomainCrossing shape / 3 specialized assignable to RecallCandidate.
- T1.5 신규: Concept `{id, label, createdAt}` 필수 / Concept `kind?` + `embedding?: number[]` 옵션 / GraphEdge `{fromId, toId, kind, weight}` / GraphEdge.kind 2-narrow / EdgeKind concept↔recall import 정합.

**engine 60 PASS** (Sprint 4 26 + buildEdges +1 (T1.5) + types 일괄 재작성 5 + hyperRecall 19 신규 + recall integration 3 신규):
- hyperRecall 19: bridge (A→B→C, 1-hop 제외, seed self-loop 제외, depth<2 → [], multi-path max + via, maxBridges cap + tiebreak, empty 1-hop) / temporal (empty → [], single coDecided + score 0.4, hit 누적 stepwise, windowMs cutoff, resolveLabel fallback / 주입) / domain_crossing (두 kind 모두 hit + 비대칭 score, 한 kind hit 제외, kindWeight override, seed 자기 제외, 동일 kind 다중 hit max) / defaults exposure.
- recall integration 3: DI override → bridge candidate 결과 포함 / source priority `mixed > semantic > co_occur > bridge > temporal > domain_crossing` / 같은 conceptId 두 source hit → mixed + max score.

**conversation 30 PASS, design-system PASS** (T1.5 의 GraphEdge 필드명 변경에도 회귀 0).

### storage T2 + label-expose ACCEPT — storage test 33 PASS (Sprint 4 26 + traverse 신규 7 - depth=2 throw 1 + label 신규 1 = 33) — 2026-04-29

신규 7 case (`packages/storage/__tests__/traverse.test.ts`):
1. `depth=2 BFS — A-B-C chain → seedA → {B (hop1), C (hop2 via B)}` — 매개 노드 B 통한 C 발견 + weight/kind 정확.
2. `depth=2 가 depth=1 의 superset (cycle 없는 그래프)` — 4-노드 트리 (A-B, A-C, B-D) 에서 depth=1={B,C}, depth=2={B,C,D} 검증.
3. `가장 짧은 경로 우선 — 같은 노드가 hop1/hop2 모두에서 도달 가능 시 hop1 보존` — A-B 직접(0.9, co_occur) + A-C-B 경유(0.1, semantic) 시 B 의 hop1 weight/kind 보존.
4. `cycle 가드 — A-B-A 같은 cycle 에서 무한 루프 0` — 삼각형 cycle (A-B-C-A) + depth=3 호출에서 무한 루프 없이 종료, 각 노드 1번씩만.
5. `depth ≤ 0 throw (silent fallback X)` — depth=0, depth=-1 모두 throw + 메시지 정합.
6. `depth > maxDepth throw — default maxDepth=3` — depth=4, depth=10 모두 throw.
7. `opts.maxDepth override — maxDepth=2 면 depth=3 throw` + `maxDepth=2 + depth=2 통과` — 옵션 override 작동.

제거 1 case: `depth=2 throw (Sprint 4 = depth=1 only)` — 의미 변경 (BFS 활성). 동일한 throw 헌법은 신규 case 5+6 가 흡수.

**회귀 0**: 기존 6 traverse case + 19 다른 storage case 전체 통과 (from_id/to_id/양방향/self-loop/빈 그래프/edges 무관/kind 보존). depth=1 결과/시그니처 동결 검증.

**typecheck**: `pnpm --filter @synapse/storage exec tsc --noEmit` PASS.

### orchestrator T4 — orchestrator test 35 PASS (Sprint 4 25 + 신규 10) — 2026-04-29

**파일**: `packages/orchestrator/src/decide.ts` 갱신, `packages/orchestrator/__tests__/decide.test.ts` 갱신.

**시그니처 동결**: `decide(ctx: DecideContext): DecisionAct` (4 원 enum 그대로). `applySilence` Sprint 4 동결, 변경 0. `types.ts` re-export 패턴 그대로.

**구현 요약**:
- `WEAK_SOURCES = new Set<RecallSource>(['bridge', 'temporal', 'domain_crossing'])` 상수 추기.
- `decide()` 단일 pass 로 maxScore + maxIsWeakOnly 동시 계산. 동일 max score 의 strong source 가 같이 존재할 때 maxIsWeakOnly=false (strong 가중 — 약화 면제).
- `tokenContext > 2000` / `recencyMs < 1500` / `maxIsWeakOnly` 3 약화 조건 모두 `WEAKEN[act]` 1 줄로 처리 (silence self-loop 자동 흡수).

**신규 10 case**:
1. `weak source bridge max → strong→suggestion` (1 단계 약화)
2. `weak source temporal max → suggestion→ghost`
3. `weak source domain_crossing max → ghost→silence`
4. `strong + weak (max=strong) → strong 가중 (약화 면제)`
5. `strong + weak (tie at max=0.85) → strong 가중 (약화 면제)`
6. `weak max + tokenContext>2000 stack → strong→ghost (2 단계)`
7. `weak max + tokenContext + recencyMs all stack → strong→silence (3 단계)`
8. `mixed source counts as strong (no weak weakening)`
9. `co_occur source counts as strong (no weak weakening)`
10. `4-원 enum drift guard — only silence/ghost/suggestion/strong returned`

**회귀 0**: Sprint 4 25 case + applySilence 11 case 전체 PASS. boundary (tokenContext=2000, recencyMs=1500) 정확. silence self-loop 정확 (`WEAKEN[silence]=silence`).

**typecheck**: `pnpm --filter @synapse/orchestrator exec tsc --noEmit` PASS. monorepo (orchestrator/conversation/engine) typecheck 0.

### designer T7 — design-system test 56 PASS (Sprint 4 50 + 신규 6) — 2026-04-29

신규 6 case:
1. `InspectorSource 6 종 = protocol RecallSource 6 종 (raw text 정합 가드)` — fs 매칭으로 InspectorList.tsx 와 protocol/recall.ts 에 동일 6-string 박힘 검증.
2. `InspectorSource union 이 protocol 외 source 키워드 누설 0 (drift guard)` — InspectorSource union 블록 추출 후 6 종만 박힘 + protocol 정합 재확인.
3. `InspectorRow 가 source?: InspectorSource optional 필드 노출` — D-S5-InspectorList-source-field 박힘 검증.
4. `InspectorList 의 source 분기 모션 4 종 모두 박힘` — motion.threadDraw / nodeOrbit / synapsePulse + accessibilityLabel hook 3 종 raw text 검증.
5. `InspectorList 의 source-pill accent 매핑 헌법` — sourceAccent 함수 + temporal/bridge/domain_crossing case 라벨 박힘 검증.
6. `InspectorListMotionTokens 가 nodeOrbit + threadDraw + synapsePulse 3 종 노출` — token export 정확히 3 종.

`SURFACE_MOTION_TOKENS.inspector` Sprint 4 `['nodeOrbit']` → Sprint 5 `['nodeOrbit', 'threadDraw', 'synapsePulse']` 갱신.

**verify-copy.mjs ok=13, exit 0** (Sprint 4 기준 유지).

**typecheck**: `pnpm --filter @synapse/design-system typecheck` PASS.

## 9. Demo Script
**Sprint 5 receipt 재현 (Ollama UP 모드)** — 40 단계 일괄 검증:
```bash
bash scripts/receipt/sprint-5.sh
```
기대 출력 = `✅ Sprint 5 receipt PASSED` (단계 [33] traverse-depth, [34] bridge=1 via=B, [35] temporal=3 top=x score=0.7, [36] domain_crossing=1 score=1.25, [37] 임계 회복 chunks≥5/length≥10/nearest≥2/recall≥3/bridge≥1/temporal≥1, [38] DecisionAct drift, [39] lint 3종, [40] 통합 e2e candidates≥3 + temporal≥1).

**SKIP_OLLAMA=1 모드** (단계 [40] 통합 e2e skip):
```bash
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-5.sh
```

**모바일 4 화면 시각 검증 (디자인 목업 정합)**:
1. `pnpm --filter @synapse/mobile run web` → Chat 화면: 사용자 turn → ghost/suggestion/strong recall 표시 (source-pill 6종 시각 분기 활성: semantic / co_occur / mixed / bridge / temporal / domain_crossing).
2. Inspector 화면: `getRecentDetailed(24h)` → row 별 top candidate 의 source 시각 표시 (디자인 목업 InspectorRow 정합).
3. Library 화면: chat/inspector 와 별도 흐름, Sprint 4 회귀 0.
4. Onboarding: 영향 0 (Sprint 1 동결).

**단위 검증 (재현성)**:
```bash
pnpm test                                        # 모노레포 242 PASS, 0 fail (3x 연속)
pnpm --filter @synapse/storage test              # storage 33 PASS (5x 연속, secondary sort)
```

## 10. Implementation Map
**packages/protocol** (T1, T1.5):
- `src/recall.ts` — `RecallSource = 'semantic'|'co_occur'|'mixed'|'bridge'|'temporal'|'domain_crossing'` 6-string union, `RecallCandidate.source: RecallSource`, `BridgeCandidate / TemporalCandidate / DomainCrossingCandidate` 3 신규 타입 + `RecallLogRow.candidate_ids` 평탄.
- `src/concept.ts` — `Concept = {id, label, kind?, embedding?, createdAt}` + `GraphEdge = {fromId, toId, kind: 'co_occur'|'semantic', weight}` + `EdgeKind` 2종 — engine→protocol 이전 (carry-over 7 잔여 1-stage 마무리).
- `__tests__/recall.test.ts` 19 PASS (Sprint 4 그대로 + 3 신규).

**packages/storage** (T2, label-expose, determinism):
- `src/repo/embed.ts` — `NearestConcept = {id, label, score}` 시그니처 확장 + SQL `SELECT c.id, c.label, v.distance` (기존 JOIN 활용) + `ORDER BY v.distance ASC, c.id ASC` (D-S5-storage-nearest-label-determinism secondary sort).
- `src/repo/graph.ts` — `traverse(db, conceptId, depth=1, opts?: {maxDepth?})` BFS + visited Set + cycle 가드 + `maxDepth=3` default (override 가능, depth ≤ 0 || depth > maxDepth → throw). `TraverseHit = {conceptId, label, weight, kind}` (label JOIN concepts.label SELECT 양쪽 UNION ALL). `traverseOneHop` 헬퍼 — depth=1 SQL + depth ≥ 2 BFS 재사용.
- `__tests__/{embed,graph,traverse}.test.ts` 33 PASS (Sprint 4 26 + 신규 7).

**packages/engine** (T3):
- `src/hyperRecall.ts` (신규) — `bridgeCandidates / temporalCandidates / domainCrossingCandidates` 3 함수, `HyperTraverseFn / HyperTraverseHit / BridgeCandidatesOptions / TemporalCandidatesOptions / DomainCrossingCandidatesOptions` 5 타입, `DEFAULT_BRIDGE_DEPTH=2 / DEFAULT_BRIDGE_MAX=5 / DEFAULT_TEMPORAL_WINDOW_MS=24h / DEFAULT_KIND_WEIGHT={co_occur:0.5, semantic:1.0}` 4 default.
- `src/recall.ts` — `recallCandidates` 합집합 정렬 = primary source enum order + secondary score desc, `BridgeFn / TemporalFn / DomainCrossingFn` 3 신규 DI 타입.
- `src/types.ts` — protocol re-export shim (`Concept / GraphEdge / EdgeKind`), 런타임 0.
- `index.ts` (root) — 11 신규 export 추가 (D-S5-engine-root-index-hyperrecall-export).
- `__tests__/{hyperRecall,recall,buildEdges,extractConcepts,embed}.test.ts` 60 PASS.

**packages/orchestrator** (T4):
- `src/decide.ts` — `WEAK_SOURCES = {bridge, temporal, domain_crossing}` 1-단계 추가 약화 (기존 WEAKEN map 재사용). max-score entry 의 source 가 weak + strong source 동률 없을 때만 약화.
- `__tests__/decide.test.ts` 35 PASS (Sprint 4 25 + 신규 10 boundary).

**packages/conversation** (T5):
- `src/loop.ts` — Sprint 4 Recall hook (§183~189) + `runRecallHook` 본체 (§215~248) 활성화 (주석 정제만). 시그니처 / 호출 위치 변경 0. RecallFn / DecideFn / RecallStore / RecallHookDeps 동결 100%.
- `__tests__/loop-recall.test.ts` 33 PASS (Sprint 4 30 + 신규 3 — bridge/temporal/domain_crossing source push, 3 source 동시 임계 회복, RecallSource 6 enum drift).

**apps/mobile** (T6):
- `src/recallStore.{ts,web.ts}` — `getRecentDetailed(withinMs, now?): {row, candidates}[]` 신규 export (carry-over 5 platform-adapter 세 번째 시범).
- `src/chatStore.{ts,web.ts}` — recall adapter 에 `hyperTraverse` (kind 보존) + `recentDecisions: recallStore.getRecent(24h)` (매 호출 fresh) 신설. `label: h.label` 직접 사용 (storage label-expose 흡수, carry-over 10 해소). web demo `DEMO_SOURCE_CYCLE` 6종.
- `app/inspector/index.tsx` — `rowsFromDetail` (row + candidates 짝) → `top.label / top.source` join + cold start fallback chain `top.label ?? row.candidate_ids[0] ?? row.act`.
- 검증 = `pnpm --filter @synapse/mobile run build` exit 0, web bundle better-sqlite3/sqlite-vec 0 hits.

**packages/design-system** (T7):
- `src/components/InspectorList.tsx` — `InspectorSource` 6-string union 자가 선언, `InspectorRow.source?: InspectorSource` optional 필드 (default 'semantic' fallback), source-pill 6종 시각 분기.
- `__tests__/InspectorList.test.ts` 56 PASS (Sprint 4 그대로 + 신규).

**scripts/receipt** (T8, tester):
- `sprint-5.sh` — Sprint 4 32 단계 wrap + Sprint 5 신규 8 단계 (총 40 단계). SKIP_OLLAMA=1 + SKIP_SPRINT1_E2E=1 호환.
- `.receipt-runner/sprint5-traverse-depth.mjs` — depth=1↔2 superset, cycle 0, maxDepth throw 검증.
- `.receipt-runner/sprint5-bridge.mjs` — stub TraverseFn, 3-noun A-B-C → seedA → bridge=C.
- `.receipt-runner/sprint5-temporal.mjs` — graph 비의존, 24h 윈도우 + scoreFor 정규화.
- `.receipt-runner/sprint5-domain-crossing.mjs` — stub TraverseFn, 두 kind 비대칭 score.
- `.receipt-runner/sprint5-recall-hyper.mjs` — 통합 e2e (recallCandidates + hyperTraverse + recentDecisions, graph-외 합성 conceptId `hyper-temp-x/y/z` 패턴).
- 5 fixture 모두 workspace 패키지 (D-S4-receipt-runner-workspace-package), 5 deps (storage/engine/orchestrator/conversation/protocol) 재사용.

## 11. Decisions Made / Open Issues
**Decisions Made:**
- **[FROZEN v2026-04-29 D-S5-recall-source-priority]** **`recallCandidates` 의 합집합 정렬 = primary source enum order (`mixed > semantic > co_occur > bridge > temporal > domain_crossing`), secondary score desc**. dedup conceptId 단일 — 두 source 모두 hit 시 source='mixed' + score=max. 사유: Sprint 4 의 `mixed > semantic > co_occur` 패턴 보존 + 신규 source 후순위 (덜 검증된 source 가 강한 source 를 가리지 않도록). score 기반 동등 처리 거절 사유 = 결정성 약화 (같은 score 시 비결정성 발생, 단위 테스트 안정성 저하).
- **[FROZEN v2026-04-29 D-S5-protocol-concept-edge-migration]** **본 sprint 안에 `Concept` / `GraphEdge` / `EdgeKind` 의 protocol 이전 (carry-over 7 잔여 1-stage 마무리)**. T1.5 활성. 사유: Sprint 4 carry-over 7 / 12 / Open Issue #1 (chatStore implicit any 5 건) 의 누적 약속 + retrospective "다음에 다르게 할 것" #4 + Sprint 4 의 4 타입 이전 패턴 입증. Sprint 6 위임 거절 사유 = 부채 적층 + Sprint 5 의 hyperRecall 이 protocol Concept/GraphEdge 를 어차피 import (engine/storage type-only cyclic 자연 해소 지점).
- **[FROZEN v2026-04-29 D-S5-receipt-threshold-recovery]** **임계 회복 = `chunks ≥ 5 length ≥ 10 + nearest ≥ 2 + recall_candidates ≥ 3 + bridge_candidates ≥ 1 + temporal_candidates ≥ 1`**. fixture 결정성 정책 (`semanticThreshold: -1` 또는 production 정합) carry-over 9 패턴 그대로. 사유: Sprint 4 실측 (`chunks=10 length=22 ms=738 / nearest=3 / recall_candidates=6`) 위 보수 회복 — 실측의 절반 ~ 60% 수준. 더 공격적 회복 (예: `recall_candidates ≥ 5`) 거절 사유 = Sprint 5 의 신규 source 가 fixture 그래프 작은 케이스에서 항상 만족 보장 X.
- **[FROZEN v2026-04-29 D-S5-concept-createdAt-retain]** **T1.5 protocol `Concept` 시그니처는 `{id, label, kind?, embedding?: number[], createdAt}`** (task subject 의 `Concept = {id, label, kind?, embedding?: number[]}` 에 `createdAt: number` 보존). 사유 = SoT 헌법 1번 `code > task subject > dev doc [FROZEN] > inbox > draft` 적용: 기존 engine `Concept` 가 `createdAt` 사용 + 12 호출처 (storage repo, conversation loop, mobile chatStore.web, conversation tests, engine tests) 가 `createdAt` 직접 주입 중. createdAt 을 protocol 에 포함시키면 시그니처 변경 0 + 이전의 본의 ("engine→protocol 위치 이동") 100% 보존. **team-lead CONFIRM v2026-04-29** — SoT 헌법 정확 적용 인지.
- **[FROZEN v2026-04-29 D-S5-storage-appendConcept-createdAt-split (SUPERSEDED)]** SUPERSEDED v2026-04-29 by **D-S5-concept-createdAt-retain** (team-lead CONFIRM, SoT 헌법 우선 적용). split 의 거절안 (1-arg `Concept & createdAt`) = retain 채택 / split 거절 사유 = SoT 헌법 1번 `code > task subject` 적용으로 12 호출처 churn 우회. 이전 split 적용 코드/테스트 변경은 본 supersede 와 함께 일괄 revert 완료 (engine 워커 책임). lint 헌법 정합 — strikethrough 제거 + ID 안 `(SUPERSEDED)` 박음, frozen-flag-audit.sh 정규식 `^- \*\*\[FROZEN v<date> <id>\]\*\*` 그대로 매칭. Sprint 6+ 가 lint 정규식을 `(FROZEN|SUPERSEDED)` 확장 시점에 본 prefix 형태도 검토 가능.
- **[FROZEN v2026-04-29 D-S5-graph-edge-field-naming]** **T1.5 `GraphEdge` 시그니처는 `{fromId, toId, kind: 'co_occur'|'semantic', weight}`** (task subject 그대로). 사유 = 기존 `from/to` (engine types) 가 storage schema column `from_id/to_id` 와 명명 어긋나 storage repo 매번 매핑 — task subject 의 `fromId/toId` 가 storage 와 정합. ~6 호출처 (buildEdges, conversation loop, conversation test, storage test, traverse test) 일괄 변경. (`EdgeKind` 4 종 → 2 종 좁힘은 task subject 그대로; engine types `bridge/temporal` 사용처 0 — 단지 type-level 미사용 enum 항.)
- **[FROZEN v2026-04-29 D-S5-engine-types-thin-shim]** **`packages/engine/src/types.ts` 는 protocol re-export shim 으로 축소** (`export type { Concept, GraphEdge, EdgeKind } from '@synapse/protocol'` + `RecallReason/RecallCandidate` 는 engine-only 라 protocol 로 안 옮김 — Sprint 5 합집합 RecallCandidate 는 protocol RecallCandidate 직접 사용). 사유 = engine/index.ts 가 외부에 `Concept` 등을 노출 (mobile/design-system/storage 가 `from '@synapse/engine'`로 import 중 ~9 호출처) — 일괄 import 경로 변경 비용 vs. shim 유지 비용. shim 은 *type-only* (런타임 0). engine 자체 모듈은 protocol 직접 import.
- **[FROZEN v2026-04-29 D-S5-engine-root-index-hyperrecall-export]** **T3 후속 잔여 해소 — `packages/engine/index.ts` (root) 에 hyperRecall 3 함수 (`bridgeCandidates/temporalCandidates/domainCrossingCandidates`) + 4 default (`DEFAULT_BRIDGE_DEPTH/DEFAULT_BRIDGE_MAX/DEFAULT_TEMPORAL_WINDOW_MS/DEFAULT_KIND_WEIGHT`) + 5 type (`HyperTraverseFn/HyperTraverseHit/BridgeCandidatesOptions/TemporalCandidatesOptions/DomainCrossingCandidatesOptions`) + recall.ts Sprint 5 신규 3 DI type (`BridgeFn/TemporalFn/DomainCrossingFn`) re-export 추기**. 사유 = T3 보고 ("engine/index.ts 갱신 추가") misreport — 실제 root index 미edit. tester (T8) 의 `import { bridgeCandidates } from '@synapse/engine'` 시도 시 untype/undefined → fixture 작성 차단. SoT 헌법 #3 (`code > task subject > dev doc [FROZEN] > inbox > draft`) 적용: task subject (#51) + dev doc §3/§5 가 root re-export 명시 → code 가 정합되어야 함 = directive 적용. 검증 = engine 60 tests PASS / `tsc --noEmit` 0 errors / `node --experimental-strip-types` 동적 import 11 export 노출 확인. **engine 워커 회고**: 보고 시 *grep 검증* 단계 누락 — 다음 sprint 부터 root index 변경 보고 직전 `grep -n "<신규 export>" <root index>` 1 회 의무.
- **[FROZEN v2026-04-29 D-S5-design-system-source-string-union]** **`packages/design-system/src/components/InspectorList.tsx` 의 `InspectorSource` 는 protocol `RecallSource` 와 동일한 6-string union 자가 선언** (protocol 직접 import 안 함). drift 가드는 `recall.test.ts` 가 raw text fs 매칭으로 책임. 사유 = Sprint 4 헌법 ("data 모델 mobile 책임, design-system 은 시각/카피 단일 진실원") + design-system 의 peerDep 변경 0 + .tsx 가 node strip-types 미지원이라 어차피 컴포넌트 import 가 test 에서 안 됨 (raw text 매칭이 자연 fallback). protocol 직접 import 거절 사유 = peerDep 추가가 design-system → protocol 의존 그래프 신규 엣지 발생 + 기존 4 컴포넌트 (Ghost/Suggestion/Strong/Inspector) 가 protocol 의존 0 인 패턴 보존.
- **[FROZEN v2026-04-29 D-S5-orchestrator-decide-hyper-source]** **`decide()` 의 weak source 약화 정책 = 1 단계 추가 약화 (기존 WEAKEN map 재사용)**. `WEAK_SOURCES = {bridge, temporal, domain_crossing}`. candidate 의 max score 를 가진 entry 의 source 가 weak 이면 (= 결정에 반영되면) 기존 약화 (tokenContext/recencyMs) 위에 1 단계 추가 약화. 동일 max 를 strong source (mixed/semantic/co_occur) 가 같이 가질 경우 약화 면제 (strong 가중). 4 원 enum (silence/ghost/suggestion/strong) 동결 그대로. 0.4/0.6/0.8 컷 + tokenContext>2000 + recencyMs<1500 약화 Sprint 4 그대로. 거절안 = **임계 +0.05 상향**. 거절 사유: (1) 신규 분기 추가 + 기존 컷 상수 변경 = boundary test 6 종 추가 필요 (결정성 검증 비용 누적), (2) 컷 (0.4/0.6/0.8) 가 Sprint 4 receipt 의 단일 진실원으로 박혀 있어 임계 변경 시 회귀 위험, (3) 1 단계 약화 채택 시 `WEAKEN[act]` 1 줄로 끝나며 `silence` self-loop 자동 처리 (boundary 자연 흡수). 결정성/단순성/회귀 안정성 3 면 모두 1 단계 약화가 우월. 검증: orchestrator 35/35 PASS (Sprint 4 25 + 신규 10), monorepo typecheck 0.
- **[FROZEN v2026-04-29 D-S5-InspectorList-source-field]** **`InspectorRow` 에 `source?: InspectorSource` optional 필드 추가** (default 미설정 시 'semantic' 폴백). mobile T6 가 chatStore 에서 RecallLogRow → top candidate.source join 하여 row 에 채우면 source-pill 5 종 시각 분기 활성. 미넘김 시 semantic 시각 (Sprint 4 회귀 0). 사유 = required 필드는 chatStore 외부 시그니처 동결 (Sprint 1 헌법) 과 충돌 가능 → optional 이 호출자 자유도 + Sprint 4 InspectorRow 호출자 회귀 0. Sprint 4 의 InspectorAct 의 'silence' 가 시각 슬롯에서 그대로 살아있는 패턴과 동일 — InspectorRow 시그니처 *확장* 만 하고 *변경* 0.
- **[FROZEN v2026-04-29 D-S5-storage-traverse-bfs]** **storage `traverse(db, conceptId, depth=1, opts?: {maxDepth?}): TraverseHit[]` 시그니처는 sync + native 동결**. depth=1 = SQL UNION ALL (Sprint 4 그대로, 회귀 0). depth ≥ 2 = BFS (visited Set + frontier, hop 마다 1-hop 헬퍼 재사용, 가장 짧은 경로 우선 — visited 가 hop ≥ 2 등장 무시). default `maxDepth=3`, `opts.maxDepth` override. depth ≤ 0 또는 depth > maxDepth → throw (silent fallback 절대 X — `D-S4-storage-traverse-depth-throw` 헌법). 사유 = (1) sync 유지: stack trace 명확 + Sprint 4 회귀 0 + chatStore 어댑터가 engine `HyperTraverseFn` async 로 흡수 (carry-over 7 패턴, dev doc §7 "engine ↔ storage interface gap" 명시). (2) native `{conceptId, weight, kind}` 유지: engine `HyperTraverseFn` 의 `{id, label, weight, kind}` 와 mismatch 는 어댑터에서 `label = labelLookup(conceptId) ?? conceptId` 로 해소 (carry-over 10). (3) `traverseOneHop` 헬퍼 추출: depth=1 SQL + depth ≥ 2 BFS 가 같은 헬퍼 재사용 → 코드 중복 0. (4) maxDepth=3 default: dev doc §3 명시 + Sprint 6+ 의 multi-hop bridge 가 override 로 확장 가능. depth=1 결과/시그니처 변경 거절 사유 = Sprint 4 회귀 위험 + spawn prompt 시그니처 동결.
- **[FROZEN v2026-04-29 D-S5-T5-conversation-hook-activation]** **conversation `sendStream` 의 Sprint 4 Recall hook 위치 (loop.ts §183~189) + `runRecallHook` 본체 (§215~248) 활성화 = 주석 정제만, 시그니처 / 호출 위치 변경 0**. 본 sprint 의 신규 3 source (bridge/temporal/domain_crossing) 는 `engine.recallCandidates` 가 합집합으로 자동 반환 (D-S5-T3) → conversation hook 은 source-agnostic, `candidates.map(c => c.conceptId)` 로 store 에 그대로 흘려보냄. **추가 hook 박지 않음** (헌법 — 단일 hook 위치). 단위 테스트 3 신규 추가 (`__tests__/loop-recall.test.ts` 끝): (1) 3 신규 source 가 RecallCandidate 통과해 decide ctx + store push 흐름 정상, (2) `recall_candidates ≥ 3 + bridge ≥ 1 + temporal ≥ 1` 동시 통과 (D-S5-receipt-threshold-recovery 분배 확인), (3) RecallSource 6 enum exhaustive switch drift 가드. RecallFn / DecideFn / RecallStore / RecallHookDeps / runRecallHook / runMemoryFormation 시그니처 동결 100%. 검증 = `pnpm --filter @synapse/conversation test` 33/33 PASS (Sprint 4 30 + 신규 3), 3 회 연속 결정성 확인.
- **[FROZEN v2026-04-29 D-S5-recallStore-detailed-getter]** **`apps/mobile/src/recallStore.{ts,web.ts}` 에 신규 export `getRecentDetailed(withinMs, now?): {row: RecallLogRow, candidates: RecallCandidate[]}[]` 추가**. 기존 `push` / `getRecent` / `getLast` / `subscribe` / `recentlyDecided` 시그니처 동결 100%. native + web 짝 그대로 유지 (carry-over 5 platform-adapter 강제 — 세 번째 시범). 사유 = D-S5-InspectorList-source-field 의 row-별 source-pill 5 종 시각 활성을 위해 InspectorScreen 의 `rowsFromLog` 가 row 와 candidates 짝을 함께 받아야 함 (현재 `getRecent` 가 `RecallLogRow[]` 만 반환 → candidates 분실, `getLast` 는 마지막 1 건만). 거절안 B (`subscribe` listener 시그니처 확장) 거절 사유 = Sprint 4 ghost/suggestion/strong 3 화면의 기존 listener 회귀 위험. 거절안 C (row-only id-string 만으로 source lookup) 거절 사유 = `RecallLogRow.candidate_ids` 와 `conceptStore` 모두 source 미보유 (불가). PM APPROVE v2026-04-29 (mobile 단독 영역, HOLD 불요). chatStore wiring (D-S5-chatStore-recall-wiring 확장) 이 push 시점에 candidates 를 함께 전달하므로 native 의 `appendRecallLog` 영속화는 row 만 (Sprint 4 동결), candidates 는 in-memory cache 에만 유지 (앱 재시작 후 cold start 는 row.candidate_ids 만 가용 — Sprint 6+ 가 retention 정책 결정).
- **[FROZEN v2026-04-29 D-S5-storage-label-expose-A]** **PM DECIDE v2026-04-29** — storage `nearestConcepts` / `traverse` 가 label 함께 반환하도록 시그니처 *확장* (기존 호출자 무영향). `NearestConcept = {id, label, score}`, `TraverseHit = {conceptId, label, weight, kind}`. 사유 = dev doc §3 In + carry-over 10 명시 (label 직접 노출) + engine `HyperTraverseFn`/`NearestRecallFn`/`TraverseFn` 의 label 필수 시그니처 정합. 거절안 B (`getConceptLabel(db, id)` helper 신규) 거절 사유 = N+1 SQL ~8 round-trips/turn 비효율. 거절안 C (id-only fallback 유지) 거절 사유 = dev doc 명시 위반 + Sprint 6 부채 적층. 거절안 D (mobile conceptStore label cache) 거절 사유 = cold start 시 cache miss → id 회귀, storage 단일 진실원 손상. 본 결정 적용 책임 = storage 워커 (시그니처 확장 + SQL JOIN concepts.label) + mobile T6 (chatStore adapter `label = h.label` 1 줄 변경). storage 워커 알림 도착 시 mobile RESUME.
- **[FROZEN v2026-04-29 D-S5-storage-label-expose (ACCEPTED-FINAL)]** **storage 워커 옵션 A 적용 → CANCEL → revert → ACCEPT (CANCEL 철회) → re-apply 최종** — 타임라인 충돌 처리. (1) PM DECIDE D-S5-storage-label-expose-A → 본 워커 옵션 A 적용 (storage 33 PASS, 모노레포 242 PASS, ETA 15-20분 → 실측 10분). (2) mobile 워커가 dev doc §7 재해석 후 옵션 C (id-only fallback 유지) 결정 → team-lead CANCEL → 본 워커 즉시 revert (storage 32 PASS 회복, ETA 2분). (3) team-lead 가 옵션 A 적용 결과의 우수성 (10분, 회귀 0) 인지 후 ACCEPT (CANCEL 철회) → 본 워커 즉시 re-apply (storage 33 PASS 재회복, ETA 2분). 최종 적용 = `embed.ts:nearestConcepts` SQL `SELECT c.id, c.label, v.distance` (기존 JOIN 그대로 활용) → `NearestConcept = {id, label, score}`. `graph.ts:traverseOneHop` SQL UNION ALL 양쪽에 `JOIN concepts c ON c.id = e.{to_id|from_id}` 추가 → `TraverseHit = {conceptId, label, weight, kind}`. depth ≥ 2 BFS 도 같은 헬퍼 재사용 → label 자동 흡수 (코드 중복 0). traverse depth=1/2/cycle/maxDepth 알고리즘 동결 그대로 (D-S5-storage-traverse-bfs 영향 0). 신규 unit 1 (`id ≠ label` fixture) + 기존 nearestConcepts case 에 label assert 1 줄 = storage **33 PASS**. 모노레포 **242 PASS, 0 fail**. engine `NearestRecallHit`/`TraverseHit` 시그니처 자연 합치 (이미 label 보유) → engine 측 변경 0. INNER JOIN 사유 = edge → concept 일관성 보장 (실 데이터 부재 거의 없음, FK 미설정이지만 appendConcept → appendEdge 순서 보장). carry-over 10 *실제 해소* — Sprint 6 위임 항목에서 제거. **워커 회고**: 옵션 채택 직렬화 (HOLD-DECIDE-RESUME 헌법 #1) 의 *적용 시점* 이 본 sprint 의 새 학습 — PM DECIDE 즉시 적용 + revert 비용 받아들이는 계약이 multi-writer race 보다 *결과* 우월 (실측: 10분 적용 + 2분 revert + 2분 re-apply = 14분 ≪ 옵션 직렬화 대기 시간 + 실제 적용). 본 sprint 의 carry-over 10 해소 = 옵션 A 적용 + CANCEL → ACCEPT race 의 우연한 결과지만, sprint 5 의 *실제 deliverable* 로 박힘.
- **[FROZEN v2026-04-29 D-S5-mobile-T6-label-fallback-keep (SUPERSEDED)]** SUPERSEDED v2026-04-29 by **D-S5-mobile-T6-label-direct** (PM FLIP — storage 의 옵션 A 적용 → CANCEL → ACCEPT race 결과 옵션 A 가 코드 현실, SoT 헌법 #1). 본 항목은 옵션 C (id fallback 유지) 의 사유/거절안 기록 보존용 — 이하 원문. **PM 재DECIDE v2026-04-29 — 옵션 C 채택 (D-S5-storage-label-expose-A SUPERSEDES)**. id-only fallback **유지**, Sprint 6 carry-over 위임. `chatStore.ts` adapter 의 `label = h.id` (nearestConcepts) / `label = h.conceptId` (traverse, hyperTraverse) 그대로 (Sprint 4 carry-over 10 패턴 보존). 사유 = (1) carry-over 10 본의 = *임시 패턴* — 본 sprint 가 해소 의무 X. (2) dev doc §7 의 fallback 공식화 (`label = labelLookup(conceptId) ?? conceptId`) = 현재 solution 인정 (mobile 의 dev doc §7 재해석 통찰 정확). (3) Synapse concept.id 가 대부분 label string 동등 (사용자 영향 작음). (4) 본 sprint 시간 압박 + 옵션 A 적용 시 race condition 발생 (storage 적용 후 revert 비용 실측). 거절안 A (storage label expose) 거절 사유 = 본 sprint 진행 비용 누적 + race condition 실측. 거절안 B (storage helper N+1) 거절 사유 = SQL N+1 ~8 round-trips/turn 비효율. 거절안 D (conceptStore cold start cache) 거절 사유 = race + 추가 lookup 코드 — 옵션 C 의 단순함을 못 이김. **Sprint 6 carry-over 위임** = (a) "storage label 노출 정식 helper (`SELECT label FROM concepts WHERE id IN (?)` 또는 `nearestConcepts`/`traverse` 시그니처 확장) — Sprint 6 의 forgetting + alias merge 와 함께 검토". (b) "chatStore adapter 의 id fallback 제거 시점 = storage label-expose 와 동기화". carry-over 10 *유지* 명시.
- **[FROZEN v2026-04-29 D-S5-chatStore-hyperTraverse-adapter]** **`apps/mobile/src/chatStore.ts` 의 native recall adapter 에 `hyperTraverse` adapter + `recentDecisions` 주입 신설** — engine `recallCandidates` 의 hyperRecall 합집합 (bridge / temporal / domain_crossing) 활성. `HyperTraverseFn` 시그니처 = `(db, id, depth) → Promise<{id, label, weight, kind}[]>` — `storage.traverse` 가 `label` + `kind` 노출 (D-S5-storage-label-expose) → 그대로 매핑. `recentDecisions` = `recallStore.getRecent(24h)` 매 recall 호출 시점 fresh 평가 (arrow body 호출마다 재평가, 24h = `engine.temporalCandidates` default `windowMs` 정합). RecallFn 외부 시그니처 동결 (Sprint 4 D-S4-chatStore-recall-wiring + Sprint 1 헌법). label 은 storage 직접 노출 (D-S5-mobile-T6-label-direct). 검증 = `pnpm --filter @synapse/mobile run build` exit 0, web bundle (`dist/_expo/static/js/web/entry-*.js`) `better-sqlite3` 0 hits + `sqlite-vec` 0 hits — **carry-over 5 platform-adapter 세 번째 시범 PASS** (chatStore.ts native-only import 확장에도 chatStore.web.ts 가 platform extension 으로 우선되어 web bundle 무영향).
- **[FROZEN v2026-04-29 D-S5-mobile-T6-label-direct]** **PM FLIP v2026-04-29 — 옵션 A 결과 흡수 (D-S5-mobile-T6-label-fallback-keep SUPERSEDES)**. 상황 = storage 워커가 D-S5-storage-label-expose 의 CANCEL → ACCEPT race 끝에 옵션 A 적용 (storage 33 PASS, 모노레포 242 PASS). SoT 헌법 #1 (`code > task subject > dev doc [FROZEN] > inbox > draft`) 에 따라 **코드 현실 = 옵션 A** → mobile 워커가 옵션 C 의 fallback 유지 결정을 옵션 A 의 label 직접 사용으로 *흡수*. 적용 = `apps/mobile/src/chatStore.ts` 의 nearest/traverse/hyperTraverse adapter `label: h.id|h.conceptId` → `label: h.label` (storage 직접 노출). `apps/mobile/src/chatStore.web.ts` 의 demo candidate `label: concept.label` 그대로 (이미 적용됨). carry-over 10 **실제 해소** → Sprint 6 carry-over 후보에서 제거. inspector/index.tsx 의 `top.label ?? row.candidate_ids[0] ?? row.act` chain 그대로 유지 (cold start = candidates 분실 시 candidate_ids 만 남음, 안전 fallback 보존). 검증 = `pnpm --filter @synapse/mobile run build` exit 0, web bundle better-sqlite3/sqlite-vec 0 hits — carry-over 5 세 번째 시범 PASS 그대로. **워커 교훈**: 옵션 채택 직렬화 의 *적용 시점* 이 본 sprint 의 새 학습 — PM DECIDE 즉시 적용 + revert 비용 받아들이는 계약이 multi-writer race 보다 *결과* 우월 (실측: storage 10분 적용 + 2분 revert + 2분 re-apply = 14분, mobile 1 줄 변경 = 5분, dev doc §11 정합 = 10분). SoT 헌법 #1 이 race 해결 도구 — 코드가 진실. 다음 sprint 부터 PM 옵션 결정 *영향 받는 모든 워커* 의 *현 상태 ack 후* 적용 또는 즉시 적용 + revert 비용 명시 계약 권장.
- **[FROZEN v2026-04-29 D-S5-storage-nearest-label-determinism]** **`nearestConcepts` SQL ORDER BY 에 secondary sort `c.id ASC` 추가 — 결정성 보강**. 증상 = tester T8 의 SKIP_OLLAMA=1 모드 `pnpm -r test` 에서 `@synapse/storage` 의 `nearestConcepts returns top-k by descending score` + 간헐 `traverse: TraverseHit 에 concepts 테이블의 label 직접 노출` 1-2건 비결정성 fail (`top[0]?.label === 'one'` expected, undefined). 본 워커 환경 (5x storage isolated + 3x 모노레포 풀) 에서는 *재현 X* — environment-dependent intermittent. 가설 = sqlite-vec MATCH + `ORDER BY v.distance ASC` 단일 키만으로는 floating-point distance tie 시 row 순서 비결정성 (platform CPU/sqlite 빌드/run 마다 다름) → `c.label` JOIN 결과 다른 row 가 top[0] 자리에 들어가 expected 'one' 과 불일치. 해소 = `ORDER BY v.distance ASC, c.id ASC` 로 secondary sort 명시 — id 가 TEXT PK 라 unique 보장 + tie 결정. 적용 위치 = `embed.ts:33` SQL ORDER BY 문 1줄 변경. label expose (D-S5-storage-label-expose) 의도/시그니처 변경 0 — 결정성 보강 only. **검증 (재현 못해도 방어적 수정)**: `pnpm --filter @synapse/storage test` 5x 연속 PASS (33/33), `pnpm -r test` 3x 연속 PASS (모노레포 242/242). carry-over 10 해소 보존 — `NearestConcept = {id, label, score}` 그대로. traverse 측의 SQL UNION ALL 도 동일 패턴 검토했으나 `traverseOneHop` 결과는 score 기반 정렬 X — secondary sort 불필요 (BFS frontier 순서가 visited Set 으로 보호). **워커 학습**: receipt 환경 (Ollama UP) 결정성 ≠ 단위 테스트 환경 (SKIP_OLLAMA=1 + node:test 직렬) 결정성 ≠ tester 환경 결정성. test platform variance 에 대한 방어 = SQL 단일 키 ORDER BY 에 항상 secondary sort 추가. production code 의 SQL 도 동일 패턴 검토 권장 (Sprint 6+).

- **[FROZEN v2026-04-29 D-S5-receipt-recall-hyper-fixture]** **`scripts/receipt/.receipt-runner/sprint5-recall-hyper.mjs` 본 sprint 안 작성** (D-S4-receipt-runner-workspace-package 패턴 그대로). 통합 e2e — `engine.recallCandidates` + `hyperTraverse` adapter + `recentDecisions` 분배 검증. graph-외 합성 conceptId (`hyper-temp-x/y/z`) 패턴 = mergeCandidate dedup 회피하여 temporal source 결과에 살아남도록 — bridge / domain_crossing 은 graph 의존 → 작은 fixture graph 결정성 보장 어려움 → 단계 [34] / [36] 의 stub fixture 가 결정성 검증 책임. 본 fixture 는 *temporal ≥ 1 + candidates ≥ 3* 만 정량 검증. 검증 결과 = candidates=7~9, sources=`mixed:4, temporal:3` (Ollama LLM 변동 영향). 사유 = D-S5-receipt-threshold-recovery 정합 통합 e2e 정량 보강 — Sprint 4 의 단계 [32] 통합 e2e (`recall_candidates ≥ 3`) 위에 hyperRecall 분배 (temporal 살아남) 보강.

## 12. Carry-over + Retrospective
**Carry-over (다음 스프린트가 반드시 알아야 할 것):**
1. **carry-over 5 platform-adapter 패턴 — 세 번째 시범 PASS 후 표준 박힘**: `chatStore.{ts,web.ts}` + `recallStore.{ts,web.ts}` 짝 강제. native-only import 확장 시에도 `.web.ts` extension 우선되어 web bundle 무영향. Sprint 6+ 가 새로 작성하는 store 도 동일 패턴 강제.
2. **mobile package.json workspace deps 5 미명시 (carry-over 12/18 누적)** — `@synapse/{protocol,storage,engine,conversation,orchestrator}` peerDep 또는 dependencies 미선언. `tsc --noEmit` LSP `Cannot find module` 노이즈 발생, build/runtime/receipt 무영향. Sprint 6 또는 Sprint 7 polish 후보.
3. **recallStore in-memory candidates retention** — `getRecentDetailed` 의 candidates 는 in-memory cache 만 — 앱 재시작 후 cold start 시 row.candidate_ids 만 가용. Sprint 6 forgetting + alias merge 정책과 결합하여 retention 정책 확정 권장.
4. **chatStore.web `DEMO_SOURCE_CYCLE` 6종 cycle** — production wiring 으로 전환 시점 = Sprint 7 polish (실 LLM + 실 storage 흐름 도달 시 demo source cycle 제거).
5. **frozen-flag-audit.sh 정규식 일반화 후보** — 본 sprint 5 회 lint blocker 의 근본 원인 = `(SUPERSEDED | CANCELED | ACCEPTED-FINAL)` 표현 free-form. Sprint 6 검토: 정규식 `^- \*\*\[(FROZEN|SUPERSEDED|CANCELED|ACCEPTED) v<date> <id>\]\*\*` 로 alternation 확장. 박힘 시 SUPERSEDED ID 흡수 패턴 (현재 선례) 도 자동 수용.
6. **SQL 단일 키 ORDER BY 결정성 보강** — D-S5-storage-nearest-label-determinism 의 secondary sort 패턴을 `appendRecallLog / recentlyDecidedFor / traverseOneHop / repo의 다른 SQL` 에도 일괄 검토. tester 환경 platform variance 방어. Sprint 6 에 storage 워커가 audit 1 회 권장.
7. **carry-over 10 (storage label 노출 정식 helper) — RESOLVED** ✅. 본 sprint 의 D-S5-storage-label-expose-A → ACCEPT-FINAL 적용으로 해소. `nearestConcepts = {id, label, score}` / `traverse = {conceptId, label, weight, kind}` 단일 진실원. chatStore adapter id fallback 제거 완료.
8. **carry-over 7 (Concept/GraphEdge protocol 이전) — RESOLVED** ✅. T1.5 통해 본 sprint 안 1-stage 마무리. `packages/engine/src/types.ts` thin shim 으로 외부 호출자 회귀 0.
9. **option 직렬화 vs 즉시 적용+revert 비용 모델** — 본 sprint 실측 (storage 10분 적용 + 2분 revert + 2분 re-apply = 14분 ≪ HOLD-DECIDE-RESUME 직렬화 + 적용) 이 *결과* 우월. 다음 sprint 부터 *영향 받는 모든 워커 ack 후 적용* 또는 *즉시 적용 + revert 비용 명시 계약* 권장. 헌법 #1 (HOLD-DECIDE-RESUME) 의 *적용 시점* 갱신 후보.

**Retrospective:**
- **잘 된 것:**
  - hyperRecall 3 알고리즘 (Bridge / Temporal / Domain Crossing) + 합집합 정렬 + decide weak 약화 + receipt 40/40 종단 PASS — Sprint 5 Goal 100% 달성.
  - 7 워커 동시 진행 (engine / storage / orchestrator / conversation / mobile / designer / tester) + 10 task dependency graph (T1→T1.5→T2→T3→T4→T5→T6/T7→T8→T9) 종단 흐름 0 회귀.
  - SoT 헌법 #1 (`code > task subject > dev doc [FROZEN] > inbox > draft`) multi-writer race 해결 도구로 실증 — mobile 워커가 stale URGENT FLIP-2 메시지를 코드 검증으로 무력화 → 헌법 동작 시범 케이스.
  - carry-over 7 + carry-over 10 본 sprint 안 *실제* 해소 (Sprint 6 부채 적층 회피).
  - lint frozen-flag-audit SUPERSEDED ID 흡수 패턴 박힘 — 5 회 blocker 끝에 노하우 표준화 (Sprint 6 정규식 alternation 후보).
  - storage 의 `nearestConcepts` SQL secondary sort `c.id ASC` — 재현 못하는 platform variance 에 대한 방어적 수정 채택, production code SQL audit 모범 사례.
- **아팠던 것:**
  - storage label-expose CANCEL → ACCEPT race (10+2+2분 비용) — team-lead 가 stale 컨텍스트 (storage 의 ACCEPT re-apply 알림 *이전* 시점 기억) 로 mobile 에 URGENT FLIP-2 발송, mobile 워커가 SoT 헌법 #1 검증으로 무력화.
  - tester 5 회 동일 보고 (lint frozen-flag-audit blocker) — team-lead 가 stale inbox 컨텍스트로 응답하다가 5 회째 정규식 분석 + 정확 diff 첨부 후에 직접 검증, 50 분 지연.
  - engine T3 root index re-export misreport — 워커가 "engine/index.ts 갱신 추가" 보고 후 실제 root index 미edit. tester T8 의 `import { bridgeCandidates } from '@synapse/engine'` 시도 차단 → directive 적용으로 해소. 보고 시 *grep 검증* 단계 누락.
  - mobile typecheck 환경 issue (carry-over 12/18) — package.json workspace deps 5 미명시 → LSP `Cannot find module` 5+ 건. build/runtime/receipt 무영향이지만 LSP 환경 노이즈 — 본 sprint 미해소 (Sprint 6 carry-over).
- **다음에 다르게 할 것:**
  - **워커 보고 시 `grep + tsc + test` 3-step 검증 의무화** — 특히 root index / barrel 변경 보고 직전 `grep -n "<신규 export>" <root index>` 1 회 (engine 워커 회고 인용).
  - **team-lead 가 race 발생 시 즉시 `pnpm test` SoT 헌법 #1 적용** — inbox 컨텍스트 보다 코드 우선. 직전 stale 메시지가 inbox 에 남아있어도 *코드 검증* 으로 진실 확정. 본 sprint 회고에서 50 분 지연 사례.
  - **옵션 직렬화 vs 즉시 적용+revert 비용 모델 사례 박음** — multi-writer race 시 즉시 적용 + revert 계약이 14분 (10+2+2) 으로 직렬화 대기 시간 + 실제 적용 보다 우월. Sprint 6 부터 PM 결정 시 *영향 받는 모든 워커 ack 후 적용* 또는 *즉시 적용 + revert 비용 명시 계약* 선택지로 명시.
  - **lint frozen-flag-audit 정규식 일반화** — `(FROZEN|SUPERSEDED|CANCELED|ACCEPTED)` alternation 으로 확장하여 free-form prefix 흡수. Sprint 6 의 첫 작업 후보.
  - **SQL 단일 키 ORDER BY audit** — storage 워커가 production code 의 모든 SQL 에 secondary sort 검토 1 회. Sprint 6 에 추가 task 로 박음.
