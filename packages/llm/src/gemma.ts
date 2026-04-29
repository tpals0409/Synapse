const MODEL = process.env.SYNAPSE_GEMMA_MODEL ?? 'gemma3:4b';
const ENDPOINT = process.env.SYNAPSE_OLLAMA_URL ?? 'http://localhost:11434';

export async function complete(prompt: string): Promise<string> {
  const res = await fetch(`${ENDPOINT}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, stream: false }),
  });
  if (!res.ok) {
    throw new Error(`gemma ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { response: string };
  return data.response;
}

export async function isAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${ENDPOINT}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

export const config = {
  model: MODEL,
  endpoint: ENDPOINT,
};
