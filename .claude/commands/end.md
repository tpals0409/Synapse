---
name: end
description: 스프린트를 종료한다. /start 가 Tier 1+2 까지 머지한 상태에서, Tier 3 잔여 worktree 머지 + 모든 리포트 수확 + Receipt 자동 검증 후 dev doc 마감, N+1 스켈레톤 자동 생성.
---

> **페르소나 가드** — 이 슬래시커맨드는 **team-leader 페르소나**에서만 실행됩니다. 현재 세션이 team-leader 가 아니면 즉시 중단하고 안내:
> ```
> /end 는 team-leader 페르소나 전용입니다.
> 별도 터미널에서 다음을 실행하세요:
>   cd /Users/kimsemin/Desktop/2026/Synapse && claude --agent team-leader
> 그 세션 안에서 /end 를 다시 호출하세요.
> ```

당신은 Synapse 프로젝트의 **team-leader** 서브에이전트로서, PM 이 호출한 `/end` 를 처리합니다. **컨텍스트가 곧 `/clear` 로 사라진다**는 것을 전제로 모든 살릴 정보를 dev doc 에 영속화하세요. Sprint 11+ 부터 **Agent View 단계별 dispatch 의 마지막 단계 (Tier 3 잔여 처리)** 모드로 작동합니다.

## 사전 상태 가정 (/start 가 이미 처리)
- Tier 1 워커: 모두 완료 → main 으로 squash merge 됨 → worktree 제거됨
- Tier 2 워커: 모두 완료 → main 으로 squash merge 됨 → worktree 제거됨
- Tier 3 워커: 진행 중 또는 일부 Completed (worktree 잔존)
- 리포트 파일: Tier 1/2 워커 리포트는 이미 main 의 `docs/sprints/sprint-N/reports/` 에 있음 (squash merge 에 포함됨). Tier 3 리포트는 Tier 3 머지 후 합류.

## 절대 규칙
- *Carry-over* 섹션 빈 칸 종료 금지 (특이사항이 없다면 "특이사항 없음, 직전 스프린트 가정 그대로 유지" 라고 *명시*).
- Receipt 검증 결과(pass/partial/fail) 는 무조건 *Implementation Map* 또는 *Open Issues* 에 기록.
- N+1 스켈레톤이 생성되지 않으면 종료 거부.
- 워커 worktree 머지 충돌 시 자동 해소 금지 — PM 개입 게이트.
- 워커 리포트 파일 부재 워커는 강제 종료 시 *Open Issues* 에 명시.
- 직접 코드 수정 금지 (긴급 통합 수정만 예외, PM 사인오프 필수).

## 절차

### 1. Tier 3 워커 세션 상태 점검
```bash
claude agents   # 또는 list 파일 캐시
```
- 모든 Tier 3 워커가 Completed 인지 확인. 아직 Working / Needs input 워커 있으면 PM 에게 명시적 확인:
  - "Tier 3 워커 X 가 still working. 강제 종료 (`claude stop <id>`) 후 진행할까요, 아니면 대기?"
- 강제 종료 시 해당 워커 *Open Issues* 에 "Tier 3 미완: <worker>" 표시.

### 2. Tier 3 worktree squash merge
각 Tier 3 워커 worktree:
```bash
for wt in .claude/worktrees/*/; do
  branch=$(git -C "$wt" rev-parse --abbrev-ref HEAD)
  worker=$(echo $branch | sed 's/.*agent-view-\([^-]*\)-.*/\1/')
  git merge --squash "$branch" && git commit -m "feat(sprint-N): $worker tier-3 slice — squash"
done
```
- 충돌 발생 시 즉시 중단 → PM 보고 (충돌 파일 절대경로 + 워커 ID + diff hunk 첫 5 줄) → PM 결정 (manual resolve / abort).
- 머지 성공 후 worktree 즉시 제거: `git worktree remove .claude/worktrees/<id>`.

### 3. 워커 리포트 일괄 수확
- `docs/sprints/sprint-N/reports/*.md` 전부 읽음 (Tier 1+2+3 모두 main 에 있어야 함).
- 부재 워커 명단 작성 → *Open Issues* 에 "리포트 부재: <worker>" 항목 추가.
- 각 워커 리포트 §5 Frozen 위반 여부 에 'producer gap' 기록 있으면 → *Open Issues* 에 "Tier N producer gap 미해소: <worker> → producer 재dispatch 필요" 표시 + N+1 carry-over 에 즉시 반영.
- 각 리포트의 §1~§5 를 메인 dev doc 의 다음 섹션에 조립:
  - §1 슬라이스 결과 + §2 Interfaces → *Implementation Map*
  - §3 Tests → *Test Scenarios* 갱신 + *Implementation Map* 의 receipt 라인
  - §4 Carry-over → *Carry-over* (워커별 sub-bullet)
  - §5 Frozen 위반 여부 → *Decisions Made* 또는 *Open Issues* (위반 시)

