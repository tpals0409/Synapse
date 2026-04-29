import type { RecallCandidate } from '@synapse/protocol';
import { EMBED_DIM, type EmbedFn } from './embed.ts';

export type NearestRecallHit = { id: string; label: string; score: number };

export type NearestRecallFn = (
  db: unknown,
  vec: Float32Array,
  k: number,
) => Promise<NearestRecallHit[]>;

export type TraverseHit = { id: string; label: string; weight: number };

export type TraverseFn = (
  db: unknown,
  conceptId: string,
  depth: number,
) => Promise<TraverseHit[]>;

export type RecallCandidatesOptions = {
  db: unknown;
  embed?: EmbedFn;
  nearest?: NearestRecallFn;
  traverse?: TraverseFn;
  semanticThreshold?: number;
  k?: number;
};

export const DEFAULT_RECALL_SEMANTIC_THRESHOLD = 0.5;
export const DEFAULT_RECALL_K = 5;

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

export async function recallCandidates(
  userMessage: string,
  opts: RecallCandidatesOptions,
): Promise<RecallCandidate[]> {
  const embed = opts.embed ?? defaultEmbed;
  const nearest = opts.nearest;
  const traverse = opts.traverse;
  const threshold = opts.semanticThreshold ?? DEFAULT_RECALL_SEMANTIC_THRESHOLD;
  const k = opts.k ?? DEFAULT_RECALL_K;

  if (!nearest) return [];

  const vec = await embed(userMessage);
  if (vec.length !== EMBED_DIM) {
    throw new Error(
      `engine.recallCandidates: expected ${EMBED_DIM}-dim embedding, got ${vec.length}`,
    );
  }

  const semanticHits = await nearest(opts.db, vec, k);
  const merged = new Map<string, RecallCandidate>();

  for (const hit of semanticHits) {
    if (hit.score < threshold) continue;
    merged.set(hit.id, {
      conceptId: hit.id,
      label: hit.label,
      score: hit.score,
      source: 'semantic',
    });
  }

  if (traverse) {
    const semanticIds = Array.from(merged.keys());
    for (const seedId of semanticIds) {
      const neighbors = await traverse(opts.db, seedId, 1);
      for (const n of neighbors) {
        if (n.id === seedId) continue;
        const existing = merged.get(n.id);
        if (existing) {
          if (existing.source === 'semantic' || existing.source === 'mixed') {
            merged.set(n.id, {
              conceptId: n.id,
              label: existing.label,
              score: Math.max(existing.score, n.weight),
              source: 'mixed',
            });
          }
        } else {
          merged.set(n.id, {
            conceptId: n.id,
            label: n.label,
            score: n.weight,
            source: 'co_occur',
          });
        }
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.score - a.score);
}
