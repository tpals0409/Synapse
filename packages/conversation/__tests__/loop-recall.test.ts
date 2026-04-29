import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, migrate } from '@synapse/storage';
import { sendStream, type RecallFn, type DecideFn, type RecallStore } from '../index.ts';
import type {
  RecallCandidate,
  RecallLogRow,
  RecallSource,
  DecisionAct,
  DecideContext,
} from '@synapse/protocol';

// ---------- helpers ----------

async function* chunks(arr: string[]): AsyncIterable<string> {
  for (const c of arr) yield c;
}

function makeStore(): RecallStore & { rows: RecallLogRow[] } {
  const rows: RecallLogRow[] = [];
  return {
    rows,
    push(row) {
      rows.push(row);
    },
    getRecent(_withinMs) {
      return rows.slice();
    },
  };
}

const C = (id: string, score: number): RecallCandidate => ({
  conceptId: id,
  label: id,
  score,
  source: 'semantic',
});

async function drain(it: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const c of it) out.push(c);
  return out;
}

/**
 * sendStream 의 hook 은 fire-and-forget. 테스트가 store.push 를 관찰하려면
 * stream 종료 후 한 microtask 더 기다려야 한다 (push 가 await 뒤로 밀릴 수 있음).
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

// ---------- 4 원 분기 ----------

test('Recall hook: silence 분기 (candidates=0) → push act=silence, suppressed_reason 미설정', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const store = makeStore();
  const recall: RecallFn = async () => [];

  await drain(
    sendStream('hi', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      recall,
      recallStore: store,
    }),
  );
  await settle();

  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0]!.act, 'silence');
  assert.equal(store.rows[0]!.suppressed_reason, undefined);
  assert.deepEqual(store.rows[0]!.candidate_ids, []);
});

// 4 원 분기는 decide stub 으로 강제 (orchestrator 본체의 score 분기 + 약화 규칙은 T4
// __tests__/decide.test.ts 책임). 본 테스트는 *conversation hook 이 decide 결과를
// store 에 정확히 전달* 하는지를 검증.

test('Recall hook: ghost 분기 (decide stub) → store push act=ghost', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const store = makeStore();
  const recall: RecallFn = async () => [C('c1', 0.5)];
  const decide: DecideFn = () => 'ghost';

  await drain(
    sendStream('hi', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      recall,
      decide,
      recallStore: store,
    }),
  );
  await settle();

  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0]!.act, 'ghost');
  assert.equal(store.rows[0]!.suppressed_reason, undefined);
  assert.deepEqual(store.rows[0]!.candidate_ids, ['c1']);
});

test('Recall hook: suggestion 분기 (decide stub) → store push act=suggestion', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const store = makeStore();
  const recall: RecallFn = async () => [C('c1', 0.7)];
  const decide: DecideFn = () => 'suggestion';

  await drain(
    sendStream('hi', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      recall,
      decide,
      recallStore: store,
    }),
  );
  await settle();

  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0]!.act, 'suggestion');
});

test('Recall hook: strong 분기 (decide stub) → store push act=strong', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const store = makeStore();
  const recall: RecallFn = async () => [C('c1', 0.9)];
  const decide: DecideFn = () => 'strong';

  await drain(
    sendStream('hi', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      recall,
      decide,
      recallStore: store,
    }),
  );
  await settle();

  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0]!.act, 'strong');
});

// ---------- silence 후처리 ----------

test('Recall hook: low-confidence (candidates>0, max<0.4) → silence + suppressed_reason=low-confidence', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const store = makeStore();
  const recall: RecallFn = async () => [C('c1', 0.2)];

  await drain(
    sendStream('hi', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      recall,
      recallStore: store,
    }),
  );
  await settle();

  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0]!.act, 'silence');
  assert.equal(store.rows[0]!.suppressed_reason, 'low-confidence');
});

// ---------- decide stub override ----------

test('Recall hook: decide DI override 호출 + ctx 형상 검증', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const store = makeStore();
  const seen: DecideContext[] = [];
  const recall: RecallFn = async () => [C('c1', 0.6), C('c2', 0.65)];
  const decide: DecideFn = (ctx) => {
    seen.push(ctx);
    return 'strong';
  };

  await drain(
    sendStream('hello world', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      recall,
      decide,
      recallStore: store,
      tokenContext: 1234,
    }),
  );
  await settle();

  assert.equal(seen.length, 1);
  assert.equal(seen[0]!.userMessage, 'hello world');
  assert.equal(seen[0]!.tokenContext, 1234);
  assert.equal(seen[0]!.candidates.length, 2);
  assert.ok(seen[0]!.recencyMs >= 0);
  assert.ok(Array.isArray(seen[0]!.recentDecisions));

  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0]!.act, 'strong');
});

// ---------- silence 시 UI hook 미호출 ----------

test('Recall hook: silence 시 store push 만, recall reply chunks 무영향', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const store = makeStore();
  const recall: RecallFn = async () => [];
  // UI hook 대용: decide 가 호출되어도 silence 만 반환
  const decide: DecideFn = () => 'silence';

  const tokens = await drain(
    sendStream('hi', {
      db,
      completeStream: () => chunks(['안', '녕', '!']),
      extractConcepts: async () => [],
      recall,
      decide,
      recallStore: store,
    }),
  );
  await settle();

  assert.deepEqual(tokens, ['안', '녕', '!']);
  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0]!.act, 'silence');
});

// ---------- recall 실패 .catch ----------

test('Recall hook: recall 실패 시 assistant reply 무영향, store push 0, logger.warn 호출', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const store = makeStore();
  const warned: unknown[][] = [];
  const recall: RecallFn = async () => {
    throw new Error('boom');
  };

  const tokens = await drain(
    sendStream('hi', {
      db,
      completeStream: () => chunks(['ok', '!']),
      extractConcepts: async () => [],
      recall,
      recallStore: store,
      logger: {
        warn: (...args: unknown[]) => {
          warned.push(args);
        },
      },
    }),
  );
  await settle();

  assert.deepEqual(tokens, ['ok', '!']);
  assert.equal(store.rows.length, 0, 'recall 실패 시 store push 미발생');
  assert.ok(
    warned.some((args) =>
      args.some((a) => typeof a === 'string' && a.includes('recall hook failed')),
    ),
    'logger.warn 가 recall hook 실패로 호출돼야 함',
  );
});

// ---------- recallStore 미주입 시 no-op ----------

test('Recall hook: recallStore 미주입 시 no-op (recall/decide 호출 0, reply 정상)', async () => {
  const db = openDb(':memory:');
  migrate(db);

  let recallCalls = 0;
  let decideCalls = 0;
  const recall: RecallFn = async () => {
    recallCalls += 1;
    return [];
  };
  const decide: DecideFn = () => {
    decideCalls += 1;
    return 'silence';
  };

  const tokens = await drain(
    sendStream('hi', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      recall,
      decide,
      // recallStore 미주입
    }),
  );
  await settle();

  assert.deepEqual(tokens, ['ok']);
  assert.equal(recallCalls, 0, 'recallStore 미주입 시 recall 호출 0');
  assert.equal(decideCalls, 0, 'recallStore 미주입 시 decide 호출 0');
});

// ---------- decide 호출 시점 = 첫 chunk 도달 *전* 시작 ----------

test('Recall hook: recall 호출이 첫 chunk yield 이전에 시작', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const store = makeStore();
  let recallStartedAt: number | null = null;
  let firstChunkAt: number | null = null;

  const recall: RecallFn = async () => {
    recallStartedAt = Date.now();
    return [];
  };

  async function* slowStream(): AsyncIterable<string> {
    // recall 가 *시작* 할 시간을 확실히 줌 (microtask 양보 + 작은 sleep).
    await new Promise((r) => setTimeout(r, 20));
    firstChunkAt = Date.now();
    yield 'late';
  }

  await drain(
    sendStream('hi', {
      db,
      completeStream: () => slowStream(),
      extractConcepts: async () => [],
      recall,
      recallStore: store,
    }),
  );
  await settle();

  assert.notEqual(recallStartedAt, null, 'recall must have started');
  assert.notEqual(firstChunkAt, null, 'first chunk must have arrived');
  assert.ok(
    recallStartedAt! <= firstChunkAt!,
    `recall start ${recallStartedAt} should be ≤ first chunk ${firstChunkAt}`,
  );
});

// ---------- DecisionAct enum 4 원 사용 검증 (drift 가드) ----------

test('Recall hook: DecisionAct 4 원 모두 store 기록 가능 (drift 가드)', async () => {
  const acts: DecisionAct[] = ['silence', 'ghost', 'suggestion', 'strong'];
  const seen = new Set<DecisionAct>();

  for (const target of acts) {
    const db = openDb(':memory:');
    migrate(db);
    const store = makeStore();

    const recall: RecallFn = async () => [C('c1', 0.5)];
    const decide: DecideFn = () => target;

    await drain(
      sendStream('hi', {
        db,
        completeStream: () => chunks(['ok']),
        extractConcepts: async () => [],
        recall,
        decide,
        recallStore: store,
      }),
    );
    await settle();

    if (store.rows[0]) seen.add(store.rows[0].act);
  }

  // silence 는 applySilence 후처리로도 발생 가능; ghost/suggestion/strong 는 decide stub 그대로 통과.
  assert.ok(seen.has('ghost'));
  assert.ok(seen.has('suggestion'));
  assert.ok(seen.has('strong'));
  assert.ok(seen.has('silence'));
});

// ---------- Sprint 5: 3 신규 source (bridge / temporal / domain_crossing) hook 통과 ----------

// engine.recallCandidates 가 hyperRecall 3 source 합집합을 RecallCandidate[] 로 좁혀 반환
// (D-S5-T3). conversation hook 은 source-agnostic — 신규 source 도 store push 까지 정상 흐름.
// 본 테스트는 *conversation 측 hook 시그니처 / 호출 위치 변경 0* 을 검증한다.
test('Recall hook (S5): bridge / temporal / domain_crossing source 가 RecallCandidate 통과해 store push', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const store = makeStore();
  const seen: DecideContext[] = [];

  const candidates: RecallCandidate[] = [
    { conceptId: 'b1', label: 'bridge-c', score: 0.62, source: 'bridge' },
    { conceptId: 't1', label: 'temporal-c', score: 0.55, source: 'temporal' },
    { conceptId: 'x1', label: 'cross-c', score: 0.71, source: 'domain_crossing' },
  ];
  const recall: RecallFn = async () => candidates;
  const decide: DecideFn = (ctx) => {
    seen.push(ctx);
    return 'suggestion';
  };

  await drain(
    sendStream('hi', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      recall,
      decide,
      recallStore: store,
    }),
  );
  await settle();

  // decide 가 신규 source 를 그대로 candidates 로 받았는가
  assert.equal(seen.length, 1);
  assert.equal(seen[0]!.candidates.length, 3);
  const sourcesIn = seen[0]!.candidates.map((c) => c.source).sort();
  assert.deepEqual(sourcesIn, ['bridge', 'domain_crossing', 'temporal']);

  // store push 시 candidate_ids 보존 (순서까지 — hook 은 map 만 함)
  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0]!.act, 'suggestion');
  assert.deepEqual(store.rows[0]!.candidate_ids, ['b1', 't1', 'x1']);
  assert.equal(store.rows[0]!.suppressed_reason, undefined);
});

// 임계 회복 (Sprint 5 receipt): recall_candidates ≥ 3 + bridge ≥ 1 + temporal ≥ 1 동시 존재.
// orchestrator T4 의 source 가중치 약화 (D-S5-T4) 와 무관하게 conversation hook 자체는
// max(score) 기준 silence 후처리만 수행 — 본 테스트는 *분배 통과* 만 검증.
test('Recall hook (S5): bridge ≥ 1 + temporal ≥ 1 + recall_candidates ≥ 3 동시 통과 (receipt 임계 회복)', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const store = makeStore();
  const recall: RecallFn = async () => [
    { conceptId: 'b1', label: 'b1', score: 0.6, source: 'bridge' },
    { conceptId: 't1', label: 't1', score: 0.65, source: 'temporal' },
    { conceptId: 's1', label: 's1', score: 0.7, source: 'semantic' },
  ];
  const decide: DecideFn = () => 'ghost';

  await drain(
    sendStream('hi', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      recall,
      decide,
      recallStore: store,
    }),
  );
  await settle();

  assert.equal(store.rows.length, 1);
  const row = store.rows[0]!;
  assert.equal(row.act, 'ghost');
  assert.ok(row.candidate_ids.length >= 3, 'recall_candidates ≥ 3');
  // Sprint 5 fixture 임계 — bridge / temporal 각각 ≥ 1 통과 (id 별로 confirm)
  assert.ok(row.candidate_ids.includes('b1'), 'bridge ≥ 1');
  assert.ok(row.candidate_ids.includes('t1'), 'temporal ≥ 1');
});

// RecallSource 6 enum drift 가드 — 새 source 가 추가되면 본 테스트의 exhaustive switch
// 가 컴파일 시 깨져 즉시 알림 (Decision-version 태그 D-S5-T1-protocol-source-enum 보호).
test('Recall hook (S5): RecallSource 6 enum drift 가드 (모두 hook 통과)', async () => {
  const sources: RecallSource[] = [
    'semantic',
    'co_occur',
    'mixed',
    'bridge',
    'temporal',
    'domain_crossing',
  ];

  // exhaustive switch — enum 이 추가/제거되면 default 가 never 분기를 깨뜨려 빌드 실패.
  for (const s of sources) {
    const _check: void = ((src: RecallSource): void => {
      switch (src) {
        case 'semantic':
        case 'co_occur':
        case 'mixed':
        case 'bridge':
        case 'temporal':
        case 'domain_crossing':
          return;
        default: {
          const _exhaust: never = src;
          return _exhaust;
        }
      }
    })(s);
    void _check;
  }

  // 6 source 각각 하나씩 candidate 로 만들어 hook 흐름 통과하는지 확인.
  const db = openDb(':memory:');
  migrate(db);
  const store = makeStore();
  const recall: RecallFn = async () =>
    sources.map((src, i): RecallCandidate => ({
      conceptId: `c${i}`,
      label: src,
      score: 0.5 + i * 0.01,
      source: src,
    }));
  const decide: DecideFn = () => 'suggestion';

  await drain(
    sendStream('hi', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      recall,
      decide,
      recallStore: store,
    }),
  );
  await settle();

  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0]!.act, 'suggestion');
  assert.equal(store.rows[0]!.candidate_ids.length, 6);
});
