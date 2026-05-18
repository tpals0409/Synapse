// Sprint 15 receipt — Step T1: stale team-leader token zero.
//
// 호출:
//   node --experimental-strip-types sprint15-stale-token-zero.mjs
//   → scripts/receipt/.receipt-runner/*.mjs 안 `team-leader` / `team_leader` 활성 식별자
//     (워커 list 안 string / 파일명 'team-leader.md' 등) 0건 검증.
//     역사적 마크 ("team-leader 폐기" 같은 narrative) 는 허용 (사실 보존).
//   → exit 0 + stdout:
//      "stale_team_leader_token_count=0;files_scanned=<n>;historical_marks_excluded=<n>"
//
// 정책 (D-S15-T1-stale-token-cleanup):
//   Sprint 13 commit 7419216 의 7 워커 정렬 후 stale 8 워커 토큰이 fixture 안에 잔존했음
//   (Sprint 14 carry-over O-S14-receipt-runner-stale-fixture-cleanup). Sprint 15 T1 으로 해소.
//   본 fixture 는 *active reference* (코드 식별자) 만 잡고 *historical mark* 는 제외.
//
// 검증 항목 2종 (모두 PASS 시 exit 0):
//   (A) `.receipt-runner/*.mjs` 안 single-line 안에서 'team-leader' 단독 토큰이
//       *narrative 마크 토큰* ('폐기' / '정리') 없이 등장하는 라인 0건.
//   (B) `WORKERS = [` 또는 `FILES = [` 안의 'team-leader' 등장 0건.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RUNNER = resolve(__dirname);

const SELF = fileURLToPath(import.meta.url);

function listMjs(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isFile() && entry.endsWith('.mjs')) out.push(p);
  }
  return out;
}

const FILES = listMjs(RUNNER).filter((f) => f !== SELF);

const HISTORICAL_MARKERS = ['폐기', '정리', 'cleanup'];

let staleCount = 0;
let historicalCount = 0;
const offenders = [];

for (const f of FILES) {
  const src = readFileSync(f, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/team[-_]leader/.test(line)) continue;
    const isHistorical = HISTORICAL_MARKERS.some((m) => line.includes(m));
    if (isHistorical) {
      historicalCount++;
      continue;
    }
    // active identifier (active list / 파일명 / import 등)
    staleCount++;
    offenders.push(`${f.replace(RUNNER, '.receipt-runner')}:${i + 1}: ${line.trim().slice(0, 100)}`);
  }
}

if (staleCount > 0) {
  for (const o of offenders) {
    console.error(`  stale: ${o}`);
  }
  console.error(
    `.receipt-runner 안 active team-leader 식별자 ${staleCount} 건 — D-S15-T1-stale-token-cleanup 회귀.`,
  );
  process.exit(2);
}

process.stdout.write(
  `stale_team_leader_token_count=${staleCount};` +
    `files_scanned=${FILES.length};` +
    `historical_marks_excluded=${historicalCount}`,
);
