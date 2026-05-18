#!/usr/bin/env bash
# Sprint 14 Receipt — Worktree-Bypass 가드 + RN Jest 인프라 보강 (Sprint 13 inheritance).
#   Sprint 13 의 69 단계 wrap + Sprint 14 신규 2 단계 (70~71) = 71 단계.
#   (Sprint 13 자체가 Sprint 9 65 단계 + Sprint 13 신규 4 단계 wrap.)
#
# 단계
#   [Sprint 14] 1: Sprint 13 69 단계 wrap (sprint-13.sh; SKIP_OLLAMA /
#                 SKIP_SPRINT1_E2E 호환. Sprint 15 T1 에서 LEGACY_WRAP_FAIL_TOLERATED
#                 영구 제거됨.)
#   [Sprint 14 pre-check] 신규 fixture 파일 2종 존재
#   [70/71] mobile-jest-infra — apps/mobile/ 안 Jest 인프라 자산 + scripts.test
#             jest 토큰 검증. RN 컴포넌트 테스트 회귀 가드.
#             — `sprint14-mobile-jest-infra.mjs`
#   [71/71] worktree-bypass-clause — .claude/agents/*.md 7 파일 모두 헌법 #13
#             (D-S14-worktree-bypass-prohibition) 조항 raw text 4종 매칭
#             (frozen ID + pwd + git rev-parse --show-toplevel + 절대경로).
#             Sprint 13 §11 O-S13-tester-worktree-bypass first 사례의 영구 가드.
#             — `sprint14-worktree-bypass-clause.mjs`
#
# 환경변수 / dev-mode flag (Sprint 13 그대로 전파, Sprint 14 신규 없음):
#   SKIP_SPRINT1_E2E=1  — Sprint 1 e2e skip.
#   SKIP_OLLAMA=1       — Sprint 1/3/4/5/6 e2e skip. 메타-검증 + stub-only e2e
#                         (Sprint 6 41~46 + Sprint 7 47~53 + Sprint 8 54~60 +
#                         Sprint 9 61~65 + Sprint 13 66~69 + Sprint 14 70~71)
#                         는 그대로 실행. 두 flag 동시 설정 시 의미 동일.
#                         *통과 ≠ /end 받음* — `/end` 는 Ollama UP 으로 전체
#                         71 단계 PASS.
#   (Sprint 15 T1: LEGACY_WRAP_FAIL_TOLERATED 영구 제거 —
#    .receipt-runner/*.mjs 안 stale 토큰 정리 + sprint-13.sh 의 LEGACY 분기 제거
#    완료로 wrap 이 단독 PASS. 본 wrap 도 LEGACY 분기 없이 sprint-13 fail 시 즉시 fail.)
#
# 임계 (D-S14-receipt-threshold-recovery — Sprint 13 누적 + 신규 보강):
#   - Sprint 13 누적 그대로:
#       external_session_count = 0          (inheritance, branch=A 미진입)
#       verify_copy_ok ≥ 24
#       web_demo_banner_present = 1
#       pakda_term_count = 0
#       agent_view_workaround_pattern ≥ 0
#       workers_with_constitution ≥ 7
#   - Sprint 14 신규:
#       mobile_jest_config_present = 1     (RN Jest 인프라 영속성 가드)
#       worktree_bypass_clause_count = 7   (헌법 #13 7 워커 영속성 가드)
#
# 모든 단계 통과 → exit 0, "✅ Sprint 14 receipt PASSED".

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
step "[Sprint 14] 1: Sprint 13 receipt 69 단계 wrap"
if ! bash "$ROOT/scripts/receipt/sprint-13.sh"; then
  fail "[Sprint 14] Sprint 13 receipt 실패. 위 로그 확인."
fi

S14_RUNNER="$ROOT/scripts/receipt/.receipt-runner"

step "[Sprint 14 pre-check] 신규 fixture 파일 존재"
S14_NEW_FIXTURES=(
  "$S14_RUNNER/sprint14-mobile-jest-infra.mjs"
  "$S14_RUNNER/sprint14-worktree-bypass-clause.mjs"
)
S14_MISSING=()
for f in "${S14_NEW_FIXTURES[@]}"; do
  if [ ! -f "$f" ]; then
    S14_MISSING+=("$f")
  fi
done
if [ ${#S14_MISSING[@]} -gt 0 ]; then
  for f in "${S14_MISSING[@]}"; do
    echo "  누락: $f" >&2
  done
  fail "[Sprint 14 pre-check] 신규 fixture 파일 누락 (위 ${#S14_MISSING[@]} 건)."
fi
echo "  신규 fixture ${#S14_NEW_FIXTURES[@]} 건 발견."

# ---------------------------------------------------------------------------
step "[70/71] mobile-jest-infra — apps/mobile/ Jest 인프라 + scripts.test jest 토큰 검증"
S14_MJI_OUT=$(node --experimental-strip-types "$S14_RUNNER/sprint14-mobile-jest-infra.mjs")
echo "  ${S14_MJI_OUT}"
S14_MJI_PASS=$(printf '%s' "$S14_MJI_OUT" | sed -n 's/.*mobile_jest_config_present=\([0-9][0-9]*\).*/\1/p')
if [ "${S14_MJI_PASS:-0}" -ne 1 ]; then
  fail "[70/71] mobile_jest_config_present != 1 — apps/mobile/ Jest 인프라 회귀 (jest.config.js / jest.setup.ts / scripts.test / __tests__/*.test.tsx 중 1+ 결함)."
fi

# ---------------------------------------------------------------------------
step "[71/71] worktree-bypass-clause — .claude/agents/*.md 7 파일 헌법 #13 조항 매칭"
S14_WBC_OUT=$(node --experimental-strip-types "$S14_RUNNER/sprint14-worktree-bypass-clause.mjs")
echo "  ${S14_WBC_OUT}"
S14_WBC_COUNT=$(printf '%s' "$S14_WBC_OUT" | sed -n 's/.*worktree_bypass_clause_count=\([0-9][0-9]*\).*/\1/p')
if [ "${S14_WBC_COUNT:-0}" -ne 7 ]; then
  fail "[71/71] worktree_bypass_clause_count=${S14_WBC_COUNT:-0} != 7 — 헌법 #13 7 워커 정렬 회귀 (D-S14-worktree-bypass-prohibition / pwd / git rev-parse --show-toplevel / 절대경로 중 1+ 미매칭)."
fi

# ---------------------------------------------------------------------------
echo ""
echo "✅ Sprint 14 receipt PASSED"
