#!/usr/bin/env bash
# Sprint 7 Receipt — Polish (애니메이션 / 다크·라이트 / 한·영 / Empty·Error / e2e + 정책 박힘).
#   Sprint 6 의 46 단계 wrap + Sprint 7 의 신규 7 단계 (47~53).
#
# 단계
#   [Sprint 7] 1: Sprint 6 46 단계 wrap (sprint-6.sh; SKIP_OLLAMA / SKIP_SPRINT1_E2E 호환)
#   [47/53] motion-token-parity — design-system motion 토큰 ↔ 디자인 목업 styles.css raw
#             text fs 매칭 (drift = 0). — `sprint7-motion-token-parity.mjs`.
#   [48/53] oklch-dark-inversion — light/dark L 합 정합 + 디자인 목업 styles.css :root +
#             [data-theme="dark"] 두 selector 안에 --paper / --ink 모두 등장. —
#             `sprint7-oklch-dark-inversion.mjs`.
#   [49/53] verify-copy — design-system copy.{ko,en} ↔ 디자인 목업 content.jsx COPY 정합
#             (Sprint 7 신규 카피 키 누적 임계 ↑). 기존 fixture 재사용.
#   [50/53] empty-error-render — design-system root index export 의 EmptyState/ErrorState
#             함수 + 메타 + 디자인 목업 screens.jsx EmptyStateScreen 3 variants raw text. —
#             `sprint7-empty-error-render.mjs`.
#   [51/53] full-journey — T11 결과 흡수: seedFullJourney(db) → 9 단계 PASS +
#             dismiss/retraction/decay/prune. — `sprint7-full-journey.mjs`.
#   [52/53] inspector-unlink-decision — sprint-7 dev doc §11 안에
#             `[FROZEN v2026-04-30 D-S7-inspector-unlink-decision]` + A/B 본문 박힘. —
#             `sprint7-inspector-unlink-decision.mjs`.
#   [53/53] contract-gap-policy — `.claude/commands/*.md` 8 워커 spawn prompt 안에
#             D-S7-consumer-producer-gap-policy + consumer 사전 진단 의무 + root index grep
#             의무 모두 박힘. — `sprint7-contract-gap-policy.mjs`.
#
# 환경변수 / dev-mode flag (Sprint 6 그대로 전파):
#   SKIP_SPRINT1_E2E=1  — Sprint 1 e2e skip.
#   SKIP_OLLAMA=1       — Sprint 1/3/4/5 e2e + Sprint 6 e2e skip. 메타-검증 + stub-only e2e
#                         (Sprint 6 41~46 + Sprint 7 47~53) 는 그대로 실행.
#                         두 flag 동시 설정 시 의미 동일 (SKIP_OLLAMA 가 SKIP_SPRINT1_E2E 함의).
#                         *통과 ≠ /end 받음* — `/end` 는 Ollama UP 으로 전체 53 단계 PASS.
#
# 임계 (D-S7-receipt-threshold-recovery — Sprint 6 누적 + 신규 보강):
#   - Sprint 6 누적 그대로:
#       chunks ≥ 5 / length ≥ 10 / ms ≤ 5000 (Sprint 1 e2e)
#       concepts ≥ 2 / co_occur ≥ 1 / nearest ≥ 2 (Sprint 3 e2e)
#       decisions ≥ 4 / recall_candidates ≥ 3 / cooldown_silence = 1 (Sprint 4 e2e)
#       bridge_candidates ≥ 1 / temporal_candidates ≥ 1 (Sprint 5 e2e)
#       dismiss_decay ≥ 1 / retracted_count ≥ 1 / pruned_edges ≥ 0 (Sprint 6 e2e)
#   - Sprint 7 신규 (D-S7-receipt-threshold-recovery):
#       motion_token_parity_drift = 0
#       oklch_dark_inversion_pass = 1
#       full_journey_steps_pass = 9
#       humble_retraction_mount_count ≥ 1
#       dismiss_button_render_count ≥ 1
#
# 모든 단계 통과 → exit 0, "✅ Sprint 7 receipt PASSED".

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

