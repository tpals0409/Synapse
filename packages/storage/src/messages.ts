import type { Message, Role } from '@synapse/protocol';
import type { Database } from './db.ts';

type MessageRow = {
  id: string;
  role: Role;
  content: string;
  ts: number;
  latency_ms: number | null;
  retracted: number;
};

export function appendMessage(db: Database, msg: Message): void {
  db.prepare(
    'INSERT INTO messages (id, role, content, ts, latency_ms) VALUES (?, ?, ?, ?, ?)',
  ).run(msg.id, msg.role, msg.content, msg.ts, msg.latency_ms ?? null);
}

export function listMessages(db: Database): Message[] {
  // [FROZEN v2026-04-29 D-S6-storage-listMessages-retracted] retracted 컬럼 노출.
  // ORDER BY ts ASC, id ASC — ts tie 시 id 결정성 (carry-over 6 audit 잔여 흡수).
  const rows = db
    .prepare(
      'SELECT id, role, content, ts, latency_ms, retracted FROM messages ORDER BY ts ASC, id ASC',
    )
    .all() as MessageRow[];
  return rows.map((r) => {
    const msg: Message = { id: r.id, role: r.role, content: r.content, ts: r.ts };
    if (r.latency_ms !== null) msg.latency_ms = r.latency_ms;
    if (r.retracted) msg.retracted = r.retracted;
    return msg;
  });
}
