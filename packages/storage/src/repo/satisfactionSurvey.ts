import type { SatisfactionSessionMarker } from '@synapse/protocol';
import type { Database } from '../db.ts';

export type SatisfactionSurveyRow = {
  id: string;
  ts: number;
  score: number;
  comment?: string;
  session_marker: SatisfactionSessionMarker;
};

type SatisfactionSurveyDbRow = {
  id: string;
  ts: number;
  score: number;
  comment: string | null;
  session_marker: SatisfactionSessionMarker;
};

function rowToSurvey(row: SatisfactionSurveyDbRow): SatisfactionSurveyRow {
  const survey: SatisfactionSurveyRow = {
    id: row.id,
    ts: row.ts,
    score: row.score,
    session_marker: row.session_marker,
  };
  if (row.comment !== null) survey.comment = row.comment;
  return survey;
}

export function appendSatisfactionSurvey(
  db: Database,
  row: SatisfactionSurveyRow,
): void {
  const tx = db.transaction(() => {
    // [D-S8-storage-shape-ack] PK conflict 만 IGNORE — score / session_marker CHECK 위반은 throw.
    // (INSERT OR IGNORE 는 CHECK constraint 위반도 swallow 하므로 ON CONFLICT(id) 사용.)
    db.prepare(
      'INSERT INTO satisfaction_survey (id, ts, score, comment, session_marker) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
    ).run(row.id, row.ts, row.score, row.comment ?? null, row.session_marker);
  });
  tx();
}

export type ListSatisfactionSurveysOptions = {
  sinceMs?: number;
  limit?: number;
};

export function listSatisfactionSurveys(
  db: Database,
  opts: ListSatisfactionSurveysOptions = {},
): SatisfactionSurveyRow[] {
  const where: string[] = [];
  const params: number[] = [];
  if (opts.sinceMs !== undefined) {
    where.push('ts >= ?');
    params.push(opts.sinceMs);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limitSql = opts.limit !== undefined ? `LIMIT ${Math.max(0, Math.floor(opts.limit))}` : '';
  const sql = `SELECT id, ts, score, comment, session_marker FROM satisfaction_survey ${whereSql} ORDER BY ts ASC, id ASC ${limitSql}`;
  const rows = db.prepare(sql).all(...params) as SatisfactionSurveyDbRow[];
  return rows.map(rowToSurvey);
}
