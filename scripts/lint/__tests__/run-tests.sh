#!/usr/bin/env bash
# Sprint 2 lint 단위 테스트 harness
# 모든 lint 스크립트의 PASS / FAIL fixture 회귀 검증.
#
# 호출: bash scripts/lint/__tests__/run-tests.sh
# 결과: exit 0 (모든 케이스 통과) / exit 1 (1건 이상 실패)
#
# 호출자: scripts/receipt/sprint-2.sh (T8) / 개발자 수동 실행.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LINT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$LINT_DIR/../.." && pwd)"
FIXT="$SCRIPT_DIR/fixtures"

pass=0
fail=0
report() {
  local status="$1" name="$2"
  if [ "$status" = "ok" ]; then
    echo "  ok  $name"
    pass=$((pass + 1))
  else
    echo "  FAIL $name" >&2
    fail=$((fail + 1))
  fi
}

assert_exit() {
  local expected="$1"; shift
  local name="$1"; shift
  local out
  out=$("$@" 2>&1) ; local actual=$?
  if [ "$actual" = "$expected" ]; then
    report ok "$name (exit=$actual)"
  else
    report fail "$name (expected exit=$expected, got=$actual)"
    echo "    output: $out" >&2
  fi
}

# ---------------------------------------------------------------------------
echo "== mockup-scope-parity.sh =="
assert_exit 0 "PASS fixture" \
  env MOCKUP_TABLE_DOC="$FIXT/mockup-scope-parity.table.md" \
  bash "$LINT_DIR/mockup-scope-parity.sh" "$FIXT/mockup-scope-parity.target.pass.md"

assert_exit 1 "FAIL fixture (undefined screen)" \
  env MOCKUP_TABLE_DOC="$FIXT/mockup-scope-parity.table.md" \
  bash "$LINT_DIR/mockup-scope-parity.sh" "$FIXT/mockup-scope-parity.target.fail.md"

# Sprint 1 dev doc dry-run (실 파일 PASS 보장)
assert_exit 0 "Sprint 1 dev doc dry-run" \
  bash "$LINT_DIR/mockup-scope-parity.sh" "$ROOT_DIR/docs/sprints/sprint-1-conversation-loop.md"

# ---------------------------------------------------------------------------
# frozen-flag-audit.sh — T7 작성 후 케이스 추가
if [ -x "$LINT_DIR/frozen-flag-audit.sh" ]; then
  echo ""
  echo "== frozen-flag-audit.sh =="
  assert_exit 0 "PASS fixture" \
    bash "$LINT_DIR/frozen-flag-audit.sh" "$FIXT/frozen-flag-audit.pass.md"
  assert_exit 1 "FAIL fixture (missing FROZEN prefix)" \
    bash "$LINT_DIR/frozen-flag-audit.sh" "$FIXT/frozen-flag-audit.fail.md"
  assert_exit 0 "Sprint 1 dev doc dry-run" \
    bash "$LINT_DIR/frozen-flag-audit.sh" "$ROOT_DIR/docs/sprints/sprint-1-conversation-loop.md"
fi

# ---------------------------------------------------------------------------
# directive-tag-audit.ts — T4 작성 후 케이스 추가
if [ -f "$LINT_DIR/directive-tag-audit.ts" ]; then
  echo ""
  echo "== directive-tag-audit.ts =="
  assert_exit 0 "PASS fixture (single role)" \
    node --experimental-strip-types "$LINT_DIR/directive-tag-audit.ts" "$FIXT/directive-tag-audit.pass.md"
  assert_exit 1 "FAIL fixture (untagged directive)" \
    node --experimental-strip-types "$LINT_DIR/directive-tag-audit.ts" "$FIXT/directive-tag-audit.fail.md"
  assert_exit 0 ".claude/commands/*.md dry-run" \
    node --experimental-strip-types "$LINT_DIR/directive-tag-audit.ts"
fi

echo ""
echo "tests: pass=$pass fail=$fail"
[ "$fail" -eq 0 ]
