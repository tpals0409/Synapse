import type { RecallCandidate } from '@synapse/engine';
import type { Message } from '@synapse/protocol';

export type DecisionAct = 'silence' | 'ghost' | 'suggestion' | 'strong';
// Sprint 0: 'silence' 만 사용. ghost/suggestion/strong 은 Sprint 3 에서 활성.

export type Decision = {
  act: DecisionAct;
  reason: string;
  candidates?: RecallCandidate[];
};

export type DecideInput = {
  text: string;
  recentMessages?: Message[];
  candidates?: RecallCandidate[];
};
