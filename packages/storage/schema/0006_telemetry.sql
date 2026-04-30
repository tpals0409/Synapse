-- Sprint 8: telemetry stream — decision_log + satisfaction_survey 신규 테이블.
-- [DIRECTIVE v2026-04-30 D-S8-storage-shape-ack] team-lead ack:
--   (a) decision_log = 신규 테이블 (recall_log Sprint 4~6 frozen 침범 0).
--   (b) action CHECK 없는 자유 문자열 — 신규 event 자유 추기. 컴파일 타임 가드는 protocol DecisionLogAction union.
--   (c) 본 0006 은 session_hash 컬럼 없음. T1 PII 정책 PASS 후 0007 추기 migration 으로 분리.
--   (d) T1 직렬화 회피 — sessionHash 적용 위치 = mobile telemetryStore.emit 직전, storage 는 plain row 만 받음.
-- recall_log 와 별도 stream — 4-원 DecisionAct (silence/ghost/suggestion/strong) + dismiss/retraction/recall_click/satisfaction 등 wide event.
-- WAL/idempotent (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS decision_log (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_decision_log_ts ON decision_log(ts);
CREATE INDEX IF NOT EXISTS idx_decision_log_actor_action ON decision_log(actor, action);

CREATE TABLE IF NOT EXISTS satisfaction_survey (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
  comment TEXT,
  session_marker TEXT NOT NULL CHECK(session_marker IN ('mid','end'))
);

CREATE INDEX IF NOT EXISTS idx_satisfaction_survey_ts ON satisfaction_survey(ts);