### 4. Pre-receipt lint
- `bash scripts/lint/frozen-flag-audit.sh docs/sprints/sprint-N-*.md` — §11 Decisions Made 의 PM 사인오프 결정 모두 `**[FROZEN v<date> <id>]**` 부착 검증. 미부착 시 dev doc 마감 차단.
- 워커 리포트 §5 의 Frozen 위반 항목 dev doc 에 흡수 검증.

### 5. Receipt 검증

> **마감 마크 작성 직전 receipt 실측 강제 정책** (Sprint 12 `D-S12-end-mark-live-measure` 영구 박힘) — Sprint 9~10 마감 시 "Sprint 9 receipt 65/65 PASS" 마크가 실제 4 단계 stale fail (step [9/14] / [53/53] / [61/65] / [62/65]) 이었음. Sprint 11 `/end` 가 first 실측 catch. 본 §5 마감 직전 다음 절차 의무:
> 1. 마감 마크 (✅ / ⚠ / ❌) 작성 직전 receipt 스크립트 실제 실행 (`SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-N.sh`).
> 2. 결과 (pass / partial / fail) 를 *Implementation Map* 또는 *Open Issues* 에 *그대로 raw text* 기록.
> 3. 직전 sprint 결과 복제 금지 — stale 마크 재발 차단.
>
> **receipt/lint 자산 path swap 회귀 정책** (Sprint 12 `D-S12-receipt-infra-path-swap-policy` 영구 박힘) — c460712 류 구조 변경 commit (워커 정의 path 또는 receipt/lint 자산 path swap) 발생 시 receipt/lint 자산이 stale path 참조하는지 grep 1회 의무. Sprint 11 `/end` 가 5 파일 stale 일괄 swap (`scripts/receipt/sprint-2.sh` + `scripts/lint/directive-tag-audit.ts` + `scripts/lint/__tests__/run-tests.sh` + `scripts/receipt/.receipt-runner/{sprint7-contract-gap-policy, sprint9-pakda-term-zero, sprint9-spawn-prompt-update}.mjs`) 수행. 본 §5 마감 직전 다음 절차 의무:
> ```bash
> grep -rn "\.claude/commands" scripts/
> ```
> hit 발견 시 path swap 정합성 즉시 검토 (`.claude/agents/` 또는 신규 path 로 갱신 필요한지). 무시 가능 라인 (예: 본 정책 자체 라인 / 메타 인용) 은 명시적으로 판단 후 제외.

N dev doc 의 *Deliverable & Receipt* 항목을 자동 실행:
- `pnpm test` (단위/통합 테스트)
- `pnpm --filter mobile build` (빌드 가능 여부, 해당 스프린트에서 모바일 변경이 있을 때)
- `bash scripts/receipt/sprint-N.sh` (스프린트 전용 시나리오, 있는 경우 — 자체적으로 `mockup-scope-parity` / `frozen-flag-audit` / `directive-tag-audit` + 리포트 파일 개수 게이트 호출)
- 결과: **pass** / **partial** / **fail** — 마감 마크 작성 직전 *실측* 결과 raw text 그대로 기록 (위 마감 마크 실측 강제 정책 정합).
- partial/fail 인 경우: PM 에게 명시적으로 종료 여부 확인. 강제 종료 시 *Open Issues* 와 *Carry-over* 에 미해결 사항 명시.

### 6. N(현재) dev doc 마감
§3 에서 1차 조립한 후 다음 섹션 마무리:
- **Implementation Map**: 워커별 리포트 §1+§2 통합 + receipt 라인.
- **Decisions Made**: 스프린트 중 내려진 비-자명한 결정 + 이유 + `**[FROZEN v<date> <id>]**` 태그.
- **Open Issues**: 알려진 버그·한계·미구현 + 리포트 부재 워커 + producer gap 미해소.
- **Carry-over** (가장 중요): 워커별 §4 통합 + team-leader 통합 관점 한 줄. 비어있으면 종료 거부.
- **Retrospective**: 잘 된 것 / 아팠던 것 / 다음에 다르게 할 것. 워커 리포트 §5 + receipt 결과 종합.
- **Demo Script**: receipt 시연용 step-by-step.

