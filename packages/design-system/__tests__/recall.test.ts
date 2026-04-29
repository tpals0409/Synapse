// Sprint 4 (T6) — Recall surface 컴포넌트의 motion 토큰 인식 + 카피 매핑 정합성.
// Sprint 5 (T7) — InspectorList source-pill 5+ 종 + protocol RecallSource 정합 가드.
//
// 본 테스트는 .tsx 컴포넌트 자체를 import 하지 *못한다* (node --experimental-strip-types
// 는 .tsx 미지원). 대신 컴포넌트별 motion 토큰 사용 명세를 *데이터*로 표현하고,
// motion 객체와 copy 객체가 그 명세를 지원하는지를 검증한다.
// Sprint 5 의 InspectorSource 정합은 raw text fs 매칭 (verify-copy 와 같은 패턴).
//
// 4 컴포넌트 (mobile 가 mount 검증):
//   - GhostHint     → motion.ghostBreathe + motion.recallEmerge,    copy.recall.ghost
//   - SuggestionCard → motion.recallEmerge + motion.synapsePulse,    copy.recall.suggestion
//   - StrongRecall  → motion.recallEmerge + motion.threadDraw + motion.synapsePulse, copy.recall.strong
//   - InspectorList → motion.nodeOrbit + motion.threadDraw + motion.synapsePulse,
//                     copy.recall.inspector  [Sprint 5 T7: source-pill 5+ 종]
//
// 컴포넌트 코드의 `*MotionTokens` 상수는 mobile 가 import 시점에 동일 토큰 셋을
// runtime check 하도록 export — 본 파일은 명세의 *기대값* 을 동결.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { motion, copy } from '../index.ts';

type RecallSurface = 'ghost' | 'suggestion' | 'strong' | 'inspector';

// Sprint 5 (T7): inspector 가 nodeOrbit (temporal + Sprint 4 strong) + threadDraw (bridge)
// + synapsePulse (domain_crossing) 3 모션을 동시 지원.
const SURFACE_MOTION_TOKENS: Record<RecallSurface, ReadonlyArray<keyof typeof motion>> = {
  ghost: ['ghostBreathe', 'recallEmerge'],
  suggestion: ['recallEmerge', 'synapsePulse'],
  strong: ['recallEmerge', 'threadDraw', 'synapsePulse'],
  inspector: ['nodeOrbit', 'threadDraw', 'synapsePulse'],
};

// [FROZEN v2026-04-29 D-S5-design-system-source-string-union]
// design-system 은 protocol 직접 import 안 함 — 6-string union 자가 선언 (InspectorList.tsx).
// 본 테스트가 protocol RecallSource 와 raw text 매칭으로 정합 가드.
const INSPECTOR_SOURCES = [
  'semantic',
  'co_occur',
  'mixed',
  'bridge',
  'temporal',
  'domain_crossing',
] as const;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INSPECTOR_LIST_PATH = path.resolve(HERE, '../src/components/InspectorList.tsx');
const PROTOCOL_RECALL_PATH = path.resolve(HERE, '../../protocol/src/recall.ts');

test('각 recall surface 가 사용하는 motion 토큰이 motion 객체에 모두 존재', () => {
  for (const [surface, tokens] of Object.entries(SURFACE_MOTION_TOKENS)) {
    for (const token of tokens) {
      assert.ok(motion[token], `surface ${surface} requires motion.${token}`);
      assert.equal(typeof motion[token].duration, 'number');
    }
  }
});

test('각 recall surface 의 copy.{ko,en}.recall.<surface> 가 존재 + title/subtitle 채워짐', () => {
  for (const surface of Object.keys(SURFACE_MOTION_TOKENS) as RecallSurface[]) {
    for (const lang of ['ko', 'en'] as const) {
      const v = copy[lang].recall[surface];
      assert.ok(v, `${lang}.recall.${surface} missing`);
      assert.ok(v.title.length > 0, `${lang}.recall.${surface}.title empty`);
      assert.ok(v.subtitle.length > 0, `${lang}.recall.${surface}.subtitle empty`);
    }
  }
});

