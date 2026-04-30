// Sprint 8 receipt — T8 (team-leader: 외부 데이터 분석 리포트) 검증.
//
// 호출:
//   node --experimental-strip-types sprint8-external-data-index.mjs
//   → 두 분기 중 하나 PASS:
//      (A) 데이터 수집 분기 — `docs/sprints/sprint-8-data/index.md` 존재 +
//          `docs/sprints/sprint-8-data/raw/*.json` 세션 ≥ 3 (size > 0) +
//          6 종 집계 지표 raw text.
//      (B) 데이터 부재 분기 (N=0) — `index.md` 존재 + 6 종 집계 지표 raw text +
//          *데이터 부재 분기 마커* (`N=0` OR `데이터 부재` OR `Sprint 9+ 재진입 경로` 중 ≥ 2) +
//          `[FROZEN v2026-04-30 D-S8-data-report-pending]` raw text.
//          raw/ 디렉토리 부재 OR 빈 디렉토리 모두 valid.
//   → exit 0 + stdout:
//      "external_data_index_pass=1;external_session_count=<n>;index_marks=<n>;branch=<A|B>"
//
// 분기 우선순위: A (실데이터) → B (보류 분기).
//
// [DIRECTIVE v2026-04-30 D-S8-sprint-close-A-branch] — PM (A) 분기 명시 선택 시
// N=0 + 데이터 부재 사유 + Sprint 9+ 재진입 경로 + data-report-pending frozen
// 박힘 = receipt 통과 valid path. dev doc §3 line 67 ("B안 채택이 모두 강제되는 것 = Out") 정합.
//
// 6 종 집계 지표 raw text (양 분기 공통):
//   - 'recall hit'
//   - 'dismiss 빈도'
//   - 'retraction 빈도'
//   - 'dedup 신호'
//   - 'retention 신호'
//   - '만족도'

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const DATA_DIR = resolve(ROOT, 'docs/sprints/sprint-8-data');
const INDEX_PATH = resolve(DATA_DIR, 'index.md');
const RAW_DIR = resolve(DATA_DIR, 'raw');

if (!existsSync(INDEX_PATH)) {
  console.error('docs/sprints/sprint-8-data/index.md 미존재 — T8 미완료');
  process.exit(3);
}

const indexText = readFileSync(INDEX_PATH, 'utf8');

// 6 종 집계 지표 — 양 분기 공통.
const PATTERNS = [
  'recall hit',
  'dismiss 빈도',
  'retraction 빈도',
  'dedup 신호',
  'retention 신호',
  '만족도',
];

let marks = 0;
const missingMetrics = [];
for (const pat of PATTERNS) {
  if (indexText.includes(pat)) {
    marks += 1;
  } else {
    missingMetrics.push(pat);
  }
}

if (missingMetrics.length > 0) {
  for (const m of missingMetrics) console.error(`  index.md 에 '${m}' 미박힘`);
  console.error('external-data-index: 6 종 집계 지표 중 ' + missingMetrics.length + ' 건 미박힘');
  process.exit(6);
}

// raw/ 디렉토리 안 세션 파일 카운트 (부재면 0).
let sessionCount = 0;
if (existsSync(RAW_DIR)) {
  const rawFiles = readdirSync(RAW_DIR).filter((f) => {
    if (!f.endsWith('.json')) return false;
    const p = resolve(RAW_DIR, f);
    try {
      const s = statSync(p);
      return s.isFile() && s.size > 0;
    } catch {
      return false;
    }
  });
  sessionCount = rawFiles.length;
}

// ---------- 분기 A: 실데이터 ≥ 3 ----------
if (sessionCount >= 3) {
  process.stdout.write(
    'external_data_index_pass=1;external_session_count=' + sessionCount + ';index_marks=' + marks + ';branch=A',
  );
  process.exit(0);
}

// ---------- 분기 B: 데이터 부재 (N=0 분기) ----------
const ABSENCE_MARKERS = ['N=0', 'N = 0', '데이터 부재', 'Sprint 9+ 재진입', '재진입 경로'];
const FROZEN_PENDING = '[FROZEN v2026-04-30 D-S8-data-report-pending]';

const presentMarkers = ABSENCE_MARKERS.filter((m) => indexText.includes(m));
if (presentMarkers.length < 2) {
  console.error(
    'external-data-index branch B (N=0 분기): 부재 마커 (' +
      ABSENCE_MARKERS.join(' / ') +
      ') 중 ≥ 2 박힘 필요 — 현재 ' +
      presentMarkers.length +
      '건만 박힘',
  );
  process.exit(7);
}

if (!indexText.includes(FROZEN_PENDING)) {
  console.error(
    'external-data-index branch B: ' + FROZEN_PENDING + ' 미박힘 — 데이터 부재 분기 frozen 필수',
  );
  process.exit(8);
}

process.stdout.write(
  'external_data_index_pass=1;external_session_count=' + sessionCount + ';index_marks=' + marks + ';branch=B',
);
