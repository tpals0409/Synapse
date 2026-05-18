#!/usr/bin/env bash
# Sprint 6 Receipt — Failure & Hygiene (Dismiss / Humble Retraction / Forgetting).
#   Sprint 5 의 40 단계 wrap + Sprint 6 의 6 단계
#   (dismiss-penalty / retraction-rollback / forgetting-decay / edge-prune / sql-audit /
#    carry-over 2 mobile tsc + carry-over 5 lint regex alternation grep / 임계 보강).
#
# 단계
#   [Sprint 6] 1: Sprint 5 40 단계 wrap (sprint-5.sh; SKIP_OLLAMA / SKIP_SPRINT1_E2E 호환)
#   [41/46] e2e Dismiss penalty — applyDismiss + markDismissed + decayEdgeWeight
#             → recall_log.dismissed_concept_ids JSON + edges.weight *= 0.5 검증.
#             — `sprint6-dismiss-penalty.mjs`.
#   [42/46] e2e Humble Retraction rollback — detectRetractionSignal hit/miss + markRetracted
#             + rollbackCaptureForTurn (concepts/edges hard-delete) 검증.
#             — `sprint6-retraction-rollback.mjs`.
#   [43/46] e2e Forgetting decay — engine.decayScore 단조 + half-life 정확
#             + storage.decayWeights edges weight 단조 감쇠 + recordTouch 검증.
#             — `sprint6-forgetting-decay.mjs`.
#   [44/46] e2e Edge prune — pruneEdgesBelow 임계 미만 hard-delete + 멱등 검증.
#             — `sprint6-edge-prune.mjs`.
#   [45/46] e2e SQL secondary sort audit — recentlyDecidedFor 5 회 연속 결정성 +
#             id ASC tie-break 검증 (carry-over 6 흡수). — `sprint6-sql-audit.mjs`.
#   [46/46] carry-over 2 (mobile workspace deps 5 tsc) + carry-over 5 (lint regex
#             alternation grep) + lint 3 종 (mockup-scope-parity / frozen-flag-audit /
#             directive-tag-audit) Sprint 6 dev doc PASS + 임계 보강 검증.
#
# 환경변수 / dev-mode flag (Sprint 5 그대로 전파):
#   SKIP_SPRINT1_E2E=1  — Sprint 1 e2e skip (Sprint 5 wrap 안에서 그대로 전파).
#   SKIP_OLLAMA=1       — Sprint 1/3/4 e2e + Sprint 5 e2e 40 skip.
#                         메타-검증 + stub-only e2e (33~36, 41~46) 는 그대로 실행.
#                         두 flag 동시 설정 시 의미 동일 (SKIP_OLLAMA 가 SKIP_SPRINT1_E2E 함의).
#                         *통과 ≠ /end 받음* — `/end` 는 Ollama UP 으로 전체 46 단계 PASS.
#
# 임계 (D-S6-receipt-threshold-recovery — Sprint 5 누적 + 신규 보강):
#   - Sprint 5 누적 임계 그대로:
#       chunks ≥ 5  length ≥ 10  ms ≤ 5000   (Sprint 1 e2e)
#       concepts ≥ 2  co_occur ≥ 1  nearest ≥ 2  (Sprint 3 e2e)
#       decisions ≥ 4  recall_candidates ≥ 3  cooldown_silence = 1  (Sprint 4 e2e)
#       bridge_candidates ≥ 1  temporal_candidates ≥ 1  (Sprint 5 e2e)
#   - Sprint 6 신규:
#       dismiss_decay ≥ 1  (한 번 이상 weight 약화 발생)
#       retracted_count ≥ 1  (한 번 이상 retraction)
#       pruned_edges ≥ 0  (prune 호출 정상)
#
# 모든 단계 통과 → exit 0, "✅ Sprint 6 receipt PASSED".

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

