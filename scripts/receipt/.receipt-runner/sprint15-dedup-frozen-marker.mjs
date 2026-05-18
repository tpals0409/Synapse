// Sprint 15 receipt — Step T3: dedupConcepts FROZEN marker.
//
// 호출:
//   node --experimental-strip-types sprint15-dedup-frozen-marker.mjs
//   → packages/engine/src/dedupConcepts.ts 상단 코멘트에 D-S15-dedup-signature
//     FROZEN 마크 + 7 시그니처 토큰 보존 검증.
//     engine root index 의 export 변경 0 (3 token) 추가 검증.
//   → exit 0 + stdout:
//      "dedup_frozen_marker=1;signature_tokens_present=<n>;root_exports_present=<n>"
//
// 정책 (D-S15-dedup-signature):
//   Sprint 15 T3 — dedupConcepts.ts 의 DRAFT 마크 (T8 외부 데이터 후 frozen 예정 메모) 를
//   FROZEN 마크로 swap. 알고리즘 자체 변경 0, 시그니처 보존 0 — 본 fixture 가 *마크 + 시그니처
//   토큰 raw text* 만 검증. 채택/임계 결정은 별도 D-S9-concept-dedup reconfirm 으로 분리.
//
// 검증 항목 3종 (모두 PASS 시 exit 0):
//   (A) packages/engine/src/dedupConcepts.ts 상단 100 라인 안에 raw text
//       `[FROZEN v2026-05-18 D-S15-dedup-signature]` 매칭.
//   (B) 같은 파일 안에 7 시그니처 토큰 (dedupConcepts / MergePlan / DedupOptions /
//       DedupConceptInput / EmbedSimilarityFn / NormalizeLabelFn /
//       DEFAULT_DEDUP_EMBED_THRESHOLD) 모두 등장.
//   (C) packages/engine/index.ts 안에 3 root export 토큰 (dedupConcepts /
//       MergePlan / DEFAULT_DEDUP_EMBED_THRESHOLD) 모두 등장.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const DEDUP_SRC = resolve(ROOT, 'packages/engine/src/dedupConcepts.ts');
const ENGINE_INDEX = resolve(ROOT, 'packages/engine/index.ts');

if (!existsSync(DEDUP_SRC)) {
  console.error(`packages/engine/src/dedupConcepts.ts 미존재.`);
  process.exit(2);
}
if (!existsSync(ENGINE_INDEX)) {
  console.error(`packages/engine/index.ts 미존재.`);
  process.exit(3);
}

const dedupSrc = readFileSync(DEDUP_SRC, 'utf8');
const engineIndex = readFileSync(ENGINE_INDEX, 'utf8');

// (A) FROZEN 마크
const FROZEN_RE = /\[FROZEN\s+v2026-05-18\s+D-S15-dedup-signature\]/;
const dedupHead = dedupSrc.split('\n').slice(0, 100).join('\n');
if (!FROZEN_RE.test(dedupHead)) {
  console.error(
    `dedupConcepts.ts 상단 100 라인 안에 [FROZEN v2026-05-18 D-S15-dedup-signature] 마크 미발견.`,
  );
  process.exit(4);
}

// (B) 7 시그니처 토큰
const SIG_TOKENS = [
  'dedupConcepts',
  'MergePlan',
  'DedupOptions',
  'DedupConceptInput',
  'EmbedSimilarityFn',
  'NormalizeLabelFn',
  'DEFAULT_DEDUP_EMBED_THRESHOLD',
];
let sigPresent = 0;
const missingSig = [];
for (const tok of SIG_TOKENS) {
  if (dedupSrc.includes(tok)) {
    sigPresent++;
  } else {
    missingSig.push(tok);
  }
}
if (missingSig.length > 0) {
  for (const t of missingSig) {
    console.error(`  signature missing: ${t}`);
  }
  console.error(
    `dedupConcepts.ts 안 시그니처 토큰 ${missingSig.length} 건 미등장 — D-S15-dedup-signature 회귀.`,
  );
  process.exit(5);
}

// (C) 3 root export
const ROOT_EXPORTS = ['dedupConcepts', 'MergePlan', 'DEFAULT_DEDUP_EMBED_THRESHOLD'];
let rootPresent = 0;
const missingRoot = [];
for (const tok of ROOT_EXPORTS) {
  if (engineIndex.includes(tok)) {
    rootPresent++;
  } else {
    missingRoot.push(tok);
  }
}
if (missingRoot.length > 0) {
  for (const t of missingRoot) {
    console.error(`  root export missing: ${t}`);
  }
  console.error(
    `packages/engine/index.ts 안 root export ${missingRoot.length} 건 미등장 — D-S15-dedup-signature 회귀.`,
  );
  process.exit(6);
}

process.stdout.write(
  `dedup_frozen_marker=1;` +
    `signature_tokens_present=${sigPresent};` +
    `root_exports_present=${rootPresent}`,
);
