// Web adapter — Sprint 8 (T5) telemetryStore.web.
// platform-adapter 9회차 (carry-over 13 표준 강제). web bundle 의 storage native 의존 0 보존.
//
// 책임:
//   1) decision / recall / satisfaction event emit — in-memory only (web 은 storage 의존 0).
//   2) getRecent / subscribe — recallStore.web.ts 패턴 정합.
//   3) 만족도 설문 UI control — turn 5 mid-session 1회 + end-session 1회.
//   4) 시그니처 100% native (.ts) 짝 일치 (themeStore 패턴 — type 양 짝 inline).
//
// 단일 진실원 (`[DIRECTIVE D-S8-mobile-telemetry-type-singletruth]` 정합):
//   - protocol root export (`@synapse/protocol`) — `DecisionLogActor`, `DecisionLogAction`,
//     `SatisfactionSessionMarker`. mobile 내부 type 재정의 0.
//   - storage import 0 — receipt `web-bundle-no-native` 보존 (storage 가 native-only 의존 끌어옴).

import type {
  DecisionLogActor,
  DecisionLogAction,
  SatisfactionSessionMarker,
} from '@synapse/protocol';

type RecallAct = Extract<DecisionLogAction, 'silence' | 'ghost' | 'suggestion' | 'strong'>;

export type TelemetryEvent =
  | {
      event: 'decision';
      actor: DecisionLogActor;
      action: DecisionLogAction;
      ts: number;
      payload?: string;
    }
  | {
      event: 'recall';
      recallLogId: string;
      act: RecallAct;
      ts: number;
    }
  | {
      event: 'satisfaction';
      score: 1 | 2 | 3 | 4 | 5;
      comment?: string;
      sessionMarker: SatisfactionSessionMarker;
      ts: number;
    };

export type TelemetryListener = (ev: TelemetryEvent) => void;
export type StorageAdapter = (ev: TelemetryEvent) => void;

// in-memory 저장소 — web bundle 에서는 storage 의존 0.
const memory: TelemetryEvent[] = [];
const listeners = new Set<TelemetryListener>();

// 누수 방지 — 장기 세션에서 무한 누적 회피. native 짝 MAX_ENTRIES 와 정합.
const MAX_ENTRIES = 500;

// 세션 1회 토글 — 만족도 설문 mid/end 중복 mount 방지.
const surveyShown = { mid: false, end: false };

// storage adapter — web 디폴트 null. 시그니처는 native 짝과 동일 (carry-over 13 양 짝 강제).
let storageAdapter: StorageAdapter | null = null;

export function setStorageAdapter(adapter: StorageAdapter | null): void {
  storageAdapter = adapter;
}

export function emit(ev: TelemetryEvent): void {
  memory.push(ev);
  while (memory.length > MAX_ENTRIES) {
    memory.shift();
  }
  if (storageAdapter) {
    try {
      storageAdapter(ev);
    } catch {
      // storage 측 실패가 emit 흐름을 깨면 안 됨 — themeStore catch silent 패턴 정합.
    }
  }
  for (const l of listeners) {
    try {
      l(ev);
    } catch {
      // listener 실패 격리 — 다른 listener / emit 에 영향 0.
    }
  }
}

export function getRecent(withinMs: number, now: number = Date.now()): TelemetryEvent[] {
  if (!Number.isFinite(withinMs)) return memory.slice();
  const cutoff = now - withinMs;
  return memory.filter((e) => e.ts >= cutoff);
}

export function subscribe(listener: TelemetryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const MID_SESSION_TURN = 5;

export function shouldShowMidSessionSurvey(turnCount: number): boolean {
  if (surveyShown.mid) return false;
  return turnCount === MID_SESSION_TURN;
}

export function shouldShowEndSessionSurvey(): boolean {
  return !surveyShown.end;
}

export function markSurveyShown(marker: SatisfactionSessionMarker): void {
  surveyShown[marker] = true;
}

// 테스트용 reset — 세션 토글/메모리 초기화. production 흐름 미사용.
export function _resetForTest(): void {
  memory.length = 0;
  listeners.clear();
  surveyShown.mid = false;
  surveyShown.end = false;
  storageAdapter = null;
}
