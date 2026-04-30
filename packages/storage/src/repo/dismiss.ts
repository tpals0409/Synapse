import type { Database } from '../db.ts';

// Sprint 6 — Dismiss (recall_log 갱신 + edges weight 약화).
// [FROZEN v2026-04-29 D-S6-storage-recall-log-dismissed-shape] — dismissed_concept_ids 는
// JSON-encoded string[] (boolean flag X). 이전 dismiss 가 있으면 union 흡수.

// recall_log row 갱신 — dismissed_concept_ids 컬럼에 conceptIds 의 JSON 형 저장.
// 같은 row 가 두 번 dismiss 될 경우 기존 ids 와 union 후 재저장 (멱등).
export function markDismissed(
  db: Database,
  recallLogId: string,
  conceptIds: string[],
): void {
  if (conceptIds.length === 0) return;

  const tx = db.transaction(() => {
    const row = db
      .prepare('SELECT dismissed_concept_ids FROM recall_log WHERE id = ?')
      .get(recallLogId) as { dismissed_concept_ids: string | null } | undefined;
    if (!row) return; // 없는 recallLogId 는 silent no-op (caller 가 stale id 가질 수 있음).

    const existing: string[] = row.dismissed_concept_ids
      ? (JSON.parse(row.dismissed_concept_ids) as string[])
      : [];
    const merged = Array.from(new Set([...existing, ...conceptIds])).sort();

    db.prepare('UPDATE recall_log SET dismissed_concept_ids = ? WHERE id = ?').run(
      JSON.stringify(merged),
      recallLogId,
    );
  });
  tx();
}

// edges weight 약화 (multiplier ∈ (0, 1]). dismiss 시 호출.
// (from_id, to_id) 쌍의 모든 kind 일괄 약화 — 무방향 그래프 정합.
// orchestrator.applyDismiss 의 decayEdges 가 conceptIds pair 별로 호출.
export function decayEdgeWeight(
  db: Database,
  fromId: string,
  toId: string,
  multiplier: number,
): { decayed: number } {
  if (multiplier <= 0 || multiplier > 1) {
    throw new Error(
      `decayEdgeWeight: multiplier must be in (0, 1], got ${multiplier}`,
    );
  }
  const result = db
    .prepare(
      `UPDATE edges SET weight = weight * ?
        WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)`,
    )
    .run(multiplier, fromId, toId, toId, fromId);
  return { decayed: Number(result.changes) };
}
