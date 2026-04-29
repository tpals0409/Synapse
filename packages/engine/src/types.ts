export type Concept = {
  id: string;
  label: string;
  embedding?: number[];
  createdAt: number;
};

export type EdgeKind = 'co_occur' | 'semantic' | 'bridge' | 'temporal';

export type GraphEdge = {
  from: string;
  to: string;
  weight: number;
  kind: EdgeKind;
};

export type RecallReason = 'semantic' | 'bridge' | 'temporal' | 'domain_crossing';

export type RecallCandidate = {
  conceptId: string;
  score: number;
  reason: RecallReason;
  sourceMessageId?: string;
};
