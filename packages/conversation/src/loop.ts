import type { Message } from '@synapse/protocol';
import {
  appendMessage,
  appendConcept,
  appendEdge,
  nearestConcepts as defaultNearestConcepts,
  type Database,
} from '@synapse/storage';
import { gemma } from '@synapse/llm';
import {
  extractConcepts as defaultExtractConcepts,
  embedConcept as defaultEmbedConcept,
  buildEdges as defaultBuildEdges,
  DEFAULT_SEMANTIC_THRESHOLD,
  type Concept,
  type GraphEdge,
  type NearestFn as EngineNearestFn,
  type NearestHit,
  type EmbeddedConcept,
} from '@synapse/engine';

export type SendDeps = {
  db: Database;
  complete?: (prompt: string) => Promise<string>;
};

type CompleteJsonFn = (opts: {
  system: string;
  user: string;
  format: 'json';
}) => Promise<string>;

export type ExtractConceptsFn = (
  message: string,
  opts?: { complete?: CompleteJsonFn },
) => Promise<Concept[]>;

export type EmbedConceptFn = (
  concept: Concept,
  opts?: { embed?: (text: string) => Promise<Float32Array> },
) => Promise<EmbeddedConcept>;

export type NearestFn = EngineNearestFn;

export type BuildEdgesFn = (
  newConcept: Concept | EmbeddedConcept,
  opts: {
    prevMessageConceptIds?: string[];
    nearest?: EngineNearestFn;
    threshold?: number;
    topK?: number;
  },
) => Promise<GraphEdge[]>;

export type Logger = { warn: (...args: unknown[]) => void };

export type MemoryFormationDeps = {
  /** Override Concept extraction. Default: `@synapse/engine`'s `extractConcepts`. */
  extractConcepts?: ExtractConceptsFn;
  /** Override Concept embedding. Default: `@synapse/engine`'s `embedConcept`. */
  embedConcept?: EmbedConceptFn;
  /** Override edge construction. Default: `@synapse/engine`'s `buildEdges`. */
  buildEdges?: BuildEdgesFn;
  /** Forwarded to the underlying extractor (Gemma JSON mode). */
  completeJson?: CompleteJsonFn;
  /** Forwarded to the underlying embedder. */
  embed?: (text: string) => Promise<Float32Array>;
  /**
   * Top-k nearest-neighbor lookup for `semantic` edges. Default binds storage's
   * `nearestConcepts` against `deps.db`. Inject to stub during tests.
   */
  nearest?: EngineNearestFn;
  /** Concept ids of the previous user turn — used for `co_occur` edges. */
  prevMessageConceptIds?: string[];
  /** Cosine threshold for `semantic` edges. Default mirrors engine's `DEFAULT_SEMANTIC_THRESHOLD` (0.7). */
  semanticThreshold?: number;
  /** Notified once per `sendStream` call with the freshly persisted concepts (≤3). */
  onConcepts?: (concepts: Concept[]) => void;
  /** Where hook failures land. Default `console`. */
  logger?: Logger;
};

export type SendStreamDeps = {
  db: Database;
  completeStream?: (prompt: string) => AsyncIterable<string>;
} & MemoryFormationDeps;

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

  // Sprint 3 memory-formation hook — fire-and-forget; failures are logged, never surface to user.
  const logger: Logger = deps.logger ?? console;
  void runMemoryFormation(text, deps).catch((err) => {
    logger.warn('synapse/conversation: memory-formation hook failed', err);
  });
}

export async function runMemoryFormation(
  userMessage: string,
  deps: { db: Database } & MemoryFormationDeps,
): Promise<Concept[]> {
  const extract = deps.extractConcepts ?? defaultExtractConcepts;
  const embed = deps.embedConcept ?? defaultEmbedConcept;
  const buildEdgesFn = deps.buildEdges ?? defaultBuildEdges;
  const threshold = deps.semanticThreshold ?? DEFAULT_SEMANTIC_THRESHOLD;
  const nearest: EngineNearestFn =
    deps.nearest ??
    ((vec: Float32Array, k: number, opts?: { excludeId?: string }): Promise<NearestHit[]> =>
      defaultNearestConcepts(deps.db, vec, k, opts));

  const concepts = await extract(userMessage, { complete: deps.completeJson });
  if (concepts.length === 0) return [];

  const embedded = await Promise.all(
    concepts.map((c) => embed(c, { embed: deps.embed })),
  );

  for (const c of embedded) {
    const persisted: Concept = {
      ...c,
      embedding: Array.from(c.embedding),
    };
    appendConcept(deps.db, persisted);

    const edges = await buildEdgesFn(c, {
      prevMessageConceptIds: deps.prevMessageConceptIds,
      nearest,
      threshold,
    });
    for (const edge of edges) {
      appendEdge(deps.db, edge);
    }
  }

  // Strip the Float32Array before notifying — observers receive plain Concepts.
  const notified: Concept[] = embedded.map((c) => ({
    ...c,
    embedding: Array.from(c.embedding),
  }));
  deps.onConcepts?.(notified);
  return notified;
}
