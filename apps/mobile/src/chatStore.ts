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

import {
  openDb,
  migrate,
  listMessages as listMessagesNative,
  nearestConcepts,
  traverse,
  type Database,
} from '@synapse/storage';
import {
  sendStream as sendStreamNative,
  type RecallFn,
} from '@synapse/conversation';
import { recallCandidates } from '@synapse/engine';
import { decide } from '@synapse/orchestrator';
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

export function sendStream(text: string): AsyncIterable<string> {
  return sendStreamNative(text, {
    db: ensureDb(),
    prevMessageConceptIds: conceptStore.getPrevTurnConceptIds(),
    onConcepts: conceptStore.notify,
    recall,
    decide,
    recallStore,
  });
}
