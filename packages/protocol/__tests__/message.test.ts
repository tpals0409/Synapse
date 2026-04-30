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

test('protocol: Message.retracted is optional number (D-S6-protocol-message-retracted)', () => {
  const m1: Message = { id: 'm1', role: 'assistant', content: 'x', ts: 1 };
  assert.equal(m1.retracted, undefined);
  const m2: Message = {
    id: 'm2',
    role: 'assistant',
    content: 'y',
    ts: 2,
    retracted: 1,
  };
  assert.equal(m2.retracted, 1);
});
