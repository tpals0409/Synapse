import { randomUUID } from 'node:crypto';
import type { Concept } from './types.ts';

export type CompleteFn = (opts: {
  system: string;
  user: string;
  format: 'json';
}) => Promise<string>;

export type ExtractOptions = {
  complete?: CompleteFn;
  now?: () => number;
  newId?: () => string;
};

const SYSTEM_PROMPT =
  '사용자 발화에서 핵심 Concept ≤3 개 추출, label 한국어 명사구. 반드시 {"concepts":[{"label":"..."}]} 형식의 JSON 으로 응답하라.';

const ENDPOINT = process.env.SYNAPSE_OLLAMA_URL ?? 'http://localhost:11434';
const MODEL = process.env.SYNAPSE_GEMMA_MODEL ?? 'gemma3:4b';

const defaultComplete: CompleteFn = async ({ system, user, format }) => {
  const res = await fetch(`${ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      format,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`gemma extract ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? '';
};

type RawConcept = { label?: unknown };
type RawPayload = { concepts?: unknown };

function parseLabels(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const payload = parsed as RawPayload;
  const arr = Array.isArray(payload?.concepts) ? payload.concepts : [];
  const labels: string[] = [];
  for (const item of arr as RawConcept[]) {
    if (item && typeof item.label === 'string') {
      const trimmed = item.label.trim();
      if (trimmed.length > 0) labels.push(trimmed);
    }
  }
  return labels;
}

export async function extractConcepts(
  message: string,
  opts: ExtractOptions = {},
): Promise<Concept[]> {
  const complete = opts.complete ?? defaultComplete;
  const now = opts.now ?? Date.now;
  const newId = opts.newId ?? randomUUID;

  const raw = await complete({ system: SYSTEM_PROMPT, user: message, format: 'json' });
  const labels = parseLabels(raw).slice(0, 3);
  const createdAt = now();
  return labels.map((label) => ({ id: newId(), label, createdAt }));
}
