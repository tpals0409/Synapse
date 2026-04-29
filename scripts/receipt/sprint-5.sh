#!/usr/bin/env bash
# Sprint 5 Receipt — Hyper-Recall (Bridge / Temporal / Domain Crossing).
#   Sprint 4 의 32 단계 wrap + Sprint 5 의 8 단계
#   (다중 hop traverse 멱등성 / e2e Bridge / e2e Temporal / e2e DomainCrossing /
#    임계 강화 회복 / DecisionAct enum drift 그대로 / mockup·frozen·directive 0 violations
#    / [선택] 통합 recall-hyper Ollama UP).
#
# 단계
#   [Sprint 5] 1: Sprint 4 32 단계 wrap (sprint-4.sh; SKIP_OLLAMA / SKIP_SPRINT1_E2E 호환)
#   [33/40] 다중 hop traverse 멱등성 — `traverse(db, id, 1)` ↔ `traverse(db, id, 2)`
#             결과 정합 (depth=2 가 depth=1 의 superset, cycle 0, max-depth 가드 throw)
#             — `sprint5-traverse-depth.mjs`.
#   [34/40] e2e Bridge (stub-only) — fixture (3 noun 그래프 A-B/B-C edges) → seedA →
#             bridge=C 발견 (depth=2 hop B 매개) — `sprint5-bridge.mjs`.
#   [35/40] e2e Temporal (stub-only) — recall_log 의 decided_at 24h 윈도우 안 같은 시기
#             conceptId 묶음 ≥ 1 부상 — `sprint5-temporal.mjs`.
#   [36/40] e2e DomainCrossing (stub-only) — 두 다른 kind ('co_occur' / 'semantic') edge
#             의 비대칭 score 발견 ≥ 1 — `sprint5-domain-crossing.mjs`.
#   [37/40] 임계 회복 (D-S5-receipt-threshold-recovery FROZEN):
#             chunks ≥ 5 length ≥ 10 + nearest ≥ 2 + recall_candidates ≥ 3
#             + bridge_candidates ≥ 1 + temporal_candidates ≥ 1.
#             Sprint 1 e2e (chunks/length) + Sprint 3 e2e (nearest) + Sprint 4 e2e
#             (recall_candidates) 의 *재실측* + Sprint 5 신규 fixture (bridge/temporal)
#             의 *방금 측정* 합산.
#   [38/40] DecisionAct enum drift 그대로 — 4 원 (silence/ghost/suggestion/strong) 동결
#             + re-export 자동 PASS (Sprint 4 의 32 단계가 그대로 검증, 본 단계는 Sprint 5
#             dev doc 의 4 원 등장 grep 으로 보조).
#   [39/40] mockup-scope-parity + frozen-flag-audit + directive-tag-audit Sprint 5 dev doc —
#             0 violations.
#   [40/40] (선택) 통합 e2e recall-hyper — Ollama UP + hyperTraverse + recentDecisions 주입
#             → engine.recallCandidates 가 bridge/temporal/domain_crossing source 합집합
#             제공 검증. SKIP_OLLAMA=1 시 skip.
#
# 환경변수 / dev-mode flag (Sprint 4 그대로 전파):
#   SKIP_SPRINT1_E2E=1  — Sprint 1 e2e skip (Sprint 4 wrap 안에서 그대로 전파).
#                         Sprint 5 의 통합 recall-hyper (40) 도 skip.
#   SKIP_OLLAMA=1       — Sprint 1 e2e + Sprint 3 e2e + Sprint 4 e2e (25) + Sprint 5 e2e (40) skip.
#                         메타-검증 + stub-only e2e (33, 34, 35, 36) 는 그대로 실행.
#                         두 flag 동시 설정 시 의미 동일 (SKIP_OLLAMA 가 SKIP_SPRINT1_E2E 함의).
#                         *통과 ≠ /end 받음* — `/end` 는 Ollama UP 으로 전체 40 단계 PASS.
#
# 임계 (D-S5-receipt-threshold-recovery FROZEN — carry-over 14 누적 회복):
#   - Sprint 1 e2e: chunks ≥ 5  length ≥ 10  ms ≤ 5000   (강화: chunks 2→5, length 5→10)
#   - Sprint 3 e2e: concepts ≥ 2  co_occur ≥ 1  nearest ≥ 2  (강화: nearest 1→2)
#   - Sprint 4 e2e: decisions ≥ 4 (24)  recall_candidates ≥ 3 (25, 강화: 1→3)
#                   cooldown_silence = 1 (26)
#   - Sprint 5 신규: bridge_candidates ≥ 1  temporal_candidates ≥ 1
#
# 모든 단계 통과 → exit 0, "✅ Sprint 5 receipt PASSED".

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

