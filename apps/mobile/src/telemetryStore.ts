// Native (iOS/Android) adapter — Sprint 8 (T5) telemetryStore.
// platform-adapter 9회차 (carry-over 13 표준 강제) — themeStore (7회차) / chatStore (8회차) 모범 정합.
//
// 책임:
//   1) decision / recall / satisfaction event emit — in-memory + storage adapter 위임.
//   2) getRecent / subscribe — recallStore.ts 패턴 정합.
//   3) 만족도 설문 UI control — turn 5 mid-session 1회 + end-session 1회.
//   4) 시그니처 100% web (.web.ts) 짝 일치 (themeStore 패턴 — type 양 짝 inline).
//
// 단일 진실원 (`[DIRECTIVE D-S8-mobile-telemetry-type-singletruth]` 정합):
//   - storage T3 root export (`@synapse/storage`) — `appendDecisionLog`, `appendSatisfactionSurvey`,
//     `DecisionLogRow`, `SatisfactionSurveyRow`, `Database`.
//   - protocol root export (`@synapse/protocol`) — `DecisionLogActor`, `DecisionLogAction`,
//     `SatisfactionSessionMarker`. mobile 내부 type 재정의 0.
//   - 별도 `telemetryStoreTypes.ts` 모듈 *없음* — themeStore 패턴 (양 짝 inline) 적용.

import {
  openDb,
  migrate,
  appendDecisionLog,
  appendSatisfactionSurvey,
  type Database,
} from '@synapse/storage';
import type {
  DecisionLogActor,
  DecisionLogAction,
  SatisfactionSessionMarker,
} from '@synapse/protocol';

// recall act = DecisionLogAction 의 4-원 부분 집합 (silence/ghost/suggestion/strong).
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

// chatStore.ts ensureDb 패턴 정합 — telemetry 도 동일 SQLite 파일 (synapse.db) 공유.
let dbHandle: Database | null = null;
function ensureDb(): Database {
  if (!dbHandle) {
    dbHandle = openDb('synapse.db');
    migrate(dbHandle);
  }
  return dbHandle;
}

// storage 영속 adapter — emit 시 자동 호출. 디폴트 활성화 (T3 PASS 박힘).
// setStorageAdapter(null) 로 비활성화 가능 (테스트 / 외부 데이터 수집 비활성 모드).
const defaultStorageAdapter: StorageAdapter = (ev) => {
  const db = ensureDb();
  if (ev.event === 'satisfaction') {
    appendSatisfactionSurvey(db, {
      id: makeId(),
      ts: ev.ts,
      score: ev.score,
      session_marker: ev.sessionMarker,
      ...(ev.comment !== undefined ? { comment: ev.comment } : {}),
    });
    // 만족도 응답도 decision_log 에 'satisfaction' 으로 mirror — T8 데이터 분석 시 단일 source.
    appendDecisionLog(db, {
      id: makeId(),
      ts: ev.ts,
      actor: 'mobile',
      action: 'satisfaction',
      payload: JSON.stringify({ score: ev.score, sessionMarker: ev.sessionMarker }),
    });
    return;
  }
  if (ev.event === 'recall') {
    appendDecisionLog(db, {
      id: makeId(),
      ts: ev.ts,
      actor: 'orchestrator',
      action: ev.act,
      payload: JSON.stringify({ recallLogId: ev.recallLogId }),
    });
    return;
  }
  // ev.event === 'decision'
  appendDecisionLog(db, {
    id: makeId(),
    ts: ev.ts,
    actor: ev.actor,
    action: ev.action,
    ...(ev.payload !== undefined ? { payload: ev.payload } : {}),
  });
};

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const memory: TelemetryEvent[] = [];
const listeners = new Set<TelemetryListener>();

// 누수 방지 — 장기 세션 무한 누적 회피. recallStore MAX_ENTRIES=200 정합 (telemetry 는 더 빈번
// → 500). storage adapter 가 영속하므로 in-memory eviction 후에도 cold start 시 storage 에서 복원.
const MAX_ENTRIES = 500;

// 세션 1회 토글 — 만족도 설문 mid/end 중복 mount 방지.
const surveyShown = { mid: false, end: false };

// 디폴트 활성화 — T3 PASS 박힘. 테스트에서 _resetForTest() 로 초기화 가능.
let storageAdapter: StorageAdapter | null = defaultStorageAdapter;

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

// 테스트용 reset — 세션 토글/메모리 초기화 + storage adapter 디폴트 복원.
// production 흐름 미사용. dbHandle 도 초기화 → 후속 ensureDb 가 새 핸들 생성.
export function _resetForTest(): void {
  memory.length = 0;
  listeners.clear();
  surveyShown.mid = false;
  surveyShown.end = false;
  storageAdapter = defaultStorageAdapter;
  dbHandle = null;
}
