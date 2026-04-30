import type { Database } from '../db.ts';

// Sprint 6 — Forgetting (시간 감쇠 + edge prune + last_used_at 갱신).
// engine 워커가 decay 함수 형태/half-life 를 결정 (D-S6-forgetting-policy: half-life=7d).
// storage 책임 = 입력 신호 (last_used_at) 갱신 + edge weight 약화/prune 의 SQL primitives.

export type DecayOptions = {
  now: number;
  halfLifeMs: number;
};

// 모든 edges 의 weight 를 last_used_at 기준 지수 감쇠 적용.
// new_weight = weight * exp(-(now - last_used_at) / halfLifeMs * ln2)
// last_used_at = 0 (epoch — 한 번도 touch 안 된 row) 도 동일 공식 적용 → 큰 age → 거의 0.
// SQLite 는 exp/ln 내장 함수 X — JS 에서 계산 후 UPDATE batch 적용.
// 반환: decay 가 *실제로* weight 를 변경한 row 수 (age=0 인 fresh edge 는 변동 0).
export function decayWeights(db: Database, opts: DecayOptions): { decayed: number } {
  const { now, halfLifeMs } = opts;
  if (halfLifeMs <= 0) {
    throw new Error(`decayWeights: halfLifeMs must be > 0, got ${halfLifeMs}`);
  }

  const ln2 = Math.LN2;
  const rows = db
    .prepare(
      'SELECT from_id, to_id, kind, weight, last_used_at FROM edges ORDER BY from_id ASC, to_id ASC, kind ASC',
    )
    .all() as {
    from_id: string;
    to_id: string;
    kind: string;
    weight: number;
    last_used_at: number;
  }[];

  const update = db.prepare(
    'UPDATE edges SET weight = ? WHERE from_id = ? AND to_id = ? AND kind = ?',
  );

  let decayed = 0;
  const tx = db.transaction(() => {
    for (const row of rows) {
      const ageMs = Math.max(0, now - row.last_used_at);
      const factor = Math.exp(-(ageMs / halfLifeMs) * ln2);
      const newWeight = row.weight * factor;
      // floating-point exact compare — factor === 1 일 때만 변동 0.
      if (newWeight !== row.weight) {
        update.run(newWeight, row.from_id, row.to_id, row.kind);
        decayed += 1;
      }
    }
  });
  tx();

  return { decayed };
}

// weight < threshold 인 edge 자동 삭제.
// hard-delete (D-S6-storage-rollback-shape 정합 — soft-delete 는 Sprint 7+).
// 반환: 삭제된 row 수.
export function pruneEdgesBelow(db: Database, threshold: number): { pruned: number } {
  const result = db.prepare('DELETE FROM edges WHERE weight < ?').run(threshold);
  return { pruned: Number(result.changes) };
}

// concepts.last_used_at = now 갱신 (nearest/traverse hit 시점 호출).
// 존재하지 않는 conceptId 는 silent no-op (UPDATE matched 0 row 정상).
export function recordTouch(db: Database, conceptId: string, now: number): void {
  db.prepare('UPDATE concepts SET last_used_at = ? WHERE id = ?').run(now, conceptId);
}

// concepts.last_used_at 단건 조회 (engine T3 DI 입력).
// 부재 conceptId → undefined. last_used_at = 0 (한 번도 touch 안 됨) → 0 그대로 반환
// (engine 의 forgetting decay 가 0 을 silent skip 처리 — D-S6-engine-recall-forgetting-dismiss-order).
export function getLastUsedAt(db: Database, conceptId: string): number | undefined {
  const row = db
    .prepare('SELECT last_used_at FROM concepts WHERE id = ?')
    .get(conceptId) as { last_used_at: number } | undefined;
  return row ? row.last_used_at : undefined;
}

// edges.last_used_at = now 갱신 (traverse hit 또는 dismiss 의 inverse 시점 호출).
// (from_id, to_id) 쌍의 모든 kind 일괄 갱신 — 무방향 그래프 정합.
// 반환: 갱신된 row 수.
export function recordEdgeTouch(
  db: Database,
  fromId: string,
  toId: string,
  now: number,
): { touched: number } {
  const result = db
    .prepare(
      `UPDATE edges SET last_used_at = ?
        WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)`,
    )
    .run(now, fromId, toId, toId, fromId);
  return { touched: Number(result.changes) };
}
