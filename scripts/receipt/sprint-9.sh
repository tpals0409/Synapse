#!/usr/bin/env bash
# Sprint 9 Receipt — External Data and Decisions (close 분기 B C-revised).
#   Sprint 8 의 60 단계 wrap + Sprint 9 의 신규 5 단계 (61~65) = 65 단계.
#
# 단계
#   [Sprint 9] 1: Sprint 8 60 단계 wrap (sprint-8.sh; SKIP_OLLAMA / SKIP_SPRINT1_E2E 호환)
#   [61/65] spawn-prompt-update — 8 워커 정의 (`.claude/commands/*.md`) 안에
#             헌법 9~12 raw text 4 종 검증 토큰 OR 매칭. —
#             `sprint9-spawn-prompt-update.mjs`.
#   [62/65] pakda-term-zero — 신규 dev doc 변경분 (§3~§12) + 8 워커 정의 헌법
#             9~12 추기 영역 컨텍스트 인식 grep — 동사 활용형 토큰 0건. —
#             `sprint9-pakda-term-zero.mjs`.
#   [63/65] decisions-re-frozen — Sprint 9 dev doc §11 안에 D-S9-{theme-toggle,
#             empty-error-copy,concept-dedup,recall-log-retention,
#             negation-classifier}-decision = 보류 5종 + Sprint 10 trigger 키워드
#             ≥ 5 박힘. — `sprint9-decisions-re-frozen.mjs`.
#   [64/65] inspector-unlink-reconfirm — D-S9-inspector-unlink-recheck = A안
#             reconfirm + Sprint 7 5층위 거절 메커니즘 + Sprint 10 B안 재진입
#             trigger 매칭. — `sprint9-inspector-unlink-reconfirm.mjs`.
#   [65/65] sprint-8-wrap — Sprint 8 60단계 fixture 메타 정합 보존 (Sprint 4: 32
#             + 5: 8 + 6: 6 + 7: 7 + 8: 7 = 60). — `sprint9-sprint-8-wrap.mjs`.
#
# 환경변수 / dev-mode flag (Sprint 8 그대로 전파):
#   SKIP_SPRINT1_E2E=1  — Sprint 1 e2e skip.
#   SKIP_OLLAMA=1       — Sprint 1/3/4/5/6 e2e skip. 메타-검증 + stub-only e2e
#                         (Sprint 6 41~46 + Sprint 7 47~53 + Sprint 8 54~60 +
#                         Sprint 9 61~65) 는 그대로 실행.
#                         두 flag 동시 설정 시 의미 동일 (SKIP_OLLAMA 가
#                         SKIP_SPRINT1_E2E 함의).
#                         *통과 ≠ /end 받음* — `/end` 는 Ollama UP 으로 전체
#                         65 단계 PASS.
#
# 임계 (D-S9-receipt-threshold-recovery — Sprint 8 누적 + 신규 보강):
#   - Sprint 8 누적 그대로. 단, Sprint 8 step 54 의 `external_session_count ≥ 3`
#     은 close 분기 (B) C-revised 정합으로 `external_session_count ≥ 0
#     (branch=B 강제)` 로 정합 — sprint-8.sh 의 branch B (N=0) 분기가 그대로
#     활성. raw/ 디렉토리 부재 OR 빈 디렉토리 모두 valid.
#   - Sprint 9 신규:
#       frozen_decisions_updated ≥ 5 (5종 보류 재확정)
#       pakda_term_count = 0
#       sprint_8_wrap_pass = 1
#
# 모든 단계 통과 → exit 0, "✅ Sprint 9 receipt PASSED".

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

