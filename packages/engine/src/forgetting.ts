// [FROZEN v2026-04-29 D-S6-forgetting-policy]
// Sprint 6 forgetting decay 정책:
// - shape: 지수 감쇠 (smooth + 단조 감소 + ageMs=halfLifeMs 시 정확히 0.5)
// - half-life: 7d (default 권장 — dev doc §3 [FROZEN v2026-04-29 D-S6-forgetting-policy])
//
// Selected over linear/step: 지수 = 자연 망각 모델 표준, 결정성과 미분 가능성
// 모두 우수. 결정 즉시 적용 + revert 비용 낮음 (함수 1개 + const 1개).

/** 7 days in milliseconds — default half-life for forgetting decay. */
export const DEFAULT_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Exponential decay of a score by age.
 *
 * `decayScore(s, t, h) = s * (0.5)^(t / h)`
 *
 * 성질:
 * - `decayScore(s, 0, h) === s` (즉시 = 감쇠 없음)
 * - `decayScore(s, h, h) === s * 0.5` (half-life 정확)
 * - `decayScore(s, 2h, h) === s * 0.25`
 * - 단조 감소 (ageMs 증가 시 score 감소)
 * - 음수 ageMs (미래 last_used_at) 시 감쇠 없음 (clamp to 1.0 multiplier)
 */
export function decayScore(
  score: number,
  ageMs: number,
  halfLifeMs: number = DEFAULT_HALF_LIFE_MS,
): number {
  if (halfLifeMs <= 0) return score;
  if (ageMs <= 0) return score;
  return score * Math.pow(0.5, ageMs / halfLifeMs);
}