test('synapse-pulse 사용 surface (suggestion / strong) 가 keyframe 진실원 (0.55↔1, 1↔1.18) 과 일관', () => {
  // T6 spec: SuggestionCard 는 1 회, StrongRecall 은 반복.
  const tokens = motion.synapsePulse;
  assert.equal(tokens.from.opacity, 0.55);
  assert.equal(tokens.mid.opacity, 1);
  assert.equal(tokens.from.scale, 1);
  assert.equal(tokens.mid.scale, 1.18);
});

test('thread-draw 사용 surface (strong) 의 stroke-dashoffset 키프레임 80 → 0 일관', () => {
  assert.equal(motion.threadDraw.from.strokeDashoffset, 80);
  assert.equal(motion.threadDraw.to.strokeDashoffset, 0);
});

test('node-orbit 사용 surface (inspector) 의 회전 0 → 360 일관 + radius 14', () => {
  assert.equal(motion.nodeOrbit.from.rotate, 0);
  assert.equal(motion.nodeOrbit.to.rotate, 360);
  assert.equal(motion.nodeOrbit.radius, 14);
});

test('recall surface 4 종 모두 surface map 에 등록 (drift guard)', () => {
  const surfaces = Object.keys(SURFACE_MOTION_TOKENS).sort();
  assert.deepEqual(surfaces, ['ghost', 'inspector', 'strong', 'suggestion']);
});

// ─────────────────────────────────────────────────────────────
// Sprint 5 (T7) — InspectorList source-pill 5+ 종 + protocol RecallSource 정합 가드.
// ─────────────────────────────────────────────────────────────

test('InspectorSource 6 종 = protocol RecallSource 6 종 (raw text 정합 가드)', async () => {
  // [FROZEN v2026-04-29 D-S5-design-system-source-string-union]
  // design-system 의 InspectorList.tsx 와 protocol/recall.ts 의 RecallSource 가
  // 동일한 6-string union 으로 박혀있어야 함. drift 즉시 fail.
  const inspectorRaw = await readFile(INSPECTOR_LIST_PATH, 'utf8');
  const protocolRaw = await readFile(PROTOCOL_RECALL_PATH, 'utf8');
  for (const source of INSPECTOR_SOURCES) {
    assert.ok(
      inspectorRaw.includes(`'${source}'`),
      `InspectorList.tsx must declare '${source}' in InspectorSource union`,
    );
    assert.ok(
      protocolRaw.includes(`'${source}'`),
      `protocol/recall.ts must declare '${source}' in RecallSource enum`,
    );
  }
  assert.equal(INSPECTOR_SOURCES.length, 6, 'INSPECTOR_SOURCES must remain 6');
});

test('InspectorSource union 이 protocol 외 source 키워드 누설 0 (drift guard)', async () => {
  // protocol RecallSource 에 없는 임의 source 라벨이 InspectorList.tsx 에서 새어
  // 박히지 않도록 guard. 미래에 'bridge_v2' 같은 alias 추가 시 protocol 박는 것이 먼저.
  const inspectorRaw = await readFile(INSPECTOR_LIST_PATH, 'utf8');
  const protocolRaw = await readFile(PROTOCOL_RECALL_PATH, 'utf8');
  // InspectorSource union 블록 추출.
  const unionMatch = inspectorRaw.match(
    /export type InspectorSource\s*=\s*([\s\S]*?);/,
  );
  assert.ok(unionMatch, 'InspectorList.tsx must declare InspectorSource union');
  const unionBody = unionMatch[1] ?? '';
  const literals = [...unionBody.matchAll(/'([a-z_]+)'/g)].map(
    (m) => m[1] ?? '',
  );
  assert.deepEqual(
    literals.sort(),
    [...INSPECTOR_SOURCES].sort(),
    'InspectorSource union must contain exactly the 6 RecallSource values',
  );
  // protocol 도 같은 6 종만 — 정합.
  for (const lit of literals) {
    assert.ok(
      protocolRaw.includes(`'${lit}'`),
      `protocol/recall.ts missing '${lit}' (drift)`,
    );
  }
});

