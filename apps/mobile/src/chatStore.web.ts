// Web adapter — Expo Router web export 용 (Sprint 1 receipt 빌드 타깃).
// better-sqlite3 는 native 모듈 → web bundle 에 들어가면 안 됨.
// 이 파일이 platform extension 으로 chatStore.ts 를 대체.
//
// Sprint 1 web build 는 *영속화 검증을 하지 않음* — receipt 의 streamSend.mjs (node)
// 가 SQLite 행 검증을 담당. 여기서는 in-memory 만으로 화면을 동작시킨다.
//
// LLM 응답: web 환경에서 Ollama 가 같은 호스트에 있다는 보장이 없으므로
// 짧은 데모 토큰 시퀀스를 yield (디자인 의도 — ink-rise 시각 확인).

import type { Message } from '@synapse/protocol';

const memory: Message[] = [];

export function listMessages(): Message[] {
  return memory.slice();
}

const DEMO_REPLY_KO = ['환영해요. ', '무엇이든 ', '떠오르는 ', '대로 ', '적어보세요.'];

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