step() { echo ""; echo "▶ $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

# SKIP_OLLAMA=1 은 SKIP_SPRINT1_E2E=1 을 함의.
if [ "${SKIP_OLLAMA:-0}" = "1" ]; then
  export SKIP_SPRINT1_E2E=1
  echo "  ⚠ SKIP_OLLAMA=1 — Sprint 1/3/4/5 e2e + Sprint 6 e2e 건너뜀."
fi

# ---------------------------------------------------------------------------
step "[Sprint 7] 1: Sprint 6 receipt 46 단계 wrap"
if ! bash "$ROOT/scripts/receipt/sprint-6.sh"; then
  fail "[Sprint 7] Sprint 6 receipt 실패. 위 로그 확인."
fi

S7_RUNNER="$ROOT/scripts/receipt/.receipt-runner"

# Sprint 7 신규 fixture 파일 존재 가드.
step "[Sprint 7 pre-check] 신규 fixture 파일 존재"
S7_NEW_FIXTURES=(
  "$S7_RUNNER/sprint7-motion-token-parity.mjs"
  "$S7_RUNNER/sprint7-oklch-dark-inversion.mjs"
  "$S7_RUNNER/sprint7-empty-error-render.mjs"
  "$S7_RUNNER/sprint7-full-journey.mjs"
  "$S7_RUNNER/sprint7-inspector-unlink-decision.mjs"
  "$S7_RUNNER/sprint7-contract-gap-policy.mjs"
)
S7_MISSING=()
for f in "${S7_NEW_FIXTURES[@]}"; do
  if [ ! -f "$f" ]; then
    S7_MISSING+=("$f")
  fi
done
if [ ${#S7_MISSING[@]} -gt 0 ]; then
  for f in "${S7_MISSING[@]}"; do
    echo "  누락: $f" >&2
  done
  fail "[Sprint 7 pre-check] 신규 fixture 파일 누락 (위 ${#S7_MISSING[@]} 건)."
fi
echo "  신규 fixture ${#S7_NEW_FIXTURES[@]} 건 발견."

# ---------------------------------------------------------------------------
step "[47/53] motion-token-parity — design-system motion ↔ 디자인 목업 styles.css drift=0"
S7_MOT_OUT=$(node --experimental-strip-types "$S7_RUNNER/sprint7-motion-token-parity.mjs")
echo "  ${S7_MOT_OUT}"
S7_MOT_DRIFT=$(printf '%s' "$S7_MOT_OUT" | sed -n 's/.*motion_token_parity_drift=\([0-9][0-9]*\).*/\1/p')
S7_MOT_TOKENS=$(printf '%s' "$S7_MOT_OUT" | sed -n 's/.*tokens_checked=\([0-9][0-9]*\).*/\1/p')
if [ "${S7_MOT_DRIFT:-1}" -ne 0 ]; then
  fail "[47/53] motion_token_parity_drift != 0 — 디자인 목업과 motion 정의 mismatch."
fi
if [ "${S7_MOT_TOKENS:-0}" -lt 1 ]; then
  fail "[47/53] tokens_checked < 1 — MOTION_MOCKUP_PARITY 비어있음."
fi

# ---------------------------------------------------------------------------
step "[48/53] oklch-dark-inversion — light/dark L 합 정합 + styles.css :root + dark"
S7_OKL_OUT=$(node --experimental-strip-types "$S7_RUNNER/sprint7-oklch-dark-inversion.mjs")
echo "  ${S7_OKL_OUT}"
S7_OKL_PASS=$(printf '%s' "$S7_OKL_OUT" | sed -n 's/.*oklch_dark_inversion_pass=\([0-9][0-9]*\).*/\1/p')
if [ "${S7_OKL_PASS:-0}" -ne 1 ]; then
  fail "[48/53] oklch_dark_inversion_pass != 1 — 토큰 반전 정합 실패."
fi

# ---------------------------------------------------------------------------
step "[49/53] verify-copy — design-system copy ↔ 디자인 목업 content.jsx COPY (Sprint 7 임계 ↑)"
S7_COPY_OUT=$(node --experimental-strip-types \
  "$ROOT/packages/design-system/.receipt-runner/verify-copy.mjs")
echo "  ${S7_COPY_OUT}"
# verify-copy.mjs 출력 형태: ok=<n> (designer T4 가 임계 박음).
S7_COPY_OK=$(printf '%s' "$S7_COPY_OUT" | sed -n 's/.*ok=\([0-9][0-9]*\).*/\1/p')
# Sprint 6 까지 16, Sprint 7 신규 카피 ≥ 1 추가 → 보수적 임계 17.
# 임계 보수적 시작 (feedback_receipt_threshold) — 1 회 PASS 후 회복 가능.
if [ "${S7_COPY_OK:-0}" -lt 17 ]; then
  fail "[49/53] verify-copy ok=${S7_COPY_OK} < 17 (Sprint 7 신규 카피 임계 미달)."
fi

# ---------------------------------------------------------------------------
step "[50/53] empty-error-render — EmptyState/ErrorState root export + screens.jsx 정합"
S7_EE_OUT=$(node --experimental-strip-types "$S7_RUNNER/sprint7-empty-error-render.mjs")
echo "  ${S7_EE_OUT}"
S7_EE_PASS=$(printf '%s' "$S7_EE_OUT" | sed -n 's/.*empty_error_render_pass=\([0-9][0-9]*\).*/\1/p')
if [ "${S7_EE_PASS:-0}" -ne 1 ]; then
  fail "[50/53] empty_error_render_pass != 1."
fi

# ---------------------------------------------------------------------------
step "[51/53] full-journey — seedFullJourney 9 단계 + dismiss/retraction/decay/prune"
S7_FJ_DB="$(mktemp -t synapse-sprint7-fj.XXXXXX.db)"
trap 'rm -f "$S7_FJ_DB"' EXIT
S7_FJ_OUT=$(SYNAPSE_DB_PATH="$S7_FJ_DB" node --experimental-strip-types \
  "$S7_RUNNER/sprint7-full-journey.mjs")
echo "  ${S7_FJ_OUT}"
S7_FJ_STEPS=$(printf '%s' "$S7_FJ_OUT" | sed -n 's/.*full_journey_steps_pass=\([0-9][0-9]*\).*/\1/p')
S7_FJ_DIS=$(printf '%s' "$S7_FJ_OUT" | sed -n 's/.*dismiss_decay=\([0-9][0-9]*\).*/\1/p')
S7_FJ_RET=$(printf '%s' "$S7_FJ_OUT" | sed -n 's/.*retracted_count=\([0-9][0-9]*\).*/\1/p')
S7_FJ_PRU=$(printf '%s' "$S7_FJ_OUT" | sed -n 's/.*pruned_edges=\([0-9][0-9]*\).*/\1/p')
S7_FJ_HR=$(printf '%s' "$S7_FJ_OUT" | sed -n 's/.*humble_retraction_mount_count=\([0-9][0-9]*\).*/\1/p')
S7_FJ_DB_BTN=$(printf '%s' "$S7_FJ_OUT" | sed -n 's/.*dismiss_button_render_count=\([0-9][0-9]*\).*/\1/p')
if [ "${S7_FJ_STEPS:-0}" -ne 9 ]; then
  fail "[51/53] full_journey_steps_pass != 9: ${S7_FJ_OUT}"
fi
if [ "${S7_FJ_DIS:-0}" -lt 1 ]; then
  fail "[51/53] dismiss_decay < 1: ${S7_FJ_OUT}"
fi
if [ "${S7_FJ_RET:-0}" -lt 1 ]; then
  fail "[51/53] retracted_count < 1: ${S7_FJ_OUT}"
fi
if [ "${S7_FJ_PRU:-0}" -lt 0 ]; then
  fail "[51/53] pruned_edges < 0: ${S7_FJ_OUT}"
fi
if [ "${S7_FJ_HR:-0}" -lt 1 ]; then
  fail "[51/53] humble_retraction_mount_count < 1: ${S7_FJ_OUT}"
fi
if [ "${S7_FJ_DB_BTN:-0}" -lt 1 ]; then
  fail "[51/53] dismiss_button_render_count < 1: ${S7_FJ_OUT}"
fi
rm -f "$S7_FJ_DB"

# ---------------------------------------------------------------------------
step "[52/53] inspector-unlink-decision — §11 §FROZEN 박힘"
S7_IUD_OUT=$(node --experimental-strip-types "$S7_RUNNER/sprint7-inspector-unlink-decision.mjs")
echo "  ${S7_IUD_OUT}"
S7_IUD_PASS=$(printf '%s' "$S7_IUD_OUT" | sed -n 's/.*inspector_unlink_decision_frozen=\([0-9][0-9]*\).*/\1/p')
if [ "${S7_IUD_PASS:-0}" -ne 1 ]; then
  fail "[52/53] inspector_unlink_decision_frozen != 1."
fi

# ---------------------------------------------------------------------------
step "[53/53] contract-gap-policy — 8 워커 spawn prompt raw text 박힘"
S7_CGP_OUT=$(node --experimental-strip-types "$S7_RUNNER/sprint7-contract-gap-policy.mjs")
echo "  ${S7_CGP_OUT}"
S7_CGP_PASS=$(printf '%s' "$S7_CGP_OUT" | sed -n 's/.*contract_gap_policy_pass=\([0-9][0-9]*\).*/\1/p')
S7_CGP_MARKS=$(printf '%s' "$S7_CGP_OUT" | sed -n 's/.*policy_marks=\([0-9][0-9]*\).*/\1/p')
if [ "${S7_CGP_PASS:-0}" -ne 1 ]; then
  fail "[53/53] contract_gap_policy_pass != 1."
fi
# 8 파일 × 3 패턴 = 24 marks 보수적 임계.
if [ "${S7_CGP_MARKS:-0}" -lt 24 ]; then
  fail "[53/53] policy_marks=${S7_CGP_MARKS} < 24 — 8 파일 × 3 패턴 미달."
fi

# ---------------------------------------------------------------------------
echo ""
echo "✅ Sprint 7 receipt PASSED"