test('InspectorRow 가 source?: InspectorSource optional 필드 노출 (D-S5-InspectorList-source-field)', async () => {
  // [FROZEN v2026-04-29 D-S5-InspectorList-source-field]
  // InspectorRow 시그니처에 optional source 필드 박혀있어야 함 — Sprint 4 회귀 0 + Sprint 5 활성.
  const inspectorRaw = await readFile(INSPECTOR_LIST_PATH, 'utf8');
  assert.ok(
    /source\?\s*:\s*InspectorSource/.test(inspectorRaw),
    'InspectorRow must declare optional `source?: InspectorSource`',
  );
});

test('InspectorList 의 source 분기 모션 4 종 모두 InspectorList.tsx 에 박힘 (drift guard)', async () => {
  // bridge → threadDraw, temporal → nodeOrbit, domain_crossing → synapsePulse,
  // semantic/co_occur/mixed = 추가 모션 0 (Sprint 4 그대로).
  const raw = await readFile(INSPECTOR_LIST_PATH, 'utf8');
  for (const tok of ['threadDraw', 'nodeOrbit', 'synapsePulse'] as const) {
    assert.ok(
      raw.includes(`motion.${tok}`),
      `InspectorList.tsx must reference motion.${tok}`,
    );
  }
  // accessibilityLabel guard — mobile / e2e 가 잡을 수 있는 시각 분기 hook.
  for (const label of [
    'motion-thread-draw',
    'motion-node-orbit',
    'motion-synapse-pulse',
  ]) {
    assert.ok(
      raw.includes(label),
      `InspectorList.tsx must expose accessibilityLabel="${label}" for source-pill drift guard`,
    );
  }
});

test('InspectorList 의 source-pill accent 매핑 헌법 (semantic/co_occur/mixed = synapse-deep / temporal = ink / bridge·domain_crossing = synapse)', async () => {
  // sourceAccent 함수 내부 분기 raw text 검증 — 디자인 목업 InspectorScreen 의
  // kind 라벨 시각 슬롯 (synapse-deep) 과 1:1 + Sprint 5 spec 의 모션 분기 색.
  const raw = await readFile(INSPECTOR_LIST_PATH, 'utf8');
  // sourceAccent 함수 시그니처가 박혀있어야 함.
  assert.ok(
    /function sourceAccent\(source: InspectorSource\)/.test(raw),
    'InspectorList.tsx must declare `sourceAccent(source: InspectorSource)` helper',
  );
  // 분기 case 라벨 — temporal / bridge / domain_crossing 모두 명시.
  for (const branch of ['temporal', 'bridge', 'domain_crossing']) {
    assert.ok(
      new RegExp(`case '${branch}':`).test(raw),
      `sourceAccent must handle case '${branch}'`,
    );
  }
});

test('InspectorListMotionTokens 가 nodeOrbit + threadDraw + synapsePulse 3 종 노출 (Sprint 5 T7 확장)', async () => {
  const raw = await readFile(INSPECTOR_LIST_PATH, 'utf8');
  const tokensMatch = raw.match(
    /export const InspectorListMotionTokens\s*=\s*\[([^\]]*)\]/,
  );
  assert.ok(tokensMatch, 'InspectorListMotionTokens export missing');
  const tokensBody = tokensMatch[1] ?? '';
  const declared = [...tokensBody.matchAll(/'([a-zA-Z]+)'/g)].map(
    (m) => m[1] ?? '',
  );
  assert.deepEqual(
    declared.sort(),
    ['nodeOrbit', 'synapsePulse', 'threadDraw'],
    'InspectorListMotionTokens must be exactly { nodeOrbit, threadDraw, synapsePulse }',
  );
  // 모든 토큰이 motion 객체에 존재.
  for (const tok of declared) {
    if (!tok) continue;
    assert.ok(
      (motion as Record<string, unknown>)[tok],
      `motion.${tok} missing for InspectorListMotionTokens`,
    );
  }
});
