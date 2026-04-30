import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, migrate, listMessages } from '@synapse/storage';
import { send, sendStream, type OnErrorFn, type Logger } from '../index.ts';

// ---------- helpers ----------

async function* fromArray(chunks: string[]): AsyncIterable<string> {
  for (const c of chunks) yield c;
}

async function drain(it: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const c of it) out.push(c);
  return out;
}

type Spy<F extends (...args: never[]) => unknown> = {
  fn: F;
  calls: Parameters<F>[];
};

function spy<F extends (...args: never[]) => unknown>(impl: F): Spy<F> {
  const calls: Parameters<F>[] = [];
  const fn = ((...args: Parameters<F>) => {
    calls.push(args);
    return impl(...args);
  }) as F;
  return { fn, calls };
}

function silentLogger(): Logger {
  return { warn: () => {} };
}

// ---------- send (non-stream) ----------

test('send: LLM throw → onError("llm-failure") + 원 에러 propagation 보존', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const onError = spy<OnErrorFn>(() => {});

  await assert.rejects(
    send('hello', {
      db,
      complete: async () => {
        throw new Error('gemma down');
      },
      onError: onError.fn,
      logger: silentLogger(),
    }),
    /gemma down/,
  );

  assert.equal(onError.calls.length, 1, 'onError called once');
  assert.deepEqual(onError.calls[0], ['llm-failure']);

  // 시그니처 동결 검증: 기존 contract (loop.test.ts:30) — user row 는 영속화, assistant row 0.
  const rows = listMessages(db);
  assert.equal(rows.length, 1, 'user row preserved on LLM failure');
  assert.equal(rows[0]?.role, 'user');
});

test('send: 정상 흐름 → onError 호출 0 (시그니처 동결 회귀 가드)', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const onError = spy<OnErrorFn>(() => {});

  const reply = await send('안녕', {
    db,
    complete: async () => '안녕!',
    onError: onError.fn,
  });

  assert.equal(reply, '안녕!');
  assert.equal(onError.calls.length, 0, '정상 흐름에서 onError 호출 0');

  const rows = listMessages(db);
  assert.equal(rows.length, 2, 'user + assistant 영속화');
});

test('send: onError 미주입 시에도 LLM 실패 throw 그대로 propagate (옵션 hook 패턴)', async () => {
  const db = openDb(':memory:');
  migrate(db);

  await assert.rejects(
    send('hello', {
      db,
      complete: async () => {
        throw new Error('gemma down');
      },
      logger: silentLogger(),
      // onError 미주입 — 옵션 hook 패턴
    }),
    /gemma down/,
  );

  const rows = listMessages(db);
  assert.equal(rows.length, 1);
});

// ---------- sendStream ----------

test('sendStream: stream mid 에러 → onError("llm-failure") 호출 + 원 에러 propagate', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const onError = spy<OnErrorFn>(() => {});

  async function* explodingStream(): AsyncIterable<string> {
    yield '안';
    throw new Error('gemma down mid-stream');
  }

  const collected: string[] = [];
  await assert.rejects(async () => {
    for await (const tok of sendStream('안녕', {
      db,
      completeStream: () => explodingStream(),
      extractConcepts: async () => [],
      onError: onError.fn,
      logger: silentLogger(),
    })) {
      collected.push(tok);
    }
  }, /gemma down mid-stream/);

  assert.deepEqual(collected, ['안'], 'consumer received chunks before failure');
  assert.equal(onError.calls.length, 1, 'onError called once');
  assert.deepEqual(onError.calls[0], ['llm-failure']);

  // 시그니처 동결 검증: 기존 contract (loop-stream.test.ts:39) 보존 — user row 만 영속화.
  const rows = listMessages(db);
  assert.equal(rows.length, 1, 'user row preserved on LLM stream failure');
  assert.equal(rows[0]?.role, 'user');
});

test('sendStream: completeStream 호출 즉시 throw (chunks 0) → onError("llm-failure")', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const onError = spy<OnErrorFn>(() => {});

  async function* immediateThrowStream(): AsyncIterable<string> {
    throw new Error('gemma cold-start failed');
  }

  const collected: string[] = [];
  await assert.rejects(async () => {
    for await (const tok of sendStream('hi', {
      db,
      completeStream: () => immediateThrowStream(),
      extractConcepts: async () => [],
      onError: onError.fn,
      logger: silentLogger(),
    })) {
      collected.push(tok);
    }
  }, /gemma cold-start failed/);

  assert.deepEqual(collected, []);
  assert.equal(onError.calls.length, 1);
  assert.deepEqual(onError.calls[0], ['llm-failure']);
});

test('sendStream: 정상 흐름 → onError 호출 0 (시그니처 동결 회귀 가드)', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const onError = spy<OnErrorFn>(() => {});

  const tokens = await drain(
    sendStream('hello', {
      db,
      completeStream: () => fromArray(['hi', '!']),
      extractConcepts: async () => [],
      onError: onError.fn,
    }),
  );

  assert.deepEqual(tokens, ['hi', '!']);
  assert.equal(onError.calls.length, 0, '정상 흐름에서 onError 호출 0');
});

test('sendStream: onError 콜백 자체가 throw 해도 원 LLM 에러 propagation 보존 (격리)', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const onError: OnErrorFn = () => {
    throw new Error('callback exploded');
  };

  async function* explodingStream(): AsyncIterable<string> {
    throw new Error('gemma down');
  }

  // 원 에러 (gemma down) 가 propagate 되어야 함 — callback 의 throw 가 격리.
  await assert.rejects(async () => {
    for await (const _ of sendStream('hi', {
      db,
      completeStream: () => explodingStream(),
      extractConcepts: async () => [],
      onError,
      logger: silentLogger(),
    })) {
      // drain
    }
  }, /gemma down/);
});

test('sendStream: storage appendMessage(user) throw → onError("storage-failure") + propagate', async () => {
  const onError = spy<OnErrorFn>(() => {});

  // appendMessage 가 throw 하도록 db 를 닫은 상태로 주입.
  const db = openDb(':memory:');
  migrate(db);
  db.close();

  await assert.rejects(async () => {
    for await (const _ of sendStream('hi', {
      db,
      completeStream: () => fromArray(['ok']),
      extractConcepts: async () => [],
      onError: onError.fn,
      logger: silentLogger(),
    })) {
      // drain
    }
  });

  assert.equal(onError.calls.length, 1, 'onError called once for storage failure');
  assert.deepEqual(onError.calls[0], ['storage-failure']);
});
