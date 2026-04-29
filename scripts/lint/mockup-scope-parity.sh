#!/usr/bin/env bash
# mockup-scope-parity.sh
# Sprint 2 lint — 디자인 목업 화면 enum (designer 가 dev doc §7 mockup-enum-table 마커 안에 박은 표)
# 와 dev doc §3 In 의 화면 표현 1:1 매칭 검증.
#
# CLI:  bash scripts/lint/mockup-scope-parity.sh <target-dev-doc>
#       MOCKUP_TABLE_DOC=<path> bash scripts/lint/mockup-scope-parity.sh <target-dev-doc>
#
# 통과: exit 0
# 위반: stderr 줄 단위 보고 + exit 1
#
# 표의 단일 진실원: Sprint 2 dev doc §7 (`docs/sprints/sprint-2-agent-workflow-hardening.md`) — designer T1 작성.
# `MOCKUP_TABLE_DOC` 환경변수로 override 가능 (테스트 fixture 용).
# 첫 번째 인자(<target-dev-doc>) 는 §3 In 을 검사할 대상.
#
# 알고리즘:
#   1. 표 dev doc §7 의 <!-- mockup-enum-table:start --> ~ <!-- mockup-enum-table:end --> 사이에서
#      파이프 표 데이터 행을 파싱. 컬럼 4 개 고정: export | 한국어 라벨 | 별칭 | 비고.
#      → 각 행에서 lowercase alias 토큰 set + ko 라벨 토큰 + export 이름 (lowercase) 을 통합 패턴 set 로 만든다.
#   2. target dev doc §3 (## 3. Scope) ~ §4 (## 4.) 사이의 "**In:**" ~ "**Out:**" 본문을 추출.
#   3. §3 In 본문에서 "화면스러운" 토큰 추출:
#        a) 영어: 정규식 `[A-Z][a-zA-Z]+` 중 의미있는 suffix (Screen/Chat/Recall/Hint/State/Inspector) — 예: "OnboardingScreen", "FirstChat".
#           표 export 와 정확 일치(case-insensitive)도 검사 (예: "Onboarding" 단독).
#           흔한 잡음 (Sprint, RN, Expo, NDJSON, COPY, DI, UI, CTA, SQLite 등) 은 stop-list 로 제외.
#        b) 한국어: 표의 ko 라벨 컬럼 값 자체가 §3 In 에 substring 으로 등장하면 positive 매칭 (위반 아님).
#   4. 후보 토큰 중 어느 행의 패턴 set 와도 매칭되지 않는 게 있으면 위반. 매칭은 case-insensitive
#      substring/정확 일치 (alias 는 kebab-case 그대로, export 는 case-insensitive substring).
#
# 의존: bash, grep, sed, awk, tr.

set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "usage: $0 <target-dev-doc>  (env: MOCKUP_TABLE_DOC)" >&2
  exit 2
fi

TARGET_DOC="$1"
if [ ! -f "$TARGET_DOC" ]; then
  echo "target dev doc not found: $TARGET_DOC" >&2
  exit 2
fi

# 표의 단일 진실원 — 기본값 = Sprint 2 dev doc.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TABLE_DOC="${MOCKUP_TABLE_DOC:-$ROOT_DIR/docs/sprints/sprint-2-agent-workflow-hardening.md}"
if [ ! -f "$TABLE_DOC" ]; then
  echo "table dev doc not found: $TABLE_DOC (set MOCKUP_TABLE_DOC env var to override)" >&2
  exit 2
fi

