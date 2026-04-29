#!/usr/bin/env bash
# Sprint 3 Receipt — Memory Formation
#   Sprint 2 의 14 단계 wrap + Sprint 3 의 8 단계 (0003 멱등성, e2e Concept/Graph/Nearest,
#   CaptureToast i18n ok=8, mockup-scope-parity Sprint 3, frozen-flag-audit Sprint 3, directive-tag-audit).
#
# 단계
#   [Sprint 3] 1..14: Sprint 2 receipt 그대로 통과 (sprint-2.sh wrap; SKIP_SPRINT1_E2E 호환)
#   [15/22] 0003 마이그 멱등성 — empty DB 두 번 → exit 0, concepts/edges/vec_concepts 존재
#   [16/22] e2e: Concept 추출 — '어제 산책 중 들은 노래가 좋았어' → concepts ≥ 1, label 비어있지 않음
#   [17/22] e2e: 그래프 형성 — 두 메시지 연속 → concepts ≥ 2, edges co_occur ≥ 1
#   [18/22] e2e: nearestConcepts — top-3 row ≥ 1, score DESC, excludeId 준수
#   [19/22] CaptureToast i18n — verify-copy.mjs ok=8 (Sprint 1 6 + Sprint 3 신규 captured/capturedSub)
#   [20/22] mockup-scope-parity — Sprint 3 dev doc PASS
#   [21/22] frozen-flag-audit — Sprint 3 dev doc PASS
#   [22/22] directive-tag-audit — `.claude/commands/*.md` PASS
#
# 환경변수 / dev-mode flag (우선순위: SKIP_OLLAMA > SKIP_SPRINT1_E2E):
#   SKIP_SPRINT1_E2E=1  — Sprint 1 receipt 단계 (sprint-2.sh 의 step 1) 만 skip.
#                         Sprint 3 신규 e2e (16/17/18) 는 그대로 실행 (사용 빈도 낮음).
#   SKIP_OLLAMA=1       — Sprint 1 e2e + 신규 e2e 3 종 (16/17/18) 모두 skip.
#                         메타-검증(1-3, 7-14, 15, 19-22) 만으로 dev mode 자체 검증.
#                         두 flag 동시 설정 시 의미 동일 (모두 skip).
#                         *통과 ≠ /end 받음* — `/end` 는 Ollama UP 으로 전체 22 단계 PASS 받아야 마감.
#
# 임계 (보수적 시작 — `feedback_receipt_threshold.md`):
#   chunks ≥ 1 / length ≥ 1 (Sprint 1 그대로)
#   concepts ≥ 1 (단계 16) / concepts ≥ 2 (단계 17) / co_occur ≥ 1 (단계 17) / nearest rows ≥ 1 (단계 18)
#   본 sprint receipt 통과 후 `/end` 가 *Sprint 4 receipt 헌법 강화* 결정 (`D-S3-receipt-threshold-recovery`).
#
# 모든 단계 통과 → exit 0, "✅ Sprint 3 receipt PASSED".

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

