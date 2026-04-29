import type { Message } from '@synapse/protocol';
import { appendMessage, type Database } from '@synapse/storage';
import { gemma } from '@synapse/llm';

export type SendDeps = {
  db: Database;
  complete?: (prompt: string) => Promise<string>;
};

export type SendStreamDeps = {
  db: Database;
  completeStream?: (prompt: string) => AsyncIterable<string>;
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

export async function* sendStream(
  text: string,
  deps: SendStreamDeps,
): AsyncIterable<string> {
  const completeStream = deps.completeStream ?? gemma.completeStream;

  const ts0 = Date.now();
  const userMsg: Message = {
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
    ts: ts0,
  };
  appendMessage(deps.db, userMsg);

  let acc = '';
  // Sprint 4: orchestrator.decide(...) gate goes here — silence default keeps yield path open
  for await (const chunk of completeStream(text)) {
    acc += chunk;
    yield chunk;
  }

  const ts1 = Date.now();
  const asstMsg: Message = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: acc,
    ts: ts1,
    latency_ms: ts1 - ts0,
  };
  appendMessage(deps.db, asstMsg);
}
