export { send, sendStream, runMemoryFormation } from './src/loop.ts';
export type {
  SendDeps,
  SendStreamDeps,
  MemoryFormationDeps,
  RecallHookDeps,
  RetractionHookDeps,
  ExtractConceptsFn,
  EmbedConceptFn,
  BuildEdgesFn,
  NearestFn,
  RecallFn,
  DecideFn,
  RecallStore,
  DetectRetractionFn,
  MarkRetractedFn,
  RollbackCaptureFn,
  MarkDismissedFn,
  Logger,
  OnErrorFn,
} from './src/loop.ts';
export { detectRetractionSignal } from './src/retraction.ts';
