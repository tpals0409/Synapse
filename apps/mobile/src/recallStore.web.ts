// Web adapter — Expo Router web export 용 (Sprint 4 receipt step 3 빌드 타깃).
// better-sqlite3 / sqlite-vec 는 native 모듈 → web bundle 에 들어가면 안 됨.
// 이 파일이 platform extension 으로 recallStore.ts 를 대체.
//
// carry-over 5 platform-adapter 두 번째 시범 (첫 시범: conceptStore.{ts,web.ts}):
// - native = @synapse/storage 의 appendRecallLog + recentlyDecidedFor 위임 + observer Set.
// - web = in-memory Array<RecallLogRow> + observer Set. storage 의존 0.
//
// receipt 가 web bundle 의 better-sqlite3/sqlite-vec 0 hits 검증 → 본 파일은
// import 라인이 native-only 모듈을 끌어오면 안 됨.
//
// Sprint 5 [FROZEN v2026-04-29 D-S5-recallStore-detailed-getter] — 신규 export
// `getRecentDetailed` native 짝 (carry-over 5 세 번째 시범). storage 의존 0 그대로.

import type { RecallCandidate, RecallLogRow } from '@synapse/protocol';

type Listener = (row: RecallLogRow) => void;

export type RecallLogDetail = {
  row: RecallLogRow;
  candidates: RecallCandidate[];
};

const memory: RecallLogRow[] = [];
const memoryCandidatesById = new Map<string, RecallCandidate[]>();
const listeners = new Set<Listener>();
let lastDecision: { act: RecallLogRow['act']; candidates: RecallCandidate[] } | null = null;

export function push(
  row: RecallLogRow,
  candidates: RecallCandidate[] = [],
): void {
  memory.push(row);
  memoryCandidatesById.set(row.id, candidates);
  lastDecision = { act: row.act, candidates };
  for (const l of listeners) l(row);
}

export function getRecent(withinMs: number, now: number = Date.now()): RecallLogRow[] {
  if (!Number.isFinite(withinMs)) return memory.slice();
  const cutoff = now - withinMs;
  return memory.filter((r) => r.decided_at >= cutoff);
}

export function getRecentDetailed(
  withinMs: number,
  now: number = Date.now(),
): RecallLogDetail[] {
  return getRecent(withinMs, now).map((row) => ({
    row,
    candidates: memoryCandidatesById.get(row.id) ?? [],
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
