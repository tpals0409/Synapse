import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, migrate } from '@synapse/storage';
import { sendStream, type RecallFn, type DecideFn, type RecallStore } from '../index.ts';
import type {
  RecallCandidate,
  RecallLogRow,
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
