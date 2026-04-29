#!/usr/bin/env node
// directive-tag-audit.ts
// Sprint 2 lint — `.claude/commands/<role>.md` 의 SendMessage / spawn prompt 인용 안에서
// directive 의도(지시/강제/필수/MUST/DIRECTIVE)가 검출되면 `[DIRECTIVE v<date> <id>]`
// 또는 `[FROZEN v<date> <id>]` 태그 부착 여부를 검증.
//
// CLI:
//   pnpm tsx scripts/lint/directive-tag-audit.ts             # 기본: .claude/commands/*.md 전체
//   node --experimental-strip-types scripts/lint/directive-tag-audit.ts <file>...
//   node --experimental-strip-types scripts/lint/directive-tag-audit.ts          # 동등
//
// 통과: exit 0
// 위반: stderr 줄 단위 보고 + exit 1
//
// 검출 알고리즘 (conservative):
//   1. 각 .md 파일을 읽어 *공통 헌법 섹션* 본문은 검사에서 제외 (`## 공통 헌법` 다음 ~ 다음 `^## ` 직전).
//      이유: 헌법 섹션은 패턴 형식 자체를 설명하는 산문이라 false-positive 폭증.
//   2. 나머지 본문에서, 다음 둘 중 하나에 매칭되는 줄을 검출:
//        a) 인라인 코드 또는 코드블록 안에 `SendMessage` 토큰이 있는 줄 (인용 예시).
//        b) directive 어휘 (`지시`, `강제`, `필수`, `MUST`, `DIRECTIVE`) 가 등장하는 *bullet 줄* (`^- ` 시작).
//   3. 검출된 줄 / 같은 단락에 `[DIRECTIVE v\d{4}-\d{2}-\d{2} \S+]` 또는
//      `[FROZEN v\d{4}-\d{2}-\d{2} \S+]` 태그가 부착되어 있으면 PASS, 아니면 violation.
//   4. *형식 설명용 백틱 인용* (예: 본문에 `[DIRECTIVE v<date> <id>]` 라고 쓴 placeholder)
//      은 정규식이 실제 날짜 형식 `\d{4}-\d{2}-\d{2}` 를 요구하므로 매칭 안 됨 → 자연 제외.
//
// 의존: node 20+ (--experimental-strip-types) 또는 tsx.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const HERE = new URL('.', import.meta.url).pathname;
const ROOT = resolve(HERE, '../..');
const COMMANDS_DIR = join(ROOT, '.claude/commands');

const DIRECTIVE_KEYWORDS = ['지시', '강제', '필수', 'MUST', 'DIRECTIVE'];
const TAG_REGEX = /\[(DIRECTIVE|FROZEN) v\d{4}-\d{2}-\d{2} \S+?\]/;

interface Violation {
  file: string;
  line: number;
  reason: string;
  text: string;
}

function listMdFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .map((n) => join(dir, n))
    .filter((p) => statSync(p).isFile());
}

// 공통 헌법 섹션 (`## 공통 헌법` ~ 다음 `^## `) 의 줄 인덱스 set 반환.
function constitutionLineIndices(lines: string[]): Set<number> {
  const skip = new Set<number>();
  let inSection = false;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^## 공통 헌법/.test(ln)) {
      inSection = true;
      skip.add(i);
      continue;
    }
    if (inSection && /^## /.test(ln) && !/^## 공통 헌법/.test(ln)) {
      inSection = false;
    }
    if (inSection) skip.add(i);
  }
  return skip;
}

// 코드블록 (``` ~ ```) 안의 줄 인덱스 set 반환.
function fencedBlockIndices(lines: string[]): Set<number> {
  const inFence = new Set<number>();
  let open = false;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^```/.test(ln.trim())) {
      open = !open;
      inFence.add(i);
      continue;
    }
    if (open) inFence.add(i);
  }
  return inFence;
}

function lineHasDirectiveKeyword(line: string): boolean {
  return DIRECTIVE_KEYWORDS.some((k) => line.includes(k));
}

function lineMentionsSendMessage(line: string): boolean {
  return /SendMessage/.test(line);
}

function paragraphHasTag(lines: string[], idx: number): boolean {
  // bullet 줄: 그 줄과 다음 indent 된 줄들까지 검사 (paragraph 끝 = 빈 줄 또는 새 bullet)
  if (TAG_REGEX.test(lines[idx])) return true;
  for (let j = idx + 1; j < lines.length; j++) {
    const ln = lines[j];
    if (/^\s*$/.test(ln)) break;
    if (/^- |^\d+\. /.test(ln)) break; // 새 bullet 시작
    if (TAG_REGEX.test(ln)) return true;
  }
  return false;
}

function auditFile(file: string): Violation[] {
  const lines = readFileSync(file, 'utf8').split('\n');
  const skip = constitutionLineIndices(lines);
  const fenced = fencedBlockIndices(lines);
  const violations: Violation[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (skip.has(i)) continue;
    const ln = lines[i];

    // (a) SendMessage 코드 인용 (인라인 백틱 또는 fenced)
    if (lineMentionsSendMessage(ln) && (fenced.has(i) || /`.*SendMessage.*`/.test(ln))) {
      // directive 어휘 함께 있으면 태그 검사
      if (lineHasDirectiveKeyword(ln) && !paragraphHasTag(lines, i)) {
        violations.push({
          file,
          line: i + 1,
          reason: 'SendMessage 인용 + directive 어휘 + 태그 누락',
          text: ln.trim(),
        });
      }
      continue;
    }

    // (b) directive 어휘 bullet
    if (/^- /.test(ln) && lineHasDirectiveKeyword(ln)) {
      // bullet 본문이 *형식 설명/원리* 일 가능성: bullet 안에 `SendMessage` 또는 백틱 코드 인용이 있을 때만 검사
      const hasInlineCode = /`[^`]+`/.test(ln);
      const hasSendMsg = lineMentionsSendMessage(ln);
      if ((hasInlineCode && hasSendMsg) || /(?:^- ).{0,40}(지시|강제|필수|MUST)\s*[:;]/.test(ln)) {
        if (!paragraphHasTag(lines, i)) {
          violations.push({
            file,
            line: i + 1,
            reason: 'directive bullet + 태그 누락',
            text: ln.trim(),
          });
        }
      }
      continue;
    }
  }
  return violations;
}

function main() {
  const argv = process.argv.slice(2);
  const targets = argv.length > 0 ? argv.map((a) => resolve(a)) : listMdFiles(COMMANDS_DIR);
  let total = 0;
  for (const f of targets) {
    const vs = auditFile(f);
    for (const v of vs) {
      console.error(`[directive-tag-audit] ${v.file}:${v.line} ${v.reason}`);
      console.error(`    ${v.text}`);
      total += 1;
    }
  }
  if (total > 0) {
    console.error(`[directive-tag-audit] 위반 ${total} 건. directive 인용에 [DIRECTIVE v<date> <id>] 태그 부착 필요.`);
    process.exit(1);
  }
  process.exit(0);
}

main();
