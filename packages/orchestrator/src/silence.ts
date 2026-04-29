import type { DecideContext } from '@synapse/protocol';
import type { DecisionAct } from './types.ts';

// Silence rules 후처리. 우선순위:
// 1) cooldown — 동일 candidate id × act ∈ {ghost,suggestion,strong} × decided_at ≥ now - 60_000.
// 2) duplicate — 직전 decision 의 candidate set 동일.
// 3) low-confidence — decide 단계에서 candidates 가 있는데 silence 가 나온 경우 (max score < 0.4).
const COOLDOWN_MS = 60_000;
const RECALL_ACTS: ReadonlySet<DecisionAct> = new Set<DecisionAct>(['ghost', 'suggestion', 'strong']);

export type SilenceResult = {
  act: DecisionAct;
  suppressedReason?: 'cooldown' | 'duplicate' | 'low-confidence';
};

function setEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const x of b) if (!setA.has(x)) return false;
  return true;
}

export function applySilence(decision: DecisionAct, ctx: DecideContext): SilenceResult {
  const recent = ctx.recentDecisions ?? [];
  const candidateIds = ctx.candidates.map((c) => c.conceptId);

  if (RECALL_ACTS.has(decision)) {
    const now = Date.now();
    const cutoff = now - COOLDOWN_MS;
    const cooldownHit = recent.some(
      (row) =>
        row.decided_at >= cutoff &&
        RECALL_ACTS.has(row.act) &&
        row.candidate_ids.some((id) => candidateIds.includes(id)),
    );
    if (cooldownHit) return { act: 'silence', suppressedReason: 'cooldown' };
  }

  if (RECALL_ACTS.has(decision) && recent.length > 0) {
    const lastRecall = recent
      .filter((r) => RECALL_ACTS.has(r.act))
      .reduce<typeof recent[number] | null>(
        (latest, r) => (latest === null || r.decided_at > latest.decided_at ? r : latest),
        null,
      );
    if (
      lastRecall !== null &&
      candidateIds.length > 0 &&
      lastRecall.candidate_ids.length === candidateIds.length &&
      setEqual(lastRecall.candidate_ids, candidateIds)
    ) {
      return { act: 'silence', suppressedReason: 'duplicate' };
    }
  }

  if (decision === 'silence' && ctx.candidates.length > 0) {
    return { act: 'silence', suppressedReason: 'low-confidence' };
  }

  return { act: decision };
}