step() { echo ""; echo "▶ $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

# SKIP_OLLAMA=1 은 SKIP_SPRINT1_E2E=1 을 함의.
if [ "${SKIP_OLLAMA:-0}" = "1" ]; then
  export SKIP_SPRINT1_E2E=1
  echo "  ⚠ SKIP_OLLAMA=1 — Sprint 1/3 e2e + Sprint 4 e2e + Sprint 5 e2e 40 건너뜀."
fi

# ---------------------------------------------------------------------------
step "[Sprint 6] 1: Sprint 5 receipt 40 단계 wrap"
if ! bash "$ROOT/scripts/receipt/sprint-5.sh"; then
  fail "[Sprint 6] Sprint 5 receipt 실패. 위 로그 확인."
fi

S6_RUNNER="$ROOT/scripts/receipt/.receipt-runner"

# Sprint 6 신규 fixture 파일 존재 가드.
step "[Sprint 6 pre-check] 신규 fixture 파일 존재"
S6_NEW_FIXTURES=(
  "$S6_RUNNER/sprint6-dismiss-penalty.mjs"
  "$S6_RUNNER/sprint6-retraction-rollback.mjs"
  "$S6_RUNNER/sprint6-forgetting-decay.mjs"
  "$S6_RUNNER/sprint6-edge-prune.mjs"
  "$S6_RUNNER/sprint6-sql-audit.mjs"
)
S6_MISSING=()
for f in "${S6_NEW_FIXTURES[@]}"; do
  if [ ! -f "$f" ]; then
    S6_MISSING+=("$f")
  fi
done
if [ ${#S6_MISSING[@]} -gt 0 ]; then
  for f in "${S6_MISSING[@]}"; do
    echo "  누락: $f" >&2
  done
  fail "[Sprint 6 pre-check] 신규 fixture 파일 누락 (위 ${#S6_MISSING[@]} 건)."
fi
echo "  신규 fixture ${#S6_NEW_FIXTURES[@]} 건 발견."

# ---------------------------------------------------------------------------
step "[41/46] e2e: Dismiss penalty (orchestrator T5 + storage T2)"
S6_DIS_DB="$(mktemp -t synapse-sprint6-dismiss.XXXXXX.db)"
trap 'rm -f "$S6_DIS_DB"' EXIT
DIS_OUT=$(SYNAPSE_DB_PATH="$S6_DIS_DB" node --experimental-strip-types \
  "$S6_RUNNER/sprint6-dismiss-penalty.mjs")
echo "  ${DIS_OUT}"
S6_DIS_DECAYED=$(printf '%s' "$DIS_OUT" | sed -n 's/.*decayed=\([0-9][0-9]*\).*/\1/p')
S6_DIS_WEIGHT=$(printf '%s' "$DIS_OUT" | sed -n 's/.*edge_weight=\([0-9.]*\).*/\1/p')
S6_DIS_PRUNED=$(printf '%s' "$DIS_OUT" | sed -n 's/.*pruned=\([0-9][0-9]*\).*/\1/p')
if [ "${S6_DIS_DECAYED:-0}" -lt 1 ]; then
  fail "[41/46] dismiss decayed < 1: ${DIS_OUT}"
fi
if [ "${S6_DIS_WEIGHT}" != "0.4000" ]; then
  fail "[41/46] expected edge_weight=0.4000 (0.8 * 0.5 penalty), got '${S6_DIS_WEIGHT}'"
fi
rm -f "$S6_DIS_DB"

# ---------------------------------------------------------------------------
step "[42/46] e2e: Humble Retraction rollback (conversation T4 + storage T2)"
S6_RET_DB="$(mktemp -t synapse-sprint6-retraction.XXXXXX.db)"
RET_OUT=$(SYNAPSE_DB_PATH="$S6_RET_DB" node --experimental-strip-types \
  "$S6_RUNNER/sprint6-retraction-rollback.mjs")
echo "  ${RET_OUT}"
S6_RET_RETRACTED=$(printf '%s' "$RET_OUT" | sed -n 's/.*retracted=\([0-9][0-9]*\).*/\1/p')
S6_RET_ROLLBACK=$(printf '%s' "$RET_OUT" | sed -n 's/.*rolledback=\([0-9][0-9]*\).*/\1/p')
S6_RET_HIT=$(printf '%s' "$RET_OUT" | sed -n 's/.*detect_hit=\([0-9][0-9]*\).*/\1/p')
S6_RET_MISS=$(printf '%s' "$RET_OUT" | sed -n 's/.*detect_miss=\([0-9][0-9]*\).*/\1/p')
if [ "${S6_RET_RETRACTED:-0}" -lt 1 ]; then
  fail "[42/46] retracted < 1: ${RET_OUT}"
fi
if [ "${S6_RET_ROLLBACK:-0}" -lt 1 ]; then
  fail "[42/46] rolledback < 1: ${RET_OUT}"
fi
if [ "${S6_RET_HIT:-0}" -lt 6 ]; then
  fail "[42/46] detect_hit < 6 (한·영 6 케이스 미달): ${RET_OUT}"
fi
if [ "${S6_RET_MISS:-0}" -lt 4 ]; then
  fail "[42/46] detect_miss < 4 (false positive 가능): ${RET_OUT}"
fi
rm -f "$S6_RET_DB"

# ---------------------------------------------------------------------------
step "[43/46] e2e: Forgetting decay (engine T3 + storage T2)"
S6_FOR_DB="$(mktemp -t synapse-sprint6-forgetting.XXXXXX.db)"
FOR_OUT=$(SYNAPSE_DB_PATH="$S6_FOR_DB" node --experimental-strip-types \
  "$S6_RUNNER/sprint6-forgetting-decay.mjs")
echo "  ${FOR_OUT}"
S6_FOR_STEPS=$(printf '%s' "$FOR_OUT" | sed -n 's/.*decay_steps=\([0-9][0-9]*\).*/\1/p')
S6_FOR_MONO=$(printf '%s' "$FOR_OUT" | sed -nE 's/.*monotone=(true|false).*/\1/p')
S6_FOR_HALF=$(printf '%s' "$FOR_OUT" | sed -nE 's/.*halflife_exact=(true|false).*/\1/p')
S6_FOR_DECAYED=$(printf '%s' "$FOR_OUT" | sed -n 's/.*edge_decayed=\([0-9][0-9]*\).*/\1/p')
S6_FOR_TOUCHED=$(printf '%s' "$FOR_OUT" | sed -nE 's/.*touched=(true|false).*/\1/p')
if [ "${S6_FOR_MONO}" != "true" ]; then
  fail "[43/46] decayScore monotone=false: ${FOR_OUT}"
fi
if [ "${S6_FOR_HALF}" != "true" ]; then
  fail "[43/46] half-life exact 검증 실패: ${FOR_OUT}"
fi
if [ "${S6_FOR_DECAYED:-0}" -lt 1 ]; then
  fail "[43/46] storage edge_decayed < 1: ${FOR_OUT}"
fi
if [ "${S6_FOR_TOUCHED}" != "true" ]; then
  fail "[43/46] recordTouch 검증 실패: ${FOR_OUT}"
fi
rm -f "$S6_FOR_DB"

# ---------------------------------------------------------------------------
step "[44/46] e2e: Edge prune (storage T2)"
S6_PRU_DB="$(mktemp -t synapse-sprint6-prune.XXXXXX.db)"
PRU_OUT=$(SYNAPSE_DB_PATH="$S6_PRU_DB" node --experimental-strip-types \
  "$S6_RUNNER/sprint6-edge-prune.mjs")
echo "  ${PRU_OUT}"
S6_PRU_PRUNED=$(printf '%s' "$PRU_OUT" | sed -n 's/.*pruned=\([0-9][0-9]*\).*/\1/p')
S6_PRU_REMAIN=$(printf '%s' "$PRU_OUT" | sed -n 's/.*remaining=\([0-9][0-9]*\).*/\1/p')
S6_PRU_IDEM=$(printf '%s' "$PRU_OUT" | sed -nE 's/.*idempotent=(true|false).*/\1/p')
if [ "${S6_PRU_PRUNED:-0}" -lt 2 ]; then
  fail "[44/46] pruned < 2 (weights 0.04, 0.01 미삭제): ${PRU_OUT}"
fi
if [ "${S6_PRU_REMAIN:-0}" -ne 3 ]; then
  fail "[44/46] remaining != 3: ${PRU_OUT}"
fi
if [ "${S6_PRU_IDEM}" != "true" ]; then
  fail "[44/46] idempotent=false: ${PRU_OUT}"
fi
rm -f "$S6_PRU_DB"

# ---------------------------------------------------------------------------
step "[45/46] e2e: SQL secondary sort audit (carry-over 6 흡수, storage T1.5)"
S6_SQL_DB="$(mktemp -t synapse-sprint6-sql.XXXXXX.db)"
SQL_OUT=$(SYNAPSE_DB_PATH="$S6_SQL_DB" node --experimental-strip-types \
  "$S6_RUNNER/sprint6-sql-audit.mjs")
echo "  ${SQL_OUT}"
S6_SQL_CONS=$(printf '%s' "$SQL_OUT" | sed -n 's/.*consecutive=\([0-9][0-9]*\).*/\1/p')
S6_SQL_CHOSEN=$(printf '%s' "$SQL_OUT" | sed -n 's/.*chosen_id=\([A-Za-z0-9-]*\).*/\1/p')
S6_SQL_TIED=$(printf '%s' "$SQL_OUT" | sed -n 's/.*tied_count=\([0-9][0-9]*\).*/\1/p')
if [ "${S6_SQL_CONS:-0}" -lt 5 ]; then
  fail "[45/46] consecutive < 5 (결정성 미보장): ${SQL_OUT}"
fi
if [ "${S6_SQL_CHOSEN}" != "r-aaa" ]; then
  fail "[45/46] expected chosen_id=r-aaa (id ASC tie-break), got '${S6_SQL_CHOSEN}'"
fi
if [ "${S6_SQL_TIED:-0}" -ne 3 ]; then
  fail "[45/46] expected tied_count=3, got ${S6_SQL_TIED}"
fi
rm -f "$S6_SQL_DB"

# ---------------------------------------------------------------------------
step "[46/46] carry-over 2/5 + lint 3 종 (Sprint 6 dev doc) + 임계 보강"

# carry-over 2 — mobile package.json workspace deps 5 명시 grep.
S6_MOBILE_PKG="$ROOT/apps/mobile/package.json"
if [ ! -f "$S6_MOBILE_PKG" ]; then
  fail "[46/46] mobile package.json 누락: $S6_MOBILE_PKG"
fi
S6_DEPS_COUNT=0
for dep in protocol storage engine conversation orchestrator; do
  if grep -q "\"@synapse/${dep}\":" "$S6_MOBILE_PKG"; then
    S6_DEPS_COUNT=$((S6_DEPS_COUNT + 1))
  else
    fail "[46/46] carry-over 2: mobile package.json 에 @synapse/${dep} 누락"
  fi
done
echo "  carry-over 2 mobile workspace deps: ${S6_DEPS_COUNT}/5 PASS"

# carry-over 2 (확장) — mobile tsc 'Cannot find module' 0 검증.
# tsc --noEmit 의 종료 코드가 아닌 'Cannot find module' grep — LSP 노이즈 정책 (carry-over 18).
# tsc 가 다른 implicit any 등으로 실패하더라도 'Cannot find module' 만 0 검증.
echo "  mobile tsc 'Cannot find module' 검증 (carry-over 2 확장):"
S6_TSC_LOG="$(mktemp -t synapse-sprint6-tsc.XXXXXX.log)"
trap 'rm -f "$S6_TSC_LOG" "$S6_DIS_DB" "$S6_RET_DB" "$S6_FOR_DB" "$S6_PRU_DB" "$S6_SQL_DB"' EXIT
# tsc 실패 허용 (LSP 노이즈 정책) — 출력만 캡처. set -e 우회 위해 || true.
( cd "$ROOT" && pnpm --filter @synapse/mobile exec tsc --noEmit ) > "$S6_TSC_LOG" 2>&1 || true
S6_CANT_FIND=$(grep -c "Cannot find module '@synapse/" "$S6_TSC_LOG" || true)
if [ "${S6_CANT_FIND:-0}" -gt 0 ]; then
  echo "[46/46] mobile tsc 'Cannot find module @synapse/' ${S6_CANT_FIND} 건 발견:" >&2
  grep "Cannot find module '@synapse/" "$S6_TSC_LOG" | head -10 >&2
  fail "[46/46] carry-over 2 위반 — workspace deps resolution 실패."
fi
echo "    'Cannot find module @synapse/*' 0 건 PASS"

# carry-over 5 — frozen-flag-audit 정규식 alternation grep (FROZEN|SUPERSEDED|...)
# T8 (PM, Sprint 13 7419216 이후 team-leader 폐기) 가 본 sprint 안에 흡수. lint 스크립트 자체에
# alternation 등장 검증 + Sprint 6 dev doc 에 적용 시 PASS.
S6_LINT_SH="$ROOT/scripts/lint/frozen-flag-audit.sh"
if [ ! -f "$S6_LINT_SH" ]; then
  fail "[46/46] frozen-flag-audit.sh 누락: $S6_LINT_SH"
fi
# alternation 형태 (FROZEN|SUPERSEDED|...) 그룹 등장 검증.
# 정확한 형태는 T8 결정 — 본 receipt 는 alternation operator '|' 가 FROZEN 옆에 붙어있는지 확인.
# 검증 패턴: '\(FROZEN|' 또는 'FROZEN\\|' 또는 group capture (FROZEN|SUPERSEDED) 형태.
if ! grep -qE '\(FROZEN\\?\|' "$S6_LINT_SH"; then
  echo "[46/46] carry-over 5 (D-S6-lint-frozen-flag-audit-regex-alternation):" >&2
  echo "    frozen-flag-audit.sh 에 정규식 alternation '(FROZEN|...)' 패턴 미발견." >&2
  echo "    T8 (PM, team-leader 폐기 후) 워커가 흡수해야 할 carry-over. 현재 lint 는 FROZEN 단일 패턴." >&2
  fail "[46/46] frozen-flag-audit.sh 정규식 alternation 미적용."
fi
echo "  carry-over 5 lint 정규식 alternation grep PASS"

# lint 3 종 Sprint 6 dev doc.
S6_DEVDOC="$ROOT/docs/sprints/sprint-6-failure-hygiene.md"
if [ ! -f "$S6_DEVDOC" ]; then
  fail "[46/46] Sprint 6 dev doc 누락: $S6_DEVDOC"
fi
if ! bash "$ROOT/scripts/lint/mockup-scope-parity.sh" "$S6_DEVDOC"; then
  fail "[46/46] mockup-scope-parity Sprint 6 실패."
fi
if ! bash "$ROOT/scripts/lint/frozen-flag-audit.sh" "$S6_DEVDOC"; then
  fail "[46/46] frozen-flag-audit Sprint 6 실패 — §11 Decisions Made FROZEN prefix 미부착."
fi
if ! node --experimental-strip-types "$ROOT/scripts/lint/directive-tag-audit.ts"; then
  fail "[46/46] directive-tag-audit 실패."
fi
echo "  lint 3 종 (mockup-scope-parity / frozen-flag-audit / directive-tag-audit) PASS"

# Sprint 6 신규 임계 보강 (D-S6-receipt-threshold-recovery):
#   dismiss_decay ≥ 1, retracted_count ≥ 1, pruned_edges ≥ 0
# 위 41/42/44 단계의 출력값 재검증.
echo "  Sprint 6 신규 임계: dismiss_decay=${S6_DIS_DECAYED} ≥ 1, retracted_count=${S6_RET_RETRACTED} ≥ 1, pruned_edges=${S6_PRU_PRUNED} ≥ 0"
if [ "${S6_DIS_DECAYED:-0}" -lt 1 ]; then
  fail "[46/46] D-S6-receipt-threshold-recovery 위반 — dismiss_decay < 1."
fi
if [ "${S6_RET_RETRACTED:-0}" -lt 1 ]; then
  fail "[46/46] D-S6-receipt-threshold-recovery 위반 — retracted_count < 1."
fi
if [ "${S6_PRU_PRUNED:-0}" -lt 0 ]; then
  fail "[46/46] D-S6-receipt-threshold-recovery 위반 — pruned_edges < 0."
fi
echo "  D-S6-receipt-threshold-recovery PASS"

# ---------------------------------------------------------------------------
echo ""
echo "✅ Sprint 6 receipt PASSED"
