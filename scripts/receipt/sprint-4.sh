#!/usr/bin/env bash
# Sprint 4 Receipt — Recall L1~L3 + Orchestrator (silence default)
#   Sprint 3 의 22 단계 wrap + Sprint 4 의 10 단계
#   (0004 멱등성 / DecisionAct 4 원 분기 e2e / Recall 종단 / Silence cooldown /
#    i18n ok ≥ 12 / mockup-scope-parity Sprint 4 / frozen-flag-audit Sprint 4 /
#    directive-tag-audit / 임계 강화 / DecisionAct enum drift grep).
#
# 단계
#   [Sprint 4] 1: Sprint 3 22 단계 wrap (sprint-3.sh; SKIP_OLLAMA / SKIP_SPRINT1_E2E 호환)
#   [23/32] 0004 마이그 멱등성 — empty DB 두 번 → exit 0, recall_log 존재
#   [24/32] DecisionAct 4 원 분기 e2e — fixture 4 종 (silence/ghost/suggestion/strong)
#   [25/32] Recall 종단 — turn2 메시지 → engine.recallCandidates → decide → recall_log 적재
#   [26/32] Silence cooldown — 60s 내 동일 candidate 재등장 → suppressed_reason='cooldown'
#   [27/32] i18n 카피 — verify-copy.mjs ok ≥ 12
#   [28/32] mockup-scope-parity — Sprint 4 dev doc PASS
#   [29/32] frozen-flag-audit — Sprint 4 dev doc PASS
#   [30/32] directive-tag-audit — `.claude/commands/*.md` PASS
#   [31/32] 임계 강화 검증 (D-S3-receipt-threshold-recovery 그대로):
#             - Sprint 1 e2e: chunks ≥ 2 length ≥ 5 ms ≤ 5000
#             - Sprint 3 e2e: concepts ≥ 2 co_occur ≥ 1 nearest ≥ 1
#             - Sprint 4 신규 e2e: decisions ≥ 4 + recall_candidates ≥ 1 + cooldown_silence = 1
#             (24/25/26 실제 출력값 + Ollama UP 시 stream/extract/graph/nearest 재호출)
#   [32/32] DecisionAct enum drift grep —
#             memory `decision_orchestrator_enum.md` ↔
#             `packages/protocol/src/recall.ts` ↔
#             `packages/orchestrator/src/types.ts`
#             4 원 (silence/ghost/suggestion/strong) 일치
#
# 환경변수 / dev-mode flag (우선순위: SKIP_OLLAMA > SKIP_SPRINT1_E2E):
#   SKIP_SPRINT1_E2E=1  — Sprint 1 receipt 단계만 skip (Sprint 3 wrap 안에서 그대로 전파).
#                         Sprint 4 의 신규 e2e 25 (Recall 종단) 는 그대로 실행 (Ollama 의존).
#   SKIP_OLLAMA=1       — Sprint 1 e2e + Sprint 3 e2e 3 종 + Sprint 4 의 25 (Recall 종단) skip.
#                         메타-검증 + stub-only e2e (24, 26) 는 그대로 실행.
#                         두 flag 동시 설정 시 의미 동일 (SKIP_OLLAMA 가 SKIP_SPRINT1_E2E 함의).
#                         *통과 ≠ /end 받음* — `/end` 는 Ollama UP 으로 전체 32 단계 PASS 받아야 마감.
#
# 임계 (D-S3-receipt-threshold-recovery 그대로 박음, 본 sprint receipt 의 핵심 강화):
#   - Sprint 1 e2e: chunks ≥ 2  length ≥ 5  ms ≤ 5000   (단계 31 이 stream 출력 재파싱)
#   - Sprint 3 e2e: concepts ≥ 2  co_occur ≥ 1  nearest ≥ 1
#   - Sprint 4 e2e: decisions ≥ 4 (24)  recall_candidates ≥ 1 (25)  cooldown_silence = 1 (26)
#
# 모든 단계 통과 → exit 0, "✅ Sprint 4 receipt PASSED".

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

