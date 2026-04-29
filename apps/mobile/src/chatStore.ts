// Native (iOS/Android) adapter — Sprint 7 에서 RN bundle 에 활성화될 진짜 어댑터.
// Sprint 1 의 receipt 는 web export 만 검증 — 이 모듈은 web 빌드에서 .web.ts 로 대체됨.
//
// 약속: dev doc §4 "FirstChat 가 storage.listMessages + conversation.sendStream 사용".
// metro 의 platform extension (`.web.ts` 우선) 으로 web 빌드는 native 의존(better-sqlite3)을
// 번들에 끌어오지 않는다. native (iOS/Android) 빌드는 이 파일이 선택되어 실제 SQLite 영속화.

import {
  openDb,
  migrate,
  listMessages as listMessagesNative,
  type Database,
} from '@synapse/storage';
import { sendStream as sendStreamNative } from '@synapse/conversation';
import type { Message } from '@synapse/protocol';

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
  return sendStreamNative(text, { db: ensureDb() });
}
