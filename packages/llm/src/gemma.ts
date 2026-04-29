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

export async function* completeStream(prompt: string): AsyncIterable<string> {
  const res = await fetch(`${ENDPOINT}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, stream: true }),
  });
  if (!res.ok) {
    throw new Error(`gemma ${res.status}: ${await res.text()}`);
  }
  if (!res.body) {
    throw new Error('gemma: response body is empty');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl = buffer.indexOf('\n');
      while (nl !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line.length > 0) {
          const parsed = JSON.parse(line) as { response?: string; done?: boolean };
          if (typeof parsed.response === 'string' && parsed.response.length > 0) {
            yield parsed.response;
          }
          if (parsed.done) return;
        }
        nl = buffer.indexOf('\n');
      }
    }

    const tail = buffer.trim();
    if (tail.length > 0) {
      const parsed = JSON.parse(tail) as { response?: string; done?: boolean };
      if (typeof parsed.response === 'string' && parsed.response.length > 0) {
        yield parsed.response;
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore — already released
    }
  }
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
