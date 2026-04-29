#!/usr/bin/env bash
# Sprint 1 Receipt — Onboarding + FirstChat + Streaming + i18n + latency_ms
# 종단 흐름: 안녕 → Gemma stream → SQLite + COPY 1:1 매칭.
#
# 단계 (Sprint 0 5 단계 → Sprint 1 8 단계 확장)
#   [1/8] pnpm install
#   [2/8] pnpm -r test  (Sprint 0 22 + 신규 ~38)
#   [3/8] mobile bundle export (Expo Web)
#   [4/8] e2e: 안녕 → Gemma single-shot   (Sprint 0 회귀)
#   [5/8] e2e: 안녕 → Gemma stream         (sendStream 청크 ≥ 1)
#   [6/8] verify: latency_ms (last assistant.latency_ms > 0)
#   [7/8] verify: COPY i18n  (design-system.copy.ko ↔ content.jsx COPY.ko)
#   [8/8] verify: SQLite rows (user≥1, assistant≥1)
#
# 실패 시 어느 단계인지 echo 로 보이고 non-zero exit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

step() { echo ""; echo "▶ $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
step "[1/8] pnpm install"
pnpm install --frozen-lockfile=false

# ---------------------------------------------------------------------------
step "[2/8] pnpm -r test"
pnpm -r test

# ---------------------------------------------------------------------------
step "[3/8] mobile bundle export"
if ! pnpm --filter @synapse/mobile run build; then
  fail "[3/8] mobile bundle build 실패. apps/mobile 의 build 스크립트와 expo CLI 설치를 확인."
fi

# ---------------------------------------------------------------------------
# Ollama 헬스체크 (step 4/5/6 공통). 미가동시 즉시 친절한 에러.
if ! curl -sf http://localhost:11434/api/tags > /dev/null; then
  fail "Ollama 미가동. 'brew services start ollama' 후 'ollama pull gemma3:4b' 를 먼저 실행."
fi

# 진입점은 packages/conversation/.receipt-runner/ 의 *영구* mjs 파일들.
# (Sprint 0 은 heredoc 으로 임시 생성했지만, Sprint 1 은 commit 된 파일 — trap 으로 지우지 않는다.)
RUN_DIR="$ROOT/packages/conversation/.receipt-runner"
DB_PATH="$(mktemp -t synapse-sprint1.XXXXXX.db)"
SINGLESHOT_DB="$(mktemp -t synapse-sprint1-single.XXXXXX.db)"
trap 'rm -f "$DB_PATH" "$SINGLESHOT_DB"' EXIT

# Sprint 0 의 send.mjs 와 동등한 single-shot 진입점을 ad-hoc 으로 작성 (Sprint 0 회귀 보존).
# 영구 파일을 늘리지 않기 위해 임시 파일로 하되 RUN_DIR 안에 두어 alias resolve 가 정상 동작하도록.
TMP_SINGLE="$RUN_DIR/_singleshot-tmp.mjs"
cat > "$TMP_SINGLE" <<'NODE'
const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) { console.error('SYNAPSE_DB_PATH unset'); process.exit(2); }
const storage = await import('@synapse/storage');
const conversation = await import('@synapse/conversation');
const db = storage.openDb(dbPath);
storage.migrate(db);
const reply = await conversation.send('안녕', { db });
if (!reply || typeof reply !== 'string' || reply.length === 0) {
  console.error('empty reply from Gemma single-shot');
  process.exit(3);
}
process.stdout.write(`reply_len=${reply.length}`);
NODE

cleanup_tmp() { rm -f "$TMP_SINGLE"; rm -f "$DB_PATH" "$SINGLESHOT_DB"; }
trap cleanup_tmp EXIT

# ---------------------------------------------------------------------------
step "[4/8] e2e: 안녕 → Gemma single-shot (Sprint 0 회귀)"
SINGLE_OUT=$(SYNAPSE_DB_PATH="$SINGLESHOT_DB" node --experimental-strip-types "$TMP_SINGLE")
echo "  single-shot: ${SINGLE_OUT}"

# ---------------------------------------------------------------------------
step "[5/8] e2e: 안녕 → Gemma stream (sendStream)"
STREAM_OUT=$(SYNAPSE_DB_PATH="$DB_PATH" node --experimental-strip-types "$RUN_DIR/streamSend.mjs")
# streamSend.mjs 출력 형식: "<chunks>:<length>:<ms>"
CHUNKS="${STREAM_OUT%%:*}"
REST="${STREAM_OUT#*:}"
LENGTH="${REST%%:*}"
STREAM_MS="${STREAM_OUT##*:}"
echo "  stream: chunks=${CHUNKS} length=${LENGTH} ms=${STREAM_MS}"

if [ "${CHUNKS:-0}" -lt 1 ]; then
  fail "[5/8] 스트림 청크 수 < 1: chunks=${CHUNKS}"
fi
if [ "${LENGTH:-0}" -lt 1 ]; then
  fail "[5/8] 스트림 누적 길이 < 1: length=${LENGTH}"
fi

# ---------------------------------------------------------------------------
step "[6/8] verify: latency_ms 적재"
LAT_OUT=$(SYNAPSE_DB_PATH="$DB_PATH" node --experimental-strip-types "$RUN_DIR/verify-stream.mjs")
echo "  ${LAT_OUT}"

# ---------------------------------------------------------------------------
step "[7/8] verify: COPY i18n (design-system.copy.ko ↔ content.jsx COPY.ko)"
# verify-copy.mjs 는 design-system 패키지 안에 둔다 — `@synapse/design-system` import 가
# conversation 패키지의 dep 이 아니므로, design-system 자기 자신의 진실원 매칭은
# 자기 패키지에서 검증 (상대 import `../index.ts`).
COPY_OUT=$(node --experimental-strip-types "$ROOT/packages/design-system/.receipt-runner/verify-copy.mjs")
echo "  ${COPY_OUT}"

# ---------------------------------------------------------------------------
step "[8/8] verify SQLite rows"
TMP_VERIFY="$RUN_DIR/_verify-rows-tmp.mjs"
cat > "$TMP_VERIFY" <<'NODE'
const storage = await import('@synapse/storage');
const db = storage.openDb(process.env.SYNAPSE_DB_PATH);
const rows = storage.listMessages(db);
const userRows = rows.filter((r) => r.role === 'user').length;
const assistantRows = rows.filter((r) => r.role === 'assistant').length;
process.stdout.write(`${userRows}:${assistantRows}`);
NODE
trap 'rm -f "$TMP_SINGLE" "$TMP_VERIFY" "$DB_PATH" "$SINGLESHOT_DB"' EXIT

COUNT=$(SYNAPSE_DB_PATH="$DB_PATH" node --experimental-strip-types "$TMP_VERIFY")
USER_COUNT="${COUNT%%:*}"
ASSISTANT_COUNT="${COUNT##*:}"
echo "  messages user=${USER_COUNT} assistant=${ASSISTANT_COUNT}"
if [ "$USER_COUNT" -lt 1 ] || [ "$ASSISTANT_COUNT" -lt 1 ]; then
  fail "[8/8] 기대 user>=1 assistant>=1, 실제 user=${USER_COUNT} assistant=${ASSISTANT_COUNT}"
fi

echo ""
echo "✅ Sprint 1 receipt PASSED"
