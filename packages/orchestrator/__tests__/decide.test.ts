import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../index.ts';

test('decide returns silence by default (Sprint 0 헌법)', () => {
  const result = decide({ text: 'hello' });
  assert.equal(result.act, 'silence');
  assert.equal(result.reason, 'sprint-0-default-silence');
});

test('decide ignores recentMessages and candidates in Sprint 0', () => {
  const result = decide({
    text: '안녕',
    recentMessages: [{ id: 'm1', role: 'user', content: '안녕', ts: Date.now() }],
    candidates: [],
  });
  assert.equal(result.act, 'silence');
});
