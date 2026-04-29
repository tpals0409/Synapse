export type RecallSource = 'semantic' | 'co_occur' | 'mixed';

export type RecallCandidate = {
  conceptId: string;
  label: string;
  score: number;
  source: RecallSource;
};

export type DecisionAct = 'silence' | 'ghost' | 'suggestion' | 'strong';

export type SuppressedReason = 'cooldown' | 'duplicate' | 'low-confidence';

export type RecallLogRow = {
  id: string;
  decided_at: number;
  act: DecisionAct;
  candidate_ids: string[];
  suppressed_reason?: SuppressedReason;
};

export type DecideContext = {
  userMessage: string;
  candidates: RecallCandidate[];
  recencyMs: number;
  tokenContext: number;
  recentDecisions?: RecallLogRow[];
};
