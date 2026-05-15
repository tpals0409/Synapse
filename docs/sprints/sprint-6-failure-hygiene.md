# Sprint 6 — Failure & Hygiene

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`

## 1. Goal
사용자가 잘못된 recall 을 거절(Dismiss/Unlink)하고, 시스템이 자체 오답을 회수(Humble Retraction)하며, 시간이 지나면 자연 망각(Forgetting)이 일어나는 — 기억의 *실패와 위생* 루프를 활성화한다.

## 2. Deliverable & Receipt
**Deliverable:**
- **Dismiss/Unlink 액션** — Inspector / Suggestion / Strong UI 의 거절 버튼 → recall_log + concept-edge weight 약화 + 같은 conceptId 재등장 시 score 페널티.
- **Humble Retraction** — LLM 응답 중 사용자가 "아니야 / 그건 다른 얘기" 같은 부정 신호 → 직전 assistant 응답에 `retracted=true` 마킹 + 해당 turn 의 capture 결과 회수.
- **Forgetting 정책** — co_occur weight 의 시간 감쇠 (last_used_at 기반), nearestConcepts MATCH 시점 가중치 적용. 임계 미만 edge 자동 prune.
- **carry-over 처리** — Sprint 5 carry-over 1~6 + 9 (frozen-flag-audit 정규식 일반화 / SQL secondary sort audit / package.json deps 명시 / recallStore retention 등) 본 sprint 안 흡수.

**Receipt (자동 검증 가능한 형태):**
- `bash scripts/receipt/sprint-6.sh` exit 0, "✅ Sprint 6 receipt PASSED".
- Sprint 5 40 단계 wrap (SKIP_OLLAMA / SKIP_SPRINT1_E2E 호환).
- 신규 4~6 단계:
  1. Dismiss/Unlink → recall_log + edge weight 변동 검증 (e2e fixture).
  2. Humble Retraction 부정 신호 패턴 매칭 + assistant row `retracted` 컬럼 검증.
  3. Forgetting 시간 감쇠 (now - last_used_at)→ weight 감소 단조 검증.
  4. Edge prune 임계 미만 자동 삭제 검증.
  5. carry-over 5/6 (lint 정규식 + SQL secondary sort) 흡수 lint PASS.
  6. carry-over 2 (mobile package.json workspace deps 5 명시) tsc PASS.
- 임계 회복 (D-S5-receipt-threshold-recovery 정합 + Sprint 6 신규 임계 보강).

## 3. Scope

**In:**

- **storage schema migration `0005_failure_hygiene.sql`** — `concepts.last_used_at INTEGER NOT NULL DEFAULT 0` 추기, `messages.retracted INTEGER NOT NULL DEFAULT 0` 추기, edges 테이블에 `last_used_at INTEGER NOT NULL DEFAULT 0` 추기, `recall_log.dismissed INTEGER NOT NULL DEFAULT 0` 추기 (or `dismissed_concept_ids TEXT` JSON array). 기존 row default = 0 (silent migration). Sprint 0/1/3/4/5 schema 동결 — 본 sprint 가 처음 추기.
- **storage repo 신규 함수** — `packages/storage/src/repo/{forgetting,retraction,dismiss}.ts` (또는 기존 파일 확장):
  - `decayWeights(db, opts: {now, halfLifeMs}): {decayed: number}` — `last_used_at` 기반 시간 감쇠 (지수 감쇠 또는 선형, /start 결정 → PM HOLD 후보).
  - `pruneEdgesBelow(db, threshold): {pruned: number}` — weight < threshold edge DELETE.
  - `markRetracted(db, messageId): void` — `messages.retracted = 1` UPDATE.
  - `rollbackCaptureForTurn(db, turnId): {rolledback: number}` — turn 단위 capture 결과 (concepts/edges) 회수. concepts 는 hard-delete 또는 soft-delete (turn_id 기반 — schema 추가 결정).
  - `markDismissed(db, recallLogId, conceptIds): void` — recall_log row 갱신 + 해당 edges weight 약화 (`weight *= dismissPenalty`).
  - `recordTouch(db, conceptId, now): void` — `nearestConcepts` MATCH / `traverse` 시점 호출 → `last_used_at = now` UPDATE.
- **storage SQL secondary sort audit (carry-over 6)** — production code 의 모든 SQL `ORDER BY` 단일 키 검토. 부족한 곳에 `, id ASC` 또는 `, decided_at DESC` 일괄 추기. 대상 = `appendRecallLog / recentlyDecidedFor / traverseOneHop / 기타 repo 함수`. **[FROZEN v2026-04-29 D-S6-storage-sql-secondary-sort-audit]**.
- **engine forgetting hook** — `packages/engine/src/recall.ts` 의 `recallCandidates` 가 nearest 호출 시점에 `recordTouch` 호출 (DI 옵션). score 계산에 `last_used_at` 가중치 = `score *= exp(-(now - last_used_at) / halfLifeMs * ln2)` 또는 step function. **[FROZEN v2026-04-29 D-S6-forgetting-policy]** half-life = 7d (PM 결정 후보, default 권장).
- **engine dismiss penalty** — `packages/engine/src/recall.ts` 가 같은 conceptId 의 dismissed 이력 (recall_log 또는 별도 lookup) 있을 때 score 페널티 (`score *= dismissPenalty`, default 0.5). DI 옵션 `dismissedConceptIds?: Set<string>`. orchestrator/conversation 가 호출 시점에 주입.
- **conversation Humble Retraction** — `packages/conversation/src/loop.ts` 에 `detectRetractionSignal(text): boolean` (regex 기반 — `/^(아니|아니야|그건 아니|그건 다른|틀렸|wrong|no that's|not what)/i` 등). `sendStream` 의 user msg append 직후, 직전 assistant msg 가 있고 retraction 신호 hit 시:
  1. `markRetracted(db, prevAssistantMsgId)`.
  2. `rollbackCaptureForTurn(db, prevAssistantMsgId.turn_id)`.
  3. recall_log 의 해당 turn 결정 dismiss 마킹 (optional).
  - 시그니처 동결 (RecallFn / DecideFn / RecallStore / RecallHookDeps / runMemoryFormation 변경 0). 신규 hook = `runRetractionHook` (RecallHook 패턴 따라 옵션 DI). 패턴 매칭 채택 사유 = LLM 분류 거절 사유 (latency + cost + 결정성 약화).
- **orchestrator dismiss action** — `packages/orchestrator/src/decide.ts` 또는 신규 `packages/orchestrator/src/dismiss.ts`. `applyDismiss(decisionId, conceptIds, opts: {markDismissed, decayEdges}): void`. 4 원 enum 동결 그대로 (`act` 확장 절대 X — `dismissed` 부속 컬럼 패턴). recall_log update + edges weight `* 0.5` 약화 dispatch.
- **mobile dismiss UI wiring** — `apps/mobile/app/{inspector,suggestion,strong}/index.tsx` 거절 버튼 (DismissButton 컴포넌트). `chatStore.{ts,web.ts}` `dismiss(decisionId, conceptIds?): Promise<void>` 신규 메서드. retracted 메시지 시각 (취소선 또는 ink-mute). recallStore 의 `getRecentDetailed` candidates 가 dismissed 이력 가지면 시각 분기 (faded). chatStore 외부 시그니처 *확장 only* (기존 변경 0).
- **designer DismissButton + Retracted 시각** — `packages/design-system/src/components/DismissButton.tsx` 신규 (3 화면 공통). `ChatBubble` (또는 동등) 에 `retracted?: boolean` prop 추기 → 취소선 + ink-mute 색. Inspector unlink 아이콘 (디자인 목업 InspectorScreen 의 unlink 슬롯). copy.ts 한/영 ('취소'/'Dismiss', '연결 해제'/'Unlink', '회수됨'/'Retracted').
- **carry-over 5 lint 정규식 일반화** — `scripts/lint/frozen-flag-audit.sh` 정규식 alternation 확장: `^- \*\*\[(FROZEN|SUPERSEDED|CANCELED|ACCEPTED) v<date> <id>\]\*\*`. SUPERSEDED ID 흡수 패턴 자동 수용. **[FROZEN v2026-04-29 D-S6-lint-frozen-flag-audit-regex-alternation]**.
- **carry-over 2 mobile package.json workspace deps 5 명시** — `apps/mobile/package.json` 의 `dependencies` 에 `@synapse/{protocol,storage,engine,conversation,orchestrator}: workspace:*` 5 종 명시. tsc --noEmit `Cannot find module` LSP 노이즈 0 검증.
- **carry-over 3 recallStore retention 정책** — `apps/mobile/src/recallStore.{ts,web.ts}` `getRecentDetailed` 의 in-memory candidates cache 에 `maxEntries` (default 200) 추기. native 의 cold start 시 row.candidate_ids 만 가용 — 본 sprint 는 retention 정책 결정 + 적용 (Sprint 5 carry-over 3 흡수).
- **단위 테스트** — storage `decay/prune/retraction/dismiss/touch` 신규 unit (8+) + engine `recall` forgetting + dismiss penalty 신규 unit (5+) + conversation `loop-retraction.test.ts` 신규 (5+) + orchestrator `dismiss.test.ts` 신규 (4+) + design-system `DismissButton.test.ts` + `Retracted.test.ts` 신규 (3+).
- **receipt 자동화** — `scripts/receipt/sprint-6.sh` Sprint 5 40 단계 wrap (`SKIP_OLLAMA=1` / `SKIP_SPRINT1_E2E=1` 호환) + 신규 4~6 단계 + 임계 보강. `.receipt-runner/sprint6-{dismiss-penalty,retraction-rollback,forgetting-decay,edge-prune,sql-audit}.mjs` 5 신규 fixture.
- **임계 보강 (D-S6-receipt-threshold-recovery)** — Sprint 5 임계 + 신규: `dismiss_decay ≥ 1` (한 번 이상 weight 약화 발생) + `retracted_count ≥ 1` (한 번 이상 retraction) + `pruned_edges ≥ 0` (prune 호출 정상). chunks/length/ms/nearest/recall_candidates/bridge/temporal Sprint 5 그대로.

**Out:**

- **Concept dedup / alias merge** — Sprint 7+. 본 sprint 는 dismiss 가 conceptId 단일 약화만, alias merge 는 별도.
- **LLM 기반 부정 신호 분류** — Sprint 6 패턴 매칭만. LLM 분류는 Sprint 7+ (latency + cost + 결정성 약화 사유).
- **DecisionAct enum 'dismissed' 추가** — 절대 금지. 4 원 (`silence/ghost/suggestion/strong`) 동결. dismissed 는 별도 컬럼/필드.
- **`runMemoryFormation` / `runRecallHook` / `RecallFn` / `DecideFn` 시그니처 변경** — 동결. 변경 필요 시 PM HOLD.
- **chatStore 외부 시그니처 변경 (기존 메서드)** — 동결. 신규 `dismiss` 메서드 *추기 only*.
- **forgetting half-life 외 추가 파라미터 노출** — half-life 만 const. 다중 파라미터 (decay rate / floor) 는 Sprint 7+.
- **edges hard-delete 외 alias 합병** — pruneEdgesBelow 는 hard-delete only. soft-delete + alias 는 Sprint 7+.
- **mockup 표 신규 화면** — Sprint 5 §7.1 표 그대로. DismissButton + Retracted 시각은 Inspector / Suggestion / Strong 기존 화면 *내부* 컴포넌트 추기.
- **다국어 균형 / embedding 모델 어댑터 분리** — Sprint 7.
- **`appendRecallLog` schema 변경 외 retention** — recall_log retention 정책 (e.g. 30d 만 유지) 은 Sprint 7+.
- **Sprint 6 receipt 통과 후 추가 임계 강화** — Sprint 7 결정.

## 4. Architecture & Data Flow

```
[user input]
  → conversation.sendStream
    → user msg append
    → [Sprint 6 신규] runRetractionHook(userText, db, prevAssistantMsg)
      ├─ detectRetractionSignal(text) → boolean (regex)
      └─ if hit:
         ├─ markRetracted(db, prevAssistantMsg.id)
         ├─ rollbackCaptureForTurn(db, prevAssistantMsg.turn_id)
         │    └─ concepts/edges hard-delete 또는 soft-mark (decision)
         └─ recall_log dismiss 마킹 (optional — 직전 결정 conceptIds 약화)
    → fire-and-forget Recall hook (Sprint 4/5 그대로)
      → engine.recallCandidates(userMessage, opts)
        ├─ embed → 768d
        ├─ nearest(db, vec, k=5) → semantic candidates
        │    └─ [Sprint 6 신규] for each hit: recordTouch(db, conceptId, now) → last_used_at 갱신
        ├─ hyperRecall (Sprint 5 그대로)
        ├─ [Sprint 6 신규] forgetting weight: score *= decay(now - last_used_at, halfLifeMs)
        ├─ [Sprint 6 신규] dismiss penalty: if conceptId ∈ dismissedConceptIds → score *= 0.5
        └─ 합집합 dedup (Sprint 5 그대로)
      → orchestrator.decide(ctx) (Sprint 4/5 그대로)
      → orchestrator.applySilence (Sprint 4 그대로)
      → recallStore.push (Sprint 4/5 그대로)
      → mobile 4 화면 mount
        ├─ ghost/suggestion/strong/inspector (Sprint 4/5 그대로)
        └─ [Sprint 6 신규] DismissButton 노출 — 사용자 클릭 시
           → chatStore.dismiss(decisionId, conceptIds?)
             └─ orchestrator.applyDismiss(decisionId, conceptIds, {markDismissed, decayEdges})
                ├─ markDismissed(db, recallLogId, conceptIds) — recall_log 갱신
                ├─ edges weight *= 0.5 (decayEdges)
                └─ pruneEdgesBelow(db, threshold) — 임계 미만 edge 자동 삭제
    → assistant first chunk
    → assistant streaming
    → assistant complete (turn_id 박힘 — retraction 시 rollback 대상)
  → user reply

[scheduled / on-startup forgetting sweep — optional]
  → decayWeights(db, {now, halfLifeMs=7d}) → 모든 edges weight 시간 감쇠
  → pruneEdgesBelow(db, threshold) → weight < ε edges 삭제
```

핵심 변경:
- `messages.retracted` + `concepts.last_used_at` + `edges.last_used_at` + `recall_log.dismissed` 4 컬럼 schema 추기 (migration 0005).
- `runRetractionHook` conversation 신규 hook — 사용자 부정 신호 → 직전 assistant 회수.
- `recordTouch` engine ↔ storage 신규 — nearest/traverse 호출 시점 last_used_at 갱신 (forgetting 의 입력 신호).
- `applyDismiss` orchestrator 신규 — UI 의 dismiss 클릭 → recall_log + edges 약화 dispatch. 4 원 enum 동결.
- `DismissButton` design-system 신규 컴포넌트 — 3 화면 공통.
- `ChatBubble.retracted?: boolean` 시각 (취소선 + ink-mute).
- engine `recallCandidates` score 계산 = base * forgetting_decay * dismiss_penalty * source_priority.

의존 그래프 신규 엣지 0 — 기존 `engine ↔ protocol`, `storage ↔ protocol`, `orchestrator ↔ protocol`, `conversation ↔ orchestrator` 그대로.

## 5. File Ownership

| 파일/디렉토리 | 작성자 | 비고 |
|---|---|---|
| `packages/storage/schema/0005_failure_hygiene.sql` 신규 | storage | last_used_at + retracted + dismissed 4 컬럼 |
| `packages/storage/src/repo/forgetting.ts` 신규 | storage | decayWeights + pruneEdgesBelow + recordTouch |
| `packages/storage/src/repo/retraction.ts` 신규 | storage | markRetracted + rollbackCaptureForTurn |
| `packages/storage/src/repo/dismiss.ts` 신규 | storage | markDismissed |
| `packages/storage/src/repo/{embed,graph,recall_log}.ts` | storage | secondary sort audit (carry-over 6 흡수) |
| `packages/storage/src/index.ts` | storage | 신규 함수 re-export |
| `packages/storage/__tests__/{forgetting,retraction,dismiss,sql-audit}.test.ts` 신규 | storage | 8+ 신규 |
| `packages/protocol/src/recall.ts` | engine | `RecallLogRow.dismissed?: number` 또는 `dismissed_concept_ids?: string` 추기 |
| `packages/protocol/src/concept.ts` | engine | `Concept.last_used_at?: number` 추기 |
| `packages/protocol/__tests__/{recall,concept}.test.ts` | engine | 신규 필드 검증 |
| `packages/engine/src/recall.ts` | engine | forgetting decay + dismiss penalty 적용 (DI) |
| `packages/engine/src/forgetting.ts` 신규 | engine | decay 함수 (`decayScore(score, ageMs, halfLifeMs)`) |
| `packages/engine/__tests__/forgetting.test.ts` 신규 | engine | 5+ 신규 |
| `packages/engine/__tests__/recall.test.ts` | engine | forgetting + dismiss penalty 통합 |
| `packages/orchestrator/src/dismiss.ts` 신규 | orchestrator | applyDismiss 함수 |
| `packages/orchestrator/__tests__/dismiss.test.ts` 신규 | orchestrator | 4+ 신규 |
| `packages/conversation/src/loop.ts` | conversation | runRetractionHook 신규 + sendStream wiring |
| `packages/conversation/src/retraction.ts` 신규 | conversation | detectRetractionSignal regex |
| `packages/conversation/__tests__/loop-retraction.test.ts` 신규 | conversation | 5+ 신규 |
| `apps/mobile/app/{inspector,suggestion,strong}/index.tsx` | mobile | DismissButton 노출 + 핸들러 |
| `apps/mobile/src/chatStore.{ts,web.ts}` | mobile | dismiss(decisionId, conceptIds?) 메서드 신규 |
| `apps/mobile/src/recallStore.{ts,web.ts}` | mobile | getRecentDetailed retention (maxEntries=200) |
| `apps/mobile/package.json` | mobile | workspace deps 5 명시 (carry-over 2) |
| `packages/design-system/src/components/DismissButton.tsx` 신규 | designer | 3 화면 공통 dismiss 버튼 |
| `packages/design-system/src/components/ChatBubble.tsx` (또는 동등) | designer | retracted? prop + 취소선/ink-mute 시각 |
| `packages/design-system/src/copy.ts` | designer | dismiss/unlink/retracted 한·영 |
| `packages/design-system/__tests__/{DismissButton,Retracted}.test.ts` 신규 | designer | 3+ 신규 |
| `scripts/lint/frozen-flag-audit.sh` | team-leader | 정규식 alternation 확장 (carry-over 5) |
| `scripts/lint/__tests__/` (해당) | tester | lint 정규식 회귀 테스트 |
| `scripts/receipt/sprint-6.sh` 신규 | tester | Sprint 5 40 wrap + 신규 4~6 |
| `scripts/receipt/.receipt-runner/sprint6-{dismiss-penalty,retraction-rollback,forgetting-decay,edge-prune,sql-audit}.mjs` 5 신규 | tester | fixture 5 종 |
| `docs/sprints/sprint-6-failure-hygiene.md` | team-leader | §3-§6 본 게이트 (완료), §7-§8 라이브, §9-§12 /end |
| `SPRINTS.md` | team-leader | /end 시 갱신 |

비변경 (검증):
- `packages/llm/src/` — Sprint 1 그대로.
- `packages/engine/src/{extractConcepts,embed,buildEdges,hyperRecall}.ts` — Sprint 3/5 그대로.
- `packages/storage/schema/0001_*.sql` ~ `0004_recall_log.sql` — Sprint 0/1/3/4 동결.
- `packages/orchestrator/src/{silence,decide,types}.ts` — Sprint 4/5 동결 (decide 의 weak source 가중치 그대로).
- `packages/conversation/src/loop.ts` 의 `runMemoryFormation / runRecallHook / RecallFn / DecideFn / RecallStore / RecallHookDeps` 시그니처 — Sprint 3/4/5 동결. 신규 `runRetractionHook` 만 추기.
- `apps/mobile/app/{ghost,onboarding,first-chat,library}/index.tsx` — Sprint 1/3/4/5 그대로 (Ghost 거절 버튼 0 — silence/ghost 약화 X).
- `packages/design-system/src/components/InspectorList.tsx` — Sprint 5 source-pill 6종 그대로 (DismissButton 은 별도 컴포넌트로 합성).

## 6. Tasks

| # | Task ID | 책임 | addBlockedBy | 완료 조건 |
|---|---|---|---|---|
| T0 | spawn-and-inject | team-leader | - | 8 워커 spawn + 0번 묶음 4 패턴 + carry-over 9 항목 inject + 3 frozen ID 미리 박힘 |
| T1 | storage-schema-migration | storage | T0 | `0005_failure_hygiene.sql` + 4 컬럼 추기 + migration runner 통과 + repo 에서 SELECT 정합 |
| T1.5 | storage-sql-secondary-sort-audit | storage | T0 | production code SQL `ORDER BY` audit + secondary sort 일괄 추기 + lint regression 0 (carry-over 6 흡수) |
| T2 | storage-failure-hygiene-repo | storage | T1 | decayWeights + pruneEdgesBelow + recordTouch + markRetracted + rollbackCaptureForTurn + markDismissed + 8+ unit |
| T3 | engine-forgetting-dismiss | engine | T1, T2 | `forgetting.ts` decay 함수 + `recall.ts` forgetting + dismiss penalty DI + 5+ unit + recall.test 통합 |
| T4 | conversation-retraction-hook | conversation | T2 | `retraction.ts` detect 함수 + `loop.ts` runRetractionHook + 5+ unit (RecallFn/RecallHookDeps 동결) |
| T5 | orchestrator-dismiss-action | orchestrator | T2 | `dismiss.ts` applyDismiss + 4+ unit (4 원 enum 동결) |
| T6 | designer-dismiss-retracted | designer | T0 | DismissButton 컴포넌트 + ChatBubble retracted prop + copy.ts ko/en + 3+ unit + verify-copy ok 유지/증가 |
| T7 | mobile-dismiss-wiring | mobile | T5, T6 | 3 화면 DismissButton 노출 + chatStore.dismiss 신규 + recallStore retention + workspace deps 5 명시 + mobile build PASS + web bundle 0 hits |
| T8 | team-lead-lint-regex | team-leader | T0 | frozen-flag-audit.sh 정규식 alternation + 회귀 0 + carry-over 5 흡수 |
| T9 | tester-receipt-sprint6 | tester | T2, T3, T4, T5 (부분 검증 가능) | sprint-6.sh exit 0 + 5 신규 fixture + 임계 보강 PASS |
| T10 | dev-doc-live-and-close | team-leader | T1~T9 | §7-§8 라이브 갱신 (워커 보고 흡수) + §9-§12 /end 마감 (carry-over 자가완결) |

의존 그래프:
```
T0 → T1 → T2 → T3 → T9
              T2 → T4 → T9
              T2 → T5 → T7 → T9
T0 → T1.5 (병렬, T1 완료 후 secondary sort)
T0 → T6 → T7
T0 → T8 (병렬)
{T1~T9} → T10
```

**HOLD-DECIDE-RESUME 후보 (헌법 #1)**:
- forgetting decay 함수 형태 (지수 감쇠 vs. 선형 vs. step) → engine 워커 즉시 PM HOLD 발송 (`D-S6-forgetting-decay-shape`).
- forgetting half-life 상수 (7d / 30d / other) → engine 워커 즉시 PM HOLD 발송 (`D-S6-forgetting-half-life`).
- `messages.retracted` 컬럼 추기 vs. 별도 retraction_log 테이블 → storage 워커 즉시 PM HOLD 발송 (`D-S6-retracted-storage-shape`).
- 부정 신호 감지 = 패턴 매칭 vs. LLM 분류 → conversation 워커 패턴 매칭 default. LLM 채택 필요 시 PM HOLD.
- DecisionAct enum 'dismissed' 추가 → orchestrator 워커 즉시 PM HOLD 발송 (4 원 동결 헌법 우선 — 본 sprint 는 별도 컬럼 default).
- mockup 표 신규 별칭 (DismissButton, Retracted 시각) → designer 워커 즉시 PM HOLD 발송 (목업 정합 검증).
- rollbackCaptureForTurn 의 concepts hard-delete vs. soft-delete (turn_id 컬럼 신규) → storage 워커 즉시 PM HOLD 발송.

**spawn prompt 0번 묶음 inject 사항 (Sprint 6)**:
1. 헌법 4 패턴 (HOLD-DECIDE-RESUME / Decision-version 태그 / SoT 우선순위 / 단일 작성자 시간창)
2. carry-over 9 — 즉시 적용 + revert 비용 명시 계약 모델 (Sprint 5 실측 14분, multi-writer race 우월)
3. 워커 보고 시 `grep + tsc + test` 3-step 검증 의무 (Sprint 5 retrospective)
4. carry-over 18 LSP 노이즈 무시 정책 + 신규 implicit any 동일 정책
5. 명명 표준 `D-S6-<영향 받는 대상 파일>-<행위>`
6. 4 원 DecisionAct enum 동결 그대로 — `dismissed` 별도 컬럼 default (orchestrator HOLD 후 결정)
7. recall_log retention + recallStore in-memory cache 정책 = 본 sprint 결정 책임
8. **Decisions Made 후보** 즉시 dev doc §11 에 메모
9. **3 frozen decisions 미리 박힘**: D-S6-storage-sql-secondary-sort-audit / D-S6-forgetting-policy / D-S6-lint-frozen-flag-audit-regex-alternation

## 7. Interfaces / Contracts
<함수 시그니처, 메시지 타입, 패키지 경계 — 책임 에이전트가 결정될 때마다 추기>

### storage (T1 / T1.5 / T2 — 완료, 56 tests PASS)

**schema 0005_failure_hygiene.sql** (Sprint 0/1/3/4/5 동결 후 첫 신규):
- `concepts.last_used_at INTEGER NOT NULL DEFAULT 0` + `idx_concepts_last_used_at`.
- `edges.last_used_at INTEGER NOT NULL DEFAULT 0` + `idx_edges_last_used_at`.
- `messages.retracted INTEGER NOT NULL DEFAULT 0`.
- `recall_log.dismissed_concept_ids TEXT` (nullable, JSON-encoded `string[]`).
- 기존 row 영향 0 (silent migration). ALTER 멱등 = `_migrations` 트래킹.

**`packages/storage/src/repo/forgetting.ts`**:
- `decayWeights(db, opts: {now, halfLifeMs}): {decayed: number}` — 모든 edges 지수 감쇠 `weight *= exp(-(age/halfLifeMs)*ln2)`. halfLifeMs ≤ 0 throw.
- `pruneEdgesBelow(db, threshold): {pruned: number}` — strict `<` 미만 hard-delete.
- `recordTouch(db, conceptId, now): void` — concepts.last_used_at = now (미존재 silent no-op).
- `recordEdgeTouch(db, fromId, toId, now): {touched: number}` — 양방향 매칭 (모든 kind 일괄).
- `getLastUsedAt(db, conceptId): number | undefined` — engine T3 DI 입력. 부재 → undefined, default 0 → 0 (engine forgetting decay 가 0 silent skip).

**`packages/storage/src/repo/retraction.ts`** [FROZEN D-S6-storage-rollback-caller-pass + D-S6-storage-rollback-shape]:
- `markRetracted(db, messageId): void`.
- `rollbackCaptureForTurn(db, conceptIds: string[]): {rolledback: number}` — *caller-pass* (turn_id X). 트랜잭션 hard-delete: edges (from|to IN(...)) → vec_concepts (BY rowid) → concepts.

**`packages/storage/src/repo/dismiss.ts`** [FROZEN D-S6-storage-recall-log-dismissed-shape]:
- `markDismissed(db, recallLogId, conceptIds: string[]): void` — 기존 dismissed_concept_ids 와 union (sorted, 멱등). stale id / 빈 list silent no-op.
- `decayEdgeWeight(db, fromId, toId, multiplier): {decayed: number}` — multiplier ∈ (0,1] (out-of-range throw). 양방향 매칭. orchestrator T5 `applyDismiss` 의 conceptIds-pair-level adapter 가 caller.

**SQL secondary sort audit (T1.5)** [FROZEN D-S6-storage-sql-secondary-sort-audit]:
- `recentlyDecidedFor`: `ORDER BY decided_at DESC, id ASC`.
- `traverseOneHop`: UNION ALL → 외부 sub-SELECT, `ORDER BY label ASC, other ASC`.
- `nearestConcepts` (Sprint 5): `ORDER BY v.distance ASC, c.id ASC` 그대로.
- audit fixture (`__tests__/sql-audit.test.ts`) 가 production source 단일-키 ORDER BY = 0 보장. 화이트리스트: `ts ASC` (Sprint 1 frozen messages.ts), `id ASC` (rowid sub-SELECT, PK 결정성).

**index.ts re-exports**: 9 신규 함수 (`decayWeights / pruneEdgesBelow / recordTouch / recordEdgeTouch / getLastUsedAt / markRetracted / rollbackCaptureForTurn / markDismissed / decayEdgeWeight`) + `DecayOptions` type.

**`packages/storage/src/messages.ts`** 갱신 [FROZEN D-S6-storage-listMessages-retracted]:
- `listMessages` SELECT 에 `retracted` 컬럼 추기 + ORDER BY `ts ASC, id ASC` (carry-over 6 audit 잔여 흡수).
- `MessageRow` 타입에 `retracted: number` 필드 추기.
- mapping `if (r.retracted) msg.retracted = r.retracted` — silent migration 정합 (retracted=0 row → `Message.retracted = undefined`).
- mobile T7 chat 화면 `item.retracted === 1` 분기 + protocol `Message.retracted` (D-S6-protocol-message-retracted) 와 동기.

storage 패키지 총 58 tests PASS (Sprint 5 33 + Sprint 6 신규 25 = forgetting 9 + retraction 6 + dismiss 5 + sql-audit 3 + listMessages-retracted 2). tsc --noEmit 0.

### orchestrator (T5 — `packages/orchestrator/src/dismiss.ts`)

```ts
export type DismissOptions = {
  markDismissed: (recallLogId: string, conceptIds: string[]) => void;
  decayEdges: (conceptIds: string[], penalty: number) => void;
  pruneEdgesBelow?: (threshold: number) => number;
  penalty?: number;        // default 0.5
  pruneThreshold?: number; // default 0.05
};
export type DismissResult = { decayed: number; pruned: number };
export function applyDismiss(
  decisionId: string,
  conceptIds: string[],
  opts: DismissOptions,
): DismissResult;
```

계약:
- 호출 순서 = `markDismissed` → `decayEdges`(conceptIds 비어있지 않을 때만) → `pruneEdgesBelow?`(주입 시).
- `conceptIds = []` 시: `markDismissed` 는 호출 (recall_log 가 dismissal 자체는 기록), `decayEdges` 는 *skip* (storage SQL 의 빈 IN clause 회피).
- `pruneEdgesBelow` 미주입 시 `pruned = 0` (호출 0).
- 4 원 enum 동결 — `DismissResult` 는 `{decayed, pruned}` (number 만), `DecisionAct` 노출 X. 컴파일 가드 `_DismissResultIsNotAct` + 런타임 drift guard 테스트.
- idempotent 책임은 caller — 같은 `decisionId` 두 번 호출 시 양쪽 모두 dispatch (누적 회수가 의도). storage T2 `markDismissed` 가 set-once 로 idempotent 보장.
- DI 주입 출처: `markDismissed` = storage T2 `repo/dismiss.ts`, `decayEdges` = storage T2 (conceptIds 한정 약화 — `forgetting.ts` 의 전체 decayWeights 와 다름), `pruneEdgesBelow` = storage `forgetting.ts:pruneEdgesBelow` 그대로.

테스트 (`packages/orchestrator/__tests__/dismiss.test.ts`, 10개):
1. 호출 순서 + result 검증.
2. penalty default 0.5.
3. penalty override 전달.
4. pruneThreshold default 0.05.
5. pruneThreshold override 전달.
6. pruneEdgesBelow 미주입 → pruned 0.
7. 빈 conceptIds → markDismissed 호출 + decayEdges skip.
8. 같은 decisionId 두 번 호출 → 양쪽 모두 dispatch (누적).
9. 4 원 enum drift guard — DismissResult value 가 DecisionAct 와 충돌 0.
10. pruneEdgesBelow 반환값 → result.pruned 반영.

orchestrator 패키지 총 45 tests PASS (decide 23 + silence 12 + dismiss 10), tsc --noEmit 0.

### engine (T3 — `packages/engine/src/forgetting.ts` + `recall.ts` 확장)

```ts
// packages/engine/src/forgetting.ts (신규)
export const DEFAULT_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7d
export function decayScore(
  score: number,
  ageMs: number,
  halfLifeMs?: number, // default = DEFAULT_HALF_LIFE_MS
): number;

// packages/engine/src/recall.ts (시그니처 *확장 only* — 기존 옵션 0 변경)
export type RecordTouchFn = (
  db: unknown,
  conceptId: string,
  now: number,
) => Promise<void> | void;

export type GetLastUsedAtFn = (
  db: unknown,
  conceptId: string,
) => Promise<number | undefined> | number | undefined;

export type RecallCandidatesOptions = {
  // ... Sprint 5 기존 옵션 그대로 ...
  recordTouch?: RecordTouchFn;            // semantic hit 시 storage T2 호출
  getLastUsedAt?: GetLastUsedAtFn;        // forgetting decay 입력
  halfLifeMs?: number;                     // default 7d
  now?: number;                            // 테스트 결정성용
  dismissedConceptIds?: Set<string>;       // dismiss penalty 대상
  dismissPenalty?: number;                 // default 0.5
};
export const DEFAULT_DISMISS_PENALTY = 0.5;
```

계약 (`recallCandidates` 내부 변형 순서):
1. semantic hit 누적 (Sprint 5 그대로) → traverse co_occur (Sprint 5) → hyperRecall bridge/temporal/domain_crossing (Sprint 5).
2. **forgetting decay** — `getLastUsedAt` 주입 시 모든 후보 conceptId 마다 `score = decayScore(score, now - last_used_at, halfLifeMs)`. `last_used_at` = undefined 또는 0 시 skip (silent migration default).
3. **dismiss penalty** — `dismissedConceptIds.has(conceptId)` 시 `score *= dismissPenalty`.
4. **recordTouch** — 마지막. semantic hit 의 conceptId 만 (threshold 통과). co_occur/bridge/temporal/domain_crossing 은 파생이라 touch 외.
5. sort (Sprint 5 source priority + score desc 그대로).

DI 주입 출처:
- `recordTouch` = storage T2 `repo/forgetting.ts:recordTouch` (await async 또는 sync 모두 허용).
- `getLastUsedAt` = storage T2 새 read 함수 (Concept 단건 조회) — engine 자체 import 0.
- `dismissedConceptIds` = orchestrator `applyDismiss` 호출 시점에 caller (chatStore) 가 누적한 set.

protocol 추기:
- `Concept.last_used_at?: number` (옵셔널, 미설정 = 0 silent default).
- `RecallLogRow.dismissed?: number` (옵셔널, 0/1 short-form. storage 의 `dismissed_concept_ids TEXT` JSON 과 별도 — short-form 은 boolean 호환).

테스트:
- `packages/engine/__tests__/forgetting.test.ts` (8 신규):
  1. ageMs=0 → score 그대로.
  2. ageMs=halfLifeMs → score*0.5 (3 cases).
  3. ageMs=2*halfLifeMs → score*0.25.
  4. monotonic decreasing.
  5. negative ageMs (future last_used_at) → score 그대로.
  6. halfLifeMs ≤ 0 → score 그대로.
  7. default halfLifeMs = 7d.
  8. smoothness (1h delta < 1% score change).
- `packages/engine/__tests__/recall.test.ts` (8 Sprint 6 신규):
  1. recordTouch DI 호출 — semantic hit 마다 1회, threshold 미만은 skip.
  2. forgetting decay 적용 — 7d 경과 → score*0.5.
  3. forgetting decay 비활성 — getLastUsedAt 미주입.
  4. forgetting decay skip — last_used_at undefined or 0.
  5. dismiss penalty default 0.5.
  6. dismiss penalty 커스텀 배수.
  7. forgetting + dismiss 합성 = 0.5 * 0.5 = 0.25.
  8. 시그니처 동결 — Sprint 5 옵션만으로 정상 동작.

engine 패키지 총 76 tests PASS (Sprint 5 60 + forgetting 8 + recall sprint6 8). tsc --noEmit 0. root index re-export 검증 grep PASS (`decayScore`, `DEFAULT_HALF_LIFE_MS`, `RecordTouchFn`, `GetLastUsedAtFn`, `DEFAULT_DISMISS_PENALTY`).

### conversation (T4 — `packages/conversation/src/{retraction,loop}.ts`)

```ts
// retraction.ts (신규)
export function detectRetractionSignal(text: string): boolean;
// regex 기반 — ko: /^\s*(아니|아니야|아냐|그건 아니|그건 다른|틀렸|잘못)/i
//             en: /^\s*(no\b|no,|no\s+that's|that's wrong|not what|wrong\b|i didn't)/i
// 첫 단어/구문 매칭 (^anchor) — 결정성 보강. LLM 분류 채택은 Sprint 7+ (latency + cost + 결정성 약화 사유).

// loop.ts (시그니처 추기 — 기존 RecallFn / DecideFn / RecallStore / RecallHookDeps / runMemoryFormation 변경 0)
export type DetectRetractionFn = (text: string) => boolean;
export type MarkRetractedFn = (messageId: string) => void;
export type RollbackCaptureFn = (conceptIds: string[]) => { rolledback: number } | void;
export type MarkDismissedFn = (recallLogId: string, conceptIds: string[]) => void;

export type RetractionHookDeps = {
  detectRetraction?: DetectRetractionFn;        // default: detectRetractionSignal
  markRetracted?: MarkRetractedFn;              // DI → storage T2 markRetracted(db, id)
  rollbackCaptureForTurn?: RollbackCaptureFn;   // DI → storage T2 rollbackCaptureForTurn(db, conceptIds)
  markDismissed?: MarkDismissedFn;              // optional DI → storage T2 markDismissed(db, recallLogId, conceptIds)
  prevAssistantMessageId?: string;              // caller-pass (chatStore 가 직전 turn 끝에서 보유)
  prevAssistantConceptIds?: string[];           // caller-pass — runMemoryFormation.onConcepts 콜백에서 수집
  prevRecallLogId?: string;                     // optional caller-pass — recall_log dismiss 마킹용
};
export type SendStreamDeps = ... & RetractionHookDeps;
```

`sendStream` wiring 변경:
- 호출 위치 = user msg append 직후 + Recall hook *전*. 동기 호출 (storage repo 함수 동기) — RecallHook 의 fire-and-forget 와 다름.
- try/catch + logger.warn 으로 실패 격리 (user reply 흐름 무영향).

`runRetractionHook` (sync, internal) 결정 분기:
1. `detectRetraction(userText)` miss → return.
2. `prevAssistantMessageId` 없음 → return (첫 user 메시지 / 직전이 user 인 경우).
3. `markRetracted` 미주입 → return (옵션 hook 패턴 — 핵심 효과 없음).
4. `markRetracted(prevId)` 호출.
5. `prevAssistantConceptIds.length > 0` AND `rollbackCaptureForTurn` 주입 → `rollbackCaptureForTurn(conceptIds)` 호출.
6. `prevRecallLogId` AND `markDismissed` 주입 → `markDismissed(prevRecallLogId, conceptIds)` 호출.

계약:
- caller-pass 모델 ([FROZEN D-S6-storage-rollback-caller-pass]): conceptIds 는 mobile chatStore 가 `runMemoryFormation.onConcepts` 콜백에서 수집해 직접 주입. concepts 에 turn_id 컬럼 X.
- 시그니처 동결 100%: RecallFn / DecideFn / RecallStore / RecallHookDeps / runMemoryFormation 변경 0. 신규 export 만 추기.
- 실패 격리: hook 내 throw 는 `logger.warn` 로 흡수 — assistant streaming 흐름 무영향 (Sprint 4 RecallHook 패턴 답습).
- LLM 분류 채택 가능성 보존: `detectRetraction` DI override 로 향후 LLM 분류 어댑터 주입 가능 (인터페이스 호환성 유지). PM HOLD 회피 — 패턴 매칭 default + override 구멍 보존으로 양쪽 모두 흡수.

테스트 (`packages/conversation/__tests__/loop-retraction.test.ts`, 11개):
1. detectRetractionSignal: ko 7 case hit.
2. detectRetractionSignal: en 6 case hit.
3. detectRetractionSignal: 빈 문자열 / 평범한 인사 miss.
4. 부정 신호 hit + prevId 존재 → markRetracted + rollbackCaptureForTurn 호출 검증.
5. 부정 신호 miss → 모든 함수 호출 0 (hook noop).
6. prevAssistantMessageId 미주입 → hook noop.
7. markRetracted 미주입 → hook 전체 noop (옵션 hook 패턴).
8. ko + en 양쪽 부정 신호 (2 sendStream loop) → 각각 markRetracted + rollback 호출.
9. prevAssistantConceptIds = [] → markRetracted 만, rollback skip.
10. prevRecallLogId + markDismissed 주입 시 markDismissed 호출 검증.
11. detectRetraction DI override → LLM 분류 인터페이스 호환성 (override true → markRetracted 발동).

conversation 패키지 총 44 tests PASS (기존 33 + 신규 11), tsc --noEmit 0.

### designer (T6 — `packages/design-system/src/components/{DismissButton,HumbleRetraction}.tsx` + `copy.ts` 확장)

**[FROZEN D-S6-design-system-mockup-conflict-resolution]** PM A안 채택 — 디자인 목업 1:1 final.

**비충돌 — 즉시 적용**:

**`packages/design-system/src/components/DismissButton.tsx`** 신규:
- `export type DismissButtonVariant = 'reject'` — 자가 선언 (D-S5-design-system-source-string-union 정합).
- `export const DISMISS_BUTTON_VARIANTS: readonly DismissButtonVariant[] = ['reject']` — drift guard.
- `export interface DismissButtonProps { onPress: () => void; label?: string; variant?: DismissButtonVariant; }`.
- `export function DismissButton(...)` — Pressable + Text. 디자인 목업 SuggestionCard L236-240 onDismiss 버튼 1:1 (sans 11, INK_MUTE ~60%, transparent bg, padding 2px 0).
- `accessibilityLabel={`dismiss-${variant}`}` — e2e 분기 hook.
- *충돌 보류*: `variant='unlink'` (Inspector unlink 슬롯 부재 — PM HOLD 결정 후 추가).

**`packages/design-system/src/copy.ts`** RecallCopy 확장:
- `RecallCopy` 인터페이스에 `dismiss: string`, `never: string`, `humble: string` 3 필드 추기.
- ko: `'지금은 됐어요'`, `'다신 보지 않기'`, `'아, 잘못 연결했네요. 미안해요.'`.
- en: `'Not now'`, `'Never again'`, `'Ah — I connected the wrong thread. Sorry.'`.
- 디자인 목업/content.jsx COPY.{dismiss, never, humble} 1:1 — 충돌 0.
- *충돌 보류*: `recall.unlink` / `recall.retracted` 키 (목업 부재 — D-S4-design-system-single-copy-file 헌법 정합 PM 결정 후).

**`packages/design-system/src/components/index.ts`** sub-entry:
- `export { DismissButton, DISMISS_BUTTON_VARIANTS }` + `export type { DismissButtonProps, DismissButtonVariant }` 추기.

**`packages/design-system/.receipt-runner/verify-copy.mjs`** — 검증 키 `13 → 16` (Sprint 6 dismiss/never/humble 추가). 디자인 목업/content.jsx ko 블록 raw text 매칭 패턴 그대로 (drift guard).

**`packages/design-system/__tests__/DismissButton.test.ts`** 신규 5 tests + `__tests__/copy.test.ts` 신규 3 tests (Sprint 6 dismiss/never/humble ko/en 1:1 + 비어있지 않음).

**검증 결과** (designer 비충돌 영역):
- design-system 테스트 **64 PASS** (baseline 56 + 신규 8 — 5 DismissButton drift guard + 3 copy 1:1).
- `verify-copy.mjs` `ok=16` (baseline 13 → 16).
- `tsc --noEmit` 0 errors.
- 디자인 목업 1:1 헌법 (D-S4-design-system-single-copy-file + feedback_mockup_truth.md) 정합 — 충돌 0.

**PM A안 채택 후 적용 (frozen 박힌 후 5분 분기)** [FROZEN D-S6-design-system-mockup-conflict-resolution]:

**`packages/design-system/src/components/HumbleRetraction.tsx`** 신규 — 디자인 목업 synapse-ui.jsx L425-443 1:1:
- `export interface HumbleRetractionProps { text: string }` — 호출자가 `copy[lang].recall.humble` 주입.
- `export function HumbleRetraction(props): React.ReactElement`.
- 시각: paper-shade bg + ink-faint dashed border + X 아이콘 (rotate 45/-45) + serif italic ink-mute 사과 텍스트.
- motion: `inkRise` 0.4s ease-out (목업 `ink-rise` 1:1).
- `accessibilityLabel="humble-retraction"` — mobile e2e 분기 hook.
- `HumbleRetractionMotionTokens = ['inkRise']` — drift guard.

**`packages/design-system/src/components/index.ts`** sub-entry:
- `export { HumbleRetraction, HumbleRetractionMotionTokens }` + `export type { HumbleRetractionProps }` 추기.

**`packages/design-system/__tests__/HumbleRetraction.test.ts`** 신규 5 tests (text prop + accessibilityLabel + motion.inkRise + MotionTokens drift + 시각 토큰 raw text 매칭).

**A안 미적용 사항 (의도적)**:
- `DismissButtonVariant` 에 `'unlink'` 추가 0 (현 'reject' 1 종 final).
- `copy.recall.unlink` / `copy.recall.retracted` 키 0 (목업 부재 + D-S4 헌법 정합).
- `ChatBubble.retracted` prop 0 (retraction 시각 = HumbleRetraction 카드 mount 로 대체).
- 디자인 목업 content.jsx / synapse-ui.jsx 수정 0 (단일 진실원 보존).

**최종 검증**:
- design-system **69 tests PASS** (baseline 56 + 신규 13 — 5 DismissButton + 3 copy + 5 HumbleRetraction).
- `verify-copy.mjs` `ok=16` exit 0.
- `tsc --noEmit` 0 errors.
- root index grep 의무 (`feedback_root_index_grep.md`): components sub-entry `./components` path 가 root package.json `exports` 에 박혀있어 root index 변경 불필요. `grep HumbleRetraction packages/design-system/src/components/index.ts` 1 hit 확인.
- 디자인 목업 단일 진실원 헌법 (D-S4 + carry-over feedback_mockup_truth.md) 정합 — 충돌 0 / 목업 수정 0.

design-system 패키지 총 69 tests PASS (기존 56 + 신규 13), tsc --noEmit 0.

### mobile (T7 — `apps/mobile/{app,src}/`)

**Phase-1+ (carry-over 흡수 + retraction wiring)**:

- **`apps/mobile/package.json`** — `dependencies` 에 5 종 명시 (carry-over 2 흡수, P1):
  `@synapse/{conversation,design-system,engine,orchestrator,protocol,storage}: workspace:*`. `pnpm install` 통과.
- **`apps/mobile/src/recallStore.{ts,web.ts}`** — `MAX_ENTRIES = 200` retention (carry-over 3 흡수). `push()` 마다 `sessionRows.length > MAX_ENTRIES` 시 oldest row 폐기 + `sessionCandidatesById.delete(evicted.id)` 동기 evict (Map 누수 방지). native/web 짝 동일 정책.
- **`apps/mobile/src/chatStore.{ts,web.ts}`** — 외부 시그니처 *확장 only* (Sprint 1 D-S1 시그니처 동결 그대로). 신규 export 2:
  - `dismiss(decisionId: string, conceptIds?: string[]): Promise<void>`. native: orchestrator `applyDismiss` + storage repo (`markDismissed` / `decayEdgeWeight` / `pruneEdgesBelow`) 클로저 DI. conceptIds 미지정 시 `recallStore.getRecentDetailed` 에서 row.id 로 candidates 조회 (cold start 시 row.candidate_ids fallback). decayEdges 어댑터 = i<j pair enumeration → `decayEdgeWeight(db, ids[i], ids[j], penalty)`. web: in-memory `dismissedDecisionIds` Set 갱신만 (storage / orchestrator import 0).
  - `isDismissed(decisionId: string): boolean` — session-local Set 조회. native/web 짝 동일 시그니처. 화면 시각 분기 (faded) 즉응용.
- **`apps/mobile/src/chatStore.ts` retraction wiring** ([FROZEN D-S6-storage-rollback-caller-pass] 정합):
  - module state 3종 — `prevAssistantMessageId` / `prevAssistantConceptIds` / `prevRecallLogId`.
  - `recallStore.subscribe` 1회 module-load 등록 → `push` 마다 `prevRecallLogId = row.id` 갱신.
  - `conceptStore.subscribe` 1회 module-load 등록 → `notify(concepts)` 마다 `prevAssistantConceptIds = concepts.map(c => c.id)` 갱신.
  - `sendStream(text)` 진입 시 prev{...} **snapshot lock** (call-time copy) → 이후 hook 들이 module state 갱신해도 본 turn 의 retraction 입력은 *직전 turn 값* 보존.
  - `sendStreamNative` deps 에 storage repo 3종 클로저 + caller-pass 3종 주입: `markRetracted` / `rollbackCaptureForTurn` / `markDismissed` (DI) + `prevAssistantMessageId` / `prevAssistantConceptIds` / `prevRecallLogId` (caller-pass).
  - outer `async function*` 가 inner 소진 후 `listMessagesNative(db)` 의 마지막 `role === 'assistant'` 메시지 `id` 를 다음 turn 의 `prevAssistantMessageId` 로 캐시 (역순 탐색).

**Phase-2 (DismissButton + HumbleRetraction wiring — PM A안 D-S6-design-system-mockup-conflict-resolution 정합)**:

- **`apps/mobile/app/suggestion/index.tsx`** — `Mounted = {decisionId, candidates}` shape 확장 (이전 = candidates 만). `recallStore.subscribe` 의 row 인자에서 `decisionId = row.id` 캐치. SuggestionCard 직후 `<DismissButton onPress={onDismiss} label={c.recall.dismiss} variant="reject" />` 노출. dismiss 후 `setMounted(null)` → 시각 즉시 회수.
- **`apps/mobile/app/strong/index.tsx`** — Suggestion 과 동일 패턴. DRY 의도적 안 함 (두 화면 분리 정책 — Sprint 4 그대로).
- **`apps/mobile/app/inspector/index.tsx`** — DismissButton 노출 = 0 (PM A안: unlink 제거, 변경 없음).
- **`apps/mobile/app/chat/index.tsx`** — `renderRow` 에 `item.role === 'assistant' && item.retracted === 1` 분기 추기 → `<View>{<AIBubble />}{<HumbleRetraction text={c.recall.humble} />}</View>` 합성 (FlatList renderItem single element 제약). 디자인 목업 synapse-ui.jsx L425~443 의 카드 1:1.
- **handler**: `chatStore.dismiss(mounted.decisionId, mounted.candidates.map(c => c.conceptId))`.
- **`Message.retracted` 흡수**: `DraftMessage = Message & { pending?: boolean }` — protocol [FROZEN D-S6-protocol-message-retracted] + storage [FROZEN D-S6-storage-listMessages-retracted] 산출물 자동 흡수 (mobile 코드 변경 0).

**검증 (3-step + bundle scan)**:
- `tsc --noEmit` exit 0 — `Cannot find module` 0 + implicit any 0 (carry-over 2 + 18 흡수 검증).
- `pnpm --filter @synapse/mobile run build` exit 0. dist/_expo/static/js/web/entry-*.js (1.01 MB).
- web bundle scan — `better-sqlite3=0` + `sqlite-vec=0` (**carry-over 5 platform-adapter 시범 누적 6회**: Sprint 5 retrospective "세 번째 후 표준" + 본 sprint 3회 추가 보강).
- `DismissButton=4` + `HumbleRetraction=3` bundle hit (컴포넌트 + 화면 import + accessibilityLabel hit, wiring 검증).
- root index grep 의무 (`feedback_root_index_grep.md` 정합) — `orchestrator/index.ts:5` `applyDismiss` / `storage/index.ts:14` `markRetracted, rollbackCaptureForTurn` / `design-system/components/index.ts` `DismissButton` + `HumbleRetraction` / `protocol/src/message.ts:12` `retracted?: number` / `storage/src/messages.ts:24` `SELECT … retracted` 모두 hit ✅.

**시그니처 동결 보존 (Sprint 1/3/4/5 carry-over 정합)**:
- `chatStore.sendStream(text): AsyncIterable<string>` — Sprint 1 D-S1 동결 그대로.
- `chatStore.listMessages(): Message[]` — 그대로 (Message.retracted 옵셔널 자동 흡수).
- 신규 export = `dismiss` / `isDismissed` 두 개만 추기.

**부가 — orchestrator root index contract gap 보강**:
- `packages/orchestrator/index.ts:5-6` 에 `applyDismiss` / `DismissOptions` / `DismissResult` re-export 추기. T5 워커가 `src/index.ts` 만 export 하고 root index 누락 → mobile import `Module has no exported member` race. team-lead ACK 처분: 헌법 #4 위반 처리 X (carry-over 9 모델로 즉시 적용). carry-over 후보 = "consumer-detected producer contract gap 정책 정리" Sprint 7 retrospective.

mobile 패키지 `pnpm --filter @synapse/mobile run build` exit 0 + tsc --noEmit 0.

## 8. Test Scenarios
<디자인 목업/기획서 인용 시나리오 + 자동화 위치 (`e2e/scenarios/...`)>

## 9. Demo Script

**Sprint 6 receipt 재현 (SKIP_OLLAMA 모드 — 46 단계 일괄 검증)**:
```bash
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-6.sh
```
기대 출력 = `✅ Sprint 6 receipt PASSED` (46/46 통과: Sprint 5 40 wrap [1~40] + 신규 [41] dismiss-penalty (decayed=2 / edge=0.4 / dismissed=["X","Y"]) / [42] retraction-rollback (retracted=1 / rolledback=1 / detect_hit=6 / detect_miss=4) / [43] forgetting-decay (5 step monotone + halflife exact + edge_decayed=2 + touched=true) / [44] edge-prune (pruned=2 / remaining=3 / idempotent) / [45] sql-audit (consecutive=5 / chosen_id=r-aaa / tied=3) / [46] carry-over 2/5 + lint 3종 + 임계 보강 (dismiss_decay=2 / retracted_count=1 / pruned_edges=2)).

**Ollama UP 모드** (단계 [40] 통합 e2e 활성):
```bash
bash scripts/receipt/sprint-6.sh
```

**모바일 시각 검증 (디자인 목업 정합)**:
1. `pnpm --filter @synapse/mobile run web` → Chat 화면.
2. 사용자 turn 1: 평범한 입력 → AI assistant 응답.
3. 사용자 turn 2: "아니야, 그건 다른 얘기야" → conversation `runRetractionHook` hit → storage `markRetracted(prevAssistantMessageId)` + `rollbackCaptureForTurn(prevAssistantConceptIds)` + recall_log dismiss 마킹. chat 화면 `messages.retracted === 1` 분기 → AIBubble 직후 `<HumbleRetraction text="아, 잘못 연결했네요. 미안해요." />` 카드 mount (디자인 목업 synapse-ui.jsx L425~443 1:1).
4. Suggestion 화면: ghost recall 발생 turn 에서 `<DismissButton variant='reject' label='지금은 됐어요' />` 노출 → 클릭 → orchestrator `applyDismiss` → storage `markDismissed` + `decayEdgeWeight` 양방향 → 같은 conceptId 다음 turn score 페널티.
5. Strong 화면: 동일 패턴.
6. Inspector 화면: PM A안 채택으로 unlink 노출 0 — Sprint 5 모습 그대로 유지.

**단위 검증 (재현성)**:
```bash
pnpm test                                            # 모노레포 전체
pnpm --filter @synapse/storage test                  # 58 PASS
pnpm --filter @synapse/engine test                   # 76 PASS
pnpm --filter @synapse/orchestrator test             # 45 PASS
pnpm --filter @synapse/conversation test             # 44 PASS
pnpm --filter @synapse/protocol test                 # 22 PASS
pnpm --filter @synapse/design-system test            # 69 PASS
pnpm --filter @synapse/mobile run build              # web bundle better-sqlite3=0 + sqlite-vec=0
```

## 10. Implementation Map

> §7 Interfaces 가 패키지별 라이브 갱신 산출물의 *시그니처* 단일 진실원. §10 은 *파일/엔드포인트 인덱스* — 다음 스프린트가 코드를 찾을 때 lookup.

### packages/protocol (engine — T1, T3, D-S6-protocol-message-retracted, D-S6-protocol-recall-log-dismissed, D-S6-protocol-concept-last-used-at)
| 파일 | 역할 |
|---|---|
| `src/concept.ts` | `Concept.last_used_at?: number` 옵셔널 추기 (silent migration) |
| `src/recall.ts` | `RecallLogRow.dismissed?: number` 옵셔널 추기 |
| `src/message.ts` | `Message.retracted?: number` 옵셔널 추기 (storage schema 0005 동기) |
| `__tests__/{concept,recall,message}.test.ts` | 옵셔널 필드 검증 |
| `index.ts` (root) | re-export 그대로 (시그니처 변경 0) |

총 **22 PASS** (Sprint 5 19 + 신규 3).

### packages/storage (storage — T1, T1.5, T2, listMessages-retracted, getLastUsedAt 후속)
| 파일 | 역할 |
|---|---|
| `schema/0005_failure_hygiene.sql` 신규 | concepts.last_used_at + edges.last_used_at + messages.retracted + recall_log.dismissed_concept_ids 4 컬럼 |
| `src/repo/forgetting.ts` 신규 | `decayWeights / pruneEdgesBelow / recordTouch / recordEdgeTouch / getLastUsedAt` |
| `src/repo/retraction.ts` 신규 | `markRetracted / rollbackCaptureForTurn(db, conceptIds)` (caller-pass 모델) |
| `src/repo/dismiss.ts` 신규 | `markDismissed(db, recallLogId, conceptIds[]) / decayEdgeWeight(db, fromId, toId, multiplier)` |
| `src/messages.ts` | listMessages SELECT 에 retracted 추기 + `ORDER BY ts ASC, id ASC` (carry-over 6 secondary sort) |
| `src/repo/{embed,graph,recall_log}.ts` | secondary sort audit |
| `__tests__/{forgetting,retraction,dismiss,sql-audit,db}.test.ts` | 신규 22 + listMessages-retracted 2 |
| `index.ts` (root) | 신규 8+ export (D-S6 함수들) |

총 **58 PASS** (Sprint 5 33 + 신규 25).

### packages/engine (engine — T3)
| 파일 | 역할 |
|---|---|
| `src/forgetting.ts` 신규 | `decayScore(score, ageMs, halfLifeMs)` 지수 감쇠 + `DEFAULT_HALF_LIFE_MS = 7d` |
| `src/recall.ts` | `recallCandidates` 변형 순서 = accumulate → forgetting decay → dismiss penalty → recordTouch (semantic hit). DI 옵션 `getLastUsedAt? / dismissedConceptIds? / recordTouch?` |
| `__tests__/{forgetting,recall}.test.ts` | 신규 16 |
| `index.ts` (root) | `decayScore / DEFAULT_HALF_LIFE_MS / DEFAULT_DISMISS_PENALTY / RecordTouchFn / GetLastUsedAtFn` 신규 export |

총 **76 PASS** (Sprint 5 60 + 신규 16).

### packages/orchestrator (orchestrator — T5, root index race ack)
| 파일 | 역할 |
|---|---|
| `src/dismiss.ts` 신규 | `applyDismiss(decisionId, conceptIds, opts) → {decayed, pruned}` + 4 원 enum drift guard |
| `src/index.ts` | `applyDismiss / DismissOptions / DismissResult` re-export |
| `index.ts` (root) | `applyDismiss / DismissOptions / DismissResult` re-export (mobile contract gap 보강 race) |
| `__tests__/dismiss.test.ts` 신규 | 10 unit (boundary + idempotent + 4 원 drift) |

총 **45 PASS** (Sprint 5 35 + 신규 10).

### packages/conversation (conversation — T4)
| 파일 | 역할 |
|---|---|
| `src/retraction.ts` 신규 | `detectRetractionSignal(text)` regex ko/en (^ anchor 결정성) |
| `src/loop.ts` | `runRetractionHook(text, deps)` 신규 sync hook (sendStream user msg append 직후 + Recall hook 전, try/catch + logger.warn 격리). 시그니처 동결 100% |
| `__tests__/loop-retraction.test.ts` 신규 | 11 unit (ko 7 + en 6 + miss + DI 옵션 패턴) |
| `index.ts` (root) | `detectRetractionSignal / DetectRetractionFn / MarkRetractedFn / RollbackCaptureFn / MarkDismissedFn / RetractionHookDeps` 신규 export |

총 **44 PASS** (Sprint 5 33 + 신규 11).

### packages/design-system (designer — T6, A안 frozen)
| 파일 | 역할 |
|---|---|
| `src/components/DismissButton.tsx` 신규 | variant='reject' 1 종 (목업 SuggestionCard onDismiss L203~245 1:1), accessibilityLabel `dismiss-reject` |
| `src/components/HumbleRetraction.tsx` 신규 | 목업 synapse-ui.jsx L425~443 1:1 (X 아이콘 + 이탤릭 ink-mute + paper-shade dashed border + motion.inkRise) |
| `src/copy.ts` | RecallCopy 확장 — `dismiss / never / humble` 3 키 (목업 content.jsx 1:1) |
| `src/components/index.ts` | DismissButton + HumbleRetraction + 토큰 + props re-export |
| `.receipt-runner/verify-copy.mjs` | 검증 키 13 → 16 |
| `__tests__/{DismissButton,copy,HumbleRetraction}.test.ts` 신규 | 13 unit (5+3+5) |

총 **69 PASS** (Sprint 5 56 + 신규 13). verify-copy `ok=16` exit 0.

### apps/mobile (mobile — T7)
(상세 = 본 §10 직후 mobile 표 그대로 — Phase-1 carry-over 흡수 + Phase-2 wiring + chat 화면 retracted mount + 시그니처 동결 100%.)

### scripts (tester — T9, team-lead — T8)
| 파일 | 역할 |
|---|---|
| `scripts/receipt/sprint-6.sh` 신규 | 46 단계 (Sprint 5 40 wrap + 신규 6) |
| `scripts/receipt/.receipt-runner/sprint6-{dismiss-penalty,retraction-rollback,forgetting-decay,edge-prune,sql-audit}.mjs` 5 신규 | workspace 패키지 + 5 deps 재사용 |
| `scripts/lint/frozen-flag-audit.sh` | 정규식 alternation `(FROZEN|SUPERSEDED|CANCELED|ACCEPTED)` 확장 (carry-over 5 흡수) |

`SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-6.sh` exit 0 — **✅ Sprint 6 receipt PASSED 46/46** (PM /end 시점 재실행 검증).

### mobile (T7)

| 파일 | 역할 | 비고 |
|---|---|---|
| `apps/mobile/package.json` | workspace deps 5 (carry-over 2) | dependencies 에 conversation/design-system/engine/orchestrator/protocol/storage 명시 |
| `apps/mobile/src/recallStore.ts` | native recallStore + retention | MAX_ENTRIES=200 (carry-over 3), sessionRows + sessionCandidatesById 동기 evict |
| `apps/mobile/src/recallStore.web.ts` | web 짝 retention | native 와 동일 정책 (storage 의존 0) |
| `apps/mobile/src/chatStore.ts` | native chatStore + dismiss + retraction wiring | dismiss(decisionId, conceptIds?) / isDismissed / module state 3종 / sendStream snapshot lock + outer generator |
| `apps/mobile/src/chatStore.web.ts` | web 짝 dismiss | in-memory dismissedDecisionIds Set (carry-over 5 platform-adapter) |
| `apps/mobile/app/suggestion/index.tsx` | DismissButton wiring | Mounted shape 확장 (decisionId + candidates), variant='reject' |
| `apps/mobile/app/strong/index.tsx` | DismissButton wiring | Suggestion 과 동일 패턴 (DRY 의도적 안 함) |
| `apps/mobile/app/inspector/index.tsx` | unlink 노출 0 (PM A안) | 변경 없음 (final) |
| `apps/mobile/app/chat/index.tsx` | retracted 시각 (HumbleRetraction mount) | renderRow 에 item.retracted===1 분기, View 합성 (FlatList renderItem single element) |
| `packages/orchestrator/index.ts` | (mobile 가 직접 수정) applyDismiss re-export | T5 contract gap 보강, race ack 처분 |

**검증**: tsc --noEmit 0, build PASS, web bundle better-sqlite3=0 + sqlite-vec=0 (platform-adapter 6회 누적), DismissButton=4 + HumbleRetraction=3 bundle hit.

## 11. Decisions Made / Open Issues
**Decisions Made:**
- **[FROZEN v2026-04-29 D-S6-storage-rollback-caller-pass]** — `rollbackCaptureForTurn(db, conceptIds: string[])` *caller-pass* 모델. concepts 에 `turn_id` 컬럼 신규 X (schema 변경 최소화). 사유: (a) concepts 는 multi-turn 누적 (같은 concept 가 여러 turn 등장) — turn_id 단일 컬럼 부적합. (b) Humble Retraction 의 의도 = "직전 turn 의 capture 결과" 회수 — caller (conversation `runRetractionHook`) 가 직전 turn 의 conceptIds list 를 *직접 보유*. revert 비용: turn-id 기반 회수가 향후 필요 시 (1) `concepts.turn_id` 컬럼 추기 + (2) `appendConcept` 시그니처 변경 + (3) `rollbackCaptureForTurn` 시그니처 변경 — 약 30분.
- **[FROZEN v2026-04-29 D-S6-storage-recall-log-dismissed-shape]** — `recall_log.dismissed_concept_ids TEXT` (nullable, JSON-encoded `string[]`). boolean 단일 flag X (어떤 conceptId 가 dismiss 되었는지 보존 필요 — `applyDismiss` 의 conceptIds 가 `candidate_ids` 의 부분집합일 수 있음). 기존 row 영향 0 (nullable + DEFAULT NULL).
- **[FROZEN v2026-04-29 D-S6-storage-rollback-shape]** — concepts/edges *hard-delete* (vs soft-mark). 사유: (a) embedding 인덱스 (`vec_concepts`) 도 같이 삭제해야 의미 있음 — soft-mark 시 nearest 결과에 잔존. (b) Humble Retraction 의도 = "잘못 잡힌 capture" 완전 회수. (c) schema 변경 최소. revert 비용: soft-delete 가 필요 시 `concepts.deleted_at INTEGER NULL` 추기 + 모든 SELECT 에 `WHERE deleted_at IS NULL` 추기 — 약 1시간.
- **[FROZEN v2026-04-29 D-S6-forgetting-decay-shape]** — `decayScore(score, ageMs, halfLifeMs) = score * Math.pow(0.5, ageMs / halfLifeMs)`. 지수 감쇠 채택. 사유: smooth + 단조 감소 + ageMs=halfLifeMs 시 정확히 0.5. 대안 (선형/step) 대비 자연 망각 모델 표준 + 미분 가능 + 결정성. revert 비용: 함수 1개 (`packages/engine/src/forgetting.ts`) 교체 — 5분.
- **[FROZEN v2026-04-29 D-S6-forgetting-half-life-default]** — `DEFAULT_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000` (7d). dev doc §3 [FROZEN D-S6-forgetting-policy] 그대로 채택. 사유: 일주일 단위 자연 잊힘 (사용자가 한 주에 한 번 거의 모든 concept 재방문 가정). engine root export. revert 비용: 상수 1개 (낮음).
- **[FROZEN v2026-04-29 D-S6-engine-recall-forgetting-dismiss-order]** — `recallCandidates` score 변형 순서: 모든 후보 누적 → forgetting decay (`getLastUsedAt` DI 주입 시) → dismiss penalty (`dismissedConceptIds` set 매칭 시) → recordTouch (semantic hit 만, 마지막). 사유: (a) decay 가 dismiss 보다 먼저여야 두 효과 합성 결정성 보장. (b) recordTouch 마지막 = 다음 호출이 fresh 신호로 정상 인식. (c) semantic hit 만 touch — co_occur/bridge/temporal/domain_crossing 은 파생이라 last_used_at 갱신 책임 외 (storage T2 `recordTouch` 가 직접 hit 만 갱신).
- **[FROZEN v2026-04-29 D-S6-engine-dismiss-penalty-default]** — `DEFAULT_DISMISS_PENALTY = 0.5`. orchestrator/conversation 호출 시점에 `dismissedConceptIds: Set<string>` DI 로 주입. engine 자체는 storage 직접 import 0 (DI only, Sprint 5 패턴 그대로).
- **[FROZEN v2026-04-29 D-S6-protocol-concept-last-used-at]** — `Concept.last_used_at?: number` 추기. 미설정 = 0 (silent migration default). storage 0005 schema 와 동기.
- **[FROZEN v2026-04-29 D-S6-protocol-recall-log-dismissed]** — `RecallLogRow.dismissed?: number` 추기 (storage 가 `dismissed_concept_ids TEXT` JSON 도 별도 결정 — 본 필드는 boolean 호환 short-form). 미설정 = 0.
- **[FROZEN v2026-04-29 D-S6-protocol-message-retracted]** — `Message.retracted?: number` 옵셔널 필드 추기. 사유: mobile chat 화면 `item.retracted === 1` 분기가 protocol Message 타입에 의존 + storage `messages.retracted` 컬럼 (schema 0005) 와 동기 + 옵셔널 silent migration (미설정 = 0, 회귀 0). D-S6-protocol-{recall-log-dismissed, concept-last-used-at} 패턴과 동일. 검증: grep `retracted` message.ts 3 hits / Message root re-export 확인 / tsc 0 / protocol 22 PASS (+1) / 모든 consumer (storage/engine/conversation/orchestrator) tsc 0. revert 비용 1줄 = 1분 (carry-over 9 정합).
- **[FROZEN v2026-04-29 D-S6-storage-listMessages-retracted]** — `listMessages` SELECT/MessageRow 에 `retracted` 컬럼 노출 + ORDER BY `ts ASC, id ASC` (carry-over 6 audit 잔여 흡수). 사유: protocol `Message.retracted` (D-S6-protocol-message-retracted) + mobile chat 화면 `item.retracted === 1` 분기 의존 — listMessages 가 retracted 미노출 시 mobile 분기 무력화. mapping 옵셔널 박음 (`if (r.retracted) msg.retracted = r.retracted`) — retracted=0 row 의 `Message.retracted = undefined` 보장 (silent migration 정합). 검증: grep `retracted` messages.ts 4 hits / tsc 0 / 58 PASS (+2 신규 unit: retracted exposure + ts/id ASC 결정성). revert 비용: SELECT 1 토큰 + mapping 1 줄 + MessageRow 필드 1 줄 = 1분 (carry-over 9 정합).
- **[FROZEN v2026-04-29 D-S6-orchestrator-root-index-dismiss-export]** orchestrator T5 후속 잔여 해소 — `packages/orchestrator/index.ts` (root) 에 `applyDismiss / DismissOptions / DismissResult` re-export 추기. 사유 = T5 보고 ("packages/orchestrator/src/index.ts re-export") misreport — 실제 root index 미edit (package.json `main` 이 `./index.ts` root 를 가리키므로 src/index.ts 변경은 외부 import 에 보이지 않음). SoT 헌법 #1 (`code > task subject > dev doc [FROZEN] > inbox > draft`) 적용 — directive 즉시 적용 (2 줄, 1분). 검증: `grep applyDismiss index.ts` 1 hit + tsc 0 errors + 45 tests PASS + mobile tsc applyDismiss 오류 0. **회고**: Sprint 5 D-S5-engine-root-index-hyperrecall-export 회고 ("root index 변경 보고 직전 grep 검증 1 회 의무") 누락 — 다음 sprint 부터 의무 재강조.
- **[ACCEPTED v2026-04-29 D-S6-design-system-non-conflict-start]** team-lead ACCEPTED — designer T6 비충돌 영역 (DismissButton variant='reject' + copy.recall.{dismiss,never,humble} 3 키 + verify-copy 13→16) 사전 착수 승인. 사유: A/B/C 어느 PM 결정에서도 동일하게 살아남는 영역 + 디자인 목업 1:1 + 충돌 0 + revert 비용 0 (carry-over 9 — 즉시 적용 + revert 비용 명시 계약 정합). 결과: design-system 64 PASS / verify-copy ok=16 / tsc 0.
- **[FROZEN v2026-04-29 D-S6-design-system-mockup-conflict-resolution]** PM A안 채택 — 디자인 목업 1:1 final. 사유: (a) 헌법 2 동시 만족 (D-S4-design-system-single-copy-file + carry-over feedback_mockup_truth.md 목업 우선). (b) 구현 비용 0 (비충돌 영역이 그대로 final + HumbleRetraction 신설 1 컴포넌트). (c) 디자인 의도 1:1 (HumbleRetraction = AI 사과 카드, 메시지 라벨 X — 디자인 목업 synapse-ui.jsx L425-443 그대로). 결정 사항:
  - DismissButton.variant = `'reject'` 1 종 final. `'unlink'` variant 추가 = 0.
  - ChatBubble.retracted prop 신설 X. retraction 시각 = 별도 `HumbleRetraction` 컴포넌트 mount (`packages/design-system/src/components/HumbleRetraction.tsx` 신규).
  - mobile chat 화면이 `messages.retracted === 1` 메시지 직후 `<HumbleRetraction text={copy[lang].recall.humble} />` mount.
  - copy.recall.dismiss / never / humble 3 키 final. unlink / retracted 키 추기 0.
  - 디자인 목업 content.jsx / synapse-ui.jsx 수정 0 (단일 진실원 보존).
  - Inspector unlink 슬롯 미구현 — Sprint 7 사용자 테스트 후 검토 (carry-over X — 사용자 테스트 결과에 따른 결정).
  - 검증: design-system **69 PASS** (baseline 56 + DismissButton 5 + copy 3 + HumbleRetraction 5) / verify-copy ok=16 / tsc 0. revert 비용: HumbleRetraction.tsx 1 파일 + index.ts 4 줄 + test 1 파일 — 5 분 (총 6 분 carry-over 9 정합).
- **[FROZEN v2026-04-29 D-S6-lint-frozen-flag-audit-regex-alternation]** `scripts/lint/frozen-flag-audit.sh` 정규식 alternation 확장 — `^- \*\*\[FROZEN ...\]\*\*` → `^- \*\*\[(FROZEN|SUPERSEDED|CANCELED|ACCEPTED) ...\]\*\*`. carry-over 5 흡수. 사유: Sprint 5 의 5 회 lint blocker 의 근본 원인 (`SUPERSEDED|CANCELED|ACCEPTED-FINAL` 표현 free-form, prefix 박힘 패턴 흡수 어려움) 영구 해소. 검증: tester verifier 양쪽 패턴 (`(FROZEN|`, `(FROZEN\|`) 모두 hit + Sprint 1~6 dev doc 회귀 0 (Sprint 0 의 fail 은 pre-existing — Sprint 2 lint 도입 이전 박힘, 본 변경은 추기적이라 영향 0). receipt 단계 46/46 PASS = `bash scripts/receipt/sprint-6.sh` exit 0 ("✅ Sprint 6 receipt PASSED"). 헌법 효과: SUPERSEDED 결정도 prefix 그대로 (자연 흡수), Sprint 5 의 D-S5-storage-appendConcept-createdAt-split (SUPERSEDED) 패턴이 lint 위반 없이 안착 가능. revert 비용: alternation 제거 = 5분 (정규식 1줄 + 메시지 2줄).

**Open Issues:**
- *(현재 없음 — D-S6-design-system-mockup-conflict 는 D-S6-design-system-mockup-conflict-resolution 으로 PM A안 채택 + resolve)*

## 12. Carry-over + Retrospective

**Carry-over (다음 스프린트가 반드시 알아야 할 것):**

1. **carry-over 5 platform-adapter 패턴 표준 박힘 (시범 누적 6회)** — `chatStore.{ts,web.ts}` + `recallStore.{ts,web.ts}` + 미래 모든 store 가 native/web 짝 강제. native-only import 확장 시에도 `.web.ts` extension 우선되어 web bundle 무영향. Sprint 6 chatStore.dismiss + retraction wiring + DismissButton/HumbleRetraction import 추가에도 better-sqlite3 / sqlite-vec 0 hits 보존. **Sprint 7 에 새 store 작성 시 동일 패턴 강제**.

2. **Inspector unlink 슬롯 — 디자인 목업 부재, 사용자 테스트 후 검토** ([FROZEN D-S6-design-system-mockup-conflict-resolution] A안 결과). 본 sprint 미구현 사유: 헌법 (목업 우선 + D-S4-single-copy-file). Sprint 7 polish 사용자 테스트에서 *recall 거절 동작이 부족하다* 판명 시 → 디자인 목업 InspectorScreen 확장 + DismissButton variant 'unlink' 추가 + copy 'unlink'/'retracted' 키 추기 + chat ChatBubble.retracted prop 검토. **결정 트리거 = 사용자 테스트 결과**.

3. **3 producer contract gap 패턴 (Sprint 7 receipt 보강 후보)** — Sprint 6 의 mobile T7 retracted 시각 wiring 이 protocol Message.retracted + storage listMessages SELECT + design-system HumbleRetraction 3 producer 동시 의존 발견. mobile 워커가 ping-then-wait 정책 적용해 4분 만에 dispatch + 흡수. **Sprint 7+ receipt 가 dependency tree 사전 검증 단계 추가 권장** — `tsc --noEmit` 의 `Module has no exported member` / `Property does not exist` 패턴을 receipt 가 producer-consumer gap 으로 분류.

4. **consumer-detected producer contract gap 정책 결정 (Sprint 7 retrospective 후보)** — orchestrator T5 root index `applyDismiss` re-export misreport 발생 시 mobile 워커 + team-lead 가 동시에 동일 추가 적용 = 단일 작성자 시간창 헌법 #4 잠재 위반. 결과 코드 idempotent + carry-over 9 (즉시 적용 + revert 비용) 정합 → race 처분 X. **Sprint 7 정책 결정**: (a) consumer 가 즉시 직접 추기 OK (carry-over 9 우선) vs. (b) producer 워커 wake 후 적용 (헌법 #4 우선) — 두 옵션 비용 모델 정량 비교 후 표준화.

5. **recall_log retention 정책 미결** — `appendRecallLog` 가 append-only 그대로 (Sprint 5 carry-over 4 그대로). recallStore 의 in-memory cache 는 `MAX_ENTRIES=200` retention 적용 (carry-over 3 흡수 — Sprint 6 D-S6-recallStore-detailed-retention frozen). **DB 측 recall_log 의 long-term retention (e.g. 30d 만 유지) 은 Sprint 7+ 결정**. 본 sprint 의 forgetting decay 가 edges 만 다룸 — recall_log 자체는 dismiss 마킹만.

6. **Concept dedup / alias merge 미구현** — Sprint 3 합의 (같은 label concept 중복 그대로) Sprint 6 까지 유지. dismiss 페널티는 conceptId 단일 약화만 — alias merge 시점에 dismiss 이력 통합 정책 결정 필요. **Sprint 7+** (사용자 테스트 결과로 alias 필요성 우선순위 결정).

7. **carry-over 9 비용 모델 검증 누적** — Sprint 5 14분 모델 (storage 10+2+2) 위에 Sprint 6 가 추가 검증:
   - storage `getLastUsedAt` 후속 추기 = 즉시 적용 5분 (carry-over 9 정합).
   - orchestrator root index race = team-lead directive + mobile 동시 적용 (idempotent → 위반 처리 X).
   - 3 producer dispatch (engine + storage + designer) = 각 3~5분, mobile 흡수 ≈3분 = total ≈12분 (3 producer 차단 발견부터 mobile 마무리까지).
   - 결론: **carry-over 9 모델은 multi-writer race 보다 실측 우월**. Sprint 7 부터 표준 운영 모델로 박음.

8. **Sprint 7 polish receipt 임계 보강 후보** — D-S6-receipt-threshold-recovery 의 dismiss_decay/retracted_count/pruned_edges 신규 임계 위에:
   - `humble_retraction_mount_count ≥ 1` (chat 화면 카드 mount 시각 검증).
   - `dismiss_button_render_count ≥ 1` (Suggestion/Strong wiring 검증).
   - 사용자 e2e 시나리오 검증 (Sprint 7 사용자 테스트 통합).

9. **Sprint 5 carry-over 잔여 정리**:
   - carry-over 1 (platform-adapter 표준) = Sprint 6 6회 시범 누적, **표준 박힘 영구**.
   - carry-over 2 (mobile workspace deps 5) = **RESOLVED** (Sprint 6 T7 흡수, tsc 0 검증).
   - carry-over 3 (recallStore retention) = **RESOLVED** (MAX_ENTRIES=200 frozen).
   - carry-over 4 (DEMO_SOURCE_CYCLE) = Sprint 7 polish 그대로.
   - carry-over 5 (lint 정규식) = **RESOLVED** (T8 alternation 흡수).
   - carry-over 6 (SQL secondary sort) = **RESOLVED** (T1.5 + storage 후속 추가 흡수).
   - carry-over 7 (Concept/GraphEdge protocol) = **Sprint 5 RESOLVED 그대로**.
   - carry-over 8 (carry-over 9 모델 = 즉시 적용 + revert 비용) = Sprint 6 추가 검증 (위 #7 항).

**Retrospective:**

- **잘 된 것:**
  - Sprint 6 Goal 100% 달성 (Dismiss/Unlink + Humble Retraction + Forgetting + carry-over 1~6+9 흡수) + receipt **46/46 PASS** + 12 frozen decisions + 8 워커 11 task + 디자인 목업 1:1 헌법 + 시그니처 동결 100% + carry-over 9 모델 추가 검증.
  - 워커 측 SoT 헌법 #3 워커 측 모범 사례 확립 — engine / storage / conversation 모두 stale task_assignment 무시 + code/task/dev doc 3중 검증 후 idle 유지. Sprint 5 retrospective "team-lead 가 race 시 코드 검증" 의 워커 측 패턴 박힘.
  - 디자인 목업 충돌 PM HOLD #2 → A안 채택 → 5분 분기 적용 = HOLD-DECIDE-RESUME 헌법 깔끔한 흐름. designer 의 비충돌 영역 사전 착수 ([ACCEPTED D-S6-design-system-non-conflict-start]) = HOLD 가 막는 건 충돌 부분만, 비충돌은 진행 OK 의 패턴 검증.
  - 3 producer 차단 (mobile T7 retracted 시각 wiring) → ping-then-wait → 4분 dispatch + 12분 unblock = contract gap 패턴 표준 흐름 확립.
  - lint 정규식 alternation `(FROZEN|SUPERSEDED|CANCELED|ACCEPTED)` 박힘 = Sprint 5 의 5회 lint blocker 영구 해소.
  - storage 의 `getLastUsedAt` 후속 + ORDER BY secondary sort 추가 audit = consumer 가 producer §7 계약 gap 발견 시 즉시 producer 가 정합화 (Sprint 5 retrospective "producer 측 신속 정합" 패턴 박힘).
  - `feedback_root_index_grep.md` 메모리 박힘 = Sprint 5/6 연속 root index misreport 영구 방지. orchestrator T5 misreport 가 마지막 사례.

- **아팠던 것:**
  - **orchestrator T5 root index misreport 재발** — Sprint 5 D-S5-engine-root-index-hyperrecall-export 회고에서 "다음 sprint 부터 root index 변경 보고 직전 grep 검증 1 회 의무" 라고 박았는데도 동일 패턴 재발. mobile 워커가 발견 + team-lead directive 동시 발송으로 race 발생 (idempotent 결과 + carry-over 9 정합으로 위반 처분 X). **`feedback_root_index_grep.md` 메모리 영구 박음 = Sprint 7+ 부터 *모든* 워커 의무 재강조**.
  - **mobile T7 의 3 producer 차단 발견 시점이 Phase-2 마무리 직전** — 일찍 발견했으면 병렬 진행 가능했음. mobile 의 ping-then-wait 정책은 정확하지만, *진단 단계* 가 Phase-1+ 끝까지 미루어짐. Sprint 7 부터 워커 spawn prompt 0번 묶음에 "consumer 슬라이스 *시작 시* producer 슬라이스 §7 계약 gap 사전 진단 1회 의무" 추가 검토.
  - **PM HOLD #2 결정 대기 시간** — designer 충돌 발견부터 PM A안 결정까지 ≈30분 대기. designer 비충돌 영역 사전 착수로 비용 회피 했지만, *사용자 테스트 데이터 부재 시 디자인 목업 vs. task subject 충돌 결정 비용*은 본질적임. Sprint 7 polish 가 사용자 테스트 데이터 박는 시점에 검토.
  - **engine T3 root index misreport 재발 회피 검증 누락** — engine 워커는 자기 분야의 misreport 회피 (Sprint 5 D-S5-engine-root-index-hyperrecall-export) 를 dev doc §11 에 박았으나, *다른 워커* (orchestrator) 의 root index 도 같은 패턴 가능성을 사전 진단하지 않음. Sprint 7 부터 워커가 자기 분야 외 producer 도 같은 misreport 패턴인지 cross-check 의무 검토.

- **다음에 다르게 할 것:**
  - **워커 spawn prompt 0번 묶음에 "consumer 슬라이스 시작 시 producer §7 계약 gap 사전 진단 1회 의무" 추가** — mobile T7 의 3 producer 차단 발견 시점 단축.
  - **Sprint 7 receipt 보강** — `tsc --noEmit` 결과를 producer-consumer gap 으로 분류해 "예상 시그니처" 사전 검증 단계 추가 (carry-over 3 정합).
  - **consumer-detected producer contract gap 정책 명문화** — carry-over 9 우선 (즉시 적용 OK) vs. 헌법 #4 우선 (단일 작성자 시간창) 두 옵션 비용 모델 정량 비교 후 표준화 (carry-over 4).
  - **lint 정규식 alternation 추가 확장 검토** — `[ACK]` / `[DIRECTIVE]` / `[OPEN]` 등 prefix 도 alternation 에 추가할지 Sprint 7 검토 (단, 결정 vs. 메모 vs. issue 의 의미 분리는 유지).
  - **사용자 테스트 데이터 박는 receipt fixture 추가** — Sprint 7 polish 가 모바일 e2e 시나리오 (chat → retraction signal → HumbleRetraction mount → recall 거절 → dismiss penalty) 종단 검증 fixture 추기.

**Retrospective:**
- 잘 된 것:
- 아팠던 것:
- 다음에 다르게 할 것:
