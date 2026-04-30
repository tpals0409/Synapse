import type { DecisionAct } from './types.ts';

// Sprint 6 — Dismiss action (T5).
// 사용자가 Inspector / Suggestion / Strong UI 의 거절 버튼을 누른 시점에 호출되는 action.
//
// 헌법 (4 원 enum 동결):
//   `act` 확장 X — DecisionAct 는 silence/ghost/suggestion/strong 4 원 그대로 (Sprint 3 carry-over 2,
//   `decision_orchestrator_enum.md`). dismissed 는 별도 컬럼 (`recall_log.dismissed_concept_ids`,
//   D-S6-storage-recall-log-dismissed-shape) 패턴 — applyDismiss 의 반환값에도 DecisionAct 노출 X.
//
// 책임:
//   1) markDismissed — recall_log row 의 dismissed_concept_ids 갱신 (storage T2 DI).
//   2) decayEdges    — conceptIds 한정 edges weight 약화 (storage T2 DI, default penalty 0.5).
//   3) pruneEdgesBelow? — 옵션 — 임계 미만 edge 자동 prune (storage forgetting.pruneEdgesBelow DI).
//
// idempotent — 같은 decisionId 두 번 호출 시 markDismissed 는 같은 값을 set, decayEdges 는 누적
// (호출자가 누적 회수를 원할 때만 두 번 호출하는 계약).

// [DIRECTIVE D-S7-orchestrator-pruneEdges-signature-mismatch]
// pruneEdgesBelow DI 시그니처 = `(threshold) => { pruned: number }` — storage SoT (헌법 #1).
// Sprint 6 의 `=> number` narrow 는 storage truth 와 mismatch 였음 — storage forgetting.ts:61
// `pruneEdgesBelow(db, threshold): { pruned: number }` 그대로 정합. mock + 실어댑터 양쪽
// extraction (`.pruned`) 이 사라져 wiring 비용 0.
export type DismissOptions = {
  markDismissed: (recallLogId: string, conceptIds: string[]) => void;
  decayEdges: (conceptIds: string[], penalty: number) => void;
  pruneEdgesBelow?: (threshold: number) => { pruned: number };
  penalty?: number;
  pruneThreshold?: number;
};

export type DismissResult = {
  decayed: number;
  pruned: number;
};

const DEFAULT_PENALTY = 0.5;
const DEFAULT_PRUNE_THRESHOLD = 0.05;

export function applyDismiss(
  decisionId: string,
  conceptIds: string[],
  opts: DismissOptions,
): DismissResult {
  const penalty = opts.penalty ?? DEFAULT_PENALTY;
  const pruneThreshold = opts.pruneThreshold ?? DEFAULT_PRUNE_THRESHOLD;

  opts.markDismissed(decisionId, conceptIds);

  let decayed = 0;
  if (conceptIds.length > 0) {
    opts.decayEdges(conceptIds, penalty);
    decayed = conceptIds.length;
  }

  let pruned = 0;
  if (opts.pruneEdgesBelow !== undefined) {
    pruned = opts.pruneEdgesBelow(pruneThreshold).pruned;
  }

  return { decayed, pruned };
}

// 4 원 enum drift guard — 본 모듈은 DecisionAct 를 *반환하지 않는다*.
// 컴파일 타임 가드: applyDismiss 의 ReturnType 이 DecisionAct 를 포함하지 않는지 검증.
// (테스트에서 `Exclude<DismissResult[keyof DismissResult], DecisionAct>` 로 확인)
export type _DismissResultIsNotAct = Exclude<DismissResult[keyof DismissResult], DecisionAct>;
