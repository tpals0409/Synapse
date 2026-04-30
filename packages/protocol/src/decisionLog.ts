// Sprint 8: telemetry stream 의 컴파일 타임 가드 (DB CHECK 는 자유 문자열, [DIRECTIVE D-S8-storage-shape-ack] (b)).
// consumer (mobile telemetryStore / orchestrator decision_log hook) 가 본 union 사용 — 신규 event 추기 시 union 만 갱신.
// runtime DB 측은 자유 문자열 그대로.

export type DecisionLogActor =
  | 'orchestrator'
  | 'mobile'
  | 'engine'
  | 'conversation';

export type DecisionLogAction =
  | 'silence'
  | 'ghost'
  | 'suggestion'
  | 'strong'
  | 'dismiss'
  | 'retraction'
  | 'recall_click'
  | 'satisfaction'
  | 'send'; // mobile T5 추기 — chat onSubmit user 발화 카운트 (헌법 7 옵션 (a) — ≤3줄, idempotent, revert ≤5분, 확장 only).

export type SatisfactionSessionMarker = 'mid' | 'end';
