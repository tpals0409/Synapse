import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemma } from '../index.ts';

type FetchFn = typeof fetch;

function withFetch<T>(stub: FetchFn, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

function ndjsonStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i]!));
      i++;
    },
  });
}

function okResponse(body: ReadableStream<Uint8Array>): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/x-ndjson' },
  });
}

test('gemma.completeStream yields chunks line-by-line and stops on done', async () => {
  const lines = [
    '{"response":"안","done":false}\n',
    '{"response":"녕","done":false}\n',
    '{"response":"!","done":true}\n',
  ];
  const stub: FetchFn = async () => okResponse(ndjsonStream(lines));

  const tokens: string[] = [];
  await withFetch(stub, async () => {
    for await (const tok of gemma.completeStream('안녕')) {
      tokens.push(tok);
    }
  });

  assert.deepEqual(tokens, ['안', '녕', '!']);
  assert.ok(tokens.length >= 2, 'expected at least 2 chunks');
});

test('gemma.completeStream buffers partial chunks across reads', async () => {
  const chunks = [
    '{"response":"hel',
    'lo","done":false}\n{"resp',
    'onse":" world","done":false}\n',
    '{"response":"!","done":true}\n',
  ];
  const stub: FetchFn = async () => okResponse(ndjsonStream(chunks));

  const tokens: string[] = [];
  await withFetch(stub, async () => {
    for await (const tok of gemma.completeStream('hi')) {
      tokens.push(tok);
    }
  });

  assert.deepEqual(tokens, ['hello', ' world', '!']);
});

test('gemma.completeStream rejects when Ollama is down (non-2xx)', async () => {
  const stub: FetchFn = async () =>
    new Response('connection refused', { status: 503 });

  await withFetch(stub, async () => {
    await assert.rejects(async () => {
      for await (const _ of gemma.completeStream('안녕')) {
        // drain
      }
    }, /gemma 503/);
  });
});

test('gemma.completeStream rejects when fetch throws (network error)', async () => {
  const stub: FetchFn = async () => {
    throw new Error('ECONNREFUSED');
  };

  await withFetch(stub, async () => {
    await assert.rejects(async () => {
      for await (const _ of gemma.completeStream('안녕')) {
        // drain
      }
    }, /ECONNREFUSED/);
  });
});
