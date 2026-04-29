import type { DecisionAct, RecallLogRow, SuppressedReason } from '@synapse/protocol';
import type { Database } from '../db.ts';

type RecallLogDbRow = {
  id: string;
  decided_at: number;
  act: DecisionAct;
  candidate_ids: string;
  suppressed_reason: SuppressedReason | null;
};

function rowToLog(row: RecallLogDbRow): RecallLogRow {
  const log: RecallLogRow = {
    id: row.id,
    decided_at: row.decided_at,
    act: row.act,
    candidate_ids: JSON.parse(row.candidate_ids) as string[],
  };
  if (row.suppressed_reason !== null) log.suppressed_reason = row.suppressed_reason;
  return log;
}

export function appendRecallLog(db: Database, log: RecallLogRow): void {
  const tx = db.transaction(() => {
    db.prepare(
      'INSERT OR IGNORE INTO recall_log (id, decided_at, act, candidate_ids, suppressed_reason) VALUES (?, ?, ?, ?, ?)',
    ).run(
      log.id,
      log.decided_at,
      log.act,
      JSON.stringify(log.candidate_ids),
      log.suppressed_reason ?? null,
    );
  });
  tx();
}

export function recentlyDecidedFor(
  db: Database,
  candidateId: string,
  withinMs: number,
  now: number = Date.now(),
): RecallLogRow | null {
  // candidate_ids 는 JSON.stringify 결과 (예: '["c1","c2"]'). LIKE 단순 매칭.
  const pattern = `%"${candidateId}"%`;
  const row = db
    .prepare(
      `SELECT id, decided_at, act, candidate_ids, suppressed_reason
       FROM recall_log
       WHERE decided_at >= ? AND candidate_ids LIKE ?
       ORDER BY decided_at DESC
       LIMIT 1`,
    )
    .get(now - withinMs, pattern) as RecallLogDbRow | undefined;
  return row ? rowToLog(row) : null;
}
