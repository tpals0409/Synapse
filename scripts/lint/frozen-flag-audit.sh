#!/usr/bin/env bash
# frozen-flag-audit.sh
# Sprint 2 lint — dev doc §11 *Decisions Made* 의 각 결정 줄에
# `**[FROZEN v<date> <decision-id>]**` prefix 부착 검증.
#
# CLI:  bash scripts/lint/frozen-flag-audit.sh <dev-doc-path>
# 통과: exit 0
# 위반: stderr 줄 단위 보고 + exit 1
#
# 알고리즘:
#   1. dev doc 의 `## 11.` ~ `## 12.` 사이를 §11 본문으로 추출.
#   2. 그 안에서 `**Decisions Made:**` ~ `**Open Issues:**` 사이를 결정 블록으로 추출.
#   3. 결정 블록의 모든 `^- ` bullet 줄을 검사. 단,
#        - `^- *(.*)*$` 형태의 *meta 주석* (이탤릭) 은 skip.
#        - bullet 가 prefix `**[FROZEN v<date> <id>]**` 로 시작하지 않으면 위반.
#        - prefix 정규식: `^- \*\*\[FROZEN v[0-9]{4}-[0-9]{2}-[0-9]{2} [^]]+\]\*\*`.
#   4. 빈 줄 / non-bullet 본문은 무시 (들여쓴 sub-bullet 도 *현재 정책상* prefix 면제).
#
# 의존: bash, awk, grep.

set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "usage: $0 <dev-doc-path>" >&2
  exit 2
fi

DEV_DOC="$1"
if [ ! -f "$DEV_DOC" ]; then
  echo "dev doc not found: $DEV_DOC" >&2
  exit 2
fi

# §11 본문 추출
SECTION11=$(awk '
  /^## 11\./ { inside=1; next }
  /^## 12\./ { inside=0; next }
  inside { print }
' "$DEV_DOC")

if [ -z "$SECTION11" ]; then
  echo "[frozen-flag-audit] §11 본문 추출 실패 (## 11. / ## 12. 마커 누락): $DEV_DOC" >&2
  exit 1
fi

# Decisions Made 블록 추출
DEC_BLOCK=$(printf '%s\n' "$SECTION11" | awk '
  /^\*\*Decisions Made:\*\*/ { inside=1; next }
  /^\*\*Open Issues:\*\*/    { inside=0; next }
  inside { print }
')

if [ -z "$DEC_BLOCK" ]; then
  # Decisions Made 블록이 비어 있으면 검사 항목 0 — PASS.
  exit 0
fi

# 위반 검사
violations=0
line_no=0
while IFS= read -r line; do
  line_no=$((line_no + 1))
  # bullet 시작 줄만 검사 (^- )
  case "$line" in
    "- "*)
      ;;
    *)
      continue
      ;;
  esac

  body="${line#- }"

  # meta 주석 (이탤릭만 있는 bullet) skip — `*(...)*` 또는 빈 줄
  if [ -z "$body" ]; then
    continue
  fi
  if printf '%s' "$body" | grep -Eq '^\*\(.*\)\*[[:space:]]*$'; then
    continue
  fi

  # FROZEN prefix 검사
  if printf '%s' "$line" | grep -Eq '^- \*\*\[FROZEN v[0-9]{4}-[0-9]{2}-[0-9]{2} [^]]+\]\*\*'; then
    continue
  fi

  echo "[frozen-flag-audit] §11 Decisions Made bullet 에 FROZEN prefix 누락:" >&2
  echo "    $line" >&2
  violations=$((violations + 1))
done <<< "$DEC_BLOCK"

if [ "$violations" -eq 0 ]; then
  exit 0
fi

echo "[frozen-flag-audit] 위반 ${violations} 건. 각 결정 bullet 에 \`**[FROZEN v<date> <id>]**\` prefix 부착 필요." >&2
exit 1
