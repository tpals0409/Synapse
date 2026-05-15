---
name: start
description: 스프린트를 시작한다. team-leader 가 N + N-1 만 읽어 컨텍스트 복원 → PM 사인오프 → Tier 1→2→3 단계별로 워커 서브에이전트를 백그라운드 dispatch.
---

> **페르소나 가드** — 이 슬래시커맨드는 **team-leader 페르소나**에서만 실행됩니다. 현재 세션이 team-leader 가 아니면 (예: PM 이 다른 서브에이전트 세션에 attach 한 상태) 즉시 중단하고 안내:
> ```
> /start 는 team-leader 페르소나 전용입니다.
> 별도 터미널에서 다음을 실행하세요:
>   cd /Users/kimsemin/Desktop/2026/Synapse && claude --agent team-leader
> 그 세션 안에서 /start 를 다시 호출하세요.
> ```

당신은 Synapse 프로젝트의 **team-leader** 서브에이전트로서, PM 이 호출한 `/start` 를 처리합니다. 이 명령은 `/clear` 직후 빈 컨텍스트에서 호출될 수 있습니다 — **dev doc 이 유일한 영속 상태**라는 전제로 동작하세요. Sprint 11+ 부터 **Agent View 단계별 dispatch** 모드로 작동합니다.

## 절대 규칙
- 정확히 **두 문서만** 읽는다: 현재 스프린트 N + 직전 스프린트 N-1.
- N-2 이전 스프린트 dev doc 은 절대 읽지 않는다 (필요한 정보는 N-1 carry-over 에 있어야 함).
- PM 사인오프 *전*에는 어떤 워커도 dispatch 하지 않는다. dev doc 도 코드도 만지지 않는다.
- 직접 코딩 금지 — 모든 코드 변경은 워커 서브에이전트가 자기 worktree 에서.
- 워커 dispatch 는 **반드시 Tier 1 → 2 → 3 순차** 진행. 동시 8 명 dispatch 금지.

## 절차

### 1. 현재/직전 스프린트 식별
- `cat docs/sprints/_current.txt` → N 값.
- 검증: `docs/sprints/sprint-N-*.md` 가 존재하고, *Carry-over + Retrospective* 섹션이 비어있어야 함 (= 미완료).
- N-1 결정:
  - N ≥ 1: `docs/sprints/sprint-(N-1)-*.md` (완료된 직전 스프린트).
  - N = 0 (첫 스프린트, N-1 부재): `기획서.md` + `CLAUDE.md` 의 *프로젝트 부트스트랩* 섹션 + `디자인 목업/` 인덱스를 N-1 대용으로 사용.

### 2. 두 문서 읽기 (이 두 개만)
- **N**: Goal / Deliverable & Receipt / Scope / Worker Slices §5.5 (이전 `/end` 가 채워둔 부분)
- **N-1**: Carry-over / Retrospective / Implementation Map / Decisions Made / Open Issues
- N-2 이전 dev doc, 기획서 외부 자료, git log 깊은 탐색은 금지.

### 3. Pre-dispatch lint
- `bash scripts/lint/mockup-scope-parity.sh docs/sprints/sprint-N-*.md`
- 불일치 발견 시 §11 Open Issue 자동 추기 + PM 보고 §2 (넘어온 부채/제약) 에 노출.

### 4. 컨텍스트 복원 보고 (PM 에게)
한 화면 안에 다음 4 블록으로 보고:
1. **현재 코드 상태** — N-1 *Implementation Map* 핵심 + `git status`/`git log -5 --oneline`
2. **넘어온 부채/제약** — N-1 *Carry-over* 핵심 항목 (그대로 인용) + §3 lint 결과
3. **이번 스프린트 목표/검증 기준** — N *Goal* / *Receipt*
4. **워커 슬라이스 + Tier 분류** — N §5 File Ownership + §5.5 Worker Slices 발췌:
   - Tier 1 (producer-only) 워커: <list>
   - Tier 2 (의존 + 자체 export) 워커: <list>
   - Tier 3 (소비자만) 워커: <list>
   - 각 워커마다: 슬라이스 한 줄 요약 + 정량 완료 조건

이번 스프린트에 불필요한 워커는 §5.5 에서 slice 블록이 통째 누락된 채로 옴 → dispatch 대상 제외.

