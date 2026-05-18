#!/usr/bin/env bash
# Sprint 15 Receipt — Inheritance Cleanup (branch=C, eighth inheritance pattern).
#   Sprint 14 의 71 단계 wrap + Sprint 15 신규 4 단계 (72~75) = 75 단계.
#   (Sprint 14 = Sprint 13 의 69 단계 + 신규 2 단계. Sprint 13 = Sprint 9 의 65 단계 + 신규 4 단계.)
#
# 단계
#   [Sprint 15] 1: Sprint 14 receipt 71 단계 wrap (sprint-14.sh; SKIP_OLLAMA /
#                  SKIP_SPRINT1_E2E 호환. LEGACY_WRAP_FAIL_TOLERATED 분기는 Sprint 15
#                  T1 에서 sprint-13.sh + sprint-14.sh 모두 영구 제거됨.)
#   [Sprint 15 pre-check] 신규 fixture 파일 4종 존재
#   [72/75] stale-token-zero — `.receipt-runner/*.mjs` 안 active team-leader 식별자 0건.
#             역사적 마크 ("team-leader 폐기") 는 제외. — `sprint15-stale-token-zero.mjs`
#   [73/75] mobile-theme-aware — apps/mobile/ 안 `colorsHex.light.*` 직접 참조 0건 +
#             6 화면 useTheme() 호출 1+. D-S14-mobile-theme-aware-pattern 본격 rollout.
#             — `sprint15-mobile-theme-aware.mjs`
#   [74/75] dedup-frozen-marker — packages/engine/src/dedupConcepts.ts 상단 100 라인 안에
#             [FROZEN v2026-05-18 D-S15-dedup-signature] 마크 + 7 시그니처 토큰 + 3 root export.
#             — `sprint15-dedup-frozen-marker.mjs`
#   [75/75] pii-0007-shape — packages/storage/schema/0007_pii_session_hash.sql +
#             scripts/export/sprint8-data.mjs + root scripts.export:sprint8 + workspace 멤버
#             5종 형상 검증. D-S8-pii-policy Rule 1 영속화.
#             — `sprint15-pii-0007-shape.mjs`
#
# 환경변수:
#   SKIP_SPRINT1_E2E=1  — Sprint 1 e2e skip.
#   SKIP_OLLAMA=1       — Sprint 1/3/4/5/6 e2e skip. (SKIP_SPRINT1_E2E 함의.)
#                         메타-검증 + stub-only e2e (Sprint 6~9, Sprint 13~14, Sprint 15) 는 그대로 실행.
#                         *통과 ≠ /end 받음* — `/end` 는 Ollama UP 으로 전체 75 단계 PASS.
#
# 임계 (D-S15-receipt-threshold-recovery — Sprint 14 누적 + 신규 4 보강):
#   - Sprint 14 누적 그대로:
#       external_session_count = 0          (inheritance, branch=C)
#       verify_copy_ok ≥ 24
#       web_demo_banner_present = 1
#       pakda_term_count = 0
#       agent_view_workaround_pattern ≥ 0
#       workers_with_constitution ≥ 7
#       mobile_jest_config_present = 1
#       worktree_bypass_clause_count = 7
#   - Sprint 15 신규:
#       stale_team_leader_token_count = 0
#       hardcoded_light_token_count = 0     (mobile theme-aware 영속성 가드)
#       dedup_frozen_marker = 1             (D-S15-dedup-signature 영속성 가드)
#       pii_0007_columns_added = 3          (D-S8-pii-policy Rule 1 영속성 가드)
#
# 모든 단계 통과 → exit 0, "✅ Sprint 15 receipt PASSED".

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
step "[Sprint 15] 1: Sprint 14 receipt 71 단계 wrap"
if ! bash "$ROOT/scripts/receipt/sprint-14.sh"; then
  fail "[Sprint 15] Sprint 14 receipt 실패. 위 로그 확인."
fi

S15_RUNNER="$ROOT/scripts/receipt/.receipt-runner"

