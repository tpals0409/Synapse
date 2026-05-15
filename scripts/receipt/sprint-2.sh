#!/usr/bin/env bash
# Sprint 2 Receipt — Agent Workflow Hardening
#   Sprint 1 의 8 단계 + Sprint 2 의 6 단계 (헌법 inject / mockup-scope / FROZEN / directive / lint 단위 / race regression).
#
# 단계
#   [ 1.. 8] Sprint 1 의 모든 단계 (sprint-1.sh 호출)
#   [ 9/14] 헌법 inject — `.claude/commands/*.md` 10 파일 모두 "HOLD-DECIDE-RESUME" 박힘
#   [10/14] mockup-scope-parity — Sprint 1 dev doc dry-run PASS
#   [11/14] frozen-flag-audit — Sprint 1 dev doc PASS (FROZEN prefix retrofit 후)
#   [12/14] directive-tag-audit — `.claude/commands/*.md` PASS
#   [13/14] lint 단위 테스트 harness — PASS/FAIL fixture 모두 PASS
#   [14/14] e2e/scenarios/sprint-2-race-regression.md — 핵심 항목 ≥ 4 개 grep
#
# 모든 단계 통과 → exit 0, "✅ Sprint 2 receipt PASSED".

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

step() { echo ""; echo "▶ $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
step "[Sprint 2] 1..8: Sprint 1 receipt 그대로 통과"
if [ "${SKIP_SPRINT1_E2E:-0}" = "1" ]; then
  echo "  ⚠ SKIP_SPRINT1_E2E=1 — Sprint 1 receipt 단계 건너뜀 (메타-스프린트 dev mode)."
else
  if ! bash "$ROOT/scripts/receipt/sprint-1.sh"; then
    fail "[Sprint 2] Sprint 1 receipt 실패. 위 로그 확인."
  fi
fi

# ---------------------------------------------------------------------------
step "[ 9/14] 헌법 inject 검증"
# Sprint 14 D-S14-sprint-2-threshold-dynamic: 정적 10 파일 list → 동적 카운트, 7 워커 정렬 후 fail 회복.
# `.claude/agents/*.md` 만 카운트 (Sprint 13 정렬로 .claude/commands/ 폐기 — 슬래시커맨드 0).
# 임계 ≥ 7 (7 워커 정합). raw text marker `worker_constitution_targets=$INJECT_COUNT` 보존.
INJECT_TARGETS_DIR="$ROOT/.claude/agents"
if [ ! -d "$INJECT_TARGETS_DIR" ]; then
  fail "[ 9/14] $INJECT_TARGETS_DIR 미존재 — 7 워커 정렬 회귀."
fi
MISSING_INJECT=$(grep -L "HOLD-DECIDE-RESUME" "$INJECT_TARGETS_DIR"/*.md 2>/dev/null || true)
if [ -n "$MISSING_INJECT" ]; then
  echo "  미부착 파일:" >&2
  echo "$MISSING_INJECT" >&2
  fail "[ 9/14] 헌법 inject 누락 — 위 파일에 'HOLD-DECIDE-RESUME' 키워드 박힘 필요."
fi
INJECT_COUNT=$(find "$INJECT_TARGETS_DIR" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')
echo "  HOLD-DECIDE-RESUME 박힌 파일: ${INJECT_COUNT}"
echo "  worker_constitution_targets=${INJECT_COUNT}"
if [ "$INJECT_COUNT" -lt 7 ]; then
  fail "[ 9/14] 헌법 inject 파일 수 < 7 (실제 ${INJECT_COUNT})."
fi

# ---------------------------------------------------------------------------
step "[10/14] mockup-scope-parity — Sprint 1 dev doc dry-run"
if ! bash "$ROOT/scripts/lint/mockup-scope-parity.sh" "$ROOT/docs/sprints/sprint-1-conversation-loop.md"; then
  fail "[10/14] mockup-scope-parity 실패 — designer 표 또는 Sprint 1 §3 In 정렬 필요."
fi
echo "  PASS"

# ---------------------------------------------------------------------------
step "[11/14] frozen-flag-audit — Sprint 1 dev doc"
if ! bash "$ROOT/scripts/lint/frozen-flag-audit.sh" "$ROOT/docs/sprints/sprint-1-conversation-loop.md"; then
  fail "[11/14] frozen-flag-audit 실패 — Sprint 1 §11 Decisions Made 의 FROZEN prefix 미부착."
fi
echo "  PASS"

# ---------------------------------------------------------------------------
step "[12/14] directive-tag-audit — .claude/commands/*.md"
if ! node --experimental-strip-types "$ROOT/scripts/lint/directive-tag-audit.ts"; then
  fail "[12/14] directive-tag-audit 실패."
fi
echo "  PASS"

# ---------------------------------------------------------------------------
step "[13/14] lint 단위 테스트 harness"
if ! bash "$ROOT/scripts/lint/__tests__/run-tests.sh"; then
  fail "[13/14] lint 단위 테스트 실패."
fi
echo "  PASS"

# ---------------------------------------------------------------------------
step "[14/14] e2e/scenarios/sprint-2-race-regression.md 핵심 항목 ≥ 4"
RACE_DOC="$ROOT/e2e/scenarios/sprint-2-race-regression.md"
if [ ! -f "$RACE_DOC" ]; then
  fail "[14/14] race regression 시나리오 파일 없음: $RACE_DOC"
fi
# 핵심 항목 = '## 항목' 또는 '### 항목' 헤더로 셈 (T9 가 정의한 명세).
RACE_COUNT=$(grep -cE '^### 항목 ' "$RACE_DOC" || true)
echo "  검출된 항목 수: ${RACE_COUNT}"
if [ "${RACE_COUNT:-0}" -lt 4 ]; then
  fail "[14/14] race regression 항목 수 < 4 (실제 ${RACE_COUNT}). T9 명세 확장 필요."
fi
echo "  PASS"

# ---------------------------------------------------------------------------
echo ""
echo "✅ Sprint 2 receipt PASSED"
