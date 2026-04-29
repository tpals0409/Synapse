import type { DecideContext, RecallSource } from '@synapse/protocol';
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

// FROZEN D-S5-orchestrator-decide-hyper-source — weak source (bridge/temporal/domain_crossing)
// 의 최고 score 가 결정에 반영될 때 1 단계 추가 약화. strong source (mixed/semantic/co_occur)
// 는 약화 면제. 기존 WEAKEN map 재사용 = 결정성 유지 + 신규 분기 0.
const WEAK_SOURCES: ReadonlySet<RecallSource> = new Set<RecallSource>([
  'bridge',
  'temporal',
  'domain_crossing',
]);

function classifyByScore(maxScore: number): DecisionAct {
  if (maxScore < SCORE_GHOST) return 'silence';
  if (maxScore < SCORE_SUGGESTION) return 'ghost';
  if (maxScore < SCORE_STRONG) return 'suggestion';
  return 'strong';
}

export function decide(ctx: DecideContext): DecisionAct {
  if (ctx.candidates.length === 0) return 'silence';

  let maxScore = -Infinity;
  let maxIsWeakOnly = false;
  for (const c of ctx.candidates) {
    if (c.score > maxScore) {
      maxScore = c.score;
      maxIsWeakOnly = WEAK_SOURCES.has(c.source);
    } else if (c.score === maxScore && !WEAK_SOURCES.has(c.source)) {
      // 동일 max 를 가진 strong source 가 같이 존재 → 약화 면제 (strong 가중).
      maxIsWeakOnly = false;
    }
  }

  let act = classifyByScore(maxScore);

  if (ctx.tokenContext > TOKEN_CONTEXT_WEAKEN) act = WEAKEN[act];
  if (ctx.recencyMs < RECENCY_MS_WEAKEN) act = WEAKEN[act];
  if (maxIsWeakOnly) act = WEAKEN[act];

  return act;
}
