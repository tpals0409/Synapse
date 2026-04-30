import type {
  Concept,
  RecallCandidate,
  RecallLogRow,
} from '@synapse/protocol';
import type { Database } from '../db.ts';
import { appendMessage } from '../messages.ts';
import { appendConcept, appendEdge } from './graph.ts';
import { appendRecallLog } from './recall.ts';
import { markDismissed, decayEdgeWeight } from './dismiss.ts';
import { markRetracted } from './retraction.ts';

// [FROZEN v2026-04-30 D-S7-storage-seedFullJourney-shape-UNION]
// (SUPERSEDES D-S7-storage-seedFullJourney-shape + REVISED + result-alias.)
//
// e2e fixture 시드 — Sprint 7 §4 데이터플로우의 9 단계 DB 상태 결정성 (faked clock 7d).
// schema 변경 0 (Sprint 6 0005 그대로). caller 가 migrate(db) 를 먼저 호출.
//
// UNION shape (헌법 7 D-S7-consumer-producer-gap-policy 정합): 양쪽 표현 모두 export —
// (a) array + 단계별 (engine recall-full-journey + orchestrator dispatch + tester e2e):
//     concepts / recentDecisions / advancedNow / dismiss / retraction / forgetting / 단계별.
// (b) named lookup + 단일 ID alias (consumer convenience, array filter 0):
//     conceptIds.{music,jazz,coltrane,saxophone} / recallLogIds.{l1Ghost,...} / day7 /
//     halfLifeMs / onboardingMessageId / firstChatAssistantMessageId /
//     dismissedRecallLogId / retractedMessageId.
// consistency 강제: `conceptIds.jazz === concepts.find(c => c.label === 'jazz').id` 등
// (테스트가 cross-shape consistency 검증).
//
// 모든 ID 는 frozen literal (UUID 미사용). embedding = seedEmbedding(label) —
// mulberry32 PRNG seeded by charcode hash, L2-normalized 768d unit vector.

const NOW = 1735689600000; // 2025-01-01T00:00:00Z UTC — frozen
const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7d — engine.DEFAULT_HALF_LIFE_MS 정합
const ADVANCED_NOW = NOW + HALF_LIFE_MS;
const EMBED_DIM = 768;

export type FullJourneyFixture = {
  // ── 시간축 결정성 (양쪽 alias 모두) ──
  now: number;
  advancedNow: number;        // = now + 7d (faked clock) — engine + orchestrator 사용
  day7: number;               // alias = advancedNow (named lookup)
  halfLifeMs: number;         // = 7 * 24 * 60 * 60 * 1000

  // ── engine 입력 (array + named lookup 둘 다) ──
  concepts: Concept[];        // 4 (music/jazz/coltrane/saxophone, 768d embedding)
  conceptIds: {
    music: string;
    jazz: string;
    coltrane: string;
    saxophone: string;
  };
  dismissedConceptIds: Set<string>;
  recentDecisions: RecallLogRow[]; // 4 (r-l1/r-l2/r-l3/r-hyper, r-l2 dismissed=1)
  recallLogIds: {
    l1Ghost: string;
    l2Suggestion: string;
    l3Strong: string;
    hyper: string;
  };

  // ── 단일 ID + alias (consumer convenience) ──
  onboardingMessageId: string;          // 'msg-onb-user'
  firstChatAssistantMessageId: string;  // 'msg-fc-assistant'
  dismissedRecallLogId: string;         // alias = recallLogIds.l2Suggestion
  retractedMessageId: string;           // alias = firstChatAssistantMessageId

  // ── 단계별 fixture (orchestrator dispatch + tester e2e) ──
  ghost: { candidates: RecallCandidate[]; recallLogId: string };
  suggestion: { candidates: RecallCandidate[]; recallLogId: string };
  strong: { candidates: RecallCandidate[]; recallLogId: string };
  hyperRecall: { candidates: RecallCandidate[] };
  dismiss: { recallLogId: string; conceptIds: string[] };
  retraction: { messageId: string; turnId: string };
  forgetting: {
    edgeConceptPairs: Array<[string, string]>;
    nowAt: number;        // alias = now
    sevenDaysLater: number; // alias = advancedNow
  };
};

