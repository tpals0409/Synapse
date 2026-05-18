#!/usr/bin/env bash
# Sprint 13 Receipt — External Data Arrival (Sprint 12 메타 본체 inheritance).
#   Sprint 9 의 65 단계 wrap + Sprint 13 신규 4 단계 (66~69) = 69 단계.
#   (sprint-10/11/12.sh 부재 — Sprint 10/11/12 모두 no-op close 였음.)
#
# 단계
#   [Sprint 13] 1: Sprint 9 65 단계 wrap (sprint-9.sh; SKIP_OLLAMA / SKIP_SPRINT1_E2E 호환)
#   [Sprint 13 pre-check] 신규 fixture 파일 4종 존재
#   [66/69] end-mark-live-measure — 메모리 feedback_end_mark_live_measure 정책
#             검증. Sprint 13 dev doc §10 Implementation Map / §12 Carry-over +
#             Retrospective 안에 `bash scripts/receipt/sprint-13.sh` 실측 흔적
#             ("exit 0" / "PASSED" / "69/69" 중 1+) 또는 PM 의 명시적 마감 마크
#             존재. 메타-검증 — 정책 자체 검증.
#             — `sprint13-end-mark-live-measure.mjs`
#   [67/69] receipt-infra-path-swap — 메모리 feedback_receipt_external_contract
#             정책 검증. .receipt-runner/sprint*-*.mjs 안 src/ 직진 import 0건
#             (root index 경로 또는 fs/path-only). 위반 1건 = exit 1.
#             — `sprint13-receipt-infra-path-swap.mjs`
#   [68/69] dev-infra-doc — `docs/dev-infra.md` 영속성 + 핵심 raw text 5종
#             (`serve -s` / `OLLAMA_ORIGINS` / `pnpm --filter mobile build` /
#             `chatStore.web.ts` / `Sprint 10` 등) 검증. 메모리
#             feedback_end_mark_live_measure 정합 — 사용자 시연 first 발견 결함
#             영구 보존 가드. — `sprint13-dev-infra-doc.mjs`
#   [69/69] web-demo-banner — T2 mobile 결과 consume.
#             apps/mobile/app/chat/index.tsx 안 `Platform.OS === 'web'` AND
#             `firstChat.demoHint` 동시 매칭. copy.ts 안 ko/en `demoHint` 양쪽.
#             non-web OS 분기로 mount 한 흔적 0건 (디자인 의도 위반 가드).
#             — `sprint13-web-demo-banner.mjs`
#
# 환경변수 / dev-mode flag (Sprint 9 그대로 전파 + Sprint 13 신규):
#   SKIP_SPRINT1_E2E=1  — Sprint 1 e2e skip.
#   SKIP_OLLAMA=1       — Sprint 1/3/4/5/6 e2e skip. 메타-검증 + stub-only e2e
#                         (Sprint 6 41~46 + Sprint 7 47~53 + Sprint 8 54~60 +
#                         Sprint 9 61~65 + Sprint 13 66~69) 는 그대로 실행.
#                         두 flag 동시 설정 시 의미 동일 (SKIP_OLLAMA 가
#                         SKIP_SPRINT1_E2E 함의).
#                         *통과 ≠ /end 받음* — `/end` 는 Ollama UP 으로 전체
#                         69 단계 PASS.
#   (Sprint 15 T1: LEGACY_WRAP_FAIL_TOLERATED 환경 우회 분기 영구 제거 —
#    O-S14-receipt-runner-stale-fixture-cleanup carry-over 해소 후 sprint-9.sh
#    가 단독 PASS 함을 가드. 본 wrap 은 LEGACY 분기 없이 sprint-9 fail 시 즉시
#    fail 한다.)
#
# 임계 (D-S13-receipt-threshold-recovery — Sprint 9 누적 + 신규 보강):
#   - Sprint 9 누적 그대로.
#   - Sprint 13 신규:
#       external_session_count = 0   (inheritance 모드, branch=A 미진입)
#       verify_copy_ok ≥ 24          (T1 designer 결과 — Sprint 7 ok=23 +1)
#       web_demo_banner_present = 1  (T2 mobile 결과)
#       pakda_term_count = 0         (메모리 feedback_no_pakda_term)
#       agent_view_workaround_pattern ≥ 0
#         (Sprint 12 결함 우회 불필요 — 본 sprint 13 진행 자체가 결함 해소 신호)
#       workers_with_constitution ≥ 7
#         (Sprint 13 정렬로 7 워커, .claude/agents/*.md)
#
# 모든 단계 통과 → exit 0, "✅ Sprint 13 receipt PASSED".

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
step "[Sprint 13] 1: Sprint 9 receipt 65 단계 wrap"
if ! bash "$ROOT/scripts/receipt/sprint-9.sh"; then
  fail "[Sprint 13] Sprint 9 receipt 실패. 위 로그 확인."
fi

S13_RUNNER="$ROOT/scripts/receipt/.receipt-runner"

# Sprint 13 신규 fixture 파일 존재 가드.
# Sprint 13 7 워커 정렬 정합 — workers_with_constitution ≥ 7 임계 검증.
step "[Sprint 13 pre-check] 7 워커 정의 + HOLD-DECIDE-RESUME 박힘"
S13_AGENTS=("conversation" "designer" "engine" "mobile" "orchestrator" "storage" "tester")
S13_AGENT_PASS=0
for w in "${S13_AGENTS[@]}"; do
  AGENT_FILE="$ROOT/.claude/agents/${w}.md"
  if [ ! -f "$AGENT_FILE" ]; then
    fail "[Sprint 13 pre-check] .claude/agents/${w}.md 미존재 — 7 워커 정렬 회귀."
  fi
  if ! grep -q "HOLD-DECIDE-RESUME" "$AGENT_FILE"; then
    fail "[Sprint 13 pre-check] .claude/agents/${w}.md 안 'HOLD-DECIDE-RESUME' 미박힘."
  fi
  S13_AGENT_PASS=$((S13_AGENT_PASS + 1))
