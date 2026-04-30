import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  openDb,
  migrate,
  appendConcept,
  appendEdge,
  appendRecallLog,
  recentlyDecidedFor,
  traverse,
} from '../index.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'synapse-storage-sqlaudit-'));
  const path = join(dir, 'test.db');
  const db = openDb(path);
  migrate(db);
  return {
    db,
    cleanup: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

// [D-S6-storage-sql-secondary-sort-audit] — production code 의 모든 SQL `ORDER BY`
// 단일 키 검토. 이 fixture 는 (a) source-level static check 로 단일-키 ORDER BY 0
// 확정 + (b) runtime 으로 결정성 검증.

test('sql-audit: production source 의 ORDER BY 단일 키 0 (static check)', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, '..', 'src', 'repo');
  const messages = join(here, '..', 'src', 'messages.ts');

  const files = [
    join(repoRoot, 'embed.ts'),
    join(repoRoot, 'graph.ts'),
    join(repoRoot, 'recall.ts'),
    join(repoRoot, 'forgetting.ts'),
    join(repoRoot, 'retraction.ts'),
    join(repoRoot, 'dismiss.ts'),
    messages,
  ];

  // ORDER BY <expr> (단일 토큰 ASC|DESC?)\s*(LIMIT|\)|$|\n) — secondary sort 부재.
  // expr 단일 키 = column-name (단어/점/공백 한 묶음, 콤마 없음).
  // 본 검사는 후-secondary-sort 적용 후 production 코드가 multi-key 또는 ORDER BY 부재이도록 강제.
  // ts ASC 단일 키 (messages.listMessages — Sprint 1 동결, ts 가 PK 가까운 인덱스) 는 예외.
  const allowSingleKey = new Set([
    "ORDER BY ts ASC", // messages.listMessages (Sprint 1 frozen — ts 가 PK 동등 인덱스).
    "ORDER BY id ASC", // retraction.rollbackCaptureForTurn 의 rowid SELECT — id 가 PK 라 결정적.
    "ORDER BY from_id ASC, to_id ASC, kind ASC", // forgetting.decayWeights — 이미 multi-key (정상).
  ]);

  // SQL string literals (single-quote/backtick) 안의 ORDER BY 만 캡쳐. 주석 (//, /* */)
  // 안의 텍스트는 무시. 행 단위 처리로 단순화 — 주석 제거 후 ORDER BY 검사.
  let violations = 0;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    // 1. 블록 주석 제거.
    let stripped = src.replace(/\/\*[\s\S]*?\*\//g, '');
    // 2. 행 단위 // 주석 제거.
    stripped = stripped
      .split('\n')
      .map((line) => {
        const idx = line.indexOf('//');
        return idx >= 0 ? line.slice(0, idx) : line;
      })
      .join('\n');

    // 3. backtick / single-quote 문자열 리터럴 안의 ORDER BY 만 캡쳐.
    const literalRe = /(`[^`]*`|'[^']*')/gs;
    let lit: RegExpExecArray | null;
    while ((lit = literalRe.exec(stripped)) !== null) {
      const literal = lit[1] ?? '';
      const orderRe = /ORDER BY\s+([^)`'\n]+?)(?:\bLIMIT\b|\)|`|'|$|\n)/gi;
      let m: RegExpExecArray | null;
      while ((m = orderRe.exec(literal)) !== null) {
        const clause = (m[1] ?? '').trim().replace(/\s+/g, ' ');
        if (clause.includes(',')) continue;
        const normalizedKey = `ORDER BY ${clause}`;
        if (allowSingleKey.has(normalizedKey)) continue;
        violations++;
        console.error(`single-key ORDER BY in ${file}: "${clause}"`);
      }
    }
  }
  assert.equal(violations, 0, `found ${violations} single-key ORDER BY in production code`);
});

test('sql-audit: recentlyDecidedFor 결정성 — decided_at tie 시 id ASC', () => {
  const { db, cleanup } = freshDb();
  try {
    // 동일 decided_at 의 두 row — id ASC 우선이면 'r-aaa' 가 후보 (그러나 LIMIT 1 + DESC 라
    // r-aaa, r-bbb 둘 다 같은 decided_at 이면 id ASC 로 r-aaa 가 먼저).
    appendRecallLog(db, { id: 'r-bbb', decided_at: 1000, act: 'ghost', candidate_ids: ['c1'] });
    appendRecallLog(db, { id: 'r-aaa', decided_at: 1000, act: 'suggestion', candidate_ids: ['c1'] });

    // 100 회 반복 — 결정성 검증 (race 없는 SQL 이라도 ORDER BY 결정성).
    for (let i = 0; i < 5; i++) {
      const hit = recentlyDecidedFor(db, 'c1', 10_000, 2_000);
      assert.equal(hit?.id, 'r-aaa', `tie-break by id ASC, run ${i}`);
    }
  } finally {
    cleanup();
  }
});

test('sql-audit: traverseOneHop 결정성 — label ASC tie-break', () => {
  const { db, cleanup } = freshDb();
  try {
    // c1 의 1-hop 이웃 3개. label 정렬: '가나' < '나다' < '다라'.
    appendConcept(db, { id: 'c1', label: 'seed', createdAt: 1 });
    appendConcept(db, { id: 'c2', label: '나다', createdAt: 2 });
    appendConcept(db, { id: 'c3', label: '가나', createdAt: 3 });
    appendConcept(db, { id: 'c4', label: '다라', createdAt: 4 });
    appendEdge(db, { fromId: 'c1', toId: 'c2', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { fromId: 'c1', toId: 'c3', weight: 0.5, kind: 'co_occur' });
    appendEdge(db, { fromId: 'c1', toId: 'c4', weight: 0.5, kind: 'co_occur' });

    const hits = traverse(db, 'c1', 1);
    // [FROZEN D-S6-storage-sql-secondary-sort-audit] label ASC, conceptId ASC.
    const labels = hits.map((h) => h.label);
    assert.deepEqual(labels, ['가나', '나다', '다라'], 'label ASC 결정성');
  } finally {
    cleanup();
  }
});
