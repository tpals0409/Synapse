export { openDb } from './src/db.ts';
export { migrate } from './src/migrate.ts';
export { appendMessage, listMessages } from './src/messages.ts';
export { appendConcept, appendEdge, traverse } from './src/repo/graph.ts';
export { nearestConcepts } from './src/repo/embed.ts';
export { appendRecallLog, recentlyDecidedFor } from './src/repo/recall.ts';
export {
  decayWeights,
  pruneEdgesBelow,
  recordTouch,
  recordEdgeTouch,
  getLastUsedAt,
} from './src/repo/forgetting.ts';
export { markRetracted, rollbackCaptureForTurn } from './src/repo/retraction.ts';
export { markDismissed, decayEdgeWeight } from './src/repo/dismiss.ts';
export { appendDecisionLog, listDecisionLog } from './src/repo/decisionLog.ts';
export type { DecisionLogRow, ListDecisionLogOptions } from './src/repo/decisionLog.ts';
export {
  appendSatisfactionSurvey,
  listSatisfactionSurveys,
} from './src/repo/satisfactionSurvey.ts';
export type {
  SatisfactionSurveyRow,
  ListSatisfactionSurveysOptions,
} from './src/repo/satisfactionSurvey.ts';
export { seedFullJourney } from './src/repo/seedFullJourney.ts';
export type { FullJourneyFixture } from './src/repo/seedFullJourney.ts';
export type { NearestConcept } from './src/repo/embed.ts';
export type { TraverseHit } from './src/repo/graph.ts';
export type { DecayOptions } from './src/repo/forgetting.ts';
export type { EdgeKind } from '@synapse/protocol';
export type { Database } from './src/db.ts';
