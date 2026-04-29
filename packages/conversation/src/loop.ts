import type {
  Message,
  RecallCandidate,
  RecallLogRow,
  DecideContext,
  DecisionAct,
} from '@synapse/protocol';
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
  recallCandidates as defaultRecallCandidates,
  DEFAULT_SEMANTIC_THRESHOLD,
  type Concept,
  type GraphEdge,
  type NearestFn as EngineNearestFn,
  type NearestRecallFn,
  type TraverseFn,
  type NearestHit,
  type EmbeddedConcept,
} from '@synapse/engine';
import { decide as defaultDecide, applySilence } from '@synapse/orchestrator';

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

/**
 * Sprint 4 Recall hook DI.
 *
 * - `recall`: user message → RecallCandidate[]. Default thin-wraps `engine.recallCandidates`;
 *   nearest/traverse 미주입 시 engine 의 empty-graph 관용 처리로 [] 반환.
 *   storage adapter 결합은 mobile chatStore wiring (D-S4-chatStore-recall-wiring) 책임.
 * - `decide`: DecideContext → DecisionAct (4 원). Default = `orchestrator.decide`.
 *   silence 후처리(applySilence)는 conversation 이 정적 import 로 항상 호출
 *   (D-S4-conversation-orchestrator-dep).
 * - `recallStore`: 결정 로그 push + 최근 N ms 조회. mobile platform-adapter 가 native/web
 *   구현 주입 (carry-over 5).
 */
export type RecallFn = (
  userMessage: string,
  opts: {
    db: Database;
    embed?: (text: string) => Promise<Float32Array>;
    nearest?: NearestRecallFn;
    traverse?: TraverseFn;
    semanticThreshold?: number;
    k?: number;
  },
) => Promise<RecallCandidate[]>;

export type DecideFn = (ctx: DecideContext) => DecisionAct;

export type RecallStore = {
  push: (row: RecallLogRow) => void | Promise<void>;
  getRecent: (withinMs: number) => RecallLogRow[];
};

export type RecallHookDeps = {
  /** Override Recall candidate generation. Default: `@synapse/engine`'s `recallCandidates`. */
  recall?: RecallFn;
  /** Override DecisionAct classification. Default: `@synapse/orchestrator`'s `decide`. */
  decide?: DecideFn;
  /** Decision log + recent-window query. Hook is a no-op if omitted. */
  recallStore?: RecallStore;
  /** Approximate token budget for the upcoming completion. Forwarded to `decide` ctx. */
  tokenContext?: number;
  /** Cooldown / recent-window for `recallStore.getRecent`. Default: 60_000 ms. */
  recentWindowMs?: number;
};

export type SendStreamDeps = {
  db: Database;
  completeStream?: (prompt: string) => AsyncIterable<string>;
} & MemoryFormationDeps &
  RecallHookDeps;

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
  const logger: Logger = deps.logger ?? console;

  const ts0 = Date.now();
  const userMsg: Message = {
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
    ts: ts0,
  };
  appendMessage(deps.db, userMsg);

  // Sprint 4 Recall hook — user append 직후 + assistant 첫 chunk 도달 *전*.
  // fire-and-forget; recall/decide 실패는 user reply 흐름과 격리 (silent fallback).
  // Sprint 5 hook 주석: Bridge / Temporal / Domain Crossing 추가 진입점은 본 hook 내부의
  // recall() 어댑터를 확장 (recallCandidates → bridgeCandidates ∪ temporalCandidates ∪ ...).
  void runRecallHook(text, ts0, deps).catch((err) => {
    logger.warn('synapse/conversation: recall hook failed', err);
  });

  let acc = '';
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
  void runMemoryFormation(text, deps).catch((err) => {
    logger.warn('synapse/conversation: memory-formation hook failed', err);
  });
}

const DEFAULT_RECENT_WINDOW_MS = 60_000;

async function runRecallHook(
  userMessage: string,
  userTs: number,
  deps: { db: Database } & RecallHookDeps,
): Promise<void> {
  const store = deps.recallStore;
  if (store === undefined) return;

  const recall: RecallFn = deps.recall ?? defaultRecallCandidates;
  const decideFn: DecideFn = deps.decide ?? defaultDecide;
  const windowMs = deps.recentWindowMs ?? DEFAULT_RECENT_WINDOW_MS;

  const candidates = await recall(userMessage, { db: deps.db });

  const ctx: DecideContext = {
    userMessage,
    candidates,
    recencyMs: Date.now() - userTs,
    tokenContext: deps.tokenContext ?? 0,
    recentDecisions: store.getRecent(windowMs),
  };

  const decision = decideFn(ctx);
  const final = applySilence(decision, ctx);

  const row: RecallLogRow = {
    id: crypto.randomUUID(),
    decided_at: Date.now(),
    act: final.act,
    candidate_ids: candidates.map((c) => c.conceptId),
    suppressed_reason: final.suppressedReason,
  };
  await store.push(row);
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