step() { echo ""; echo "▶ $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

# SKIP_OLLAMA=1 은 SKIP_SPRINT1_E2E=1 을 함의.
if [ "${SKIP_OLLAMA:-0}" = "1" ]; then
  export SKIP_SPRINT1_E2E=1
  echo "  ⚠ SKIP_OLLAMA=1 — Sprint 1 e2e + Sprint 3 e2e 16/17/18 + Sprint 4 e2e 25 건너뜀."
fi

# ---------------------------------------------------------------------------
step "[Sprint 4] 1: Sprint 3 receipt 22 단계 wrap"
if ! bash "$ROOT/scripts/receipt/sprint-3.sh"; then
  fail "[Sprint 4] Sprint 3 receipt 실패. 위 로그 확인."
fi

# Sprint 4 신규 단위 테스트 통합 검증 — `pnpm -r test` 가 신규 __tests__/*.test.ts
# 를 모두 잡는지 dev mode 에서도 보장. SKIP_OLLAMA=1 시 sprint-3.sh pre-check 가 이미
# pnpm -r test 1 회 수행 — 본 단계는 *신규 파일 존재* 만 확인하여 비용 0 으로 회귀 차단.
step "[Sprint 4 pre-check] 신규 단위 테스트 파일 존재"
S4_NEW_TEST_FILES=(
  "$ROOT/packages/orchestrator/__tests__/decide.test.ts"
  "$ROOT/packages/orchestrator/__tests__/silence.test.ts"
  "$ROOT/packages/engine/__tests__/recall.test.ts"
  "$ROOT/packages/storage/__tests__/recall.test.ts"
  "$ROOT/packages/conversation/__tests__/loop-recall.test.ts"
)
S4_MISSING=()
for f in "${S4_NEW_TEST_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    S4_MISSING+=("$f")
  fi
done
if [ ${#S4_MISSING[@]} -gt 0 ]; then
  for f in "${S4_MISSING[@]}"; do
    echo "  누락: $f" >&2
  done
  fail "[Sprint 4 pre-check] 신규 단위 테스트 파일 누락 (위 ${#S4_MISSING[@]} 건)."
fi
echo "  신규 테스트 파일 ${#S4_NEW_TEST_FILES[@]} 건 발견."

# ---------------------------------------------------------------------------
step "[23/32] 0004 마이그 멱등성 — empty DB 두 번"
S4_MIG_DB="$(mktemp -t synapse-sprint4-mig.XXXXXX.db)"
trap 'rm -f "$S4_MIG_DB"' EXIT
S4_MIG_OUT=$(SYNAPSE_DB_PATH="$S4_MIG_DB" node --experimental-strip-types \
  "$ROOT/packages/storage/.receipt-runner/migrate-twice.mjs")
echo "  ${S4_MIG_OUT}"
# 0003 의 출력 검증을 그대로 재사용 — recall_log 추가 검증은 sqlite query 로.
RECALL_LOG_EXISTS=$(sqlite3 "$S4_MIG_DB" \
  "SELECT name FROM sqlite_master WHERE type='table' AND name='recall_log';" 2>/dev/null || true)
if [ "$RECALL_LOG_EXISTS" != "recall_log" ]; then
  fail "[23/32] recall_log 테이블 누락 — 0004_recall_log.sql 마이그 실패. (sqlite3 결과: '${RECALL_LOG_EXISTS}')"
fi
RECALL_LOG_IDX=$(sqlite3 "$S4_MIG_DB" \
  "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_recall_log_decided_at';" 2>/dev/null || true)
if [ "$RECALL_LOG_IDX" != "idx_recall_log_decided_at" ]; then
  fail "[23/32] idx_recall_log_decided_at 인덱스 누락. (sqlite3 결과: '${RECALL_LOG_IDX}')"
fi
echo "  recall_log 테이블 + idx 존재 확인."

# ---------------------------------------------------------------------------
S4_RUNNER="$ROOT/scripts/receipt/.receipt-runner"

step "[24/32] e2e: DecisionAct 4 원 분기 fixture (stub-only)"
DECIDE_OUT=$(node --experimental-strip-types "$S4_RUNNER/sprint4-decide.mjs")
echo "  ${DECIDE_OUT}"
DEC_TOTAL=$(printf '%s' "$DECIDE_OUT" | sed -n 's/.*decisions=\([0-9][0-9]*\).*/\1/p')
DEC_SIL=$(printf '%s' "$DECIDE_OUT" | sed -n 's/.*silence=\([0-9][0-9]*\).*/\1/p')
DEC_GH=$(printf '%s' "$DECIDE_OUT" | sed -n 's/.*ghost=\([0-9][0-9]*\).*/\1/p')
DEC_SU=$(printf '%s' "$DECIDE_OUT" | sed -n 's/.*suggestion=\([0-9][0-9]*\).*/\1/p')
DEC_ST=$(printf '%s' "$DECIDE_OUT" | sed -n 's/.*strong=\([0-9][0-9]*\).*/\1/p')
if [ "${DEC_TOTAL:-0}" -lt 4 ]; then
  fail "[24/32] decisions < 4: ${DECIDE_OUT}"
fi
if [ "${DEC_SIL:-0}" -lt 1 ] || [ "${DEC_GH:-0}" -lt 1 ] || [ "${DEC_SU:-0}" -lt 1 ] || [ "${DEC_ST:-0}" -lt 1 ]; then
  fail "[24/32] 4 원 분기 미충족 (silence=${DEC_SIL} ghost=${DEC_GH} suggestion=${DEC_SU} strong=${DEC_ST})"
fi

# ---------------------------------------------------------------------------
# 25 — Recall 종단. Ollama 의존.
S4_RECALL_DB=""
S4_RECALL_OUT=""
S4_RECALL_CANDIDATES=0
if [ "${SKIP_OLLAMA:-0}" = "1" ]; then
  step "[25/32] e2e: Recall 종단 — SKIP_OLLAMA=1 (skip)"
else
  if ! curl -sf http://localhost:11434/api/tags > /dev/null; then
    fail "Ollama 미가동. 'brew services start ollama' 후 'ollama pull gemma3:4b' 를 먼저 실행. (skip 하려면 SKIP_OLLAMA=1)"
  fi
  step "[25/32] e2e: Recall 종단 — engine.recallCandidates → decide → recall_log"
  S4_RECALL_DB="$(mktemp -t synapse-sprint4-recall.XXXXXX.db)"
  trap 'rm -f "$S4_MIG_DB" "$S4_RECALL_DB"' EXIT
  S4_RECALL_OUT=$(SYNAPSE_DB_PATH="$S4_RECALL_DB" node --experimental-strip-types \
    "$S4_RUNNER/sprint4-recall.mjs")
  echo "  ${S4_RECALL_OUT}"
  S4_RECALL_CANDIDATES=$(printf '%s' "$S4_RECALL_OUT" | sed -n 's/.*recall_candidates=\([0-9][0-9]*\).*/\1/p')
  S4_RECALL_LOG_ROWS=$(printf '%s' "$S4_RECALL_OUT" | sed -n 's/.*recall_log_rows=\([0-9][0-9]*\).*/\1/p')
  if [ "${S4_RECALL_CANDIDATES:-0}" -lt 1 ]; then
    fail "[25/32] recall_candidates < 1: ${S4_RECALL_OUT}"
  fi
  if [ "${S4_RECALL_LOG_ROWS:-0}" -lt 1 ]; then
    fail "[25/32] recall_log_rows < 1: ${S4_RECALL_OUT}"
  fi
fi

# ---------------------------------------------------------------------------
step "[26/32] e2e: Silence cooldown (stub-only)"
S4_COOL_DB="$(mktemp -t synapse-sprint4-cool.XXXXXX.db)"
if [ -n "$S4_RECALL_DB" ]; then
  trap 'rm -f "$S4_MIG_DB" "$S4_RECALL_DB" "$S4_COOL_DB"' EXIT
else
  trap 'rm -f "$S4_MIG_DB" "$S4_COOL_DB"' EXIT
fi
COOL_OUT=$(SYNAPSE_DB_PATH="$S4_COOL_DB" node --experimental-strip-types \
  "$S4_RUNNER/sprint4-cooldown.mjs")
echo "  ${COOL_OUT}"
COOL_SIL=$(printf '%s' "$COOL_OUT" | sed -n 's/.*cooldown_silence=\([0-9][0-9]*\).*/\1/p')
COOL_REASON=$(printf '%s' "$COOL_OUT" | sed -n 's/.*suppressed_reason=\([a-zA-Z_-]*\).*/\1/p')
if [ "${COOL_SIL:-0}" -ne 1 ]; then
  fail "[26/32] cooldown_silence != 1: ${COOL_OUT}"
fi
if [ "${COOL_REASON}" != "cooldown" ]; then
  fail "[26/32] suppressed_reason != 'cooldown': ${COOL_OUT}"
fi

# ---------------------------------------------------------------------------
step "[27/32] i18n 카피 — verify-copy.mjs ok ≥ 12"
S4_COPY_OUT=$(node --experimental-strip-types \
  "$ROOT/packages/design-system/.receipt-runner/verify-copy.mjs")
echo "  ${S4_COPY_OUT}"
S4_COPY_OK=$(printf '%s' "$S4_COPY_OUT" | sed -n 's/.*ok=\([0-9][0-9]*\).*/\1/p')
if [ "${S4_COPY_OK:-0}" -lt 12 ]; then
  fail "[27/32] verify-copy.mjs ok < 12 (실제 ${S4_COPY_OK:-0}). designer T6 의 recall.{ghost,suggestion,strong,inspector} 추기 누락 가능."
fi

# ---------------------------------------------------------------------------
step "[28/32] mockup-scope-parity — Sprint 4 dev doc"
if ! bash "$ROOT/scripts/lint/mockup-scope-parity.sh" \
  "$ROOT/docs/sprints/sprint-4-recall-l1-l3.md"; then
  fail "[28/32] mockup-scope-parity 실패 — Sprint 4 §3 In 의 ghost-hint/suggestion/strong-recall/inspector 별칭이 Sprint 2 §7.1 표와 매칭 필요."
fi
echo "  PASS"

# ---------------------------------------------------------------------------
step "[29/32] frozen-flag-audit — Sprint 4 dev doc"
if ! bash "$ROOT/scripts/lint/frozen-flag-audit.sh" \
  "$ROOT/docs/sprints/sprint-4-recall-l1-l3.md"; then
  fail "[29/32] frozen-flag-audit 실패 — Sprint 4 §11 Decisions Made FROZEN prefix 미부착."
fi
echo "  PASS"

# ---------------------------------------------------------------------------
step "[30/32] directive-tag-audit — .claude/commands/*.md"
if ! node --experimental-strip-types "$ROOT/scripts/lint/directive-tag-audit.ts"; then
  fail "[30/32] directive-tag-audit 실패."
fi
echo "  PASS"

# ---------------------------------------------------------------------------
step "[31/32] 임계 강화 검증 (D-S3-receipt-threshold-recovery 그대로)"
# Sprint 4 신규 e2e 임계 — 위 24/25/26 출력값 그대로 재검증.
if [ "${DEC_TOTAL:-0}" -lt 4 ]; then
  fail "[31/32] decisions < 4 (실제 ${DEC_TOTAL})"
fi
if [ "${COOL_SIL:-0}" -ne 1 ]; then
  fail "[31/32] cooldown_silence != 1 (실제 ${COOL_SIL})"
fi
echo "  Sprint 4 신규 임계: decisions=${DEC_TOTAL} ≥ 4, cooldown_silence=${COOL_SIL} = 1 PASS"

if [ "${SKIP_OLLAMA:-0}" = "1" ]; then
  echo "  Sprint 1/3 e2e 임계: SKIP_OLLAMA=1 (skip — /end 마감은 Ollama UP 으로 받아야 함)"
  echo "  Sprint 4 e2e recall_candidates 임계: SKIP_OLLAMA=1 (skip)"
else
  if [ "${S4_RECALL_CANDIDATES:-0}" -lt 1 ]; then
    fail "[31/32] recall_candidates < 1 (실제 ${S4_RECALL_CANDIDATES})"
  fi
  echo "  Sprint 4 e2e: recall_candidates=${S4_RECALL_CANDIDATES} ≥ 1 PASS"

  # Sprint 1 e2e 임계 강화: chunks ≥ 2 length ≥ 5 ms ≤ 5000.
  # streamSend.mjs 를 임시 DB 로 1 회 재호출 → "chunks:length:ms" 파싱.
  CONV_RUNNER="$ROOT/packages/conversation/.receipt-runner"
  S4_STREAM_DB="$(mktemp -t synapse-sprint4-stream.XXXXXX.db)"
  STREAM_OUT=$(SYNAPSE_DB_PATH="$S4_STREAM_DB" node --experimental-strip-types \
    "$CONV_RUNNER/streamSend.mjs")
  rm -f "$S4_STREAM_DB"
  S_CHUNKS="${STREAM_OUT%%:*}"
  S_REST="${STREAM_OUT#*:}"
  S_LEN="${S_REST%%:*}"
  S_MS="${STREAM_OUT##*:}"
  echo "  Sprint 1 e2e (재실측): chunks=${S_CHUNKS} length=${S_LEN} ms=${S_MS}"
  if [ "${S_CHUNKS:-0}" -lt 2 ]; then
    fail "[31/32] Sprint 1 e2e chunks < 2 (실제 ${S_CHUNKS}). D-S3-receipt-threshold-recovery 임계 위반."
  fi
  if [ "${S_LEN:-0}" -lt 5 ]; then
    fail "[31/32] Sprint 1 e2e length < 5 (실제 ${S_LEN}). D-S3-receipt-threshold-recovery 임계 위반."
  fi
  if [ "${S_MS:-0}" -gt 5000 ]; then
    fail "[31/32] Sprint 1 e2e ms > 5000 (실제 ${S_MS}). D-S3-receipt-threshold-recovery 임계 위반."
  fi

  # Sprint 3 e2e 임계 강화: concepts ≥ 2 co_occur ≥ 1 nearest ≥ 1.
  # sprint3-graph.mjs 는 자체 임계 (concepts >= 2, co_occur >= 1) 적용 — 1 회 재호출 → 출력 파싱.
  S4_GRAPH_DB="$(mktemp -t synapse-sprint4-graph.XXXXXX.db)"
  GRAPH_OUT=$(SYNAPSE_DB_PATH="$S4_GRAPH_DB" node --experimental-strip-types \
    "$CONV_RUNNER/sprint3-graph.mjs")
  rm -f "$S4_GRAPH_DB"
  G_CONCEPTS=$(printf '%s' "$GRAPH_OUT" | sed -n 's/.*concepts=\([0-9][0-9]*\).*/\1/p')
  G_COOCCUR=$(printf '%s' "$GRAPH_OUT" | sed -n 's/.*co_occur=\([0-9][0-9]*\).*/\1/p')
  echo "  Sprint 3 e2e graph (재실측): concepts=${G_CONCEPTS} co_occur=${G_COOCCUR}"
  if [ "${G_CONCEPTS:-0}" -lt 2 ]; then
    fail "[31/32] Sprint 3 e2e concepts < 2 (실제 ${G_CONCEPTS}). 임계 위반."
  fi
  if [ "${G_COOCCUR:-0}" -lt 1 ]; then
    fail "[31/32] Sprint 3 e2e co_occur < 1 (실제 ${G_COOCCUR}). 임계 위반."
  fi

  # nearest ≥ 1 — sprint3-nearest.mjs 1 회 재호출.
  S4_NEAR_DB="$(mktemp -t synapse-sprint4-near.XXXXXX.db)"
  NEAR_OUT=$(SYNAPSE_DB_PATH="$S4_NEAR_DB" node --experimental-strip-types \
    "$CONV_RUNNER/sprint3-nearest.mjs")
  rm -f "$S4_NEAR_DB"
  N_ROWS=$(printf '%s' "$NEAR_OUT" | sed -n 's/.*rows=\([0-9][0-9]*\).*/\1/p')
  echo "  Sprint 3 e2e nearest (재실측): rows=${N_ROWS}"
  if [ "${N_ROWS:-0}" -lt 1 ]; then
    fail "[31/32] Sprint 3 e2e nearest rows < 1 (실제 ${N_ROWS}). 임계 위반."
  fi
fi

# ---------------------------------------------------------------------------
step "[32/32] DecisionAct enum drift grep"
# 4 원 = silence/ghost/suggestion/strong.
# (1) memory `decision_orchestrator_enum.md` 본문에 4 원 모두 등장.
MEMORY_FILE="$HOME/.claude/projects/-Users-kimsemin-Desktop-2026-Synapse/memory/decision_orchestrator_enum.md"
if [ ! -f "$MEMORY_FILE" ]; then
  fail "[32/32] memory file 누락: $MEMORY_FILE"
fi
for tok in silence ghost suggestion strong; do
  if ! grep -q "${tok}" "$MEMORY_FILE"; then
    fail "[32/32] memory file 에 토큰 '${tok}' 누락: $MEMORY_FILE"
  fi
done
echo "  memory 4 원 모두 존재."

# (2) packages/protocol/src/recall.ts 의 DecisionAct 정의 본문에 4 원 모두 등장.
PROTOCOL_FILE="$ROOT/packages/protocol/src/recall.ts"
if [ ! -f "$PROTOCOL_FILE" ]; then
  fail "[32/32] protocol file 누락: $PROTOCOL_FILE"
fi
PROTO_LINE=$(grep -n "DecisionAct" "$PROTOCOL_FILE" | grep "=" | head -1 || true)
if [ -z "$PROTO_LINE" ]; then
  fail "[32/32] protocol 의 DecisionAct 타입 정의 라인 미검출: $PROTOCOL_FILE"
fi
for tok in silence ghost suggestion strong; do
  if ! printf '%s' "$PROTO_LINE" | grep -q "'${tok}'"; then
    fail "[32/32] protocol DecisionAct 정의에 '${tok}' 누락: $PROTO_LINE"
  fi
done
echo "  protocol DecisionAct 4 원 모두 존재."

# (3) packages/orchestrator/src/types.ts 의 DecisionAct 가 정의되거나 protocol 에서 re-export 됨.
#     re-export 패턴 (`export type { DecisionAct } from '@synapse/protocol';`) 은 자동 일치 — 단일 출처.
#     로컬 정의 패턴 (`export type DecisionAct = '...' | ...`) 은 4 원 인라인 검증.
ORCH_TYPES="$ROOT/packages/orchestrator/src/types.ts"
if [ ! -f "$ORCH_TYPES" ]; then
  fail "[32/32] orchestrator types.ts 누락: $ORCH_TYPES"
fi
ORCH_REEXPORT=$(grep -E "^export type \{[^}]*DecisionAct[^}]*\} from '@synapse/protocol'" "$ORCH_TYPES" | head -1 || true)
if [ -n "$ORCH_REEXPORT" ]; then
  echo "  orchestrator DecisionAct = protocol re-export (자동 단일 출처). PASS"
else
  ORCH_LINE=$(grep -E "^export type DecisionAct\s*=" "$ORCH_TYPES" | head -1 || true)
  if [ -z "$ORCH_LINE" ]; then
    fail "[32/32] orchestrator types.ts 에 DecisionAct 정의/재수출 라인 미검출: $ORCH_TYPES"
  fi
  for tok in silence ghost suggestion strong; do
    if ! printf '%s' "$ORCH_LINE" | grep -q "'${tok}'"; then
      fail "[32/32] orchestrator DecisionAct 로컬 정의에 '${tok}' 누락: $ORCH_LINE"
    fi
  done
  echo "  orchestrator DecisionAct 로컬 정의 4 원 모두 존재."
fi

# ---------------------------------------------------------------------------
echo ""
echo "✅ Sprint 4 receipt PASSED"
