import type {
  Message,
  RecallCandidate,
  RecallLogRow,
  DecideContext,
  DecisionAct,
  Concept,
  GraphEdge,
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
  type NearestFn as EngineNearestFn,
  type NearestRecallFn,
  type TraverseFn,
  type NearestHit,
  type EmbeddedConcept,
} from '@synapse/engine';
import { decide as defaultDecide, applySilence } from '@synapse/orchestrator';
import { detectRetractionSignal as defaultDetectRetraction } from './retraction.ts';

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

/**
 * Sprint 6 Humble Retraction hook DI.
 *
 * - 사용자가 직전 assistant 응답을 부정하는 신호("아니야 / no that's wrong" 등)를 감지한 순간,
 *   직전 assistant 메시지 retracted 마킹 + 직전 turn 의 capture (concepts/edges) 회수.
 * - **caller-pass 모델 ([FROZEN v2026-04-29 D-S6-storage-rollback-caller-pass])**:
 *   conceptIds 는 storage 가 turn_id 로 역추적하지 않고, caller (mobile chatStore) 가 직전 turn 의
 *   `runMemoryFormation.onConcepts` 콜백에서 보유한 list 를 그대로 주입. concepts 에 turn_id 컬럼 X.
 * - 옵션 hook 패턴 (RecallHook 패턴 답습): 의존성 미주입 시 hook noop.
 * - **시그니처 동결 보존**: RecallFn / DecideFn / RecallStore / RecallHookDeps / runMemoryFormation
 *   변경 0 — 신규 `runRetractionHook` 만 추기.
 */
export type DetectRetractionFn = (text: string) => boolean;

export type MarkRetractedFn = (messageId: string) => void;

export type RollbackCaptureFn = (
  conceptIds: string[],
) => { rolledback: number } | void;

export type MarkDismissedFn = (
  recallLogId: string,
  conceptIds: string[],
) => void;

export type RetractionHookDeps = {
  /** Override 부정 신호 감지. Default: regex 기반 `detectRetractionSignal`. */
  detectRetraction?: DetectRetractionFn;
  /** storage `markRetracted` 의 DI 바인딩. 미주입 시 hook noop. */
  markRetracted?: MarkRetractedFn;
  /** storage `rollbackCaptureForTurn` 의 DI 바인딩. 미주입 시 capture 회수만 skip. */
  rollbackCaptureForTurn?: RollbackCaptureFn;
  /**
   * 직전 assistant turn 의 recall_log row dismiss 마킹 (optional).
   * 미주입 시 recall_log 갱신 skip — markRetracted + rollback 만 수행.
   */
  markDismissed?: MarkDismissedFn;
  /** 직전 assistant 메시지 id (caller-pass). 없으면 hook noop. */
  prevAssistantMessageId?: string;
  /** 직전 turn 의 capture concept ids (caller-pass). 비어있으면 rollback skip. */
  prevAssistantConceptIds?: string[];
  /** 직전 turn 의 recall_log row id (caller-pass, optional). markDismissed 호출에 사용. */
  prevRecallLogId?: string;
};

export type SendStreamDeps = {
  db: Database;
  completeStream?: (prompt: string) => AsyncIterable<string>;
} & MemoryFormationDeps &
  RecallHookDeps &
  RetractionHookDeps;

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

  // Sprint 6 Humble Retraction hook — user append 직후 + Recall hook *전*.
  // 부정 신호 hit 시 직전 assistant 메시지 회수 + capture rollback. fire-and-forget; 실패는
  // user reply 흐름과 격리. 의존성 (markRetracted / prevAssistantMessageId) 미주입 시 noop.
  // 시그니처 동결 — RecallFn / DecideFn / RecallStore 변경 0; 신규 `runRetractionHook` 만 추기.
  try {
    runRetractionHook(text, deps);
  } catch (err) {
    logger.warn('synapse/conversation: retraction hook failed', err);
  }

  // Sprint 4 Recall hook — user append 직후 + assistant 첫 chunk 도달 *전*.
  // fire-and-forget; recall/decide 실패는 user reply 흐름과 격리 (silent fallback).
  // Sprint 5 활성화 (D-S5-T5-conversation-hook-activation): Bridge / Temporal / Domain
  // Crossing 3 신규 source 는 engine.recallCandidates 가 합집합으로 자동 반환 (D-S5-T3).
  // hook 시그니처 / 호출 위치 변경 0 — RecallCandidate.source enum 확장만으로 흐름 통과.
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

// Sprint 6 — Humble Retraction.
// 호출 위치 = sendStream 의 user msg append 직후 + Recall hook 전. 동기 (storage repo 함수가 동기).
// 옵션 hook 패턴: 어느 의존성이라도 빠지면 그 단계만 skip — 전체 noop 으로 흐름 보존.
// caller-pass 모델: prevAssistantMessageId / prevAssistantConceptIds / prevRecallLogId 는
// caller (mobile chatStore) 가 직전 turn 끝에서 보유한 값 그대로 주입.
function runRetractionHook(
  userText: string,
  deps: RetractionHookDeps,
): void {
  const detect = deps.detectRetraction ?? defaultDetectRetraction;
  if (!detect(userText)) return;

  // 직전 assistant 메시지가 없으면 hook noop — 첫 user 메시지일 수 있고, 직전 turn 이 user 의
  // 연속 입력일 수도 있다 (chatStore 가 prevAssistantMessageId 를 갱신하지 않은 상태).
  const prevId = deps.prevAssistantMessageId;
  if (!prevId) return;

  // markRetracted 미주입 시 hook 의 핵심 효과가 없으므로 전체 skip (옵션 hook 패턴).
  if (!deps.markRetracted) return;
  deps.markRetracted(prevId);

  const conceptIds = deps.prevAssistantConceptIds ?? [];
  if (conceptIds.length > 0 && deps.rollbackCaptureForTurn) {
    deps.rollbackCaptureForTurn(conceptIds);
  }

  // recall_log dismiss 마킹은 optional — recall hook 이 직전 turn 에 push 한 row id 가 있을 때만.
  if (deps.prevRecallLogId && deps.markDismissed) {
    deps.markDismissed(deps.prevRecallLogId, conceptIds);
  }
}

async function runRecallHook(
  userMessage: string,
  userTs: number,
  deps: { db: Database } & RecallHookDeps,
): Promise<void> {
  const store = deps.recallStore;
  if (store === undefined) return;

  // Sprint 5 활성화: defaultRecallCandidates 가 hyperRecall 3 source (bridge / temporal /
  // domain_crossing) 합집합을 RecallCandidate[] 로 좁혀 반환. 본 hook 은 source-agnostic —
  // candidates.map(c => c.conceptId) 로 그대로 store 에 흘려보낸다 (추가 hook 박지 않음).
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
