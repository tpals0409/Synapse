import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, migrate } from '@synapse/storage';
import {
  sendStream,
  detectRetractionSignal,
  type MarkRetractedFn,
  type RollbackCaptureFn,
  type MarkDismissedFn,
  type DetectRetractionFn,
} from '../index.ts';

// ---------- helpers ----------

async function* chunks(arr: string[]): AsyncIterable<string> {
  for (const c of arr) yield c;
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

// ---------- detectRetractionSignal — regex 단위 ----------

test('detectRetractionSignal: ko 부정 신호 hit ("아니야 / 그건 아니 / 틀렸 / 아냐 / 그건 다른")', () => {
  for (const s of [
    '아니',
    '아니야',
    '아냐',
    '그건 아니야',
    '그건 다른 얘기야',
    '틀렸어',
    '잘못 알았어',
  ]) {
    assert.equal(detectRetractionSignal(s), true, `ko hit: ${s}`);
  }
});

test('detectRetractionSignal: en 부정 신호 hit ("no that\'s / not what / wrong / I didn\'t")', () => {
  for (const s of [
    "No, that's wrong",
    "no that's not it",
    'not what I meant',
    'wrong answer',
    "I didn't say that",
    "That's wrong",
  ]) {
    assert.equal(detectRetractionSignal(s), true, `en hit: ${s}`);
  }
});

test('detectRetractionSignal: 부정 신호 miss (mid-sentence / 일반 문장 / 빈 문자열)', () => {
  for (const s of [
    '',
    '안녕하세요',
    '오늘 날씨가 좋네요',
    'Hello, how are you?',
    '그건 다른 얘기지만 사실 맞아', // mid-sentence 처럼 보여도 ^ anchor 매칭은 hit (보강 의도와 충돌 시 명확히)
  ]) {
    // 빈 문자열 / 평범한 인사 / "Hello" 는 miss 여야 함.
    if (s === '' || s === '안녕하세요' || s === '오늘 날씨가 좋네요' || s === 'Hello, how are you?') {
      assert.equal(detectRetractionSignal(s), false, `miss: ${JSON.stringify(s)}`);
    }
  }
  assert.equal(detectRetractionSignal(''), false);
  assert.equal(detectRetractionSignal('안녕하세요'), false);
  assert.equal(detectRetractionSignal('오늘 날씨가 좋네요'), false);
  assert.equal(detectRetractionSignal('Hello there'), false);
});

// ---------- runRetractionHook (sendStream 통과) — 5+ scenarios ----------

test('Retraction hook: 부정 신호 hit + 직전 assistant 존재 → markRetracted + rollbackCaptureForTurn 호출', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const markRetracted = spy<MarkRetractedFn>(() => {});
  const rollbackCaptureForTurn = spy<RollbackCaptureFn>(() => ({ rolledback: 2 }));

  await drain(
    sendStream('아니야, 그게 아니라', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      markRetracted: markRetracted.fn,
      rollbackCaptureForTurn: rollbackCaptureForTurn.fn,
      prevAssistantMessageId: 'asst-1',
      prevAssistantConceptIds: ['c1', 'c2'],
    }),
  );

  assert.equal(markRetracted.calls.length, 1, 'markRetracted called once');
  assert.deepEqual(markRetracted.calls[0], ['asst-1']);
  assert.equal(rollbackCaptureForTurn.calls.length, 1, 'rollback called once');
  assert.deepEqual(rollbackCaptureForTurn.calls[0], [['c1', 'c2']]);
});

test('Retraction hook: 부정 신호 miss → 어떤 함수도 호출 0 (hook noop)', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const markRetracted = spy<MarkRetractedFn>(() => {});
  const rollbackCaptureForTurn = spy<RollbackCaptureFn>(() => ({ rolledback: 0 }));
  const markDismissed = spy<MarkDismissedFn>(() => {});

  await drain(
    sendStream('오늘 날씨 어때?', {
      db,
      completeStream: () => chunks(['좋아요']),
      extractConcepts: async () => [],
      markRetracted: markRetracted.fn,
      rollbackCaptureForTurn: rollbackCaptureForTurn.fn,
      markDismissed: markDismissed.fn,
      prevAssistantMessageId: 'asst-1',
      prevAssistantConceptIds: ['c1'],
      prevRecallLogId: 'rl-1',
    }),
  );

  assert.equal(markRetracted.calls.length, 0);
  assert.equal(rollbackCaptureForTurn.calls.length, 0);
  assert.equal(markDismissed.calls.length, 0);
});

test('Retraction hook: 직전 assistant msg 없음 (prevAssistantMessageId 미주입) → hook noop', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const markRetracted = spy<MarkRetractedFn>(() => {});
  const rollbackCaptureForTurn = spy<RollbackCaptureFn>(() => ({ rolledback: 0 }));

  await drain(
    sendStream('아니야', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      markRetracted: markRetracted.fn,
      rollbackCaptureForTurn: rollbackCaptureForTurn.fn,
      // prevAssistantMessageId 미주입 — 첫 user msg 또는 chatStore 가 갱신 안 한 상태
    }),
  );

  assert.equal(markRetracted.calls.length, 0, 'no prevId → markRetracted skip');
  assert.equal(rollbackCaptureForTurn.calls.length, 0);
});

