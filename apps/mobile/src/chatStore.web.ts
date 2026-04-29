// Web adapter — Expo Router web export 용 (Sprint 1 receipt 빌드 타깃).
// better-sqlite3 는 native 모듈 → web bundle 에 들어가면 안 됨.
// 이 파일이 platform extension 으로 chatStore.ts 를 대체.
//
// Sprint 1 web build 는 *영속화 검증을 하지 않음* — receipt 의 streamSend.mjs (node)
// 가 SQLite 행 검증을 담당. 여기서는 in-memory 만으로 화면을 동작시킨다.
//
// LLM 응답: web 환경에서 Ollama 가 같은 호스트에 있다는 보장이 없으므로
// 짧은 데모 토큰 시퀀스를 yield (디자인 의도 — ink-rise 시각 확인).
//
// Sprint 3 [FROZEN v2026-04-29 D-S3-chatStore-internal-wiring] — native parity 유지.
// 데모 시퀀스 종료 시 conceptStore.notify 가짜 호출 → CaptureToast ink-rise 시각 확인.
//
// Sprint 4 [FROZEN v2026-04-29 D-S4-chatStore-recall-wiring] — native parity 유지.
// 외부 시그니처 동결. 내부에서 데모용 RecallLogRow 를 recallStore.push 하여
// Ghost/Suggestion/Strong 4 화면 시각 검증 (web bundle 에 storage/engine/orchestrator 의
// native-only 파스 없이도 turn 마다 act 가 한 cycle 씩 회전).

import type { Message, RecallCandidate, RecallLogRow } from '@synapse/protocol';
import type { Concept } from '@synapse/engine';
import * as conceptStore from './conceptStore';
import * as recallStore from './recallStore';

const memory: Message[] = [];

export function listMessages(): Message[] {
  return memory.slice();
}

const DEMO_REPLY_KO = ['환영해요. ', '무엇이든 ', '떠오르는 ', '대로 ', '적어보세요.'];

const DEMO_CONCEPT_LABELS = ['멈춤', '일의 리듬', '정리하고 싶음'];

// 4 화면 시각 검증을 위해 turn 마다 회전 (silence → ghost → suggestion → strong → silence …).
const DEMO_ACT_CYCLE: RecallLogRow['act'][] = ['silence', 'ghost', 'suggestion', 'strong'];
let demoTurn = 0;

export async function* sendStream(text: string): AsyncIterable<string> {
  const ts0 = Date.now();
  memory.push({
    id: cryptoRandom(),
    role: 'user',
    content: text,
    ts: ts0,
  });

  let acc = '';
  for (const tok of DEMO_REPLY_KO) {
    await sleep(80);
    acc += tok;
    yield tok;
  }
  const ts1 = Date.now();
  memory.push({
    id: cryptoRandom(),
    role: 'assistant',
    content: acc,
    ts: ts1,
    latency_ms: ts1 - ts0,
  });

  const demoConcepts: Concept[] = DEMO_CONCEPT_LABELS.map((label) => ({
    id: cryptoRandom(),
    label,
    createdAt: ts1,
  }));
  conceptStore.notify(demoConcepts);

  const act = DEMO_ACT_CYCLE[demoTurn % DEMO_ACT_CYCLE.length] as RecallLogRow['act'];
  demoTurn += 1;
  const candidates: RecallCandidate[] = demoConcepts.map((concept) => ({
    conceptId: concept.id,
    label: concept.label,
    score: 0.7,
    source: 'semantic',
  }));
  const row: RecallLogRow = {
    id: cryptoRandom(),
    decided_at: Date.now(),
    act,
    candidate_ids: candidates.map((c) => c.conceptId),
  };
  recallStore.push(row, candidates);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function cryptoRandom(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
