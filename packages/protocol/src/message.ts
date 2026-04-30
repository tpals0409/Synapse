export type Role = 'user' | 'assistant';

export type Message = {
  id: string;
  role: Role;
  content: string;
  ts: number;
  latency_ms?: number;
  // [FROZEN v2026-04-29 D-S6-protocol-message-retracted]
  // Sprint 6 Humble Retraction. 1 = 사용자가 부정 신호로 회수한 메시지.
  // 미설정 = 0 (silent migration). storage messages.retracted 컬럼 (schema 0005) 와 동기.
  retracted?: number;
};
