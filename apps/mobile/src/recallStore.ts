// Native (iOS/Android) adapter — Sprint 7 에서 RN bundle 에 활성화될 어댑터.
// Sprint 4 carry-over 5 platform-adapter 두 번째 시범 (첫 시범: conceptStore.{ts,web.ts}).
//
// 책임 분담 (sprint-4 dev doc §6~§7):
// - conversation.sendStream 의 hook 이 recall → decide → push(row, candidates) 흐름.
// - native = @synapse/storage 의 appendRecallLog 로 영속 + recentlyDecidedFor 로 cooldown.
//   추가로 본 세션의 push 이력을 in-memory 로도 보관 → getRecent / Inspector 피드 즉응.
// - 본 어댑터는 metro 의 platform extension(.web.ts 우선) 분기를 위한 *짝* 으로 존재
//   (carry-over 5: web bundle 에 better-sqlite3/sqlite-vec 0 hits — 세 번째 시범).
//
// shape: protocol 의 RecallLogRow 그대로 (snake_case: decided_at / candidate_ids).
// storage 도 T1 (#38) 후 protocol shape 채택 — 별도 매핑 불필요.
//
// Sprint 5 [FROZEN v2026-04-29 D-S5-recallStore-detailed-getter] — 신규 export
// `getRecentDetailed(withinMs, now?): {row, candidates}[]` 추기. Inspector 의 row-별
// source-pill 시각 분기 (D-S5-InspectorList-source-field) 를 위해 candidates 짝 노출.
// push/getRecent/getLast/subscribe/recentlyDecided 시그니처 동결 100%.
// candidates 는 in-memory 만 유지 (cold start = row.candidate_ids 만).
//
// Sprint 6 — carry-over 3 흡수 (in-memory candidates retention):
// `sessionRows` + `sessionCandidatesById` 가 push 마다 무한 누적되면 장기 세션에서 메모리 누수.
// `MAX_ENTRIES = 200` 도입 — 초과 시 oldest row 폐기 (candidates Map 도 같이 evict).
// native 의 cold start 시 row.candidate_ids 만 가용 — appendRecallLog 가 영속하므로
// in-memory eviction 후에도 row 자체는 SQLite 에서 복원 가능 (본 sprint 결정).

import {
  appendRecallLog,
  recentlyDecidedFor,
  openDb,
  migrate,
  type Database,
} from '@synapse/storage';
import type { RecallCandidate, RecallLogRow } from '@synapse/protocol';

type Listener = (row: RecallLogRow) => void;

export type RecallLogDetail = {
  row: RecallLogRow;
  candidates: RecallCandidate[];
};

const listeners = new Set<Listener>();
const sessionRows: RecallLogRow[] = [];
const sessionCandidatesById = new Map<string, RecallCandidate[]>();
let lastDecision: { act: RecallLogRow['act']; candidates: RecallCandidate[] } | null = null;

// Sprint 6 — in-memory candidates cache retention (carry-over 3).
// push() 마다 sessionRows / sessionCandidatesById 에 누적 → 장기 세션 누수 방지.
const MAX_ENTRIES = 200;

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
  sessionCandidatesById.set(row.id, candidates);
  // retention: oldest row + 짝 candidates 폐기. Map.delete 누락 시 Map 만 무한 성장.
  while (sessionRows.length > MAX_ENTRIES) {
    const evicted = sessionRows.shift();
    if (evicted) sessionCandidatesById.delete(evicted.id);
  }
  lastDecision = { act: row.act, candidates };
  for (const l of listeners) l(row);
}

export function getRecent(withinMs: number, now: number = Date.now()): RecallLogRow[] {
  if (!Number.isFinite(withinMs)) return sessionRows.slice();
  const cutoff = now - withinMs;
  return sessionRows.filter((r) => r.decided_at >= cutoff);
}

export function getRecentDetailed(
  withinMs: number,
  now: number = Date.now(),
): RecallLogDetail[] {
  return getRecent(withinMs, now).map((row) => ({
    row,
    candidates: sessionCandidatesById.get(row.id) ?? [],
  }));
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
