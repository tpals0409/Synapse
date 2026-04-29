import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, migrate, listMessages } from '@synapse/storage';
import type { Concept, GraphEdge } from '@synapse/engine';
import {
  sendStream,
  runMemoryFormation,
  type ExtractConceptsFn,
  type EmbedConceptFn,
  type BuildEdgesFn,
} from '../index.ts';

const EMBED_DIM = 768;

async function* fromArray(chunks: string[]): AsyncIterable<string> {
  for (const c of chunks) yield c;
}

function makeFloat32(seed: number, dim = EMBED_DIM): Float32Array {
  const arr = new Float32Array(dim);
  for (let i = 0; i < dim; i++) arr[i] = ((seed + i) % 7) * 0.01;
  return arr;
}

function stubExtract(labels: string[]): ExtractConceptsFn {
  return async () =>
    labels.map((label, i) => ({
      id: `concept-${i}`,
      label,
      createdAt: 1_700_000_000_000 + i,
    }));
}

function stubEmbed(): EmbedConceptFn {
  let seed = 0;
  return async (concept: Concept) => ({
    ...concept,
    embedding: makeFloat32(seed++),
  });
}

function stubBuildEdges(byConcept: Record<string, GraphEdge[]> = {}): BuildEdgesFn {
  return async (newConcept) => byConcept[newConcept.id] ?? [];
}

async function drain(it: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const t of it) out.push(t);
  return out;
}

/**
 * Wait until `runMemoryFormation` 의 fire-and-forget chain 이 settle.
 * sendStream 은 마지막 yield 후 `void runMemoryFormation(...).catch(...)` 를 호출하고 즉시 종료.
 * 마이크로태스크 큐를 비우고 짧은 매크로태스크 한 번이면 stub 단계는 모두 결정성 있게 끝남.
 */
async function flushHook(): Promise<void> {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
  await new Promise((r) => setTimeout(r, 5));
}

test('runMemoryFormation: extract → embed*N → appendConcept*N → buildEdges*N → appendEdge*M → onConcepts (fixed order)', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const calls: string[] = [];

  const labels = ['산책', '노래'];
  const extract: ExtractConceptsFn = async (msg) => {
    calls.push(`extract(${msg})`);
    return labels.map((label, i) => ({
      id: `c${i}`,
      label,
      createdAt: 1_700_000_000_000 + i,
    }));
  };

  const embed: EmbedConceptFn = async (concept) => {
    calls.push(`embed(${concept.id})`);
    return { ...concept, embedding: makeFloat32(concept.id.charCodeAt(1)) };
  };

  const buildEdges: BuildEdgesFn = async (newConcept) => {
    calls.push(`buildEdges(${newConcept.id})`);
    if (newConcept.id === 'c0') {
      return [{ from: 'c0', to: 'prev-1', weight: 1.0, kind: 'co_occur' }];
    }
    return [];
  };

  let notifiedCount = -1;
  const onConcepts = (concepts: Concept[]) => {
    calls.push(`notify(${concepts.length})`);
    notifiedCount = concepts.length;
  };

  const result = await runMemoryFormation('어제 산책 중 들은 노래가 좋았어', {
    db,
    extractConcepts: extract,
    embedConcept: embed,
    buildEdges,
    onConcepts,
    prevMessageConceptIds: ['prev-1'],
  });

  assert.equal(result.length, 2);
  assert.equal(notifiedCount, 2);

  assert.deepEqual(calls, [
    'extract(어제 산책 중 들은 노래가 좋았어)',
    'embed(c0)',
    'embed(c1)',
    'buildEdges(c0)',
    'buildEdges(c1)',
    'notify(2)',
  ]);

  const conceptRows = db
    .prepare('SELECT id, label FROM concepts ORDER BY id ASC')
    .all() as Array<{ id: string; label: string }>;
  assert.deepEqual(conceptRows, [
    { id: 'c0', label: '산책' },
    { id: 'c1', label: '노래' },
  ]);

  const edgeRows = db
    .prepare('SELECT from_id, to_id, kind FROM edges')
    .all() as Array<{ from_id: string; to_id: string; kind: string }>;
  assert.deepEqual(edgeRows, [
    { from_id: 'c0', to_id: 'prev-1', kind: 'co_occur' },
  ]);
});

