// Sprint 8 receipt — T4 (storage: recall_log retention 30d) 분기 검증.
//
// 호출:
//   node --experimental-strip-types sprint8-recall-log-retention.mjs
//   → 두 분기 중 하나 PASS:
//      (A) packages/storage/schema/0006_*.sql 또는 0007_*.sql 안에 *주석 line 제외 SQL 본문* 에서
//          `recall_log` 토큰 (\b 단어 경계) + retention 토큰 (`retention` / `30d` /
//          `30 day` / `30 일` / `RETENTION_DAYS = 30`) 모두 등장 +
//          `packages/storage/__tests__/migration-0006*.test.ts` OR `migration-0007*.test.ts` 존재.
//      (B) Sprint 8 dev doc §11 Decisions Made 안에
//          `[FROZEN v2026-04-30 D-S8-recall-log-retention-decision]` + 보류 사유 박힘
//          ('보류' / '신호 부재' / '데이터 부족' / '미구현').
//   → exit 0 + stdout:
//      "recall_log_retention_pass=1;branch=<A|B>"
//
// 분기 우선순위: A (구현) → B (보류 frozen). 둘 다 부재 시 fail.
//
// [DIRECTIVE v2026-04-30 D-S8-tester-step57-false-positive] 정정 — 1차 fixture 의 `30` /
// `recall_log` substring 매칭이 directive 태그 날짜 (`v2026-04-30`) + 주석 내 `recall_log`
// 언급 (별도 stream 설명) 과 우연 충돌. 본 정정에서 *주석 line 제외* + word-boundary +
// 단위 명시 토큰 매칭으로 강화.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

// SQL 본문에서 `--` 주석 line 제거. 블록 주석은 본 sprint 시점 schema 미사용.
function stripSqlComments(sql) {
  return sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');
}

// retention 토큰 strict 매칭 — REVISE D-S8-tester-step57-false-positive:
//   ASCII 토큰 (`retention` / `30d` / `30 day` / `RETENTION_DAYS=30`) 은 `\b` 단어 경계.
//   한국어 단위 (`30 일`) 는 `\b` 회피 (한국어 글자에 word boundary 미정의) — 직접 매칭.
const RECALL_LOG_RE = new RegExp('\\brecall_log\\b');
const RETENTION_RES = [
  new RegExp('\\bretention\\b', 'i'),
  new RegExp('\\b30\\s*(?:d|day|days)\\b', 'i'),
  new RegExp('30\\s*일'),
  new RegExp('\\bRETENTION_DAYS\\s*=\\s*30\\b', 'i'),
];

// ---------- 분기 A: 구현 ----------
function tryBranchA() {
  const SCHEMA_DIR = resolve(ROOT, 'packages/storage/schema');
  const TEST_DIR = resolve(ROOT, 'packages/storage/__tests__');

  if (!existsSync(SCHEMA_DIR) || !existsSync(TEST_DIR)) {
    return { ok: false, reason: 'storage schema/__tests__ 디렉토리 부재' };
  }

  const schemaFiles = readdirSync(SCHEMA_DIR).filter(
    (f) => (f.startsWith('0006_') || f.startsWith('0007_')) && f.endsWith('.sql'),
  );
  if (schemaFiles.length === 0) {
    return { ok: false, reason: '0006_*.sql / 0007_*.sql migration 파일 미발견' };
  }

  let hasMark = false;
  let matchedFile = null;
  for (const f of schemaFiles) {
    const sqlBody = stripSqlComments(readFileSync(resolve(SCHEMA_DIR, f), 'utf8'));
    const recallLogPresent = RECALL_LOG_RE.test(sqlBody);
    const retentionPresent = RETENTION_RES.some((re) => re.test(sqlBody));
    if (recallLogPresent && retentionPresent) {
      hasMark = true;
      matchedFile = f;
      break;
    }
  }
  if (!hasMark) {
    return {
      ok: false,
      reason:
        '0006_*.sql / 0007_*.sql SQL 본문 (주석 line 제외) 에 recall_log + retention 토큰 (retention OR 30d OR 30 day OR 30 일 OR RETENTION_DAYS=30) 미박힘',
    };
  }

  const testFiles = readdirSync(TEST_DIR).filter(
    (f) =>
      (f.startsWith('migration-0006') || f.startsWith('migration-0007')) &&
      f.endsWith('.test.ts'),
  );
  if (testFiles.length === 0) {
    return {
      ok: false,
      reason: 'migration-0006*.test.ts / migration-0007*.test.ts 단위 테스트 파일 미발견',
    };
  }

  return { ok: true, matchedFile };
}

// ---------- 분기 B: 보류 frozen ----------
function tryBranchB() {
  const DEV_DOC = resolve(ROOT, 'docs/sprints/sprint-8-external-validation.md');
  if (!existsSync(DEV_DOC)) {
    return { ok: false, reason: 'Sprint 8 dev doc 미존재' };
  }
  const text = readFileSync(DEV_DOC, 'utf8');

  const dec11Idx = text.indexOf('## 11. Decisions Made');
  const carry12Idx = text.indexOf('## 12.');
  if (dec11Idx < 0) {
    return { ok: false, reason: '§11 Decisions Made 섹션 헤더 미발견' };
  }
  const decSection = text.slice(dec11Idx, carry12Idx > 0 ? carry12Idx : text.length);

  // frozen-flag-audit lint 정합 — `[...-decision]` exact OR `[...-decision = <suffix>]` suffix form.
  const FROZEN_RE = new RegExp('\\[FROZEN v2026-04-30 D-S8-recall-log-retention-decision(\\]| |=)');
  if (!FROZEN_RE.test(decSection)) {
    return { ok: false, reason: "'[FROZEN v2026-04-30 D-S8-recall-log-retention-decision...]' 미박힘" };
  }

  const reasons = ['보류', '신호 부재', '데이터 부족', '미구현'];
  const hasReason = reasons.some((r) => decSection.includes(r));
  if (!hasReason) {
    return { ok: false, reason: '보류 사유 키워드 (보류/신호 부재/데이터 부족/미구현) 미박힘' };
  }

  return { ok: true };
}

const a = tryBranchA();
if (a.ok) {
  process.stdout.write(`recall_log_retention_pass=1;branch=A`);
  process.exit(0);
}
const b = tryBranchB();
if (b.ok) {
  process.stdout.write(`recall_log_retention_pass=1;branch=B`);
  process.exit(0);
}

console.error(`recall-log-retention: 두 분기 모두 fail`);
console.error(`  A (구현): ${a.reason}`);
console.error(`  B (보류 frozen): ${b.reason}`);
process.exit(3);
