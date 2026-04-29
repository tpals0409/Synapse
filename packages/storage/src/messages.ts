import type { Message, Role } from '@synapse/protocol';
import type { Database } from './db.ts';

type MessageRow = {
  id: string;
  role: Role;
  content: string;
  ts: number;
};

export function appendMessage(db: Database, msg: Message): void {
  db.prepare(
    'INSERT INTO messages (id, role, content, ts) VALUES (?, ?, ?, ?)',
  ).run(msg.id, msg.role, msg.content, msg.ts);
}

export function listMessages(db: Database): Message[] {
  const rows = db
    .prepare('SELECT id, role, content, ts FROM messages ORDER BY ts ASC')
    .all() as MessageRow[];
  return rows;
}
