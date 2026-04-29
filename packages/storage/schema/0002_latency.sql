-- Sprint 1: messages.latency_ms 추가.
-- single-shot send 는 NULL 가능, sendStream 은 user→last-token 까지의 ms 채움.
-- ALTER 는 SQLite 에서 IF NOT EXISTS 미지원 → _migrations 트래킹으로 멱등 보장.

ALTER TABLE messages ADD COLUMN latency_ms INTEGER;
