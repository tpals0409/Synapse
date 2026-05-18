-- Sprint 15 T5: PII session_hash 컬럼 추가 (D-S8-pii-policy Rule 1 영속화).
-- [DIRECTIVE v2026-05-18 D-S15-pii-0007-shape] Sprint 15 T5 storage 슬라이스 ack:
--   (a) 0006 의 "(c) 본 0006 은 session_hash 컬럼 없음. T1 PII 정책 PASS 후 0007 추기" 의 fulfillment.
--   (b) telemetry 3 테이블 (decision_log / satisfaction_survey / recall_log) 에 session_hash TEXT NULL 컬럼 + 인덱스 추가.
--   (c) NULL 허용 — internal/system event 는 NULL. mobile 측 session_hash emit 은 Sprint 16 으로 분리 (T5 경계: storage + scripts 만).
--   (d) D-S8-storage-shape-ack (d) 정합 — storage 는 hash 처리 0, mobile 이 telemetryStore.emit 직전 채움.
--   (e) hash 형식: sha256(salt + user_identifier).hex()[0:16] (16자). 본 SQL 은 형식 CHECK 없음 (NULL 허용 + 형식은 mobile/export 책임).
-- WAL/idempotent (ALTER TABLE 은 IF NOT EXISTS 미지원 — 기존 row 호환은 NULL 디폴트로 보장).

ALTER TABLE decision_log         ADD COLUMN session_hash TEXT;
ALTER TABLE satisfaction_survey  ADD COLUMN session_hash TEXT;
ALTER TABLE recall_log           ADD COLUMN session_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_decision_log_session_hash        ON decision_log(session_hash);
CREATE INDEX IF NOT EXISTS idx_satisfaction_survey_session_hash ON satisfaction_survey(session_hash);
CREATE INDEX IF NOT EXISTS idx_recall_log_session_hash          ON recall_log(session_hash);