step() { echo ""; echo "▶ $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

# SKIP_OLLAMA=1 은 SKIP_SPRINT1_E2E=1 을 함의.
if [ "${SKIP_OLLAMA:-0}" = "1" ]; then
  export SKIP_SPRINT1_E2E=1
  echo "  ⚠ SKIP_OLLAMA=1 — Sprint 1/3/4/5/6 e2e 건너뜀."
fi

# ---------------------------------------------------------------------------
step "[Sprint 9] 1: Sprint 8 receipt 60 단계 wrap"
if ! bash "$ROOT/scripts/receipt/sprint-8.sh"; then
  fail "[Sprint 9] Sprint 8 receipt 실패. 위 로그 확인."
fi

S9_RUNNER="$ROOT/scripts/receipt/.receipt-runner"

# Sprint 9 신규 fixture 파일 존재 가드.
step "[Sprint 9 pre-check] 신규 fixture 파일 존재"
S9_NEW_FIXTURES=(
  "$S9_RUNNER/sprint9-spawn-prompt-update.mjs"
  "$S9_RUNNER/sprint9-pakda-term-zero.mjs"
  "$S9_RUNNER/sprint9-decisions-re-frozen.mjs"
  "$S9_RUNNER/sprint9-inspector-unlink-reconfirm.mjs"
  "$S9_RUNNER/sprint9-sprint-8-wrap.mjs"
)
S9_MISSING=()
for f in "${S9_NEW_FIXTURES[@]}"; do
  if [ ! -f "$f" ]; then
    S9_MISSING+=("$f")
  fi
done
if [ ${#S9_MISSING[@]} -gt 0 ]; then
  for f in "${S9_MISSING[@]}"; do
    echo "  누락: $f" >&2
  done
  fail "[Sprint 9 pre-check] 신규 fixture 파일 누락 (위 ${#S9_MISSING[@]} 건)."
fi
echo "  신규 fixture ${#S9_NEW_FIXTURES[@]} 건 발견."

# ---------------------------------------------------------------------------
step "[61/65] spawn-prompt-update — 8 워커 정의 헌법 9~12 raw text 4 종 검증"
S9_SPU_OUT=$(node --experimental-strip-types "$S9_RUNNER/sprint9-spawn-prompt-update.mjs")
echo "  ${S9_SPU_OUT}"
S9_SPU_PASS=$(printf '%s' "$S9_SPU_OUT" | sed -n 's/.*spawn_prompt_update_pass=\([0-9][0-9]*\).*/\1/p')
if [ "${S9_SPU_PASS:-0}" -ne 1 ]; then
  fail "[61/65] spawn_prompt_update_pass != 1."
fi

# ---------------------------------------------------------------------------
step "[62/65] pakda-term-zero — 신규 dev doc + 8 워커 정의 동사 활용형 0건 grep"
S9_PTZ_OUT=$(node --experimental-strip-types "$S9_RUNNER/sprint9-pakda-term-zero.mjs")
echo "  ${S9_PTZ_OUT}"
S9_PTZ_PASS=$(printf '%s' "$S9_PTZ_OUT" | sed -n 's/.*pakda_term_zero_pass=\([0-9][0-9]*\).*/\1/p')
S9_PTZ_COUNT=$(printf '%s' "$S9_PTZ_OUT" | sed -n 's/.*pakda_term_count=\([0-9][0-9]*\).*/\1/p')
if [ "${S9_PTZ_PASS:-0}" -ne 1 ]; then
  fail "[62/65] pakda_term_zero_pass != 1."
fi
if [ "${S9_PTZ_COUNT:-99}" -ne 0 ]; then
  fail "[62/65] pakda_term_count=${S9_PTZ_COUNT} ≠ 0 — D-S9-no-pakda-term 위반."
fi

# ---------------------------------------------------------------------------
step "[63/65] decisions-re-frozen — §11 5종 D-S9-*-decision = 보류 + Sprint 10 trigger"
S9_DRF_OUT=$(node --experimental-strip-types "$S9_RUNNER/sprint9-decisions-re-frozen.mjs")
echo "  ${S9_DRF_OUT}"
S9_DRF_PASS=$(printf '%s' "$S9_DRF_OUT" | sed -n 's/.*decisions_re_frozen_pass=\([0-9][0-9]*\).*/\1/p')
S9_DRF_COUNT=$(printf '%s' "$S9_DRF_OUT" | sed -n 's/.*frozen_decisions_updated=\([0-9][0-9]*\).*/\1/p')
if [ "${S9_DRF_PASS:-0}" -ne 1 ]; then
  fail "[63/65] decisions_re_frozen_pass != 1."
fi
if [ "${S9_DRF_COUNT:-0}" -lt 5 ]; then
  fail "[63/65] frozen_decisions_updated=${S9_DRF_COUNT} < 5 (D-S9-receipt-threshold-recovery)."
fi

# ---------------------------------------------------------------------------
step "[64/65] inspector-unlink-reconfirm — D-S9-inspector-unlink-recheck = A안 reconfirm"
S9_IUR_OUT=$(node --experimental-strip-types "$S9_RUNNER/sprint9-inspector-unlink-reconfirm.mjs")
echo "  ${S9_IUR_OUT}"
S9_IUR_PASS=$(printf '%s' "$S9_IUR_OUT" | sed -n 's/.*inspector_unlink_reconfirm_pass=\([0-9][0-9]*\).*/\1/p')
if [ "${S9_IUR_PASS:-0}" -ne 1 ]; then
  fail "[64/65] inspector_unlink_reconfirm_pass != 1."
fi

# ---------------------------------------------------------------------------
step "[65/65] sprint-8-wrap — Sprint 8 60단계 fixture 메타 정합 보존"
S9_S8W_OUT=$(node --experimental-strip-types "$S9_RUNNER/sprint9-sprint-8-wrap.mjs")
echo "  ${S9_S8W_OUT}"
S9_S8W_PASS=$(printf '%s' "$S9_S8W_OUT" | sed -n 's/.*sprint_8_wrap_pass=\([0-9][0-9]*\).*/\1/p')
if [ "${S9_S8W_PASS:-0}" -ne 1 ]; then
  fail "[65/65] sprint_8_wrap_pass != 1."
fi

# ---------------------------------------------------------------------------
echo ""
echo "✅ Sprint 9 receipt PASSED"
