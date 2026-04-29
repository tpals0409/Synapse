// Sprint 5 — Hyper-Recall (Bridge / Temporal / Domain Crossing).
// engine 의 3 가지 신규 source 타입 candidate 생성 함수.
//
// DI 설계:
//   - traverse: (db, id, depth) → ({id, label, weight, kind})[] — storage T2 가 책임. 본 모듈은
//     `HyperTraverseFn` 으로 따로 잡아 kind 필드 의존을 분리한다 (recall.ts 의 TraverseFn 은
//     Sprint 4 시그니처 그대로 — kind 미포함). Sprint 5 단위 테스트는 stub 으로 만족.
//   - recentDecisions: orchestrator/storage 가 push 한 RecallLogRow 묶음. Temporal 은 graph 비의존.
//
// score 결정성:
//   - bridge: 시작-경유-목적지 weight 곱 (다중 경로 시 max). 동일 비결정성 회피.
//   - temporal: window 내 같이 결정된 카운트를 정규화 (최대 2 회 = 1.0).
//   - domain_crossing: 두 kind 모두 hit 한 노드의 (co_occur weight × kindWeight.co_occur) +
//     (semantic weight × kindWeight.semantic). 비대칭 (co_occur 약, semantic 강).
//
// Sprint 5 단위 테스트는 결정성 보장 위해 모두 stub TraverseFn 사용.

import type {
  BridgeCandidate,
  TemporalCandidate,
  DomainCrossingCandidate,
  EdgeKind,
  RecallLogRow,
} from '@synapse/protocol';

export type HyperTraverseHit = {
  id: string;
  label: string;
  weight: number;
  kind: EdgeKind;
};

export type HyperTraverseFn = (
  db: unknown,
  conceptId: string,
  depth: number,
) => Promise<HyperTraverseHit[]>;

export const DEFAULT_BRIDGE_DEPTH = 2;
export const DEFAULT_BRIDGE_MAX = 5;
export const DEFAULT_TEMPORAL_WINDOW_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_KIND_WEIGHT: { co_occur: number; semantic: number } = {
  co_occur: 0.5,
  semantic: 1.0,
};

export type BridgeCandidatesOptions = {
  db: unknown;
  traverse: HyperTraverseFn;
  depth?: number;
  maxBridges?: number;
};

/**
 * BFS depth-N. 기본 depth=2 → seed 의 1-hop 이웃 N1 의 1-hop 이웃 - {seed} - N1.
 * seed → middle → far 경로의 weight 곱이 score (다중 경로 시 max).
 * 결과는 score desc, 동률 시 conceptId asc (결정성).
 */
export async function bridgeCandidates(
  seedConceptId: string,
  opts: BridgeCandidatesOptions,
): Promise<BridgeCandidate[]> {
  const depth = opts.depth ?? DEFAULT_BRIDGE_DEPTH;
  const maxBridges = opts.maxBridges ?? DEFAULT_BRIDGE_MAX;

  if (depth < 2) return [];

  const oneHop = await opts.traverse(opts.db, seedConceptId, 1);
  const oneHopIds = new Set(oneHop.map((h) => h.id));

  type Acc = {
    label: string;
    score: number;
    via: string;
    depth: number;
  };
  const acc = new Map<string, Acc>();

  for (const middle of oneHop) {
    const twoHop = await opts.traverse(opts.db, middle.id, 1);
    for (const far of twoHop) {
      if (far.id === seedConceptId) continue;
      if (oneHopIds.has(far.id)) continue;
      const score = middle.weight * far.weight;
      const prev = acc.get(far.id);
      if (prev === undefined || score > prev.score) {
        acc.set(far.id, {
          label: far.label,
          score,
          via: middle.id,
          depth: 2,
        });
      }
    }
  }

  const out: BridgeCandidate[] = Array.from(acc.entries()).map(([conceptId, a]) => ({
    conceptId,
    label: a.label,
    score: a.score,
    source: 'bridge',
    viaConceptId: a.via,
    depth: a.depth,
  }));

  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.conceptId < b.conceptId ? -1 : a.conceptId > b.conceptId ? 1 : 0;
  });

  return out.slice(0, maxBridges);
}

export type TemporalCandidatesOptions = {
  db: unknown;
  recentDecisions: RecallLogRow[];
  windowMs?: number;
  /** id → label 룩업. 미주입 시 label = id fallback (carry-over 10 패턴). */
  resolveLabel?: (conceptId: string) => string | undefined;
};

