export type {
  Concept,
  EdgeKind,
  GraphEdge,
  RecallReason,
} from './src/types.ts';
export type { RecallCandidate } from '@synapse/protocol';
export { extractConcepts } from './src/extractConcepts.ts';
export type { CompleteFn, ExtractOptions } from './src/extractConcepts.ts';
export { embedConcept, EMBED_DIM } from './src/embed.ts';
export type { EmbedFn, EmbedOptions, EmbeddedConcept } from './src/embed.ts';
export {
  buildEdges,
  DEFAULT_SEMANTIC_THRESHOLD,
  DEFAULT_TOP_K,
} from './src/buildEdges.ts';
export type {
  BuildEdgesOptions,
  NearestFn,
  NearestHit,
} from './src/buildEdges.ts';
export {
  recallCandidates,
  DEFAULT_RECALL_SEMANTIC_THRESHOLD,
  DEFAULT_RECALL_K,
} from './src/recall.ts';
export type {
  RecallCandidatesOptions,
  NearestRecallFn,
  NearestRecallHit,
  TraverseFn,
  TraverseHit,
  BridgeFn,
  TemporalFn,
  DomainCrossingFn,
} from './src/recall.ts';
// Sprint 5 T3 — hyperRecall 3 함수 + defaults + 타입 [FROZEN D-S5-engine-root-index-hyperrecall-export].
export {
  bridgeCandidates,
  temporalCandidates,
  domainCrossingCandidates,
  DEFAULT_BRIDGE_DEPTH,
  DEFAULT_BRIDGE_MAX,
  DEFAULT_TEMPORAL_WINDOW_MS,
  DEFAULT_KIND_WEIGHT,
} from './src/hyperRecall.ts';
export type {
  HyperTraverseFn,
  HyperTraverseHit,
  BridgeCandidatesOptions,
  TemporalCandidatesOptions,
  DomainCrossingCandidatesOptions,
} from './src/hyperRecall.ts';
