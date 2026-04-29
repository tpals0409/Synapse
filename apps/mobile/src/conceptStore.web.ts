// Web adapter — Expo Router web export 용 (Sprint 3 receipt step 3 빌드 타깃).
// better-sqlite3 / sqlite-vec 는 native 모듈 → web bundle 에 들어가면 안 됨.
// 이 파일이 platform extension 으로 conceptStore.ts 를 대체.
//
// carry-over 5 platform-adapter 첫 시범:
// - native = @synapse/storage 위임 가능 (단, 본 sprint 는 conversation 이 이미 storage 호출 →
//   conceptStore 책임은 알림 + lastTurnConceptIds 보관 으로 동일).
// - web = in-memory Map<id, Concept> + observer Set. storage 의존 0.
//
// receipt 가 web bundle 의 better-sqlite3/sqlite-vec 0 hits 검증 → 본 파일은
// import 라인이 native-only 모듈을 끌어오면 안 됨.

import type { Concept } from '@synapse/engine';

type Listener = (concepts: Concept[]) => void;

const memory = new Map<string, Concept>();
const listeners = new Set<Listener>();
let lastTurnConceptIds: string[] = [];

export function notify(concepts: Concept[]): void {
  if (concepts.length === 0) return;
  for (const c of concepts) memory.set(c.id, c);
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
