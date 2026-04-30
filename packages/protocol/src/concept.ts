export type EdgeKind = 'co_occur' | 'semantic';

export type Concept = {
  id: string;
  label: string;
  kind?: string;
  embedding?: number[];
  createdAt: number;
  // [FROZEN v2026-04-29 D-S6-protocol-concept-last-used-at]
  // Sprint 6 forgetting decay 의 입력 신호. nearestConcepts MATCH / traverse hit
  // 시점에 storage `recordTouch` 가 갱신. 미설정 = 0 (silent migration default).
  last_used_at?: number;
};

export type GraphEdge = {
  fromId: string;
  toId: string;
  kind: EdgeKind;
  weight: number;
};