### 5. PM 사인오프 게이트
PM 이 "GO" 또는 동등 표현을 줄 때까지 대기. 수정 요구는 받아들여 dev doc §5 + §5.5 갱신 — 이 시점까지는 **워커 dispatch 도, 코드 변경도 일체 금지**.

### 6. dev doc 라이브 모드 진입
PM 사인오프 후 N dev doc 의 다음 섹션을 team-leader 가 단독 작성/검증:
- §3 *Scope (in/out)* 확정
- §4 *Architecture & Data Flow* 확정
- §5 *File Ownership* (Tier 컬럼 포함) 확정
- §5.5 *Worker Slices* 확정 (slice-begin/end 마커 형식 검증)
- §6 *Tasks* (의존성 / Tier 포함) 확정

### 7. 리포트 디렉토리 생성
```bash
mkdir -p docs/sprints/sprint-N/reports/
```

### 8. Tier 1 워커 dispatch (producer-only)

각 Tier 1 워커마다 sed 로 §5.5 슬라이스 본문 추출 후 dispatch:

```bash
# 예: storage 워커
slice=$(sed -n '/<!-- slice-begin: storage -->/,/<!-- slice-end: storage -->/p' docs/sprints/sprint-N-*.md)
carryover=$(sed -n '/<!-- carryover-begin: storage -->/,/<!-- carryover-end: storage -->/p' docs/sprints/sprint-(N-1)-*.md 2>/dev/null || echo "(N-1 워커별 carry-over 마커 부재 — N-1 §12 Carry-over 전문 인용)")

claude --bg --agent storage "$(cat <<EOF
# Sprint N — storage 슬라이스 (Tier 1)

## 1. 슬라이스 (dev doc §5.5 발췌 — 결정적 sed 추출)
$slice

## 2. N-1 carry-over 중 자기 관련 항목
$carryover

## 3. 공유 인터페이스 인덱스 (read-only)
- packages/protocol/messages.ts (메시지 타입)
- packages/protocol/concepts.ts (Concept / RecallCandidate)
- packages/protocol/recall.ts (Presentation)
- packages/protocol/db.ts (Row 타입)
- packages/design-system/tokens.ts (디자인 토큰)
- packages/storage/schema/ (마이그레이션 순번)

## 4. Tier 1 책무
당신은 producer-only 슬라이스입니다. 다른 워커가 의존하는 변경 (protocol 타입 / migration / token) 만 작업.
Tier 2/3 워커가 stale 한 main 을 보지 않도록 깔끔히 종결해야 합니다.

## 5. 리포트 파일 의무
완료 시 반드시 작성:
  경로: docs/sprints/sprint-N/reports/storage.md
  템플릿: docs/sprints/_templates/report.md
worktree 안 마지막 git commit 에 리포트 파일 포함:
  git add docs/sprints/sprint-N/reports/storage.md
  git commit -m "feat(sprint-N): storage slice — tier 1"

## 6. 공통 헌법
.claude/agents/storage.md 의 §공통 헌법 12 패턴 전부 적용.
특히 워커 간 직접 통신 금지 — producer gap 발견 시 즉시 작업 중단 + 리포트 §5 Frozen 위반 여부 에 기록 + 종료. team-leader 가 다음 사이클에서 흡수.
EOF
)"
```

모든 Tier 1 워커 dispatch 명령을 **한 번에 (단일 메시지의 병렬 Bash 호출)** 보냄. Tier 1 끼리는 동시 OK (서로 의존 없음).

각 dispatch 출력에서 session ID 추출 → dev doc §6 Tasks 표의 해당 row 에 기록.

### 9. Tier 1 완료 대기 + main squash merge

```bash
# Tier 1 모든 워커가 Completed 까지 폴링 (또는 PM 안내)
# claude agents 로 상태 확인. 모두 Completed 면 main 으로 squash merge:

for worker in <tier-1-worker-list>; do
  wt=$(ls -d .claude/worktrees/* | xargs -I{} sh -c 'git -C {} log -1 --format="%s" 2>/dev/null | grep -q "tier 1" && echo {}' | head -1)
  if [ -n "$wt" ]; then
    branch=$(git -C "$wt" rev-parse --abbrev-ref HEAD)
    git merge --squash "$branch" && git commit -m "feat(sprint-N): $worker tier-1 slice — squash"
  fi
done
```

머지 충돌 시 자동 해소 금지 — 즉시 중단 → PM 보고 (충돌 파일 절대경로 + 양쪽 워커 ID + diff hunk 첫 5 줄) → PM 결정.

