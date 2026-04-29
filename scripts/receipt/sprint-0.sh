#!/usr/bin/env bash
# Sprint 0 Receipt — "안녕 → Gemma → SQLite" 종단 흐름 검증
#
# 단계
#   [1/5] pnpm install
#   [2/5] pnpm -r test
#   [3/5] mobile bundle export (Expo Hello 가 빌드되는지)
#   [4/5] e2e: conversation.send("안녕") → Gemma 응답
#   [5/5] verify: messages 테이블에 user/assistant row 2개
#
# 실패 시 어느 단계에서 죽었는지 echo 로 명확히 보이고 non-zero exit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

step() { echo ""; echo "▶ $*"; }
fail() { echo "❌ $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
step "[1/5] pnpm install"
pnpm install --frozen-lockfile=false

# ---------------------------------------------------------------------------
step "[2/5] pnpm -r test"
pnpm -r test

# ---------------------------------------------------------------------------
step "[3/5] mobile bundle export"
# Expo bundle 빌드는 시간이 걸리고 첫 receipt 에서는 환경에 따라 변동성이 큼.
# Sprint 0 receipt 헌법: bundle 'export' 가 0 으로 끝나면 OK.
# 실패 시 즉시 어느 단계인지 표시하고 종료.
if ! pnpm --filter @synapse/mobile run build; then
  fail "[3/5] mobile bundle build 실패. apps/mobile 의 build 스크립트와 expo CLI 설치를 확인."
fi

# ---------------------------------------------------------------------------
step "[4/5] e2e: 안녕 → Gemma → SQLite"

# Ollama 헬스체크 — 미가동시 즉시 친절한 에러
if ! curl -sf http://localhost:11434/api/tags > /dev/null; then
  fail "[4/5] Ollama 미가동. 'brew services start ollama' 후 'ollama pull gemma3:4b' 를 먼저 실행."
fi

DB_PATH="$(mktemp -t synapse-receipt.XXXXXX.db)"
# pnpm 워크스페이스 별칭(`@synapse/*`) 은 진입 스크립트의 *디렉토리* 의 node_modules 에서 resolve 되므로,
# conversation 패키지 *안에* 진입 스크립트를 두고 실행해야 한다 (cwd 가 아니라 파일 위치 기준).
RUN_DIR="$ROOT/packages/conversation/.receipt-runner"
mkdir -p "$RUN_DIR"
trap 'rm -f "$DB_PATH"; rm -rf "$RUN_DIR"' EXIT

cat > "$RUN_DIR/send.mjs" <<'NODE'
const dbPath = process.env.SYNAPSE_DB_PATH;
if (!dbPath) { console.error('SYNAPSE_DB_PATH unset'); process.exit(2); }
const storage = await import('@synapse/storage');
const conversation = await import('@synapse/conversation');
const db = storage.openDb(dbPath);
storage.migrate(db);
const reply = await conversation.send('안녕', { db });
if (!reply || typeof reply !== 'string' || reply.length === 0) {
  console.error('empty reply from Gemma');
  process.exit(3);
}
console.log('reply:', reply.slice(0, 80).replace(/\n/g, ' '));
NODE

cat > "$RUN_DIR/verify.mjs" <<'NODE'
const storage = await import('@synapse/storage');
const db = storage.openDb(process.env.SYNAPSE_DB_PATH);
const rows = storage.listMessages(db);
const userRows = rows.filter((r) => r.role === 'user').length;
const assistantRows = rows.filter((r) => r.role === 'assistant').length;
process.stdout.write(`${userRows}:${assistantRows}`);
NODE

SYNAPSE_DB_PATH="$DB_PATH" node --experimental-strip-types "$RUN_DIR/send.mjs"

# ---------------------------------------------------------------------------
step "[5/5] verify SQLite rows"
COUNT=$(SYNAPSE_DB_PATH="$DB_PATH" node --experimental-strip-types "$RUN_DIR/verify.mjs")
USER_COUNT="${COUNT%%:*}"
ASSISTANT_COUNT="${COUNT##*:}"
echo "messages user=${USER_COUNT} assistant=${ASSISTANT_COUNT}"
if [ "$USER_COUNT" -lt 1 ] || [ "$ASSISTANT_COUNT" -lt 1 ]; then
  fail "[5/5] 기대 user>=1 assistant>=1, 실제 user=${USER_COUNT} assistant=${ASSISTANT_COUNT}"
fi

echo ""
echo "✅ Sprint 0 receipt PASSED"