// label 에서 deterministic 768d unit vector 생성.
function seedEmbedding(label: string): number[] {
  let seed = 0;
  for (let i = 0; i < label.length; i++) {
    seed = (seed + label.charCodeAt(i) * (i + 1)) >>> 0;
  }
  if (seed === 0) seed = 1;

  let state = seed;
  const mulberry32 = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const vec: number[] = new Array(EMBED_DIM);
  let sumSq = 0;
  for (let i = 0; i < EMBED_DIM; i++) {
    const v = mulberry32() * 2 - 1;
    vec[i] = v;
    sumSq += v * v;
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < EMBED_DIM; i++) {
    vec[i] = (vec[i] as number) / norm;
  }
  return vec;
}

function setConceptLastUsedAt(db: Database, conceptId: string, ts: number): void {
  db.prepare('UPDATE concepts SET last_used_at = ? WHERE id = ?').run(ts, conceptId);
}

function setEdgeLastUsedAt(
  db: Database,
  fromId: string,
  toId: string,
  ts: number,
): void {
  db.prepare(
    `UPDATE edges SET last_used_at = ?
      WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)`,
  ).run(ts, fromId, toId, toId, fromId);
}

export function seedFullJourney(db: Database): FullJourneyFixture {
  // frozen literal IDs.
  const onboardingMessageId = 'msg-onb-user';
  const firstChatAssistantMessageId = 'msg-fc-assistant';
  const turnId = 'turn-fc-1';

  const idMusic = 'c-music';
  const idJazz = 'c-jazz';
  const idColtrane = 'c-coltrane';
  const idSaxophone = 'c-saxophone';

  const idGhost = 'r-l1';
  const idSuggestion = 'r-l2';
  const idStrong = 'r-l3';
  const idHyper = 'r-hyper';

  const formationTs = NOW + 2000;
  const hyperTs = NOW + 6000;

  // engine 입력용 Concept[] — protocol Concept shape.
  const conceptMusic: Concept = {
    id: idMusic,
    label: 'music',
    embedding: seedEmbedding('music'),
    createdAt: formationTs,
    last_used_at: formationTs,
  };
  const conceptJazz: Concept = {
    id: idJazz,
    label: 'jazz',
    embedding: seedEmbedding('jazz'),
    createdAt: formationTs,
    last_used_at: formationTs,
  };
  const conceptColtrane: Concept = {
    id: idColtrane,
    label: 'coltrane',
    embedding: seedEmbedding('coltrane'),
    createdAt: formationTs,
    last_used_at: formationTs,
  };
  const conceptSaxophone: Concept = {
    id: idSaxophone,
    label: 'saxophone',
    embedding: seedEmbedding('saxophone'),
    createdAt: hyperTs,
    last_used_at: hyperTs,
  };
  const concepts: Concept[] = [
    conceptMusic,
    conceptJazz,
    conceptColtrane,
    conceptSaxophone,
  ];

  const tx = db.transaction(() => {
    // step 1: onboarding.
    appendMessage(db, {
      id: onboardingMessageId,
      role: 'user',
      content: '안녕, 나는 민준이야',
      ts: NOW,
    });

    // step 2: first-chat assistant.
    appendMessage(db, {
      id: firstChatAssistantMessageId,
      role: 'assistant',
      content: '반갑습니다, 민준 님.',
      ts: NOW + 1000,
      latency_ms: 420,
    });

    // step 3: memory formation.
    appendConcept(db, conceptMusic);
    appendConcept(db, conceptJazz);
    appendConcept(db, conceptColtrane);
    setConceptLastUsedAt(db, idMusic, formationTs);
    setConceptLastUsedAt(db, idJazz, formationTs);
    setConceptLastUsedAt(db, idColtrane, formationTs);

    appendEdge(db, { fromId: idJazz, toId: idColtrane, weight: 0.7, kind: 'co_occur' });
    appendEdge(db, { fromId: idMusic, toId: idJazz, weight: 0.6, kind: 'semantic' });
    setEdgeLastUsedAt(db, idJazz, idColtrane, formationTs);
    setEdgeLastUsedAt(db, idMusic, idJazz, formationTs);

    // step 4-6: recall L1~L3.
    appendRecallLog(db, {
      id: idGhost,
      decided_at: NOW + 3000,
      act: 'ghost',
      candidate_ids: [idJazz],
    });
    appendRecallLog(db, {
      id: idSuggestion,
      decided_at: NOW + 4000,
      act: 'suggestion',
      candidate_ids: [idJazz, idColtrane],
    });
    appendRecallLog(db, {
      id: idStrong,
      decided_at: NOW + 5000,
      act: 'strong',
      candidate_ids: [idMusic, idJazz],
    });

    // step 7: hyper-recall — bridge depth 2 (jazz→coltrane→saxophone).
    appendConcept(db, conceptSaxophone);
    setConceptLastUsedAt(db, idSaxophone, hyperTs);
    appendEdge(db, {
      fromId: idColtrane,
      toId: idSaxophone,
      weight: 0.5,
      kind: 'co_occur',
    });
    setEdgeLastUsedAt(db, idColtrane, idSaxophone, hyperTs);
    appendRecallLog(db, {
      id: idHyper,
      decided_at: NOW + 6500,
      act: 'suggestion',
      candidate_ids: [idSaxophone],
    });

    // step 8: dismiss — l2 의 jazz 약화.
    markDismissed(db, idSuggestion, [idJazz]);
    decayEdgeWeight(db, idJazz, idColtrane, 0.5);

    // step 9: retraction.
    markRetracted(db, firstChatAssistantMessageId);
  });
  tx();

  // 단계별 RecallCandidate fixture.
  const candGhost: RecallCandidate[] = [
    { conceptId: idJazz, label: 'jazz', score: 0.9, source: 'semantic' },
  ];
  const candSuggestion: RecallCandidate[] = [
    { conceptId: idJazz, label: 'jazz', score: 0.85, source: 'semantic' },
    { conceptId: idColtrane, label: 'coltrane', score: 0.7, source: 'co_occur' },
  ];
  const candStrong: RecallCandidate[] = [
    { conceptId: idMusic, label: 'music', score: 0.95, source: 'semantic' },
    { conceptId: idJazz, label: 'jazz', score: 0.8, source: 'mixed' },
  ];
  const candHyper: RecallCandidate[] = [
    { conceptId: idSaxophone, label: 'saxophone', score: 0.55, source: 'bridge' },
  ];

  const recentDecisions: RecallLogRow[] = [
    {
      id: idGhost,
      decided_at: NOW + 3000,
      act: 'ghost',
      candidate_ids: [idJazz],
    },
    {
      id: idSuggestion,
      decided_at: NOW + 4000,
      act: 'suggestion',
      candidate_ids: [idJazz, idColtrane],
      dismissed: 1,
    },
    {
      id: idStrong,
      decided_at: NOW + 5000,
      act: 'strong',
      candidate_ids: [idMusic, idJazz],
    },
    {
      id: idHyper,
      decided_at: NOW + 6500,
      act: 'suggestion',
      candidate_ids: [idSaxophone],
    },
  ];

  return {
    // 시간축 (양쪽 alias).
    now: NOW,
    advancedNow: ADVANCED_NOW,
    day7: ADVANCED_NOW, // alias = advancedNow
    halfLifeMs: HALF_LIFE_MS,

    // engine 입력 (array + named lookup).
    concepts,
    conceptIds: {
      music: idMusic,
      jazz: idJazz,
      coltrane: idColtrane,
      saxophone: idSaxophone,
    },
    dismissedConceptIds: new Set([idJazz]),
    recentDecisions,
    recallLogIds: {
      l1Ghost: idGhost,
      l2Suggestion: idSuggestion,
      l3Strong: idStrong,
      hyper: idHyper,
    },

    // 단일 ID + alias.
    onboardingMessageId,
    firstChatAssistantMessageId,
    dismissedRecallLogId: idSuggestion,         // = recallLogIds.l2Suggestion
    retractedMessageId: firstChatAssistantMessageId,

    // 단계별 fixture.
    ghost: { candidates: candGhost, recallLogId: idGhost },
    suggestion: { candidates: candSuggestion, recallLogId: idSuggestion },
    strong: { candidates: candStrong, recallLogId: idStrong },
    hyperRecall: { candidates: candHyper },
    dismiss: { recallLogId: idSuggestion, conceptIds: [idJazz] },
    retraction: { messageId: firstChatAssistantMessageId, turnId },
    forgetting: {
      edgeConceptPairs: [
        [idJazz, idColtrane],
        [idMusic, idJazz],
        [idColtrane, idSaxophone],
      ],
      nowAt: NOW,
      sevenDaysLater: ADVANCED_NOW,
    },
  };
}
