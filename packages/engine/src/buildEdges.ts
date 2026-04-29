import type { Concept, GraphEdge } from '@synapse/protocol';
import type { EmbeddedConcept } from './embed.ts';

export type NearestHit = { id: string; score: number };

export type NearestFn = (
  vec: Float32Array,
  k: number,
  opts?: { excludeId?: string },
) => Promise<NearestHit[]>;

export type BuildEdgesOptions = {
  prevMessageConceptIds?: string[];
  nearest?: NearestFn;
  threshold?: number;
  topK?: number;
};

export const DEFAULT_SEMANTIC_THRESHOLD = 0.7;
export const DEFAULT_TOP_K = 5;

function isEmbedded(concept: Concept | EmbeddedConcept): concept is EmbeddedConcept {
  const e = (concept as EmbeddedConcept).embedding;
  return e instanceof Float32Array;
}

export async function buildEdges(
  newConcept: Concept | EmbeddedConcept,
  opts: BuildEdgesOptions = {},
): Promise<GraphEdge[]> {
  const edges: GraphEdge[] = [];

  const prev = opts.prevMessageConceptIds ?? [];
  for (const prevId of prev) {
    if (prevId === newConcept.id) continue;
    edges.push({ fromId: newConcept.id, toId: prevId, weight: 1.0, kind: 'co_occur' });
  }

  if (opts.nearest && isEmbedded(newConcept)) {
    const threshold = opts.threshold ?? DEFAULT_SEMANTIC_THRESHOLD;
    const k = opts.topK ?? DEFAULT_TOP_K;
    const hits = await opts.nearest(newConcept.embedding, k, {
      excludeId: newConcept.id,
    });
    for (const hit of hits) {
      if (hit.id === newConcept.id) continue;
      if (hit.score >= threshold) {
        edges.push({ fromId: newConcept.id, toId: hit.id, weight: hit.score, kind: 'semantic' });
      }
    }
  }

  return edges;
}
