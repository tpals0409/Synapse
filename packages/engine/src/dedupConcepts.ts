// Sprint 8 T6 — Concept dedup / alias merge.
// [DRAFT — T8 외부 데이터 신호 후 dev doc §11 frozen 박음.]
//
// 사전 구현 사유 (carry-over 9 우선 직접 추기, 옵션 a 정합):
//   - 알고리즘 자체는 외부 데이터 신호와 독립 — *결정성 + 정합성* 만 단위 테스트로 검증.
//   - T8 결과는 (a) 채택 / 보류 결정 + (b) embedThreshold 튜닝 두 입력만 결정.
//   - 시그니처 동결 (carry-over 12) — RecallFn / DecideFn / runMemoryFormation / runRecallHook 변경 0.
//     dedup 은 *순수 함수* — caller (storage adapter) 가 MergePlan 받아 graph 갱신 책임 분리.
//
// 알고리즘:
//   1. label 정규화 (NFKC + lowercase + trim) → 동일 normalized label 그룹화.
//   2. 그룹 내 concept ≥2 개면 MergePlan(reason='normalized-label-equal').
//   3. (옵션) 각 그룹 외부의 *서로 다른 normalized label* 페어 중 cosine ≥ embedThreshold 검출.
//      → MergePlan(reason='embedding-similarity'). embedSimilarity 미주입 시 skip.
//   4. canonical 선택: createdAt ASC + id ASC tie-break (가장 오래된 / 결정성 보장).
//   5. 같은 alias 가 여러 plan 에 등장하지 않도록 first-claim wins (canonical 기준 합집합).

import type { Concept } from '@synapse/protocol';

export type EmbedSimilarityFn = (a: Float32Array, b: Float32Array) => number;

export type NormalizeLabelFn = (label: string) => string;

export type DedupOptions = {
  /** cosine similarity threshold for embedding-based merge. Default 0.85. */
  embedThreshold?: number;
  /** label 정규화 함수. Default: NFKC + lowercase + trim. */
  normalizeLabel?: NormalizeLabelFn;
  /** 임베딩 비교 함수. 미주입 시 normalize-only 매칭만 수행. */
  embedSimilarity?: EmbedSimilarityFn;
};

export type MergePlan = {
  /** 유지할 canonical concept id (createdAt ASC + id ASC tie-break). */
  canonicalId: string;
  /** canonical 로 흡수될 alias concept ids. 결정성 보장 (createdAt ASC + id ASC). */
  aliasIds: string[];
  /** merge 사유. */
  reason: 'normalized-label-equal' | 'embedding-similarity';
  /** 임베딩 매칭 시 cosine score, normalize 매칭 시 1.0. */
  score: number;
};

/** Concept 입력 — protocol number[] / engine Float32Array 양쪽 수용. */
export type DedupConceptInput = Omit<Concept, 'embedding'> & {
  embedding?: number[] | Float32Array;
};

export const DEFAULT_DEDUP_EMBED_THRESHOLD = 0.85;

const defaultNormalize: NormalizeLabelFn = (label) =>
  label.normalize('NFKC').toLowerCase().trim();

/** Cosine similarity. 둘 다 영벡터면 0. 길이 불일치 시 0 (silent — caller 가 사전 검증). */
function cosineSim(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / Math.sqrt(normA * normB);
}

function toFloat32(vec: number[] | Float32Array): Float32Array {
  return vec instanceof Float32Array ? vec : Float32Array.from(vec);
}

