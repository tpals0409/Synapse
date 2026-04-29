import type { Concept } from '@synapse/protocol';

export const EMBED_DIM = 768;

export type EmbedFn = (text: string) => Promise<Float32Array>;

export type EmbedOptions = {
  embed?: EmbedFn;
};

export type EmbeddedConcept = Omit<Concept, 'embedding'> & { embedding: Float32Array };

const ENDPOINT = process.env.SYNAPSE_OLLAMA_URL ?? 'http://localhost:11434';
const MODEL = process.env.SYNAPSE_EMBED_MODEL ?? 'embeddinggemma:latest';

const defaultEmbed: EmbedFn = async (text) => {
  const res = await fetch(`${ENDPOINT}/api/embeddings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: text }),
  });
  if (!res.ok) {
    throw new Error(`gemma embed ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { embedding?: number[] };
  if (!Array.isArray(data.embedding)) {
    throw new Error('gemma embed: missing embedding field');
  }
  return Float32Array.from(data.embedding);
};

export async function embedConcept(
  concept: Concept,
  opts: EmbedOptions = {},
): Promise<EmbeddedConcept> {
  const embed = opts.embed ?? defaultEmbed;
  const vec = await embed(concept.label);
  if (vec.length !== EMBED_DIM) {
    throw new Error(
      `engine.embedConcept: expected ${EMBED_DIM}-dim embedding, got ${vec.length}`,
    );
  }
  return { ...concept, embedding: vec };
}