### 7. N+1 스켈레톤 자동 생성
- `cp docs/sprints/_template.md docs/sprints/sprint-(N+1)-<slug>.md` (slug 은 `CLAUDE.md` 스프린트 로드맵에서 도출).
- 다음 3 개 섹션을 채움:
  - *Goal* (한 문장): `CLAUDE.md` 로드맵의 N+1 항목 + N *Carry-over* 의 시사점 종합.
  - *Deliverable & Receipt*: 시연 가능한 결과 + 통과 기준.
  - *Scope (in/out)*: 초안 (다음 `/start` 시 PM 사인오프 후 확정).
- §5.5 Worker Slices 의 slice 마커 블록은 _template.md 의 기본 7 워커 셋팅 유지 → 다음 `/start` 가 PM 사인오프 후 Tier 와 본문 채움.
- 나머지 섹션은 빈 칸.

### 8. worktree 정리
- 모든 워커 worktree 제거 확인: `git worktree list` 가 main 만 보여야 함.
- 잔재 있으면 `git worktree remove .claude/worktrees/<id>` 또는 `git worktree prune`.

### 9. 인덱스/포인터 갱신
- `SPRINTS.md`: N 행에 ✅ + 한 줄 결과 (receipt 결과 포함). N+1 행 추가 (제목·goal).
- `docs/sprints/_current.txt`: `(N+1)` 로 갱신.

### 10. 체크인 정리
- git: 스프린트 단위 커밋 + 태그 (`git tag sprint-N-end`). 사용자 동의 없이 push 는 금지.
- 잔여 워커 세션 정리: `claude stop <id>` (PM 동의 후) 또는 자연 종료 대기.

### 11. PM 안내 메시지
정확히 다음 형식으로 출력:
```
Sprint N 종료
- Tier 1 / 2 / 3 완료: <머지된 워커 수> / <예상 수>
- 리포트 회수: <받은 수> / <기대 수> (부재: <list>)
- Receipt: <pass / partial: ... / fail: ...>
- Producer gap 미해소: <count> (N+1 carry-over 에 반영됨)
- Carry-over 핵심: <한 줄 요약>
- N+1 스켈레톤: docs/sprints/sprint-(N+1)-<slug>.md (Goal: <한 문장>)

다음 단계:
1. /clear 로 컨텍스트 리셋
2. cd Synapse && claude --agent team-leader
3. /start 로 Sprint N+1 진입
```

## 금지
- *Carry-over* 비어있는 채로 절대 종료하지 않는다. 빈 칸은 다음 사이클의 단절.
- N+1 스켈레톤의 *Goal* / *Deliverable* / *Receipt* 중 하나라도 비워두지 않는다.
- 사용자 동의 없이 git push, 원격 배포, 외부 알림 발송 금지.
- 워커 worktree 머지 충돌 자동 해소 금지 — PM 개입 게이트.
- 직접 코드 수정 금지 (긴급 통합 수정만 예외, PM 사인오프 필수).

## 공통 헌법 (Sprint 2+ 적용)
출처: `~/.claude/projects/-Users-kimsemin-Desktop-2026-Synapse/memory/feedback_decision_serialization.md`. `/end` 가 dev doc 마감 시 12 패턴 점검:
1. **HOLD-DECIDE-RESUME** — receipt 검증 / dev doc 마감 진행 중 PM 결정 분기 발생 시 모든 워커 세션에 `claude attach <id>` 로 HOLD 발송 후 RESUME.
2. **Decision-version 태그** — §11 Decisions Made 의 PM 사인오프 결정에 `**[FROZEN v<date> <id>]**` prefix 부착 검증.
3. **Source-of-truth 우선순위** — `code > task subject > dev doc [FROZEN] > inbox > draft`.
4. **단일 작성자 시간창** — `/end` 가 §9-§12 마감 *동안* 다른 워커 dispatch 금지.

## /end 절차 보강 (Sprint 11+)
- §4 lint 통과 후 §5 receipt 진입.
- §5 receipt 스크립트는 새 게이트 추가: 리포트 파일 개수 ≥ 1 (보수적 시작 — 사이클 안정 후 워커 수만큼 인상).
- §2 Tier 3 머지 충돌 발생 시 PM 보고는 충돌 파일 절대경로 + 워커 ID + diff hunk 첫 5줄.
- §3 producer gap 미해소 발견 시 N+1 carry-over 에 즉시 반영 (다음 `/start` 가 Tier 1 producer 슬라이스를 생성하도록).
