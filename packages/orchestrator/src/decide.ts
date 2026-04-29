import type { DecideContext } from '@synapse/protocol';
import type { DecisionAct } from './types.ts';

// 4 원 enum 동결 (decision_orchestrator_enum.md). Sprint 4 처음으로 모두 사용.
// 정량 규칙: §sprint-4 dev doc §7.
const SCORE_GHOST = 0.4;
const SCORE_SUGGESTION = 0.6;
const SCORE_STRONG = 0.8;
const TOKEN_CONTEXT_WEAKEN = 2000;
const RECENCY_MS_WEAKEN = 1500;

const WEAKEN: Record<DecisionAct, DecisionAct> = {
  strong: 'suggestion',
  suggestion: 'ghost',
  ghost: 'silence',
  silence: 'silence',
};

function classifyByScore(maxScore: number): DecisionAct {
  if (maxScore < SCORE_GHOST) return 'silence';
  if (maxScore < SCORE_SUGGESTION) return 'ghost';
  if (maxScore < SCORE_STRONG) return 'suggestion';
  return 'strong';
}

export function decide(ctx: DecideContext): DecisionAct {
  if (ctx.candidates.length === 0) return 'silence';

  const maxScore = ctx.candidates.reduce((m, c) => (c.score > m ? c.score : m), -Infinity);
  let act = classifyByScore(maxScore);

  if (ctx.tokenContext > TOKEN_CONTEXT_WEAKEN) act = WEAKEN[act];
  if (ctx.recencyMs < RECENCY_MS_WEAKEN) act = WEAKEN[act];

  return act;
}
