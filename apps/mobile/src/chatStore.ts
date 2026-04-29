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

import {
  openDb,
  migrate,
  listMessages as listMessagesNative,
  type Database,
} from '@synapse/storage';
import { sendStream as sendStreamNative } from '@synapse/conversation';
import type { Message } from '@synapse/protocol';
import * as conceptStore from './conceptStore';

let dbHandle: Database | null = null;

function ensureDb(): Database {
  if (!dbHandle) {
    dbHandle = openDb('synapse.db');
    migrate(dbHandle);
  }
  return dbHandle;
}

export function listMessages(): Message[] {
  return listMessagesNative(ensureDb());
}

export function sendStream(text: string): AsyncIterable<string> {
  return sendStreamNative(text, {
    db: ensureDb(),
    prevMessageConceptIds: conceptStore.getPrevTurnConceptIds(),
    onConcepts: conceptStore.notify,
  });
}
