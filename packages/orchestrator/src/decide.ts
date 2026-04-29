import type { DecideInput, Decision } from './types.ts';

// 기획서 §16.3: "필요한 순간에만 개입하고, 나머지 시간은 침묵한다."
export function decide(_input: DecideInput): Decision {
  // Sprint 4: trigger/silence rules go here (DecisionAct enum 동결: 'silence' | 'ghost' | 'suggestion' | 'strong')
  return { act: 'silence', reason: 'sprint-0-default-silence' };
}
