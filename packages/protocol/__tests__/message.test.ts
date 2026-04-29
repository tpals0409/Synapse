import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Message, Role } from '../index.ts';

test('protocol: Message type shape compiles and is structurally valid', () => {
  const sample: Message = {
    id: 'm_0',
    role: 'user',
    content: '안녕',
    ts: 1_700_000_000_000,
  };
  assert.equal(sample.role, 'user');
  assert.equal(typeof sample.content, 'string');
  assert.equal(typeof sample.ts, 'number');
});

test('protocol: Role union accepts user and assistant', () => {
  const a: Role = 'user';
  const b: Role = 'assistant';
  assert.notEqual(a, b);
});
