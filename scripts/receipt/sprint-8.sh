#!/usr/bin/env bash
# Sprint 8 Receipt — External Validation (외부 dogfooding + 데이터 기반 결정 박음).
#   Sprint 7 의 53 단계 wrap + Sprint 8 의 신규 7 단계 (54~60).
#
# 단계
#   [Sprint 8] 1: Sprint 7 53 단계 wrap (sprint-7.sh; SKIP_OLLAMA / SKIP_SPRINT1_E2E 호환)
#   [54/60] external-data-index — `docs/sprints/sprint-8-data/index.md` 존재 + 세션 N≥3 raw
#             text 검증 + raw 디렉토리 카운트. — `sprint8-external-data-index.mjs`.
#   [55/60] frozen-decisions-carry-over — Sprint 8 dev doc §11 안에
#             `[FROZEN v2026-04-30 D-S8-*]` 5 종 raw text 박힘 (≥ 5). —
#             `sprint8-frozen-decisions-carry-over.mjs`.
#   [56/60] pii-policy — `docs/sprints/sprint-8-pii-policy.md` 존재 + 5 종 anonymize 규칙
#             raw text 박힘 (사용자 식별자 hash / raw 텍스트 격리 / 임베딩 / 메타 / 학습 합의). —
#             `sprint8-pii-policy.mjs`.
#   [57/60] recall-log-retention — storage migration 0006 (있는 경우) + 단위 테스트 PASS,
#             또는 *보류 frozen* 박음 raw text 분기. — `sprint8-recall-log-retention.mjs`.
#   [58/60] concept-dedup — engine `dedupConcepts.ts` (있는 경우) + 단위 테스트 PASS,
#             또는 *보류 frozen* 박음 raw text 분기. — `sprint8-concept-dedup.mjs`.
#   [59/60] negation-classifier — LLM 도입 / heuristic 강화 / 보류 frozen 3 분기 검증. —
#             `sprint8-negation-classifier.mjs`.
#   [60/60] sprint-7-wrap — Sprint 7 53단계 그대로 PASS 보존 (메타 검증 — Sprint 7 receipt
#             의 직접 호출은 step 1 에서 수행됨; 이 단계는 fixture 측의 메타 정합 검증). —
#             `sprint8-sprint-7-wrap.mjs`.
#
# 환경변수 / dev-mode flag (Sprint 7 그대로 전파):
#   SKIP_SPRINT1_E2E=1  — Sprint 1 e2e skip.
#   SKIP_OLLAMA=1       — Sprint 1/3/4/5/6 e2e skip. 메타-검증 + stub-only e2e
#                         (Sprint 6 41~46 + Sprint 7 47~53 + Sprint 8 54~60) 는 그대로 실행.
#                         두 flag 동시 설정 시 의미 동일 (SKIP_OLLAMA 가 SKIP_SPRINT1_E2E 함의).
#                         *통과 ≠ /end 받음* — `/end` 는 Ollama UP 으로 전체 60 단계 PASS.
#
# 임계 (D-S8-receipt-threshold-recovery — Sprint 7 누적 + 신규 보강):
#   - Sprint 7 누적 그대로.
#   - Sprint 8 신규:
#       external_session_count ≥ 3
#       frozen_decisions_carry_over ≥ 5
#       pii_policy_marks = 5
#       sprint_7_wrap_pass = 1
#
# 모든 단계 통과 → exit 0, "✅ Sprint 8 receipt PASSED".

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
step "[Sprint 8] 1: Sprint 7 receipt 53 단계 wrap"
if ! bash "$ROOT/scripts/receipt/sprint-7.sh"; then
  fail "[Sprint 8] Sprint 7 receipt 실패. 위 로그 확인."
fi

S8_RUNNER="$ROOT/scripts/receipt/.receipt-runner"

# Sprint 8 신규 fixture 파일 존재 가드.
step "[Sprint 8 pre-check] 신규 fixture 파일 존재"
S8_NEW_FIXTURES=(
  "$S8_RUNNER/sprint8-external-data-index.mjs"
  "$S8_RUNNER/sprint8-frozen-decisions-carry-over.mjs"
  "$S8_RUNNER/sprint8-pii-policy.mjs"
  "$S8_RUNNER/sprint8-recall-log-retention.mjs"
  "$S8_RUNNER/sprint8-concept-dedup.mjs"
  "$S8_RUNNER/sprint8-negation-classifier.mjs"
  "$S8_RUNNER/sprint8-sprint-7-wrap.mjs"
)
S8_MISSING=()
for f in "${S8_NEW_FIXTURES[@]}"; do
  if [ ! -f "$f" ]; then
    S8_MISSING+=("$f")
  fi