test('runMemoryFormation: extract returns empty → no embed/append/buildEdges/notify', async () => {
  const db = openDb(':memory:');
  migrate(db);

  let embedCalled = 0;
  let buildCalled = 0;
  let notified = 0;

  await runMemoryFormation('빈 발화', {
    db,
    extractConcepts: async () => [],
    embedConcept: (async (c) => {
      embedCalled++;
      return { ...c, embedding: makeFloat32(0) };
    }) as EmbedConceptFn,
    buildEdges: async () => {
      buildCalled++;
      return [];
    },
    onConcepts: () => {
      notified++;
    },
  });

  assert.equal(embedCalled, 0);
  assert.equal(buildCalled, 0);
  assert.equal(notified, 0);

  const conceptRows = db.prepare('SELECT id FROM concepts').all();
  assert.equal(conceptRows.length, 0);
});

test('runMemoryFormation: prevMessageConceptIds is forwarded to buildEdges', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const seenPrev: Array<string[] | undefined> = [];
  const buildEdges: BuildEdgesFn = async (_concept, opts) => {
    seenPrev.push(opts.prevMessageConceptIds);
    return [];
  };

  await runMemoryFormation('hello', {
    db,
    extractConcepts: stubExtract(['a']),
    embedConcept: stubEmbed(),
    buildEdges,
    prevMessageConceptIds: ['x', 'y'],
  });

  assert.deepEqual(seenPrev, [['x', 'y']]);
});

test('runMemoryFormation: prevMessageConceptIds undefined 일 때 그대로 undefined 전달 (첫 발화)', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const seenPrev: Array<string[] | undefined> = [];
  const buildEdges: BuildEdgesFn = async (_concept, opts) => {
    seenPrev.push(opts.prevMessageConceptIds);
    return [];
  };

  await runMemoryFormation('첫 발화', {
    db,
    extractConcepts: stubExtract(['a']),
    embedConcept: stubEmbed(),
    buildEdges,
  });

  assert.deepEqual(seenPrev, [undefined]);
});

test('runMemoryFormation: semanticThreshold 미지정 시 0.7 기본값 전달', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const seenThreshold: Array<number | undefined> = [];
  const buildEdges: BuildEdgesFn = async (_c, opts) => {
    seenThreshold.push(opts.threshold);
    return [];
  };

  await runMemoryFormation('msg', {
    db,
    extractConcepts: stubExtract(['a']),
    embedConcept: stubEmbed(),
    buildEdges,
  });

  assert.deepEqual(seenThreshold, [0.7]);
});

test('runMemoryFormation: nearest 미주입 시 storage.nearestConcepts 가 db 와 함께 buildEdges 에 전달됨', async () => {
  const db = openDb(':memory:');
  migrate(db);

  let seenNearest: unknown = null;
  const buildEdges: BuildEdgesFn = async (_c, opts) => {
    seenNearest = opts.nearest;
    return [];
  };

  await runMemoryFormation('msg', {
    db,
    extractConcepts: stubExtract(['a']),
    embedConcept: stubEmbed(),
    buildEdges,
  });

  assert.equal(typeof seenNearest, 'function', 'nearest must be bound to a function');
});

test('runMemoryFormation: extract reject — 호출자에 reject 전파, concepts 적재 0', async () => {
  const db = openDb(':memory:');
  migrate(db);

  await assert.rejects(
    runMemoryFormation('msg', {
      db,
      extractConcepts: async () => {
        throw new Error('extract down');
      },
      embedConcept: stubEmbed(),
      buildEdges: stubBuildEdges(),
    }),
    /extract down/,
  );

  const rows = db.prepare('SELECT id FROM concepts').all();
  assert.equal(rows.length, 0);
});

test('runMemoryFormation: embed reject — concept 적재 0, edges 0', async () => {
  const db = openDb(':memory:');
  migrate(db);

  await assert.rejects(
    runMemoryFormation('msg', {
      db,
      extractConcepts: stubExtract(['a', 'b']),
      embedConcept: (async () => {
        throw new Error('embed down');
      }) as EmbedConceptFn,
      buildEdges: stubBuildEdges(),
    }),
    /embed down/,
  );

  const rows = db.prepare('SELECT id FROM concepts').all();
  assert.equal(rows.length, 0);
});

