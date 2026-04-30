-- Sprint 6: failure & hygiene 4 컬럼 추기.
-- concepts.last_used_at: nearest/traverse hit 시점에 갱신 (forgetting 의 입력 신호).
-- edges.last_used_at: traverse/co-decided hit 시점에 갱신.
-- messages.retracted: Humble Retraction 시 직전 assistant row 마킹 (취소선 시각).
-- recall_log.dismissed_concept_ids: applyDismiss 시 약화된 conceptIds 의 JSON-encoded TEXT.
--   [FROZEN v2026-04-29 D-S6-storage-recall-log-dismissed-shape] — boolean 단일 flag X,
--   conceptIds list 보존 (candidate_ids 의 부분집합 가능). nullable + DEFAULT NULL 로 기존 row 영향 0.
-- ALTER 는 SQLite IF NOT EXISTS 미지원 → _migrations 트래킹으로 멱등 보장.
-- 기존 row 의 last_used_at = 0 (DEFAULT). 그래야 forgetting 가중치가 즉시 약화되어도 이상치 없음
-- (engine 의 decay 함수가 0 을 "epoch" 로 받아 깊이 감쇠 — 첫 recordTouch 호출 시 정상화).

ALTER TABLE concepts ADD COLUMN last_used_at INTEGER NOT NULL DEFAULT 0;

ALTER TABLE edges ADD COLUMN last_used_at INTEGER NOT NULL DEFAULT 0;

ALTER TABLE messages ADD COLUMN retracted INTEGER NOT NULL DEFAULT 0;

ALTER TABLE recall_log ADD COLUMN dismissed_concept_ids TEXT;

CREATE INDEX IF NOT EXISTS idx_concepts_last_used_at ON concepts(last_used_at);
CREATE INDEX IF NOT EXISTS idx_edges_last_used_at ON edges(last_used_at);
