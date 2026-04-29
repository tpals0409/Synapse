// Native (iOS/Android) adapter — Sprint 7 에서 RN bundle 에 활성화될 어댑터.
// Sprint 4 carry-over 5 platform-adapter 두 번째 시범 (첫 시범: conceptStore.{ts,web.ts}).
//
// 책임 분담 (sprint-4 dev doc §6~§7):
// - conversation.sendStream 의 hook 이 recall → decide → push(row, candidates) 흐름.
// - native = @synapse/storage 의 appendRecallLog 로 영속 + recentlyDecidedFor 로 cooldown.
//   추가로 본 세션의 push 이력을 in-memory 로도 보관 → getRecent / Inspector 피드 즉응.
// - 본 어댑터는 metro 의 platform extension(.web.ts 우선) 분기를 위한 *짝* 으로 존재
//   (carry-over 5: web bundle 에 better-sqlite3/sqlite-vec 0 hits).
//
// shape: protocol 의 RecallLogRow 그대로 (snake_case: decided_at / candidate_ids).
// storage 도 T1 (#38) 후 protocol shape 채택 — 별도 매핑 불필요.

import {
  appendRecallLog,
  recentlyDecidedFor,
  openDb,
  migrate,
  type Database,
} from '@synapse/storage';
import type { RecallCandidate, RecallLogRow } from '@synapse/protocol';

type Listener = (row: RecallLogRow) => void;

const listeners = new Set<Listener>();
const sessionRows: RecallLogRow[] = [];
let lastDecision: { act: RecallLogRow['act']; candidates: RecallCandidate[] } | null = null;

let dbHandle: Database | null = null;

function ensureDb(): Database {
  if (!dbHandle) {
    dbHandle = openDb('synapse.db');
    migrate(dbHandle);
  }
  return dbHandle;
}

export function push(
  row: RecallLogRow,
  candidates: RecallCandidate[] = [],
): void {
  appendRecallLog(ensureDb(), row);
  sessionRows.push(row);
  lastDecision = { act: row.act, candidates };
  for (const l of listeners) l(row);
}

export function getRecent(withinMs: number, now: number = Date.now()): RecallLogRow[] {
  if (!Number.isFinite(withinMs)) return sessionRows.slice();
  const cutoff = now - withinMs;
  return sessionRows.filter((r) => r.decided_at >= cutoff);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLast(): { act: RecallLogRow['act']; candidates: RecallCandidate[] } | null {
  return lastDecision;
}

/** cooldown 검사용 — orchestrator silence 에서 위임받아 사용 */
export function recentlyDecided(
  candidateId: string,
  withinMs: number,
  now: number = Date.now(),
): RecallLogRow | null {
  return recentlyDecidedFor(ensureDb(), candidateId, withinMs, now);
}
