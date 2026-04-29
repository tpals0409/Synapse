import type { Message } from '@synapse/protocol';
import { appendMessage, type Database } from '@synapse/storage';
import { gemma } from '@synapse/llm';

export type SendDeps = {
  db: Database;
  complete?: (prompt: string) => Promise<string>;
};

export async function send(text: string, deps: SendDeps): Promise<string> {
  const complete = deps.complete ?? gemma.complete;

  const userMsg: Message = {
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
    ts: Date.now(),
  };
  appendMessage(deps.db, userMsg);

  const reply = await complete(text);

  const asstMsg: Message = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: reply,
    ts: Date.now(),
  };
  appendMessage(deps.db, asstMsg);

  return reply;
}