done
if [ ${#S8_MISSING[@]} -gt 0 ]; then
  for f in "${S8_MISSING[@]}"; do
    echo "  누락: $f" >&2
  done
  fail "[Sprint 8 pre-check] 신규 fixture 파일 누락 (위 ${#S8_MISSING[@]} 건)."
fi
echo "  신규 fixture ${#S8_NEW_FIXTURES[@]} 건 발견."

# ---------------------------------------------------------------------------
step "[54/60] external-data-index — sprint-8-data/index.md + raw 세션 N≥3 OR 데이터 부재 분기"
S8_EDI_OUT=$(node --experimental-strip-types "$S8_RUNNER/sprint8-external-data-index.mjs")
echo "  ${S8_EDI_OUT}"
S8_EDI_COUNT=$(printf '%s' "$S8_EDI_OUT" | sed -n 's/.*external_session_count=\([0-9][0-9]*\).*/\1/p')
S8_EDI_PASS=$(printf '%s' "$S8_EDI_OUT" | sed -n 's/.*external_data_index_pass=\([0-9][0-9]*\).*/\1/p')
S8_EDI_BRANCH=$(printf '%s' "$S8_EDI_OUT" | sed -n 's/.*branch=\([AB]\).*/\1/p')
if [ "${S8_EDI_PASS:-0}" -ne 1 ]; then
  fail "[54/60] external_data_index_pass != 1."
fi
# branch A: 실데이터 ≥ 3 / branch B: N=0 데이터 부재 분기 (D-S8-sprint-close-A-branch 정합).
if [ "${S8_EDI_BRANCH:-X}" = "A" ] && [ "${S8_EDI_COUNT:-0}" -lt 3 ]; then
  fail "[54/60] branch=A 인데 external_session_count=${S8_EDI_COUNT} < 3 (D-S8-receipt-threshold-recovery)."
fi

# ---------------------------------------------------------------------------
step "[55/60] frozen-decisions-carry-over — Sprint 8 §11 안에 D-S8-* 5 종 박힘"
S8_FDC_OUT=$(node --experimental-strip-types "$S8_RUNNER/sprint8-frozen-decisions-carry-over.mjs")
echo "  ${S8_FDC_OUT}"
S8_FDC_COUNT=$(printf '%s' "$S8_FDC_OUT" | sed -n 's/.*frozen_decisions_carry_over=\([0-9][0-9]*\).*/\1/p')
S8_FDC_PASS=$(printf '%s' "$S8_FDC_OUT" | sed -n 's/.*frozen_decisions_carry_over_pass=\([0-9][0-9]*\).*/\1/p')
if [ "${S8_FDC_PASS:-0}" -ne 1 ]; then
  fail "[55/60] frozen_decisions_carry_over_pass != 1."
fi
if [ "${S8_FDC_COUNT:-0}" -lt 5 ]; then
  fail "[55/60] frozen_decisions_carry_over=${S8_FDC_COUNT} < 5 (D-S8-receipt-threshold-recovery)."
fi

# ---------------------------------------------------------------------------
step "[56/60] pii-policy — sprint-8-pii-policy.md + 5 종 anonymize 규칙 raw text"
S8_PII_OUT=$(node --experimental-strip-types "$S8_RUNNER/sprint8-pii-policy.mjs")
echo "  ${S8_PII_OUT}"
S8_PII_PASS=$(printf '%s' "$S8_PII_OUT" | sed -n 's/.*pii_policy_pass=\([0-9][0-9]*\).*/\1/p')
S8_PII_MARKS=$(printf '%s' "$S8_PII_OUT" | sed -n 's/.*pii_policy_marks=\([0-9][0-9]*\).*/\1/p')
if [ "${S8_PII_PASS:-0}" -ne 1 ]; then
  fail "[56/60] pii_policy_pass != 1."
fi
if [ "${S8_PII_MARKS:-0}" -lt 5 ]; then
  fail "[56/60] pii_policy_marks=${S8_PII_MARKS} < 5 — anonymize 규칙 5 종 미박힘."
fi

# ---------------------------------------------------------------------------
step "[57/60] recall-log-retention — migration 0006 + 단위 테스트 OR 보류 frozen"
S8_RLR_OUT=$(node --experimental-strip-types "$S8_RUNNER/sprint8-recall-log-retention.mjs")
echo "  ${S8_RLR_OUT}"
S8_RLR_PASS=$(printf '%s' "$S8_RLR_OUT" | sed -n 's/.*recall_log_retention_pass=\([0-9][0-9]*\).*/\1/p')
if [ "${S8_RLR_PASS:-0}" -ne 1 ]; then
  fail "[57/60] recall_log_retention_pass != 1."
fi

# ---------------------------------------------------------------------------
step "[58/60] concept-dedup — dedupConcepts.ts + 단위 테스트 OR 보류 frozen"
S8_CDP_OUT=$(node --experimental-strip-types "$S8_RUNNER/sprint8-concept-dedup.mjs")
echo "  ${S8_CDP_OUT}"
S8_CDP_PASS=$(printf '%s' "$S8_CDP_OUT" | sed -n 's/.*concept_dedup_pass=\([0-9][0-9]*\).*/\1/p')
if [ "${S8_CDP_PASS:-0}" -ne 1 ]; then
  fail "[58/60] concept_dedup_pass != 1."
fi

# ---------------------------------------------------------------------------
step "[59/60] negation-classifier — LLM 도입 / heuristic 강화 / 보류 frozen 3 분기"
S8_NEG_OUT=$(node --experimental-strip-types "$S8_RUNNER/sprint8-negation-classifier.mjs")
echo "  ${S8_NEG_OUT}"
S8_NEG_PASS=$(printf '%s' "$S8_NEG_OUT" | sed -n 's/.*negation_classifier_pass=\([0-9][0-9]*\).*/\1/p')
if [ "${S8_NEG_PASS:-0}" -ne 1 ]; then
  fail "[59/60] negation_classifier_pass != 1."
fi

# ---------------------------------------------------------------------------
step "[60/60] sprint-7-wrap — Sprint 7 53단계 fixture 메타 정합 보존"
S8_S7W_OUT=$(node --experimental-strip-types "$S8_RUNNER/sprint8-sprint-7-wrap.mjs")
echo "  ${S8_S7W_OUT}"
S8_S7W_PASS=$(printf '%s' "$S8_S7W_OUT" | sed -n 's/.*sprint_7_wrap_pass=\([0-9][0-9]*\).*/\1/p')
if [ "${S8_S7W_PASS:-0}" -ne 1 ]; then
  fail "[60/60] sprint_7_wrap_pass != 1."
fi

# ---------------------------------------------------------------------------
echo ""
echo "✅ Sprint 8 receipt PASSED"