/** createdAt ASC + id ASC tie-break — canonical 선택 + alias 정렬 결정성 보장. */
function compareConcept(
  a: DedupConceptInput,
  b: DedupConceptInput,
): number {
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function dedupConcepts(
  concepts: ReadonlyArray<DedupConceptInput>,
  opts: DedupOptions = {},
): MergePlan[] {
  const normalize = opts.normalizeLabel ?? defaultNormalize;
  const embedThreshold = opts.embedThreshold ?? DEFAULT_DEDUP_EMBED_THRESHOLD;
  const embedSim = opts.embedSimilarity ?? cosineSim;

  if (concepts.length < 2) return [];

  // 결정성 입력 정렬 — caller 가 어떤 순서로 넘겨도 동일 출력.
  const sorted = [...concepts].sort(compareConcept);

  const plans: MergePlan[] = [];
  const claimed = new Set<string>();

  // Step 1: normalized-label-equal 그룹화.
  const groups = new Map<string, DedupConceptInput[]>();
  for (const c of sorted) {
    const key = normalize(c.label);
    if (!key) continue; // 빈 label skip.
    const arr = groups.get(key);
    if (arr) arr.push(c);
    else groups.set(key, [c]);
  }

  for (const arr of groups.values()) {
    if (arr.length < 2) continue;
    // arr 은 sorted 순서 보존 — first = canonical.
    const canonical = arr[0];
    const aliases = arr.slice(1);
    plans.push({
      canonicalId: canonical.id,
      aliasIds: aliases.map((c) => c.id),
      reason: 'normalized-label-equal',
      score: 1.0,
    });
    for (const c of arr) claimed.add(c.id);
  }

  // Step 2: embedding-similarity 페어 (서로 다른 normalized label 인 경우만).
  // embeddings 가 없거나 embedSimilarity 가 normalize-only 모드면 skip.
  if (opts.embedSimilarity || (concepts.some((c) => c.embedding))) {
    const candidates = sorted.filter(
      (c) => !claimed.has(c.id) && c.embedding !== undefined,
    );
    // canonical → alias 매핑. canonical 은 먼저 등장한 (sorted 순서) concept.
    const canonicalToAliases = new Map<string, DedupConceptInput[]>();
    const aliasToCanonical = new Map<string, string>();

    for (let i = 0; i < candidates.length; i++) {
      const ci = candidates[i];
      if (claimed.has(ci.id)) continue;
      const vi = toFloat32(ci.embedding!);
      for (let j = i + 1; j < candidates.length; j++) {
        const cj = candidates[j];
        if (claimed.has(cj.id)) continue;
        // 같은 normalized label 은 step 1 에서 처리됨 — 여기서 만나면 skip.
        if (normalize(ci.label) === normalize(cj.label)) continue;
        const vj = toFloat32(cj.embedding!);
        const score = embedSim(vi, vj);
        if (score < embedThreshold) continue;
        // ci = canonical (sorted 순서 먼저), cj = alias.
        // 단, cj 가 이미 다른 canonical 의 alias 면 first-claim wins.
        if (aliasToCanonical.has(cj.id)) continue;
        if (aliasToCanonical.has(ci.id)) continue;
        const canon = canonicalToAliases.get(ci.id) ?? [];
        canon.push({ ...cj, createdAt: cj.createdAt });
        canonicalToAliases.set(ci.id, canon);
        aliasToCanonical.set(cj.id, ci.id);
        // score 는 *최댓값* 보존 — 한 plan 안에서.
        // (단순 모델: alias 별 score 보다 plan 단위 score 의 최댓값.)
      }
    }

    for (const [canonicalId, aliases] of canonicalToAliases) {
      // alias 정렬 결정성.
      aliases.sort(compareConcept);
      // score 최댓값 재계산.
      const canonical = candidates.find((c) => c.id === canonicalId)!;
      const vCan = toFloat32(canonical.embedding!);
      let best = 0;
      for (const a of aliases) {
        const s = embedSim(vCan, toFloat32(a.embedding!));
        if (s > best) best = s;
      }
      plans.push({
        canonicalId,
        aliasIds: aliases.map((a) => a.id),
        reason: 'embedding-similarity',
        score: best,
      });
    }
  }

  // 출력 결정성 — canonicalId 사전순.
  plans.sort((a, b) => (a.canonicalId < b.canonicalId ? -1 : a.canonicalId > b.canonicalId ? 1 : 0));
  return plans;
}