done
echo "  workers_with_constitution=${S13_AGENT_PASS}/7"
if [ "${S13_AGENT_PASS}" -lt 7 ]; then
  fail "[Sprint 13 pre-check] workers_with_constitution=${S13_AGENT_PASS} < 7 — Sprint 13 정렬 회귀."
fi

step "[Sprint 13 pre-check] 신규 fixture 파일 존재"
S13_NEW_FIXTURES=(
  "$S13_RUNNER/sprint13-end-mark-live-measure.mjs"
  "$S13_RUNNER/sprint13-receipt-infra-path-swap.mjs"
  "$S13_RUNNER/sprint13-dev-infra-doc.mjs"
  "$S13_RUNNER/sprint13-web-demo-banner.mjs"
)
S13_MISSING=()
for f in "${S13_NEW_FIXTURES[@]}"; do
  if [ ! -f "$f" ]; then
    S13_MISSING+=("$f")
  fi
done
if [ ${#S13_MISSING[@]} -gt 0 ]; then
  for f in "${S13_MISSING[@]}"; do
    echo "  누락: $f" >&2
  done
  fail "[Sprint 13 pre-check] 신규 fixture 파일 누락 (위 ${#S13_MISSING[@]} 건)."
fi
echo "  신규 fixture ${#S13_NEW_FIXTURES[@]} 건 발견."

# ---------------------------------------------------------------------------
step "[66/69] end-mark-live-measure — Sprint 13 dev doc §10/§12 안에 receipt 실측 흔적 메타-검증"
S13_EML_OUT=$(node --experimental-strip-types "$S13_RUNNER/sprint13-end-mark-live-measure.mjs")
echo "  ${S13_EML_OUT}"
S13_EML_PASS=$(printf '%s' "$S13_EML_OUT" | sed -n 's/.*end_mark_live_measure_pass=\([0-9][0-9]*\).*/\1/p')
if [ "${S13_EML_PASS:-0}" -ne 1 ]; then
  fail "[66/69] end_mark_live_measure_pass != 1 — Sprint 13 dev doc 안에 sprint-13.sh 실측 흔적 미발견. PM 마감 마크 직전 실측 강제 (memory: feedback_end_mark_live_measure)."
fi

# ---------------------------------------------------------------------------
step "[67/69] receipt-infra-path-swap — fixture 모두 root index 경로 (src/ 직진 0건)"
S13_RIPS_OUT=$(node --experimental-strip-types "$S13_RUNNER/sprint13-receipt-infra-path-swap.mjs")
echo "  ${S13_RIPS_OUT}"
S13_RIPS_PASS=$(printf '%s' "$S13_RIPS_OUT" | sed -n 's/.*receipt_infra_path_swap_pass=\([0-9][0-9]*\).*/\1/p')
S13_RIPS_VIOLATIONS=$(printf '%s' "$S13_RIPS_OUT" | sed -n 's/.*src_direct_import_count=\([0-9][0-9]*\).*/\1/p')
if [ "${S13_RIPS_PASS:-0}" -ne 1 ]; then
  fail "[67/69] receipt_infra_path_swap_pass != 1 — fixture 가 packages/<pkg>/src/ 직진 import. root index 경로로 swap 의무 (memory: feedback_receipt_external_contract)."
fi
if [ "${S13_RIPS_VIOLATIONS:-99}" -ne 0 ]; then
  fail "[67/69] src_direct_import_count=${S13_RIPS_VIOLATIONS} ≠ 0."
fi

# ---------------------------------------------------------------------------
step "[68/69] dev-infra-doc — docs/dev-infra.md 영속성 + 핵심 raw text 5종"
S13_DID_OUT=$(node --experimental-strip-types "$S13_RUNNER/sprint13-dev-infra-doc.mjs")
echo "  ${S13_DID_OUT}"
S13_DID_PASS=$(printf '%s' "$S13_DID_OUT" | sed -n 's/.*dev_infra_doc_pass=\([0-9][0-9]*\).*/\1/p')
if [ "${S13_DID_PASS:-0}" -ne 1 ]; then
  fail "[68/69] dev_infra_doc_pass != 1 — docs/dev-infra.md 영속성 회귀."
fi

# ---------------------------------------------------------------------------
step "[69/69] web-demo-banner — T2 mobile chat empty state web 분기 demoHint mount 검증"
S13_WDB_OUT=$(node --experimental-strip-types "$S13_RUNNER/sprint13-web-demo-banner.mjs")
echo "  ${S13_WDB_OUT}"
S13_WDB_PASS=$(printf '%s' "$S13_WDB_OUT" | sed -n 's/.*web_demo_banner_present=\([0-9][0-9]*\).*/\1/p')
if [ "${S13_WDB_PASS:-0}" -ne 1 ]; then
  fail "[69/69] web_demo_banner_present != 1 — T2 mobile web 분기 demoHint mount 결함."
fi

# ---------------------------------------------------------------------------
echo ""
echo "✅ Sprint 13 receipt PASSED"
