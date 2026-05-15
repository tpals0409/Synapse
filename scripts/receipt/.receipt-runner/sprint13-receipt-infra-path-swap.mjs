// Sprint 13 receipt — Step 67: receipt-infra-path-swap.
//
// 호출:
//   node --experimental-strip-types sprint13-receipt-infra-path-swap.mjs
//   → 메모리 feedback_receipt_external_contract 정책 검증.
//     receipt fixture 가 root index 경로로 import 해 패키지 contract gap 을
//     catch 하도록 강제. src/ 직진 import 는 워커 misreport 의 원인이 되므로
//     0건 강제.
//   → exit 0 + stdout:
//      "receipt_infra_path_swap_pass=1;src_direct_import_count=0;fixtures_scanned=<n>"
//
// 정책 (memory: feedback_receipt_external_contract + feedback_root_index_grep):
//   - GOOD: import { x } from '../../../packages/<pkg>'        (root index)
//   - GOOD: import { x } from '../../../packages/<pkg>/index'  (root index 명시)
//   - BAD : import { x } from '../../../packages/<pkg>/src/foo' (src/ 직진)
//   - GOOD: fs/path/url-only fixture (패키지 import 0건) — 메타-검증 fixture.
//
// 본 fixture 자신을 포함한 모든 sprint*-*.mjs 스캔. 자기 자신 (path-swap.mjs)
// 은 스캔 대상이지만 위반 없음 (fs/path-only).

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const RUNNER = resolve(ROOT, 'scripts/receipt/.receipt-runner');

if (!existsSync(RUNNER)) {
  console.error(`scripts/receipt/.receipt-runner 디렉토리 미존재`);
  process.exit(2);
}

// sprint*-*.mjs 만 스캔 (메타 자산: package.json 등 제외).
const files = readdirSync(RUNNER).filter(
  (f) => /^sprint\d+-.+\.mjs$/.test(f),
);

if (files.length === 0) {
  console.error(`sprint*-*.mjs fixture 0건 — 디렉토리 회귀.`);
  process.exit(3);
}

// 위반 패턴: from '<...>/packages/<pkg>/src/...'
//   (\.\.\/)+ packages/[a-z-]+/src/
const BAD_PATTERN = /from\s+['"](?:\.\.\/)+packages\/[a-z-]+\/src\//;

const violations = [];
for (const file of files) {
  const fullPath = resolve(RUNNER, file);
  const text = readFileSync(fullPath, 'utf8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // 코멘트 라인 제외 (// 또는 * 시작).
    const stripped = line.replace(/^\s*/, '');
    if (stripped.startsWith('//') || stripped.startsWith('*')) continue;
    if (BAD_PATTERN.test(line)) {
      violations.push(`${file}:${i + 1}: ${line.trim()}`);
    }
  }
}

if (violations.length > 0) {
  console.error(`src/ 직진 import ${violations.length} 건 발견:`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    `→ root index 경로 ('../../packages/<pkg>') 로 swap 의무 ` +
      `(memory: feedback_receipt_external_contract / feedback_root_index_grep).`,
  );
  process.exit(4);
}

process.stdout.write(
  `receipt_infra_path_swap_pass=1;src_direct_import_count=0;fixtures_scanned=${files.length}`,
);