/**
 * 최근 결정 로그를 windowMs 로 자른 후 같은 윈도우 안에 함께 결정된 conceptId 쌍을 모아
 * 빈도 / 정규화 score 로 변환.
 *
 * - 모든 candidate_ids 평탄화 → 같은 window 안 hit count.
 * - hit count = 1 → score 0.4 (낮음), 2 → 0.7, 3+ → 0.9 (cap).
 * - coDecidedIds = 같은 row 에 등장한 다른 conceptId 의 합집합 (set, sorted asc).
 * - decided_at 이 가장 최근에서 windowMs 안에 있는 행만 사용. (now = max decided_at — 외부 시계 의존 X)
 */
export async function temporalCandidates(
  opts: TemporalCandidatesOptions,
): Promise<TemporalCandidate[]> {
  const windowMs = opts.windowMs ?? DEFAULT_TEMPORAL_WINDOW_MS;
  if (opts.recentDecisions.length === 0) return [];

  const now = opts.recentDecisions.reduce((m, r) => Math.max(m, r.decided_at), 0);
  const cutoff = now - windowMs;
  const inWindow = opts.recentDecisions.filter((r) => r.decided_at >= cutoff);
  if (inWindow.length === 0) return [];

  const hitCount = new Map<string, number>();
  const coDecided = new Map<string, Set<string>>();
  for (const row of inWindow) {
    const ids = row.candidate_ids;
    for (const id of ids) {
      hitCount.set(id, (hitCount.get(id) ?? 0) + 1);
      let bag = coDecided.get(id);
      if (bag === undefined) {
        bag = new Set();
        coDecided.set(id, bag);
      }
      for (const other of ids) {
        if (other !== id) bag.add(other);
      }
    }
  }

  const scoreFor = (n: number): number => {
    if (n >= 3) return 0.9;
    if (n === 2) return 0.7;
    return 0.4;
  };

  const out: TemporalCandidate[] = Array.from(hitCount.entries()).map(([id, n]) => ({
    conceptId: id,
    label: opts.resolveLabel?.(id) ?? id,
    score: scoreFor(n),
    source: 'temporal',
    windowMs,
    coDecidedIds: Array.from(coDecided.get(id) ?? []).sort(),
  }));

  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.conceptId < b.conceptId ? -1 : a.conceptId > b.conceptId ? 1 : 0;
  });

  return out;
}

export type DomainCrossingCandidatesOptions = {
  db: unknown;
  traverse: HyperTraverseFn;
  kindWeight?: { co_occur: number; semantic: number };
};

/**
 * seed 의 1-hop 이웃 중 두 EdgeKind (co_occur + semantic) 모두 entry 가 있는 노드만 추출.
 * score = (co_occur weight × kindWeight.co_occur) + (semantic weight × kindWeight.semantic).
 * edgeKindFrom = 첫 번째 발견 kind, edgeKindTo = 두 번째 발견 kind (sort 후 결정성).
 */
export async function domainCrossingCandidates(
  seedConceptId: string,
  opts: DomainCrossingCandidatesOptions,
): Promise<DomainCrossingCandidate[]> {
  const kindWeight = opts.kindWeight ?? DEFAULT_KIND_WEIGHT;

  const hits = await opts.traverse(opts.db, seedConceptId, 1);

  type Bucket = {
    label: string;
    coOccur?: number;
    semantic?: number;
  };
  const bucket = new Map<string, Bucket>();
  for (const h of hits) {
    if (h.id === seedConceptId) continue;
    let b = bucket.get(h.id);
    if (b === undefined) {
      b = { label: h.label };
      bucket.set(h.id, b);
    }
    if (h.kind === 'co_occur') {
      b.coOccur = b.coOccur === undefined ? h.weight : Math.max(b.coOccur, h.weight);
    } else if (h.kind === 'semantic') {
      b.semantic = b.semantic === undefined ? h.weight : Math.max(b.semantic, h.weight);
    }
  }

  const out: DomainCrossingCandidate[] = [];
  for (const [conceptId, b] of bucket.entries()) {
    if (b.coOccur === undefined || b.semantic === undefined) continue;
    const score = b.coOccur * kindWeight.co_occur + b.semantic * kindWeight.semantic;
    out.push({
      conceptId,
      label: b.label,
      score,
      source: 'domain_crossing',
      edgeKindFrom: 'co_occur',
      edgeKindTo: 'semantic',
    });
  }

  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.conceptId < b.conceptId ? -1 : a.conceptId > b.conceptId ? 1 : 0;
  });

  return out;
}
