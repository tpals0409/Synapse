// Native (iOS/Android) adapter — Sprint 7 에서 RN bundle 에 활성화될 어댑터.
// Sprint 1 carry-over 5 platform-adapter 첫 시범 — chatStore.ts 패턴 그대로 재사용.
//
// 책임 분담 (dev doc §4):
// - conversation.runMemoryFormation 가 storage.appendConcept / appendEdge 를 *직접* 호출.
// - conceptStore 의 책임 = (1) 알림(notify) 채널 (2) 마지막 turn 의 conceptIds 보관
//   (다음 turn 의 prevMessageConceptIds 입력).
// - native 빌드도 in-memory observer + lastTurnConceptIds 로 충분 — storage 는 conversation
//   이 들고 있음. 본 어댑터는 metro 의 platform extension(.web.ts 우선) 분기를 위한
//   *짝* 으로 존재 (carry-over 5: web bundle 에 better-sqlite3/sqlite-vec 0 hits).

import type { Concept } from '@synapse/engine';

type Listener = (concepts: Concept[]) => void;

const listeners = new Set<Listener>();
let lastTurnConceptIds: string[] = [];

export function notify(concepts: Concept[]): void {
  if (concepts.length === 0) return;
  lastTurnConceptIds = concepts.map((c) => c.id);
  for (const l of listeners) l(concepts);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPrevTurnConceptIds(): string[] {
  return lastTurnConceptIds.slice();
}
