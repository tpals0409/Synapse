// Native (iOS/Android) adapter — Sprint 7 에서 RN bundle 에 활성화될 진짜 어댑터.
// Sprint 1 의 receipt 는 web export 만 검증 — 이 모듈은 web 빌드에서 .web.ts 로 대체됨.
//
// 약속: dev doc §4 "FirstChat 가 storage.listMessages + conversation.sendStream 사용".
// metro 의 platform extension (`.web.ts` 우선) 으로 web 빌드는 native 의존(better-sqlite3)을
// 번들에 끌어오지 않는다. native (iOS/Android) 빌드는 이 파일이 선택되어 실제 SQLite 영속화.
//
// Sprint 3 [FROZEN v2026-04-29 D-S3-chatStore-internal-wiring] — 외부 시그니처는 Sprint 1 동결
// 그대로 (`sendStream(text): AsyncIterable<string>`). 내부에서 conversation.sendStream 의
// `prevMessageConceptIds` / `onConcepts` 옵션을 conceptStore 에서 자동 주입.
//
// Sprint 4 [FROZEN v2026-04-29 D-S4-chatStore-recall-wiring] — 외부 시그니처 동결 그대로,
// 내부에서 `recall` (engine.recallCandidates + storage nearest/traverse 결합) +
// `decide` (orchestrator) + `recallStore` (platform adapter) 자동 주입.
//
// Sprint 5 [FROZEN v2026-04-29 D-S5-chatStore-hyperTraverse-adapter] — engine 의 hyperRecall
// 합집합 (bridge / temporal / domain_crossing) 활성을 위해 hyperTraverse adapter (kind 보존)
// + recentDecisions 주입 추기. RecallFn 외부 시그니처 동결 그대로 — opts 의 hyperTraverse /
// recentDecisions 는 conversation 미주입이므로 chatStore 가 직접 engine.recallCandidates 호출
// 시 결합.
//
// [FROZEN v2026-04-29 D-S5-mobile-T6-label-direct] — D-S5-storage-label-expose 적용 후
// nearestConcepts / traverse 가 label 직접 노출 (storage 시그니처 확장). adapter 의 id fallback
// 제거 → carry-over 10 해소. 이전 D-S5-mobile-T6-label-fallback-keep SUPERSEDED.
//
// Sprint 6 — 외부 시그니처 *확장 only* (기존 메서드 변경 0). 신규 `dismiss(decisionId, conceptIds?)`
// 메서드 추기. 내부에서 orchestrator.applyDismiss 호출 + storage repo (markDismissed /
// decayEdgeWeight / pruneEdgesBelow) 를 DI 로 주입. carry-over 5 platform-adapter 네 번째 시범 —
// dismiss 의 native-only import (storage / orchestrator) 가 .web.ts 분기로 web bundle 0 hits 보존.

import {
  openDb,
  migrate,
  listMessages as listMessagesNative,
  nearestConcepts,
  traverse,
  markDismissed,
  decayEdgeWeight,
  pruneEdgesBelow,
  markRetracted,
  rollbackCaptureForTurn,
  type Database,
} from '@synapse/storage';
import {
  sendStream as sendStreamNative,
  type RecallFn,
} from '@synapse/conversation';
import { recallCandidates } from '@synapse/engine';
import { decide, applyDismiss } from '@synapse/orchestrator';
import type { Message } from '@synapse/protocol';
import * as conceptStore from './conceptStore';
import * as recallStore from './recallStore';

let dbHandle: Database | null = null;

function ensureDb(): Database {
  if (!dbHandle) {
    dbHandle = openDb('synapse.db');
    migrate(dbHandle);
  }
  return dbHandle;
}

const RECALL_RECENT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h — engine.temporalCandidates default 와 정합.

// engine.recallCandidates 의 adapter 결합:
// - nearest / traverse: storage 가 label 직접 노출 (D-S5-storage-label-expose) → label 그대로 사용.
// - hyperTraverse: Sprint 5 신규 — engine HyperTraverseFn `(db, id, depth) → {id, label, weight, kind}[]`.
//   storage.traverse 가 label + kind 노출 → 그대로 매핑.
// - recentDecisions: Sprint 5 신규 — recallStore.getRecent(24h) 결과를 직접 전달, engine 의
//   temporalCandidates 가 이 입력으로 같은 시기 conceptId 묶음 도출.
// label 은 storage 직접 노출 — id fallback 제거 (D-S5-mobile-T6-label-direct, carry-over 10 해소).
const recall: RecallFn = (userMessage, opts) =>
  recallCandidates(userMessage, {
    ...opts,
    nearest: async (db, vec, k) => {
      const hits = await nearestConcepts(db as Database, vec, k);
      return hits.map((h) => ({ id: h.id, label: h.label, score: h.score }));
    },
    traverse: async (db, conceptId, depth) => {
      const hits = traverse(db as Database, conceptId, depth);
      return hits.map((h) => ({ id: h.conceptId, label: h.label, weight: h.weight }));
    },
    hyperTraverse: async (db, conceptId, depth) => {
      const hits = traverse(db as Database, conceptId, depth);
      return hits.map((h) => ({
        id: h.conceptId,
        label: h.label,
        weight: h.weight,
        kind: h.kind,
      }));
    },
    // 매 recall 호출 시점에 fresh 평가 (모듈 로드 시 1 회 평가 회피).
    recentDecisions: recallStore.getRecent(RECALL_RECENT_WINDOW_MS),
  });

