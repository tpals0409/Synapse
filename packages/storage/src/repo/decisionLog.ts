import type { Database } from '../db.ts';

export type DecisionLogRow = {
  id: string;
  ts: number;
  actor: string;
  action: string;
  payload?: string;
};

type DecisionLogDbRow = {
  id: string;
  ts: number;
  actor: string;
  action: string;
  payload: string | null;
};

function rowToLog(row: DecisionLogDbRow): DecisionLogRow {
  const log: DecisionLogRow = {
    id: row.id,
    ts: row.ts,
    actor: row.actor,
    action: row.action,
  };
  if (row.payload !== null) log.payload = row.payload;
  return log;
}

export function appendDecisionLog(db: Database, row: DecisionLogRow): void {
  const tx = db.transaction(() => {
    db.prepare(
      'INSERT OR IGNORE INTO decision_log (id, ts, actor, action, payload) VALUES (?, ?, ?, ?, ?)',
    ).run(row.id, row.ts, row.actor, row.action, row.payload ?? null);
  });
  tx();
}

export type ListDecisionLogOptions = {
  sinceMs?: number;
  actor?: string;
  action?: string;
  limit?: number;
};

export function listDecisionLog(
  db: Database,
  opts: ListDecisionLogOptions = {},
): DecisionLogRow[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.sinceMs !== undefined) {
    where.push('ts >= ?');
    params.push(opts.sinceMs);
  }
  if (opts.actor !== undefined) {
    where.push('actor = ?');
    params.push(opts.actor);
  }
  if (opts.action !== undefined) {
    where.push('action = ?');
    params.push(opts.action);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limitSql = opts.limit !== undefined ? `LIMIT ${Math.max(0, Math.floor(opts.limit))}` : '';
  // ts ASC 결정성 — tie 시 id ASC secondary (D-S6-storage-sql-secondary-sort-audit 정합).
  const sql = `SELECT id, ts, actor, action, payload FROM decision_log ${whereSql} ORDER BY ts ASC, id ASC ${limitSql}`;
  const rows = db.prepare(sql).all(...params) as DecisionLogDbRow[];
  return rows.map(rowToLog);
}
