import type { EdgeKind } from './concept.ts';

export type RecallSource =
  | 'semantic'
  | 'co_occur'
  | 'mixed'
  | 'bridge'
  | 'temporal'
  | 'domain_crossing';

export type RecallCandidate = {
  conceptId: string;
  label: string;
  score: number;
  source: RecallSource;
};

export type BridgeCandidate = {
  conceptId: string;
  label: string;
  score: number;
  source: 'bridge';
  viaConceptId: string;
  depth: number;
};

export type TemporalCandidate = {
  conceptId: string;
  label: string;
  score: number;
  source: 'temporal';
  windowMs: number;
  coDecidedIds: string[];
};

export type DomainCrossingCandidate = {
  conceptId: string;
  label: string;
  score: number;
  source: 'domain_crossing';
  edgeKindFrom: EdgeKind;
  edgeKindTo: EdgeKind;
};

export type DecisionAct = 'silence' | 'ghost' | 'suggestion' | 'strong';

export type SuppressedReason = 'cooldown' | 'duplicate' | 'low-confidence';

export type RecallLogRow = {
  id: string;
  decided_at: number;
  act: DecisionAct;
  candidate_ids: string[];
  suppressed_reason?: SuppressedReason;
  // [FROZEN v2026-04-29 D-S6-protocol-recall-log-dismissed]
  // Sprint 6 dismiss action 의 결과. 1 = 사용자가 거절한 결정.
  // 미설정 = 0 (silent migration default).
  dismissed?: number;
};

export type DecideContext = {
  userMessage: string;
  candidates: RecallCandidate[];
  recencyMs: number;
  tokenContext: number;
  recentDecisions?: RecallLogRow[];
};