export function listMessages(): Message[] {
  return listMessagesNative(ensureDb());
}

// Sprint 6 — Humble Retraction caller-pass state.
// chatStore 가 직전 turn 의 assistant message id + recall_log row id + concept ids 를 캐시.
// conversation.runRetractionHook 이 user msg append 직후에 이 값들을 deps 로 받아 사용.
// caller-pass 모델 ([FROZEN v2026-04-29 D-S6-storage-rollback-caller-pass]) 정합 — concepts.turn_id
// 컬럼 추가 X.
let prevAssistantMessageId: string | undefined;
let prevRecallLogId: string | undefined;
let prevAssistantConceptIds: string[] = [];

// recallStore 의 모든 push 를 구독하여 직전 row.id 갱신.
// 모듈 로드 시 1회 등록 — sendStream 호출 시점에 이미 prev 값이 신선.
recallStore.subscribe((row) => {
  prevRecallLogId = row.id;
});

// runMemoryFormation 의 onConcepts 콜백 결과를 conceptStore.notify 로 전달하는 동시에
// 본 모듈도 캐시 (rollbackCaptureForTurn 의 conceptIds 입력 용).
conceptStore.subscribe((concepts) => {
  prevAssistantConceptIds = concepts.map((c) => c.id);
});

export function sendStream(text: string): AsyncIterable<string> {
  const db = ensureDb();
  // snapshot prev{Message,Concepts,RecallLog} 값을 호출 시점에 잠금 — 이후 hook 들이 module state
  // 를 갱신해도 본 turn 의 retraction 입력은 *직전 turn 의 값* 이어야 함.
  const snapshot = {
    prevAssistantMessageId,
    prevAssistantConceptIds: prevAssistantConceptIds.slice(),
    prevRecallLogId,
  };
  const inner = sendStreamNative(text, {
    db,
    prevMessageConceptIds: conceptStore.getPrevTurnConceptIds(),
    onConcepts: conceptStore.notify,
    recall,
    decide,
    recallStore,
    // Sprint 6 retraction hook DI — storage repo 함수 3종 + caller-pass 직전 turn state.
    markRetracted: (messageId) => markRetracted(db, messageId),
    rollbackCaptureForTurn: (conceptIds) => rollbackCaptureForTurn(db, conceptIds),
    markDismissed: (recallLogId, cIds) => markDismissed(db, recallLogId, cIds),
    prevAssistantMessageId: snapshot.prevAssistantMessageId,
    prevAssistantConceptIds: snapshot.prevAssistantConceptIds,
    prevRecallLogId: snapshot.prevRecallLogId,
  });

  // outer generator — inner 가 모두 yield 한 *후* listMessages 마지막 assistant id 를
  // 다음 turn 의 prevAssistantMessageId 로 캐시. inner 에서 던진 에러는 그대로 전파.
  return (async function* () {
    for await (const chunk of inner) {
      yield chunk;
    }
    const msgs = listMessagesNative(db);
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      const m = msgs[i];
      if (m && m.role === 'assistant') {
        prevAssistantMessageId = m.id;
        break;
      }
    }
  })();
}

// Sprint 6 — Dismiss action (T7). UI 의 거절 버튼 → orchestrator.applyDismiss dispatch.
// conceptIds 미지정 시 recallStore 의 in-memory candidates 에서 row.id 로 조회 후 union.
//   - cold start 후 in-memory miss 시 row.candidate_ids fallback (storage 영속 그대로).
// orchestrator.decayEdges 는 conceptIds list 를 받음 → storage.decayEdgeWeight 는 (from,to) pair
// 단위 → adapter 가 i<j pair 를 enumerate 하여 호출 (무방향 그래프 정합).
//
// session-local dismissedDecisionIds Set — 화면 시각 분기 (faded) 즉응용. native/web 짝 강제.
const dismissedDecisionIds = new Set<string>();

export async function dismiss(
  decisionId: string,
  conceptIds?: string[],
): Promise<void> {
  const db = ensureDb();
  const ids = conceptIds ?? resolveConceptIds(decisionId);

  applyDismiss(decisionId, ids, {
    markDismissed: (recallLogId, cIds) => markDismissed(db, recallLogId, cIds),
    decayEdges: (cIds, penalty) => {
      for (let i = 0; i < cIds.length; i += 1) {
        for (let j = i + 1; j < cIds.length; j += 1) {
          decayEdgeWeight(db, cIds[i] as string, cIds[j] as string, penalty);
        }
      }
    },
    pruneEdgesBelow: (threshold) => pruneEdgesBelow(db, threshold).pruned,
  });

  dismissedDecisionIds.add(decisionId);
}

function resolveConceptIds(decisionId: string): string[] {
  const detail = recallStore
    .getRecentDetailed(Number.POSITIVE_INFINITY)
    .find((d) => d.row.id === decisionId);
  if (!detail) return [];
  if (detail.candidates.length > 0) {
    return detail.candidates.map((c) => c.conceptId);
  }
  return detail.row.candidate_ids;
}

// 화면이 dismissed 여부 시각 분기 (faded) 시 사용. native/web 짝 동일 시그니처.
export function isDismissed(decisionId: string): boolean {
  return dismissedDecisionIds.has(decisionId);
}