# ---------------------------------------------------------------------------
# 1. 표 파싱 (TABLE_DOC §7)
TABLE_BLOCK=$(awk '
  /<!-- mockup-enum-table:start -->/ { inside=1; next }
  /<!-- mockup-enum-table:end -->/   { inside=0; next }
  inside { print }
' "$TABLE_DOC")

if [ -z "$TABLE_BLOCK" ]; then
  echo "[mockup-scope-parity] 표 dev doc 에 <!-- mockup-enum-table:start/end --> 마커가 없음: $TABLE_DOC" >&2
  exit 1
fi

# 표 데이터 행만 추출 (헤더 / 구분자 / 빈줄 제외).
# 헤더 = "screens.jsx export" 포함 줄.  구분자 = "---" 만으로 구성된 셀.
DATA_ROWS=$(printf '%s\n' "$TABLE_BLOCK" | awk -F'|' '
  /screens\.jsx export/ { next }
  /^[[:space:]]*\|/ {
    # 구분자 행: 두 번째 셀이 dash-only 면 skip.
    second=$2; gsub(/[[:space:]:-]/,"",second);
    if (second == "") next
    print
  }
')

if [ -z "$DATA_ROWS" ]; then
  echo "[mockup-scope-parity] 표 데이터 행 0 — designer 의 mockup-enum-table 이 비어있음" >&2
  exit 1
fi

# 각 행 → "<export>|<ko>|<alias_csv>"  형태로 정규화 (앞뒤 공백 제거)
NORMALIZED=$(printf '%s\n' "$DATA_ROWS" | awk -F'|' '
  {
    expname=$2; ko=$3; aliases=$4;
    sub(/^[[:space:]]+/,"",expname); sub(/[[:space:]]+$/,"",expname);
    sub(/^[[:space:]]+/,"",ko);      sub(/[[:space:]]+$/,"",ko);
    sub(/^[[:space:]]+/,"",aliases); sub(/[[:space:]]+$/,"",aliases);
    if (expname == "" || ko == "" || aliases == "") next;
    print expname "|" ko "|" aliases;
  }
')

if [ -z "$NORMALIZED" ]; then
  echo "[mockup-scope-parity] 정규화 후 데이터 행 0" >&2
  exit 1
fi

# 패턴 set 구성 — 각 패턴은 lowercase 매칭용으로 보관.
# 형식: "<kind>:<pattern>" — kind = export|ko|alias.
PATTERN_SET=$(printf '%s\n' "$NORMALIZED" | awk -F'|' '
  {
    expname=$1; ko=$2; aliases=$3;
    print "export:" tolower(expname);
    print "ko:" ko;
    n=split(aliases, a, /[[:space:]]*\/[[:space:]]*/);
    for (i=1;i<=n;i++) {
      tok=a[i];
      sub(/^[[:space:]]+/,"",tok); sub(/[[:space:]]+$/,"",tok);
      if (tok != "") print "alias:" tolower(tok);
    }
  }
')

# ---------------------------------------------------------------------------
# 2. target dev doc 의 §3 In 본문 추출
SECTION3=$(awk '
  /^## 3\. Scope/ { inside=1; next }
  /^## 4\./       { inside=0; next }
  inside { print }
' "$TARGET_DOC")

IN_BODY=$(printf '%s\n' "$SECTION3" | awk '
  /^\*\*In:\*\*/  { inside=1; next }
  /^\*\*Out:\*\*/ { inside=0; next }
  inside { print }
')

if [ -z "$IN_BODY" ]; then
  echo "[mockup-scope-parity] §3 In 본문 추출 실패 — '## 3. Scope' / '**In:**' / '**Out:**' 마커 누락" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. §3 In 의 후보 화면 토큰 추출
#    - 영어 토큰: 대문자 시작 단어 (Screen 또는 Chat 으로 끝나거나, 표 export 와 정확히 일치)
#    - 한국어 토큰: ko 라벨이 본문에 substring 으로 등장하면 별도 후보로 추가

# stop-list — 화면이 아니지만 대문자로 시작하는 빈출 토큰
STOP_LIST=$(cat <<'EOF'
sprint
rn
expo
expo router
ndjson
copy
di
ui
cta
sqlite
sqlite-vec
json
ollama
gemma
api
tab
ts
tsx
metro
ms
pm
ko
en
sub
hi
hint
tagline
react
react native
better-sqlite3
color
colorshex
hex
oklch
demoscreen
EOF
)

# 후보 영어 토큰 추출 — Onboarding, OnboardingScreen, FirstChat, GhostHint, ...
ENG_CANDIDATES=$(printf '%s\n' "$IN_BODY" | grep -oE '[A-Z][a-zA-Z]+(Screen|Chat|Recall|Hint|State|Inspector)?' | sort -u || true)

# 후보 한국어 토큰: ko 라벨 자체가 본문에 등장 → "ko-hit:<label>" 로 표시
KO_HITS=""
while IFS='|' read -r row_exp row_ko row_aliases; do
  if [ -z "$row_ko" ]; then continue; fi
  if printf '%s' "$IN_BODY" | grep -qF "$row_ko"; then
    KO_HITS="$KO_HITS$row_ko"$'\n'
  fi
done <<< "$NORMALIZED"

# ---------------------------------------------------------------------------
# 4. 매칭 검사
violations=0
report_violation() {
  echo "[mockup-scope-parity] 위반: $1" >&2
  violations=$((violations + 1))
}

# 토큰 → 패턴 set 매칭 (case-insensitive, exact-or-substring).
match_token() {
  local token_lower="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  while IFS= read -r line; do
    case "$line" in
      export:*)
        local pat="${line#export:}"
        # exact match (case-insensitive)
        if [ "$token_lower" = "$pat" ]; then return 0; fi
        # token 이 export 의 substring 인 경우 (Onboarding ⊂ OnboardingScreen)
        if [ -n "$token_lower" ] && [ "${pat#*$token_lower}" != "$pat" ]; then return 0; fi
        ;;
      alias:*)
        local pat="${line#alias:}"
        if [ "$token_lower" = "$pat" ]; then return 0; fi
        ;;
      ko:*)
        local pat="${line#ko:}"
        # 한국어는 본 함수 호출에서 사용 안 함 (별도 KO_HITS 로 처리)
        ;;
    esac
  done <<EOF
$PATTERN_SET
EOF
  return 1
}

# stop-list 체크 (lower-case)
in_stop_list() {
  local t="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  while IFS= read -r s; do
    [ -z "$s" ] && continue
    if [ "$t" = "$s" ]; then return 0; fi
  done <<EOF
$STOP_LIST
EOF
  return 1
}

# 영어 후보 검증
while IFS= read -r tok; do
  [ -z "$tok" ] && continue
  if in_stop_list "$tok"; then continue; fi
  if ! match_token "$tok"; then
    # screen/chat/recall 같은 의미 있는 suffix 가 없는 단어는 잡음일 가능성 — 별칭 set 에 정확히 없으면 패스
    case "$tok" in
      *Screen|*Chat|*Recall|*Hint|*State|*Inspector)
        report_violation "§3 In 의 화면 표현 '$tok' 가 designer 표의 어떤 행과도 매칭되지 않음."
        ;;
      *)
        : # 잡음 토큰은 무시
        ;;
    esac
  fi
done <<EOF
$ENG_CANDIDATES
EOF

# 한국어 ko 라벨 hit 는 *positive* — 표의 ko 라벨이 본문에 등장한 경우라 항상 매칭 OK.
# 위반 케이스: ko 라벨이 표에 정의되지 않은 채 §3 In 에 한국어 화면명이 등장하는 경우는 검출 어려움 → conservative skip.

# ---------------------------------------------------------------------------
if [ "$violations" -eq 0 ]; then
  exit 0
fi

echo "[mockup-scope-parity] 위반 ${violations} 건. designer 표 갱신 또는 §3 In 표현 정정 필요." >&2
exit 1
