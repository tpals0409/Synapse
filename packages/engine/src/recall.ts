import type {
  RecallCandidate,
  RecallLogRow,
  RecallSource,
} from '@synapse/protocol';
import { EMBED_DIM, type EmbedFn } from './embed.ts';
import {
  bridgeCandidates as defaultBridgeCandidates,
  temporalCandidates as defaultTemporalCandidates,
  domainCrossingCandidates as defaultDomainCrossingCandidates,
  type HyperTraverseFn,
} from './hyperRecall.ts';

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

/** Sprint 5 합집합 hooks — 각 신규 source 의 candidate 생성 함수. 미주입 시 hyperRecall 직접. */
export type BridgeFn = (
  seedConceptId: string,
  opts: { db: unknown; traverse: HyperTraverseFn; depth?: number; maxBridges?: number },
) => Promise<RecallCandidate[]>;

export type TemporalFn = (opts: {
  db: unknown;
  recentDecisions: RecallLogRow[];
  windowMs?: number;
}) => Promise<RecallCandidate[]>;

export type DomainCrossingFn = (
  seedConceptId: string,
  opts: { db: unknown; traverse: HyperTraverseFn; kindWeight?: { co_occur: number; semantic: number } },
) => Promise<RecallCandidate[]>;

export type RecallCandidatesOptions = {
  db: unknown;
  embed?: EmbedFn;
  nearest?: NearestRecallFn;
  traverse?: TraverseFn;
  /** Sprint 5 — kind 정보 포함한 traverse. 미주입 시 bridge/domain_crossing 비활성. */
  hyperTraverse?: HyperTraverseFn;
  /** Sprint 5 — 최근 결정 로그. 미주입 시 temporal 비활성. */
  recentDecisions?: RecallLogRow[];
  semanticThreshold?: number;
  k?: number;
  /** DI: bridge generator override. 기본 = hyperRecall.bridgeCandidates. */
  bridge?: BridgeFn;
  /** DI: temporal generator override. 기본 = hyperRecall.temporalCandidates. */
  temporal?: TemporalFn;
  /** DI: domain crossing generator override. 기본 = hyperRecall.domainCrossingCandidates. */
  domainCrossing?: DomainCrossingFn;
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

// FROZEN D-S5-recall-source-priority — primary sort by source enum order, secondary by score desc.
// dedup conceptId — 같은 id 의 두 source hit 시 source='mixed' + score=max (Sprint 4 패턴).
const SOURCE_PRIORITY: Record<RecallSource, number> = {
  mixed: 0,
  semantic: 1,
  co_occur: 2,
  bridge: 3,
  temporal: 4,
  domain_crossing: 5,
};

function mergeCandidate(
  merged: Map<string, RecallCandidate>,
  c: RecallCandidate,
): void {
  const existing = merged.get(c.conceptId);
  if (existing === undefined) {
    merged.set(c.conceptId, c);
    return;
  }
  // 두 source 모두 hit — mixed 로 승격 + score=max + label 우선 기존 보존.
  merged.set(c.conceptId, {
    conceptId: c.conceptId,
    label: existing.label,
    score: Math.max(existing.score, c.score),
    source: 'mixed',
  });
}

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

  // Sprint 5 — Hyper-Recall 합집합. seed = semantic-hit conceptIds (이미 merged 의 keys 중 'semantic'/'mixed').
  if (opts.hyperTraverse) {
    const seeds = Array.from(merged.entries())
      .filter(([, c]) => c.source === 'semantic' || c.source === 'mixed')
      .map(([id]) => id);

    const bridgeFn: BridgeFn =
      opts.bridge ??
      (async (seedId, o) => {
        const cs = await defaultBridgeCandidates(seedId, o);
        return cs as RecallCandidate[];
      });
    const domainCrossingFn: DomainCrossingFn =
      opts.domainCrossing ??
      (async (seedId, o) => {
        const cs = await defaultDomainCrossingCandidates(seedId, o);
        return cs as RecallCandidate[];
      });

    for (const seedId of seeds) {
      const bridges = await bridgeFn(seedId, {
        db: opts.db,
        traverse: opts.hyperTraverse,
      });
      for (const b of bridges) mergeCandidate(merged, b);

      const crossings = await domainCrossingFn(seedId, {
        db: opts.db,
        traverse: opts.hyperTraverse,
      });
      for (const d of crossings) mergeCandidate(merged, d);
    }
  }

  if (opts.recentDecisions !== undefined && opts.recentDecisions.length > 0) {
    const temporalFn: TemporalFn =
      opts.temporal ??
      (async (o) => {
        const cs = await defaultTemporalCandidates(o);
        return cs as RecallCandidate[];
      });
    const temporals = await temporalFn({
      db: opts.db,
      recentDecisions: opts.recentDecisions,
    });
    for (const t of temporals) mergeCandidate(merged, t);
  }

  return Array.from(merged.values()).sort((a, b) => {
    const pa = SOURCE_PRIORITY[a.source];
    const pb = SOURCE_PRIORITY[b.source];
    if (pa !== pb) return pa - pb;
    return b.score - a.score;
  });
}