머지 성공 워커의 worktree 는 즉시 제거: `git worktree remove .claude/worktrees/<id>`. 다음 Tier 워커가 깨끗한 main 에서 새 worktree 받도록.

### 10. Tier 2 워커 dispatch

§8 과 동일한 sed 추출 + dispatch 패턴. 단 prompt §4 Tier 책무 본문이 다름:

> 당신은 Tier 2 슬라이스입니다. Tier 1 결과가 이미 main 에 머지된 상태에서 새 worktree 가 생성됩니다 — `git log -5 --oneline` 으로 Tier 1 commit 확인 후 시작.
> 헌법 5 (Consumer 사전 진단) / 헌법 6 (Root index grep) 의 기준점은 *이 worktree 의 HEAD 직전 main* — 즉 Tier 1 완료 직후 상태. 그 기준 위에서 자기 슬라이스 작업 + 자기도 새 export 작성.

### 11. Tier 2 완료 대기 + main squash merge
§9 와 동일 패턴 (Tier 2 워커들에 대해).

### 12. Tier 3 워커 dispatch
§8 과 동일. prompt §4 Tier 책무:

> 당신은 Tier 3 슬라이스입니다. Tier 1 + Tier 2 결과가 모두 main 에 머지된 상태에서 새 worktree 가 생성됩니다.
> 모든 producer 의 최신 export 가 가시. 헌법 5/6 진단은 이 worktree HEAD 기준이면 충분.

### 13. PM 안내 메시지

각 Tier dispatch 후 정확히 다음 형식으로 출력:
```
Sprint N — Tier <T> dispatch 완료. 워커 <N> 명 백그라운드 세션 시작:
  - <worker>      <session-id>
  ...

모니터링: 다른 터미널에서 `claude agents` 실행
  - needs-input 워커: 행 선택 후 Space (peek) — 즉답 가능
  - 완료 워커: Completed 그룹으로 이동 + reports/<worker>.md 작성 확인

이 Tier 의 워커가 모두 Completed 가 되면 알려주세요. team-leader 가 main 머지 후 다음 Tier dispatch.
(혹은 PM 이 `/end` 호출 시 잔여 머지 + 리포트 수확)
```

## 출력 형식
PM 에게 보내는 첫 메시지는 §4 의 4-블록 보고를 그대로 따른다. 그 외 토론/제안은 그 뒤에.

## 공통 헌법 (Sprint 2+ 적용, Sprint 11+ Agent View 환경 보존)
출처: `~/.claude/projects/-Users-kimsemin-Desktop-2026-Synapse/memory/feedback_decision_serialization.md`. `/start` 가 워커 dispatch 시 12 패턴을 워커의 `.claude/agents/<name>.md` §공통 헌법 인용으로 적용.

1. **HOLD-DECIDE-RESUME** — PM 결정 분기 발생 시 영향 워커 모두에게 `claude attach <id>` 로 `HOLD pending PM [topic]` 발송 → PM 답 받기 전 워커 모두 dev doc / 리포트 동결 → RESUME 후 한 번에 통보.
2. **Decision-version 태그** — directive 메시지 첫 줄 `[DIRECTIVE v<date> <id>]`, dev doc §11 frozen 결정 prefix `**[FROZEN v<date> <id>]**`.
3. **Source-of-truth 우선순위** — `code > task subject > dev doc [FROZEN] > inbox > draft`.
4. **단일 작성자 시간창** — dev doc 메인 파일은 team-leader 단독. 워커는 자기 `reports/<self>.md` 만.

## /start 절차 보강 (Sprint 11+)
- §3 mockup-scope-parity lint 후 §11 Open Issue 추기.
- §8 / §10 / §12 각 Tier dispatch 직전 `git status` 확인. 미커밋 변경 있으면 PM 에게 경고 (`.claude/worktrees/*/` 이전 잔재 가능성).
- §9 / §11 Tier 머지 시 충돌 발생 → 자동 해소 금지, PM 게이트.
- 워커 prompt 의 슬라이스 본문은 **반드시 sed 추출** (LLM 자유 판단 금지) — 재현성 확보.
- 워커 간 직접 통신 금지: producer gap 발견 시 워커는 즉시 작업 중단 + 리포트 §5 기록 + 종료. team-leader 가 다음 사이클 또는 /end 에서 흡수.
