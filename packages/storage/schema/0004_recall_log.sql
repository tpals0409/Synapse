-- Sprint 4: recall decision log.
-- 모든 Recall 결정 (silence/ghost/suggestion/strong) 의 결정 시각 + 후보 + 억제 사유 기록.
-- act 4-원 enum (orchestrator DecisionAct 와 동일) 은 CHECK 제약으로 강제.
-- candidate_ids: JSON-encoded string[] (LIKE 매칭으로 cooldown 조회 — Sprint 4 단순 매칭).
-- suppressed_reason: silence 시 사유 텍스트, 그 외는 NULL 가능.
-- WAL/idempotent (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS recall_log (
  id TEXT PRIMARY KEY,
  decided_at INTEGER NOT NULL,
  act TEXT NOT NULL CHECK(act IN ('silence','ghost','suggestion','strong')),
  candidate_ids TEXT NOT NULL,
  suppressed_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_recall_log_decided_at ON recall_log(decided_at);