step "[Sprint 15 pre-check] 신규 fixture 파일 4종 존재"
S15_NEW_FIXTURES=(
  "$S15_RUNNER/sprint15-stale-token-zero.mjs"
  "$S15_RUNNER/sprint15-mobile-theme-aware.mjs"
  "$S15_RUNNER/sprint15-dedup-frozen-marker.mjs"
  "$S15_RUNNER/sprint15-pii-0007-shape.mjs"
)
S15_MISSING=()
for f in "${S15_NEW_FIXTURES[@]}"; do
  if [ ! -f "$f" ]; then
    S15_MISSING+=("$f")
  fi
done
if [ ${#S15_MISSING[@]} -gt 0 ]; then
  for f in "${S15_MISSING[@]}"; do
    echo "  누락: $f" >&2
  done
  fail "[Sprint 15 pre-check] 신규 fixture 파일 누락 (위 ${#S15_MISSING[@]} 건)."
fi
echo "  신규 fixture ${#S15_NEW_FIXTURES[@]} 건 발견."

# ---------------------------------------------------------------------------
step "[72/75] stale-token-zero — .receipt-runner 안 active team-leader 식별자 0건"
S15_STZ_OUT=$(node --experimental-strip-types "$S15_RUNNER/sprint15-stale-token-zero.mjs")
echo "  ${S15_STZ_OUT}"
S15_STZ_COUNT=$(printf '%s' "$S15_STZ_OUT" | sed -n 's/.*stale_team_leader_token_count=\([0-9][0-9]*\).*/\1/p')
if [ "${S15_STZ_COUNT:-99}" -ne 0 ]; then
  fail "[72/75] stale_team_leader_token_count=${S15_STZ_COUNT:-?} != 0 — D-S15-T1-stale-token-cleanup 회귀."
fi

# ---------------------------------------------------------------------------
step "[73/75] mobile-theme-aware — apps/mobile 안 colorsHex.light.* 직접 참조 0건"
S15_MTA_OUT=$(node --experimental-strip-types "$S15_RUNNER/sprint15-mobile-theme-aware.mjs")
echo "  ${S15_MTA_OUT}"
S15_MTA_COUNT=$(printf '%s' "$S15_MTA_OUT" | sed -n 's/.*hardcoded_light_token_count=\([0-9][0-9]*\).*/\1/p')
if [ "${S15_MTA_COUNT:-99}" -ne 0 ]; then
  fail "[73/75] hardcoded_light_token_count=${S15_MTA_COUNT:-?} != 0 — D-S14-mobile-theme-aware-pattern 회귀."
fi

# ---------------------------------------------------------------------------
step "[74/75] dedup-frozen-marker — dedupConcepts.ts 상단 D-S15-dedup-signature 마크"
S15_DFM_OUT=$(node --experimental-strip-types "$S15_RUNNER/sprint15-dedup-frozen-marker.mjs")
echo "  ${S15_DFM_OUT}"
S15_DFM_MARK=$(printf '%s' "$S15_DFM_OUT" | sed -n 's/.*dedup_frozen_marker=\([0-9][0-9]*\).*/\1/p')
if [ "${S15_DFM_MARK:-0}" -ne 1 ]; then
  fail "[74/75] dedup_frozen_marker != 1 — D-S15-dedup-signature 마크 / 시그니처 / root export 회귀."
fi

# ---------------------------------------------------------------------------
step "[75/75] pii-0007-shape — 0007 SQL + export pipeline + workspace 멤버 5종 형상"
S15_PII_OUT=$(node --experimental-strip-types "$S15_RUNNER/sprint15-pii-0007-shape.mjs")
echo "  ${S15_PII_OUT}"
S15_PII_COLS=$(printf '%s' "$S15_PII_OUT" | sed -n 's/.*pii_0007_columns_added=\([0-9][0-9]*\).*/\1/p')
if [ "${S15_PII_COLS:-0}" -ne 3 ]; then
  fail "[75/75] pii_0007_columns_added=${S15_PII_COLS:-?} != 3 — D-S15-pii-0007-shape 회귀 (0007 SQL / export pipeline / workspace 멤버 중 1+ 결함)."
fi

# ---------------------------------------------------------------------------
echo ""
echo "✅ Sprint 15 receipt PASSED"
