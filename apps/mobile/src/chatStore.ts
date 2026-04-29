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

// engine.recallCandidates 의 NearestRecallFn / TraverseFn 시그니처에 storage adapter 결합.
// label 은 Sprint 5+ 의 Concept lookup 까지 id fallback (개발자 친화 표시용).
const recall: RecallFn = (userMessage, opts) =>
  recallCandidates(userMessage, {
    ...opts,
    nearest: async (db, vec, k) => {
      const hits = await nearestConcepts(db as Database, vec, k);
      return hits.map((h) => ({ id: h.id, label: h.id, score: h.score }));
    },
    traverse: async (db, conceptId, depth) => {
      const hits = traverse(db as Database, conceptId, depth);
      return hits.map((h) => ({ id: h.conceptId, label: h.conceptId, weight: h.weight }));
    },
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