step() { echo ""; echo "▶ $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

# SKIP_OLLAMA=1 은 SKIP_SPRINT1_E2E=1 을 함의 (Sprint 1 e2e 가 Ollama 의존).
if [ "${SKIP_OLLAMA:-0}" = "1" ]; then
  export SKIP_SPRINT1_E2E=1
  echo "  ⚠ SKIP_OLLAMA=1 — Sprint 1 e2e + 신규 e2e 16/17/18 단계 건너뜀 (메타-검증 dev mode)."
fi

# ---------------------------------------------------------------------------
step "[Sprint 3] 1..14: Sprint 2 receipt 그대로 통과"
if ! bash "$ROOT/scripts/receipt/sprint-2.sh"; then
  fail "[Sprint 3] Sprint 2 receipt 실패. 위 로그 확인."
fi

# ---------------------------------------------------------------------------
# Sprint 3 신규 단위 테스트 통합 검증 — `pnpm -r test` 가 신규 __tests__/*.test.ts
# 를 모두 잡는지 dev mode 에서도 보장 (SKIP_OLLAMA=1 시에도 단위 테스트는 Ollama 비의존).
# Ollama UP 모드에서는 sprint-1.sh step 2 가 동일 명령을 이미 실행하지만, dev mode 에서는
# 그 단계가 skip 되므로 여기서 한 번 더 보장. 멱등 (idempotent) — 비용 = 캐시 히트 + test 1 회.
step "[Sprint 3 pre-check] 신규 단위 테스트 픽업 — pnpm -r test"
NEW_TEST_FILES=(
  "$ROOT/packages/engine/__tests__/extractConcepts.test.ts"
  "$ROOT/packages/engine/__tests__/embed.test.ts"
  "$ROOT/packages/engine/__tests__/buildEdges.test.ts"
  "$ROOT/packages/storage/__tests__/graph.test.ts"
  "$ROOT/packages/conversation/__tests__/loop.test.ts"
)
MISSING_TESTS=()
for f in "${NEW_TEST_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    MISSING_TESTS+=("$f")
  fi
done
if [ ${#MISSING_TESTS[@]} -gt 0 ]; then
  for f in "${MISSING_TESTS[@]}"; do
    echo "  누락: $f" >&2
  done
  fail "[Sprint 3 pre-check] 신규 단위 테스트 파일 누락 (위 ${#MISSING_TESTS[@]} 건)."
fi
echo "  신규 테스트 파일 ${#NEW_TEST_FILES[@]} 건 발견."
# `pnpm -r test` 는 sprint-1.sh step 2 가 SKIP_OLLAMA=1 모드에서 skip 되므로 dev mode 에서도 명시 실행.
if [ "${SKIP_OLLAMA:-0}" = "1" ]; then
  echo "  dev mode (SKIP_OLLAMA=1) — pnpm -r test 명시 실행"
  if ! pnpm -r test; then
    fail "[Sprint 3 pre-check] pnpm -r test 실패 — 신규 단위 테스트 1 건 이상 FAIL."
  fi
fi

# ---------------------------------------------------------------------------
step "[15/22] 0003 마이그 멱등성 — empty DB 두 번"
MIG_DB="$(mktemp -t synapse-sprint3-mig.XXXXXX.db)"
trap 'rm -f "$MIG_DB"' EXIT
MIG_OUT=$(SYNAPSE_DB_PATH="$MIG_DB" node --experimental-strip-types \
  "$ROOT/packages/storage/.receipt-runner/migrate-twice.mjs")
echo "  ${MIG_OUT}"
# 출력 검증: tables=concepts,edges,vec_concepts;migrations=<n>
if ! printf '%s' "$MIG_OUT" | grep -q 'tables=concepts,edges,vec_concepts'; then
  fail "[15/22] 0003 핵심 테이블 누락: $MIG_OUT"
fi

# ---------------------------------------------------------------------------
# Sprint 3 e2e 3 종 — Ollama 의존. SKIP_OLLAMA=1 시 모두 skip.
if [ "${SKIP_OLLAMA:-0}" = "1" ]; then
  step "[16/22] e2e: Concept 추출 — SKIP_OLLAMA=1 (skip)"
  step "[17/22] e2e: 그래프 형성 — SKIP_OLLAMA=1 (skip)"
  step "[18/22] e2e: nearestConcepts — SKIP_OLLAMA=1 (skip)"
else
  # Ollama 헬스체크 (e2e 공통).
  if ! curl -sf http://localhost:11434/api/tags > /dev/null; then
    fail "Ollama 미가동. 'brew services start ollama' 후 'ollama pull gemma3:4b' 를 먼저 실행. (skip 하려면 SKIP_OLLAMA=1)"
  fi

  CONV_RUNNER="$ROOT/packages/conversation/.receipt-runner"

  # ---------------------------------------------------------------------------
  step "[16/22] e2e: Concept 추출 — '어제 산책 중 들은 노래가 좋았어'"
  EXTRACT_DB="$(mktemp -t synapse-sprint3-extract.XXXXXX.db)"
  trap 'rm -f "$MIG_DB" "$EXTRACT_DB"' EXIT
  EXTRACT_OUT=$(SYNAPSE_DB_PATH="$EXTRACT_DB" node --experimental-strip-types \
    "$CONV_RUNNER/sprint3-extract.mjs")
  echo "  ${EXTRACT_OUT}"
  EX_CONCEPTS=$(printf '%s' "$EXTRACT_OUT" | sed -n 's/.*concepts=\([0-9][0-9]*\).*/\1/p')
  if [ "${EX_CONCEPTS:-0}" -lt 1 ]; then
    fail "[16/22] concepts < 1: ${EXTRACT_OUT}"
  fi

  # ---------------------------------------------------------------------------
  step "[17/22] e2e: 그래프 형성 — 두 메시지 연속"
  GRAPH_DB="$(mktemp -t synapse-sprint3-graph.XXXXXX.db)"
  trap 'rm -f "$MIG_DB" "$EXTRACT_DB" "$GRAPH_DB"' EXIT
  GRAPH_OUT=$(SYNAPSE_DB_PATH="$GRAPH_DB" node --experimental-strip-types \
    "$CONV_RUNNER/sprint3-graph.mjs")
  echo "  ${GRAPH_OUT}"
  GR_CONCEPTS=$(printf '%s' "$GRAPH_OUT" | sed -n 's/.*concepts=\([0-9][0-9]*\).*/\1/p')
  GR_COOCCUR=$(printf '%s' "$GRAPH_OUT" | sed -n 's/.*co_occur=\([0-9][0-9]*\).*/\1/p')
  if [ "${GR_CONCEPTS:-0}" -lt 2 ]; then
    fail "[17/22] concepts < 2: ${GRAPH_OUT}"
  fi
  if [ "${GR_COOCCUR:-0}" -lt 1 ]; then
    fail "[17/22] co_occur < 1: ${GRAPH_OUT}"
  fi

  # ---------------------------------------------------------------------------
  step "[18/22] e2e: nearestConcepts top-3"
  NEAR_DB="$(mktemp -t synapse-sprint3-near.XXXXXX.db)"
  trap 'rm -f "$MIG_DB" "$EXTRACT_DB" "$GRAPH_DB" "$NEAR_DB"' EXIT
  NEAR_OUT=$(SYNAPSE_DB_PATH="$NEAR_DB" node --experimental-strip-types \
    "$CONV_RUNNER/sprint3-nearest.mjs")
  echo "  ${NEAR_OUT}"
  NR_ROWS=$(printf '%s' "$NEAR_OUT" | sed -n 's/.*rows=\([0-9][0-9]*\).*/\1/p')
  NR_SORTED=$(printf '%s' "$NEAR_OUT" | sed -n 's/.*sorted=\([a-z]*\).*/\1/p')
  if [ "${NR_ROWS:-0}" -lt 1 ]; then
    fail "[18/22] nearest rows < 1: ${NEAR_OUT}"
  fi
  if [ "${NR_SORTED}" != "true" ]; then
    fail "[18/22] nearest rows not sorted DESC by score: ${NEAR_OUT}"
  fi
fi

# ---------------------------------------------------------------------------
step "[19/22] CaptureToast i18n — verify-copy.mjs ok=8"
COPY_OUT=$(node --experimental-strip-types \
  "$ROOT/packages/design-system/.receipt-runner/verify-copy.mjs")
echo "  ${COPY_OUT}"
COPY_OK=$(printf '%s' "$COPY_OUT" | sed -n 's/.*ok=\([0-9][0-9]*\).*/\1/p')
if [ "${COPY_OK:-0}" -lt 8 ]; then
  fail "[19/22] verify-copy.mjs ok < 8 (실제 ${COPY_OK:-0}). designer T7 의 captured/capturedSub 추기 누락 가능."
fi

# ---------------------------------------------------------------------------
step "[20/22] mockup-scope-parity — Sprint 3 dev doc"
if ! bash "$ROOT/scripts/lint/mockup-scope-parity.sh" \
  "$ROOT/docs/sprints/sprint-3-memory-formation.md"; then
  fail "[20/22] mockup-scope-parity 실패 — Sprint 3 §3 In 화면 표현 ↔ Sprint 2 §7.1 표 매칭 필요."
fi
echo "  PASS"

# ---------------------------------------------------------------------------
step "[21/22] frozen-flag-audit — Sprint 3 dev doc"
if ! bash "$ROOT/scripts/lint/frozen-flag-audit.sh" \
  "$ROOT/docs/sprints/sprint-3-memory-formation.md"; then
  fail "[21/22] frozen-flag-audit 실패 — Sprint 3 §11 Decisions Made FROZEN prefix 미부착."
fi
echo "  PASS"

# ---------------------------------------------------------------------------
step "[22/22] directive-tag-audit — .claude/commands/*.md"
if ! node --experimental-strip-types "$ROOT/scripts/lint/directive-tag-audit.ts"; then
  fail "[22/22] directive-tag-audit 실패."
fi
echo "  PASS"

# ---------------------------------------------------------------------------
echo ""
echo "✅ Sprint 3 receipt PASSED"
