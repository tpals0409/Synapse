import type { Database } from '../db.ts';

// Sprint 6 — Humble Retraction (직전 assistant 메시지 회수 + capture 결과 회수).
// [FROZEN v2026-04-29 D-S6-storage-rollback-caller-pass] — caller-pass 모델.
// concepts 에 turn_id 컬럼 X. caller (conversation runRetractionHook) 가 직전 turn 의
// conceptIds list 를 *직접 보유* + 전달.
// [FROZEN v2026-04-29 D-S6-storage-rollback-shape] — concepts/edges hard-delete + vec_concepts
// 동기 삭제. soft-delete 는 Sprint 7+ (revert 비용 ~1시간).

export function markRetracted(db: Database, messageId: string): void {
  db.prepare('UPDATE messages SET retracted = 1 WHERE id = ?').run(messageId);
}

// turn 단위 capture 결과 회수.
// caller 가 conceptIds 를 전달 — 보통 직전 assistant turn 에서 capture 된 concept ids.
// 동작: (1) edges 에서 conceptIds 를 from 또는 to 로 가진 edge DELETE
//       (2) vec_concepts 에서 conceptIds 의 rowid DELETE
//       (3) concepts 에서 conceptIds DELETE
// 트랜잭션 — 부분 실패 시 전체 롤백.
// 반환: 회수된 concepts row 수 (edges/vec 는 부수 효과).
export function rollbackCaptureForTurn(
  db: Database,
  conceptIds: string[],
): { rolledback: number } {
  if (conceptIds.length === 0) return { rolledback: 0 };

  const placeholders = conceptIds.map(() => '?').join(',');
  let rolledback = 0;

  const tx = db.transaction(() => {
    // 1. edges 삭제 (from 또는 to 가 conceptIds 에 속하는 edge).
    db.prepare(
      `DELETE FROM edges WHERE from_id IN (${placeholders}) OR to_id IN (${placeholders})`,
    ).run(...conceptIds, ...conceptIds);

    // 2. vec_concepts 삭제 (concepts.rowid 와 매핑되어 있음 — concepts 삭제 *전* 에 rowid 조회).
    const rowidRows = db
      .prepare(
        `SELECT rowid FROM concepts WHERE id IN (${placeholders}) ORDER BY id ASC`,
      )
      .all(...conceptIds) as { rowid: number }[];
    for (const r of rowidRows) {
      db.prepare('DELETE FROM vec_concepts WHERE rowid = ?').run(r.rowid);
    }

    // 3. concepts 삭제.
    const result = db
      .prepare(`DELETE FROM concepts WHERE id IN (${placeholders})`)
      .run(...conceptIds);
    rolledback = Number(result.changes);
  });
  tx();

  return { rolledback };
}
