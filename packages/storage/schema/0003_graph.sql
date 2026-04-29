-- Sprint 3: concept graph + vector index.
-- concepts: 메모리의 노드. embedding 은 Float32Array 768d 의 little-endian BLOB.
-- edges: 노드 간 관계. weight ∈ [0,1]. kind = 'co_occur' | 'semantic'.
-- vec_concepts: sqlite-vec 가상 테이블. rowid = concepts.rowid 로 매핑.
--   (concepts.id 는 TEXT PK 이므로 별도 INTEGER rowid 사용; appendConcept 에서 동기화.)

CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  embedding BLOB,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_concepts_created_at ON concepts(created_at);

CREATE TABLE IF NOT EXISTS edges (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  weight REAL NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('co_occur','semantic')),
  PRIMARY KEY (from_id, to_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id);
CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_id);

CREATE VIRTUAL TABLE IF NOT EXISTS vec_concepts USING vec0(
  embedding float[768]
);