test('Retraction hook: DI 옵션 (markRetracted) 미주입 시 hook 전체 noop', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const rollbackCaptureForTurn = spy<RollbackCaptureFn>(() => ({ rolledback: 0 }));

  await drain(
    sendStream("No that's wrong", {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      // markRetracted 미주입 — 옵션 hook 패턴 (RecallHook 답습)
      rollbackCaptureForTurn: rollbackCaptureForTurn.fn,
      prevAssistantMessageId: 'asst-1',
      prevAssistantConceptIds: ['c1'],
    }),
  );

  assert.equal(
    rollbackCaptureForTurn.calls.length,
    0,
    'markRetracted 미주입 시 hook 전체 skip — rollback 도 호출 0',
  );
});

test('Retraction hook: ko + en 부정 신호 양쪽 hit (2 sendStream 호출 검증)', async () => {
  const cases: { input: string; lang: string }[] = [
    { input: '아니야 그게 아니라', lang: 'ko' },
    { input: "No, that's wrong", lang: 'en' },
  ];

  for (const c of cases) {
    const db = openDb(':memory:');
    migrate(db);
    const markRetracted = spy<MarkRetractedFn>(() => {});
    const rollback = spy<RollbackCaptureFn>(() => ({ rolledback: 1 }));

    await drain(
      sendStream(c.input, {
        db,
        completeStream: () => chunks(['ok']),
        extractConcepts: async () => [],
        markRetracted: markRetracted.fn,
        rollbackCaptureForTurn: rollback.fn,
        prevAssistantMessageId: `asst-${c.lang}`,
        prevAssistantConceptIds: ['c1'],
      }),
    );

    assert.equal(markRetracted.calls.length, 1, `${c.lang}: markRetracted called`);
    assert.equal(markRetracted.calls[0]![0], `asst-${c.lang}`);
    assert.equal(rollback.calls.length, 1, `${c.lang}: rollback called`);
  }
});

test('Retraction hook: prevAssistantConceptIds 비어있으면 markRetracted 만, rollback 은 skip', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const markRetracted = spy<MarkRetractedFn>(() => {});
  const rollbackCaptureForTurn = spy<RollbackCaptureFn>(() => ({ rolledback: 0 }));

  await drain(
    sendStream('아니야', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      markRetracted: markRetracted.fn,
      rollbackCaptureForTurn: rollbackCaptureForTurn.fn,
      prevAssistantMessageId: 'asst-1',
      prevAssistantConceptIds: [], // 직전 turn 에 capture 0
    }),
  );

  assert.equal(markRetracted.calls.length, 1);
  assert.equal(
    rollbackCaptureForTurn.calls.length,
    0,
    'conceptIds 비면 storage rollback 호출 skip',
  );
});

test('Retraction hook: prevRecallLogId + markDismissed 주입 시 recall_log dismiss 마킹 호출', async () => {
  const db = openDb(':memory:');
  migrate(db);

  const markRetracted = spy<MarkRetractedFn>(() => {});
  const rollbackCaptureForTurn = spy<RollbackCaptureFn>(() => ({ rolledback: 1 }));
  const markDismissed = spy<MarkDismissedFn>(() => {});

  await drain(
    sendStream('아니야 그건 다른 얘기', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      markRetracted: markRetracted.fn,
      rollbackCaptureForTurn: rollbackCaptureForTurn.fn,
      markDismissed: markDismissed.fn,
      prevAssistantMessageId: 'asst-1',
      prevAssistantConceptIds: ['c1', 'c2'],
      prevRecallLogId: 'rl-7',
    }),
  );

  assert.equal(markRetracted.calls.length, 1);
  assert.equal(rollbackCaptureForTurn.calls.length, 1);
  assert.equal(markDismissed.calls.length, 1);
  assert.deepEqual(markDismissed.calls[0], ['rl-7', ['c1', 'c2']]);
});

test('Retraction hook: detectRetraction DI override 채택 (LLM 분류 인터페이스 호환성)', async () => {
  const db = openDb(':memory:');
  migrate(db);

  // 입력이 부정 신호로 보이지 않아도 override 가 true 반환 시 hook 발동.
  const detect: DetectRetractionFn = (text) => text.includes('cancel');
  const markRetracted = spy<MarkRetractedFn>(() => {});

  await drain(
    sendStream('please cancel that', {
      db,
      completeStream: () => chunks(['ok']),
      extractConcepts: async () => [],
      detectRetraction: detect,
      markRetracted: markRetracted.fn,
      prevAssistantMessageId: 'asst-1',
      prevAssistantConceptIds: [],
    }),
  );

  assert.equal(markRetracted.calls.length, 1, 'override detect=true → markRetracted called');
  assert.deepEqual(markRetracted.calls[0], ['asst-1']);
});
