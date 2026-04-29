import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemma } from '../index.ts';

test('gemma.complete returns non-empty response when Ollama is available', { timeout: 30_000 }, async (t) => {
  const available = await gemma.isAvailable();
  if (!available) {
    t.skip('ollama not running at ' + gemma.config.endpoint);
    return;
  }
  const reply = await gemma.complete('hello');
  assert.equal(typeof reply, 'string');
  assert.ok(reply.length > 0, 'expected non-empty response');
});

test('gemma.config exposes model + endpoint defaults', () => {
  assert.equal(typeof gemma.config.model, 'string');
  assert.equal(typeof gemma.config.endpoint, 'string');
  assert.ok(gemma.config.endpoint.startsWith('http'));
});
