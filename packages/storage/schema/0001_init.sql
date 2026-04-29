-- Sprint 0: initial schema.
-- messages: 대화 한 줄.
-- messages_vec: EmbeddingGemma 768차원 placeholder. Sprint 0 에서는 채우지 않음 (Sprint 2 부터 사용).
-- 거리 메트릭: cosine (sqlite-vec 디폴트).

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_ts ON messages(ts);

CREATE VIRTUAL TABLE IF NOT EXISTS messages_vec USING vec0(
  message_id TEXT PRIMARY KEY,
  embedding float[768]
);
