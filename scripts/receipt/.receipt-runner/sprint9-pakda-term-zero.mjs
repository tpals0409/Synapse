// Sprint 9 receipt — Step 62: pakda-term-zero.
//
// 호출:
//   node --experimental-strip-types sprint9-pakda-term-zero.mjs
//   → 신규 dev doc 변경분 / 8 워커 정의 헌법 9~12 추기 영역 라인을
//     컨텍스트 인식 grep 으로 동사 활용형 토큰 0건 검증.
//   → exit 0 + stdout:
//      "pakda_term_zero_pass=1;pakda_term_count=0"
//
// 정책 (D-S9-no-pakda-term + dev doc §11 Open Issues 4 fixture 컨텍스트 인식 정책):
//
//   적용 영역 (검증 대상):
//     (a) docs/sprints/sprint-9-external-data-and-decisions.md §3~§12
//         (§1~§2 churn 회피 제외 — Sprint 8 에서 raw text 보존)
//     (b) .claude/agents/{8 워커}.md 파일 line 9~12 (헌법 9~12 추기 영역)
//         (Sprint 11 /end 긴급 통합 수정: c460712 .claude/commands → .claude/agents swap 후속 정합.)
//
//   제외 영역 (false positive 회피):
//     (a) 정책 정의 자체 라인 — '"박다"' 따옴표 / '용어 0건' / '용어 금지' 명시
//     (b) 검증 토큰 명시 라인 — '검증 동사 활용형 grep 토큰' / '대체어 6종 매핑'
//     (c) Sprint 7 작성 영역 (헌법 7 의 '박음' 등 churn 회피)
//     (d) 코드 블록 / 인용문 안 메타 인용 — `…` 백틱 코드 인라인
//
//   검증 동사 활용형 토큰 10종:
//     박다 / 박는다 / 박힘 / 박는 / 박음 / 박혔 / 박을 / 박혀 / 박혀야 / 박혀있
//
//   매칭 정책: line-prefix 정밀 검증 — 한 라인 안에 토큰 hit 이 있어도
//     그 라인 자체가 위 제외 영역 4종 중 하나면 false positive 로 무시.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

const TOKENS = [
  '박다',
  '박는다',
  '박힘',
  '박는',
  '박음',
  '박혔',
  '박을',
  '박혀',
  '박혀야',
  '박혀있',
];

// 라인 단위 false positive 제외 — 정책 정의 + 검증 토큰 명시 + 메타 인용.
//
// dev doc §11 Open Issues 4 정합: 정책 정의 라인 (검증 토큰 명시 / 대체어 매핑)
// 은 false positive 회피 위해 컨텍스트 인식 grep 으로 제외.
function isPolicyMetaLine(line) {
  // (a) 정책 정의 자체 — 따옴표 안 "박다" / 용어 0건 / 용어 금지.
  if (/"박다"/.test(line)) return true;
  if (/용어\s*0\s*건/.test(line)) return true;
  if (/용어\s*금지/.test(line)) return true;
  // (b) 검증 토큰 명시 라인 — 검증 / grep 키워드 + 토큰 목록 동시 등장.
  if (line.includes('검증 동사 활용형')) return true;
  if (line.includes('대체어')) return true;
  if (line.includes('grep 토큰')) return true;
  // (b-2) 'grep 검증' 라인 — 정책 자체의 grep verification spec 명시
  // (예: '└─ grep 검증 (박힘 / 박는다 / 박음 / 박혔 = 0 hits ...)').
  if (line.includes('grep 검증')) return true;
  // (b-3) '0건 grep' 라인 — step / 정책 description 자체 명시
  // (예: 'Step 61 ... 박다 0건 grep' / '... 박다 용어 0건 grep').
  if (/0\s*건\s*grep/.test(line)) return true;
  // (c) Sprint 7~8 메타 인용 — 'D-S9-no-pakda-term' 정책 ID 자체 명시.
  if (line.includes('D-S9-no-pakda-term')) return true;
  // (d) feedback memory 파일 경로 인용.
  if (line.includes('feedback_no_pakda_term.md')) return true;
  return false;
}