step() { echo ""; echo "▶ $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

# SKIP_OLLAMA=1 은 SKIP_SPRINT1_E2E=1 을 함의.
if [ "${SKIP_OLLAMA:-0}" = "1" ]; then
  export SKIP_SPRINT1_E2E=1
  echo "  ⚠ SKIP_OLLAMA=1 — Sprint 1/3 e2e + Sprint 4 e2e 25 + Sprint 5 e2e 40 건너뜀."
fi

# ---------------------------------------------------------------------------
step "[Sprint 5] 1: Sprint 4 receipt 32 단계 wrap"
if ! bash "$ROOT/scripts/receipt/sprint-4.sh"; then
  fail "[Sprint 5] Sprint 4 receipt 실패. 위 로그 확인."
fi

S5_RUNNER="$ROOT/scripts/receipt/.receipt-runner"

# Sprint 5 신규 fixture 파일 존재 가드.
step "[Sprint 5 pre-check] 신규 fixture 파일 존재"
S5_NEW_FIXTURES=(
  "$S5_RUNNER/sprint5-traverse-depth.mjs"
  "$S5_RUNNER/sprint5-bridge.mjs"
  "$S5_RUNNER/sprint5-temporal.mjs"
  "$S5_RUNNER/sprint5-domain-crossing.mjs"
)
S5_MISSING=()
for f in "${S5_NEW_FIXTURES[@]}"; do
  if [ ! -f "$f" ]; then
    S5_MISSING+=("$f")
  fi
done
if [ ${#S5_MISSING[@]} -gt 0 ]; then
  for f in "${S5_MISSING[@]}"; do
    echo "  누락: $f" >&2
  done
  fail "[Sprint 5 pre-check] 신규 fixture 파일 누락 (위 ${#S5_MISSING[@]} 건)."
fi
echo "  신규 fixture ${#S5_NEW_FIXTURES[@]} 건 발견."

# ---------------------------------------------------------------------------
step "[33/40] 다중 hop traverse 멱등성 (storage T2)"
S5_TRAV_DB="$(mktemp -t synapse-sprint5-traverse.XXXXXX.db)"
trap 'rm -f "$S5_TRAV_DB"' EXIT
TRAV_OUT=$(SYNAPSE_DB_PATH="$S5_TRAV_DB" node --experimental-strip-types \
  "$S5_RUNNER/sprint5-traverse-depth.mjs")
echo "  ${TRAV_OUT}"
S5_D1=$(printf '%s' "$TRAV_OUT" | sed -n 's/.*depth1=\([0-9][0-9]*\).*/\1/p')
S5_D2=$(printf '%s' "$TRAV_OUT" | sed -n 's/.*depth2=\([0-9][0-9]*\).*/\1/p')
S5_SUPERSET=$(printf '%s' "$TRAV_OUT" | sed -nE 's/.*superset=(true|false).*/\1/p')
S5_CYCLES=$(printf '%s' "$TRAV_OUT" | sed -n 's/.*cycles=\([0-9][0-9]*\).*/\1/p')
S5_MAXTHROW=$(printf '%s' "$TRAV_OUT" | sed -nE 's/.*maxdepth_throw=(true|false).*/\1/p')
if [ "${S5_D1:-0}" -lt 1 ] || [ "${S5_D2:-0}" -lt "${S5_D1:-1}" ]; then
  fail "[33/40] depth=2 < depth=1: ${TRAV_OUT}"
fi
if [ "${S5_SUPERSET}" != "true" ]; then
  fail "[33/40] superset=false: ${TRAV_OUT}"
fi
if [ "${S5_CYCLES:-1}" -ne 0 ]; then
  fail "[33/40] cycles != 0: ${TRAV_OUT}"
fi
if [ "${S5_MAXTHROW}" != "true" ]; then
  fail "[33/40] maxdepth_throw != true: ${TRAV_OUT}"
fi

# ---------------------------------------------------------------------------
step "[34/40] e2e: Bridge (stub-only)"
BRIDGE_OUT=$(node --experimental-strip-types "$S5_RUNNER/sprint5-bridge.mjs")
echo "  ${BRIDGE_OUT}"
S5_BRIDGE_COUNT=$(printf '%s' "$BRIDGE_OUT" | sed -n 's/.*bridge_count=\([0-9][0-9]*\).*/\1/p')
S5_BRIDGE_ID=$(printf '%s' "$BRIDGE_OUT" | sed -n 's/.*bridge_id=\([A-Za-z0-9_-]*\).*/\1/p')
S5_BRIDGE_VIA=$(printf '%s' "$BRIDGE_OUT" | sed -n 's/.*via=\([A-Za-z0-9_-]*\).*/\1/p')
if [ "${S5_BRIDGE_COUNT:-0}" -lt 1 ]; then
  fail "[34/40] bridge_count < 1: ${BRIDGE_OUT}"
fi
if [ "${S5_BRIDGE_ID}" != "C" ] || [ "${S5_BRIDGE_VIA}" != "B" ]; then
  fail "[34/40] expected bridge_id=C via=B, got id=${S5_BRIDGE_ID} via=${S5_BRIDGE_VIA}"
fi

# ---------------------------------------------------------------------------
step "[35/40] e2e: Temporal (stub-only)"
TEMP_OUT=$(node --experimental-strip-types "$S5_RUNNER/sprint5-temporal.mjs")
echo "  ${TEMP_OUT}"
S5_TEMP_COUNT=$(printf '%s' "$TEMP_OUT" | sed -n 's/.*temporal_count=\([0-9][0-9]*\).*/\1/p')
S5_TEMP_TOP=$(printf '%s' "$TEMP_OUT" | sed -n 's/.*top_id=\([A-Za-z0-9_-]*\).*/\1/p')
S5_TEMP_CO=$(printf '%s' "$TEMP_OUT" | sed -n 's/.*codecided=\([0-9][0-9]*\).*/\1/p')
if [ "${S5_TEMP_COUNT:-0}" -lt 1 ]; then
  fail "[35/40] temporal_count < 1: ${TEMP_OUT}"
fi
if [ "${S5_TEMP_TOP}" != "x" ]; then
  fail "[35/40] expected top_id=x (2-hit), got '${S5_TEMP_TOP}'"
fi
if [ "${S5_TEMP_CO:-0}" -lt 1 ]; then
  fail "[35/40] codecided < 1: ${TEMP_OUT}"
fi

# ---------------------------------------------------------------------------
step "[36/40] e2e: DomainCrossing (stub-only)"
DC_OUT=$(node --experimental-strip-types "$S5_RUNNER/sprint5-domain-crossing.mjs")
echo "  ${DC_OUT}"
S5_DC_COUNT=$(printf '%s' "$DC_OUT" | sed -n 's/.*domain_crossing_count=\([0-9][0-9]*\).*/\1/p')
S5_DC_TOP=$(printf '%s' "$DC_OUT" | sed -n 's/.*top_id=\([A-Za-z0-9_-]*\).*/\1/p')
S5_DC_FROM=$(printf '%s' "$DC_OUT" | sed -n 's/.*edgeFrom=\([a-z_]*\).*/\1/p')
S5_DC_TO=$(printf '%s' "$DC_OUT" | sed -n 's/.*edgeTo=\([a-z_]*\).*/\1/p')
if [ "${S5_DC_COUNT:-0}" -lt 1 ]; then
  fail "[36/40] domain_crossing_count < 1: ${DC_OUT}"
fi
if [ "${S5_DC_TOP}" != "X" ]; then
  fail "[36/40] expected top_id=X, got '${S5_DC_TOP}'"
fi
if [ "${S5_DC_FROM}" != "co_occur" ] || [ "${S5_DC_TO}" != "semantic" ]; then
  fail "[36/40] expected edgeFrom=co_occur edgeTo=semantic, got from=${S5_DC_FROM} to=${S5_DC_TO}"
fi

# ---------------------------------------------------------------------------
step "[37/40] 임계 회복 (D-S5-receipt-threshold-recovery FROZEN)"
# Sprint 5 신규 임계 — 위 33/34/35/36 출력값 그대로 재검증 + 누적.
if [ "${S5_BRIDGE_COUNT:-0}" -lt 1 ]; then
  fail "[37/40] bridge_candidates < 1 (실제 ${S5_BRIDGE_COUNT})"
fi
if [ "${S5_TEMP_COUNT:-0}" -lt 1 ]; then
  fail "[37/40] temporal_candidates < 1 (실제 ${S5_TEMP_COUNT})"
fi
echo "  Sprint 5 신규 임계: bridge=${S5_BRIDGE_COUNT} ≥ 1, temporal=${S5_TEMP_COUNT} ≥ 1 PASS"

if [ "${SKIP_OLLAMA:-0}" = "1" ]; then
  echo "  Sprint 1/3/4 e2e 누적 임계: SKIP_OLLAMA=1 (skip — /end 마감은 Ollama UP)"
else
  # Sprint 1 e2e 임계 회복: chunks ≥ 5 length ≥ 10 ms ≤ 5000 (강화: 2→5, 5→10).
  CONV_RUNNER="$ROOT/packages/conversation/.receipt-runner"
  S5_STREAM_DB="$(mktemp -t synapse-sprint5-stream.XXXXXX.db)"
  STREAM_OUT=$(SYNAPSE_DB_PATH="$S5_STREAM_DB" node --experimental-strip-types \
    "$CONV_RUNNER/streamSend.mjs")
  rm -f "$S5_STREAM_DB"
  S_CHUNKS="${STREAM_OUT%%:*}"
  S_REST="${STREAM_OUT#*:}"
  S_LEN="${S_REST%%:*}"
  S_MS="${STREAM_OUT##*:}"
  echo "  Sprint 1 e2e (재실측): chunks=${S_CHUNKS} length=${S_LEN} ms=${S_MS}"
  if [ "${S_CHUNKS:-0}" -lt 5 ]; then
    fail "[37/40] Sprint 1 e2e chunks < 5 (실제 ${S_CHUNKS}). D-S5-receipt-threshold-recovery 위반."
  fi
  if [ "${S_LEN:-0}" -lt 10 ]; then
    fail "[37/40] Sprint 1 e2e length < 10 (실제 ${S_LEN}). D-S5-receipt-threshold-recovery 위반."
  fi
  if [ "${S_MS:-0}" -gt 5000 ]; then
    fail "[37/40] Sprint 1 e2e ms > 5000 (실제 ${S_MS}). D-S5-receipt-threshold-recovery 위반."
  fi

  # Sprint 3 e2e 임계 회복: nearest ≥ 2 (강화: 1→2).
  S5_NEAR_DB="$(mktemp -t synapse-sprint5-near.XXXXXX.db)"
  NEAR_OUT=$(SYNAPSE_DB_PATH="$S5_NEAR_DB" node --experimental-strip-types \
    "$CONV_RUNNER/sprint3-nearest.mjs")
  rm -f "$S5_NEAR_DB"
  N_ROWS=$(printf '%s' "$NEAR_OUT" | sed -n 's/.*rows=\([0-9][0-9]*\).*/\1/p')
  echo "  Sprint 3 e2e nearest (재실측): rows=${N_ROWS}"
  if [ "${N_ROWS:-0}" -lt 2 ]; then
    fail "[37/40] Sprint 3 e2e nearest rows < 2 (실제 ${N_ROWS}). D-S5-receipt-threshold-recovery 위반."
  fi

  # Sprint 4 e2e 임계 회복: recall_candidates ≥ 3 (강화: 1→3).
  S5_RECALL_RUNNER="$ROOT/scripts/receipt/.receipt-runner"
  S5_RECALL_DB="$(mktemp -t synapse-sprint5-recall.XXXXXX.db)"
  S5_RECALL_OUT=$(SYNAPSE_DB_PATH="$S5_RECALL_DB" node --experimental-strip-types \
    "$S5_RECALL_RUNNER/sprint4-recall.mjs")
  rm -f "$S5_RECALL_DB"
  R_CAND=$(printf '%s' "$S5_RECALL_OUT" | sed -n 's/.*recall_candidates=\([0-9][0-9]*\).*/\1/p')
  echo "  Sprint 4 e2e recall (재실측): recall_candidates=${R_CAND}"
  if [ "${R_CAND:-0}" -lt 3 ]; then
    fail "[37/40] Sprint 4 e2e recall_candidates < 3 (실제 ${R_CAND}). D-S5-receipt-threshold-recovery 위반."
  fi
fi

# ---------------------------------------------------------------------------
step "[38/40] DecisionAct enum drift 그대로 (Sprint 4 32 단계가 자동 검증)"
# Sprint 4 의 32 단계 (DecisionAct enum drift grep) 가 sprint-4.sh wrap 으로 이미 통과.
# 본 단계는 *Sprint 5 dev doc* 에 4 원이 모두 등장하는지 보조 grep.
S5_DEVDOC="$ROOT/docs/sprints/sprint-5-hyper-recall.md"
if [ ! -f "$S5_DEVDOC" ]; then
  fail "[38/40] Sprint 5 dev doc 누락: $S5_DEVDOC"
fi
for tok in silence ghost suggestion strong; do
  if ! grep -q "${tok}" "$S5_DEVDOC"; then
    fail "[38/40] Sprint 5 dev doc 에 토큰 '${tok}' 누락 — 4 원 동결 회귀."
  fi
done
echo "  Sprint 5 dev doc 4 원 모두 등장 (Sprint 4 32 단계가 코드 자동 검증)."

# ---------------------------------------------------------------------------
step "[39/40] mockup-scope-parity + frozen-flag-audit + directive-tag-audit (Sprint 5)"
if ! bash "$ROOT/scripts/lint/mockup-scope-parity.sh" \
  "$ROOT/docs/sprints/sprint-5-hyper-recall.md"; then
  fail "[39/40] mockup-scope-parity Sprint 5 실패."
fi
if ! bash "$ROOT/scripts/lint/frozen-flag-audit.sh" \
  "$ROOT/docs/sprints/sprint-5-hyper-recall.md"; then
  fail "[39/40] frozen-flag-audit Sprint 5 실패 — §11 Decisions Made FROZEN prefix 미부착."
fi
if ! node --experimental-strip-types "$ROOT/scripts/lint/directive-tag-audit.ts"; then
  fail "[39/40] directive-tag-audit 실패."
fi
echo "  PASS"

# ---------------------------------------------------------------------------
# 통합 e2e — Ollama UP + hyperTraverse + recentDecisions 주입 → engine.recallCandidates
# 가 신규 source 합집합 제공. 본 fixture 는 T8 의 *선택* 스코프 (sprint5-recall-hyper.mjs)
# — 작성 후 활성화. 미작성 시 본 단계는 skip 메시지 + PASS (다음 sprint 회복).
S5_HYPER_FIXTURE="$S5_RUNNER/sprint5-recall-hyper.mjs"
if [ "${SKIP_OLLAMA:-0}" = "1" ]; then
  step "[40/40] 통합 e2e: recall-hyper — SKIP_OLLAMA=1 (skip)"
elif [ ! -f "$S5_HYPER_FIXTURE" ]; then
  step "[40/40] 통합 e2e: recall-hyper — fixture 미작성 (T8 선택 스코프, skip)"
  echo "  본 단계는 sprint5-recall-hyper.mjs 작성 후 활성화 — 현재 단계는 보조 fixture 로 충분."
else
  step "[40/40] 통합 e2e: recall-hyper — engine.recallCandidates + hyperTraverse + recentDecisions"
  if ! curl -sf http://localhost:11434/api/tags > /dev/null; then
    fail "Ollama 미가동. 'brew services start ollama' 후 'ollama pull gemma3:4b'. (skip 하려면 SKIP_OLLAMA=1)"
  fi
  S5_HYPER_DB="$(mktemp -t synapse-sprint5-hyper.XXXXXX.db)"
  HYPER_OUT=$(SYNAPSE_DB_PATH="$S5_HYPER_DB" node --experimental-strip-types \
    "$S5_HYPER_FIXTURE")
  rm -f "$S5_HYPER_DB"
  echo "  ${HYPER_OUT}"
  S5_HYPER_CAND=$(printf '%s' "$HYPER_OUT" | sed -n 's/.*candidates=\([0-9][0-9]*\).*/\1/p')
  S5_HYPER_TEMP=$(printf '%s' "$HYPER_OUT" | sed -n 's/.*temporal=\([0-9][0-9]*\).*/\1/p')
  if [ "${S5_HYPER_CAND:-0}" -lt 3 ]; then
    fail "[40/40] 통합 candidates < 3 (실제 ${S5_HYPER_CAND}). D-S5-receipt-threshold-recovery 위반."
  fi
  if [ "${S5_HYPER_TEMP:-0}" -lt 1 ]; then
    fail "[40/40] 통합 temporal < 1 (실제 ${S5_HYPER_TEMP}). 종단 합집합에 신규 source 미흡수."
  fi
  echo "  통합 임계: candidates=${S5_HYPER_CAND} ≥ 3, temporal=${S5_HYPER_TEMP} ≥ 1 PASS"
fi

# ---------------------------------------------------------------------------
echo ""
echo "✅ Sprint 5 receipt PASSED"
