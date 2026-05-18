// Sprint 7 receipt — T13 (PM: Inspector unlink 결정 frozen) raw text 검증.
// (Sprint 13 7419216: team-leader 폐기 → PM 단독 큐레이션. Sprint 15 T1 stale 토큰 정리.)
//
// 호출:
//   node --experimental-strip-types sprint7-inspector-unlink-decision.mjs
//   → docs/sprints/sprint-7-polish.md §11 Decisions Made 안에
//      `[FROZEN v2026-04-30 D-S7-inspector-unlink-decision]` 토큰 + 결정 사유 (A 또는 B 선택) 박힘.
//   → exit 0 + stdout: "inspector_unlink_decision_frozen=1;mark='<token-prefix>'"
//
// 검증 패턴 (둘 다 raw text 매칭):
//   (1) 패턴: '[FROZEN v2026-04-30 D-S7-inspector-unlink-decision]'
//   (2) 결정 본문: 'A' (미구현 그대로) 또는 'B' (unlink 슬롯 + DismissButton variant 'unlink' + copy 'unlink' 키)
//       중 하나 명시.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const devDocPath = resolve(ROOT, 'docs/sprints/sprint-7-polish.md');
const text = readFileSync(devDocPath, 'utf8');

const FROZEN_TOKEN = '[FROZEN v2026-04-30 D-S7-inspector-unlink-decision]';
if (!text.includes(FROZEN_TOKEN)) {
  console.error(`sprint-7 dev doc 에 '${FROZEN_TOKEN}' 미박힘 — T13 미완료`);
  process.exit(3);
}

// 결정 본문 — A 또는 B 둘 중 하나 명시. raw text 패턴.
const aMark = "A안";
const bMark = "B안";
const aPresent = text.includes(aMark);
const bPresent = text.includes(bMark);
if (!aPresent && !bPresent) {
  console.error(`Inspector unlink 결정 본문 (A안 / B안) 미박힘`);
  process.exit(4);
}

// 결정 위치가 §11 Decisions Made 섹션 안에 있어야 함.
const dec11Idx = text.indexOf('## 11. Decisions Made');
const carry12Idx = text.indexOf('## 12.');
const frozenIdx = text.indexOf(FROZEN_TOKEN);
if (dec11Idx < 0 || frozenIdx < dec11Idx || (carry12Idx > 0 && frozenIdx > carry12Idx)) {
  console.error(`'${FROZEN_TOKEN}' 가 §11 Decisions Made 섹션 밖에 있음`);
  process.exit(5);
}

process.stdout.write(`inspector_unlink_decision_frozen=1;mark='${aPresent ? 'A' : 'B'}'`);