function tokenHitsInLine(line) {
  if (isPolicyMetaLine(line)) return [];
  const hits = [];
  for (const token of TOKENS) {
    let idx = 0;
    while ((idx = line.indexOf(token, idx)) !== -1) {
      hits.push({ token, idx });
      idx += token.length;
    }
  }
  return hits;
}

function scanRange(filePath, fromLine, toLine) {
  if (!existsSync(filePath)) {
    return { errors: [`${filePath} 미존재`], hits: [] };
  }
  const lines = readFileSync(filePath, 'utf8').split('\n');
  const hits = [];
  const start = Math.max(1, fromLine);
  const end = toLine == null ? lines.length : Math.min(lines.length, toLine);
  for (let i = start; i <= end; i += 1) {
    const line = lines[i - 1];
    if (line == null) continue;
    const lineHits = tokenHitsInLine(line);
    for (const h of lineHits) {
      hits.push({ file: filePath, line: i, token: h.token, text: line.trim() });
    }
  }
  return { errors: [], hits };
}

// ---------------------------------------------------------------------------
// (a) Sprint 9 dev doc §3~§12 검증 — §1~§2 churn 회피 제외.
// §3 시작은 "## 3. Scope" 헤더 라인부터.
const DEV_DOC = resolve(ROOT, 'docs/sprints/sprint-9-external-data-and-decisions.md');
if (!existsSync(DEV_DOC)) {
  console.error(`Sprint 9 dev doc 미존재: ${DEV_DOC}`);
  process.exit(3);
}

const devText = readFileSync(DEV_DOC, 'utf8');
const devLines = devText.split('\n');
let s3LineIdx = -1;
for (let i = 0; i < devLines.length; i += 1) {
  if (devLines[i].startsWith('## 3.')) {
    s3LineIdx = i + 1; // 1-based.
    break;
  }
}
if (s3LineIdx < 0) {
  console.error(`Sprint 9 dev doc §3 헤더 미발견`);
  process.exit(4);
}

const devScan = scanRange(DEV_DOC, s3LineIdx, devLines.length);
const allErrors = [...devScan.errors];
const allHits = [...devScan.hits];

// ---------------------------------------------------------------------------
// (b) 8 워커 정의 line 9~12 (헌법 9~12 추기 영역) 검증.
// 파일별로 헌법 9 시작 라인을 찾아서 4 라인 (9~12) 만 스캔 — line number 가
// 파일별로 다르므로 토큰 매칭으로 시작점 동적 계산.
const WORKERS = [
  'team-leader',
  'storage',
  'engine',
  'conversation',
  'orchestrator',
  'mobile',
  'designer',
  'tester',
];

for (const w of WORKERS) {
  const p = resolve(ROOT, `.claude/agents/${w}.md`);
  if (!existsSync(p)) {
    allErrors.push(`워커 정의 미존재: ${p}`);
    continue;
  }
  const wLines = readFileSync(p, 'utf8').split('\n');
  let cstStart = -1;
  for (let i = 0; i < wLines.length; i += 1) {
    if (wLines[i].includes('외부 데이터 독립성 1차 분류 의무')) {
      cstStart = i + 1;
      break;
    }
  }
  if (cstStart < 0) {
    allErrors.push(`워커 정의 ${w}.md 안에 헌법 9 raw text 미발견`);
    continue;
  }
  // 헌법 9~12 = 4 라인 영역 (10진수 헌법 번호 4종).
  const wScan = scanRange(p, cstStart, cstStart + 3);
  for (const e of wScan.errors) allErrors.push(e);
  for (const h of wScan.hits) allHits.push(h);
}

if (allErrors.length > 0) {
  for (const e of allErrors) console.error(`  ${e}`);
  process.exit(5);
}

if (allHits.length > 0) {
  for (const h of allHits) {
    console.error(
      `  ${h.file}:${h.line} 토큰 '${h.token}' hit — '${h.text.slice(0, 100)}'`,
    );
  }
  console.error(`pakda-term-zero: ${allHits.length}건 hit (>0) — D-S9-no-pakda-term 위반`);
  process.exit(6);
}

process.stdout.write('pakda_term_zero_pass=1;pakda_term_count=0');