test('runMemoryFormation: buildEdges reject — 해당 concept 시점에서 reject (격리는 sendStream 의 .catch 책임)', async () => {
  const db = openDb(':memory:');
  migrate(db);

  await assert.rejects(
    runMemoryFormation('msg', {
      db,
      extractConcepts: stubExtract(['a']),
      embedConcept: stubEmbed(),
      buildEdges: async () => {
        throw new Error('edges down');
      },
    }),
    /edges down/,
  );
});

test('sendStream: hook 은 fire-and-forget — yield/persist 흐름 무영향 (extract reject 시 reply 정상)', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const warnings: unknown[] = [];
  const tokens = await drain(
    sendStream('안녕', {
      db,
      completeStream: () => fromArray(['안', '녕', '!']),
      extractConcepts: async () => {
        throw new Error('extract boom');
      },
      embedConcept: stubEmbed(),
      buildEdges: stubBuildEdges(),
      logger: { warn: (...args) => warnings.push(args) },
    }),
  );

  assert.deepEqual(tokens, ['안', '녕', '!']);

  const rows = listMessages(db);
  assert.equal(rows.length, 2);
  assert.equal(rows[1]?.content, '안녕!');

  await flushHook();

  assert.equal(warnings.length, 1, 'logger.warn must be called exactly once');
  const conceptRows = db.prepare('SELECT id FROM concepts').all();
  assert.equal(conceptRows.length, 0);
});

test('sendStream: hook 정상 경로 — 적재 + onConcepts 호출, reply 흐름 무영향', async () => {
  const db = openDb(':memory:');
  migrate(db);

  let notified: Concept[] | null = null;

  const tokens = await drain(
    sendStream('산책 갔다 왔어', {
      db,
      completeStream: () => fromArray(['좋', '네']),
      extractConcepts: stubExtract(['산책']),
      embedConcept: stubEmbed(),
      buildEdges: stubBuildEdges(),
      onConcepts: (cs) => {
        notified = cs;
      },
    }),
  );

  assert.deepEqual(tokens, ['좋', '네']);

  await flushHook();

  assert.ok(notified !== null, 'onConcepts must fire after assistant append');
  assert.equal((notified as Concept[]).length, 1);
  assert.equal((notified as Concept[])[0]?.label, '산책');

  const conceptRows = db
    .prepare('SELECT label FROM concepts')
    .all() as Array<{ label: string }>;
  assert.deepEqual(conceptRows, [{ label: '산책' }]);
});

test('sendStream: embed reject 도 흡수 — reply 정상, logger.warn 1회', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const warnings: unknown[] = [];
  const tokens = await drain(
    sendStream('hi', {
      db,
      completeStream: () => fromArray(['hi']),
      extractConcepts: stubExtract(['greeting']),
      embedConcept: (async () => {
        throw new Error('embed gone');
      }) as EmbedConceptFn,
      buildEdges: stubBuildEdges(),
      logger: { warn: (...args) => warnings.push(args) },
    }),
  );

  assert.deepEqual(tokens, ['hi']);

  await flushHook();
  assert.equal(warnings.length, 1);
});

test('sendStream: buildEdges reject 도 흡수 — reply 정상, logger.warn 1회', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const warnings: unknown[] = [];
  const tokens = await drain(
    sendStream('msg', {
      db,
      completeStream: () => fromArray(['msg']),
      extractConcepts: stubExtract(['x']),
      embedConcept: stubEmbed(),
      buildEdges: async () => {
        throw new Error('edges gone');
      },
      logger: { warn: (...args) => warnings.push(args) },
    }),
  );

  assert.deepEqual(tokens, ['msg']);
  await flushHook();
  assert.equal(warnings.length, 1);
});

test('sendStream: completeStream reject 시 hook 미실행 — assistant append 가 일어나지 않으므로', async () => {
  const db = openDb(':memory:');
  migrate(db);

  let extractCalled = 0;
  async function* exploding(): AsyncIterable<string> {
    yield 'a';
    throw new Error('stream boom');
  }

  await assert.rejects(async () => {
    for await (const _ of sendStream('msg', {
      db,
      completeStream: () => exploding(),
      extractConcepts: async () => {
        extractCalled++;
        return [];
      },
    })) {
      // drain
    }
  }, /stream boom/);

  await flushHook();
  assert.equal(extractCalled, 0, 'hook must not run when assistant append never happened');
});
