## 사전 점검 의무 (Sprint 15 강화)

1. **origin/main 동기화 (헌법 #3)** — `git rev-parse main == git rev-parse origin/main` 1회. 본 sprint 시작 시점 base = Sprint 15 마감 commit (PM push 시점 기준).
2. **Sprint 15 fixture 4종 단독 PASS 확인** — `sprint15-stale-token-zero / sprint15-mobile-theme-aware / sprint15-dedup-frozen-marker / sprint15-pii-0007-shape` 모두 PASS. 그렇지 않으면 Sprint 15 회귀.
3. **`.claude/agents/` deletion 상태 확인** — git index 에는 7 파일 잔존 (Sprint 13 commit 7419216) 하나 working tree 에는 deleted. 본 sprint T1 의 첫 작업이 `git rm` commit.

## 1. Goal

**[FROZEN v2026-05-18 D-S16-branch] branch=C inheritance-cleanup (ninth inheritance pattern, 외부 데이터 9 연속 미도착 회피) + 7 워커 구조 완전 폐지.**

외부 데이터 N≥3 미도착 9 연속 (Sprint 8~16). Sprint 15 의 `D-S15-7-worker-structure-supersede` 결정 후속 실행 — 7 워커 구조 (D-S13-* / 헌법 #13 / sprint-2.sh step 9 / 11+ fixture / 메모 3종) 일괄 폐지.

**T1 슬라이스 단독 (모두 producer-only, 의존 0)**:
- **T1 (tester) producer-only [P0]** — 7 워커 구조 폐지 + receipt 11+ 파일 리팩터링 + sprint-9.sh~sprint-16.sh wrap 단독 PASS 회복.

**P1 carry-over (T2~T4 후보)**:
- T2 후보 (mobile) — `O-S16-mobile-session-hash-emit` (telemetryStore.emit 직전 sha256 hash).
- T3 후보 (engine) — `O-S16-dedup-concepts-ts-strict` (TS strict 정리, 시그니처 변경 0 가드).
- T4 후보 (design-system) — `O-S16-mobile-screen-children-theme-aware` (design-system 컴포넌트 11종 colorsHex.light 검증).

**T5 PM consumer** — T1~T4 머지 후 dev doc 큐레이션 + receipt 실측 + Sprint 17 skel + 마감.

## 2. Deliverable & Receipt

**Deliverable (T1 P0)**:
1. `.claude/agents/*.md` 7 파일 `git rm` commit (working tree deleted 영속화).
2. `scripts/receipt/sprint-2.sh` step 9 "헌법 inject 검증" 제거 + 임계 갱신.
3. `.receipt-runner` fixture 7건 (`sprint7-contract-gap-policy` / `sprint7-inspector-unlink-decision` / `sprint8-pii-policy` / `sprint8-external-data-index` / `sprint8-frozen-decisions-carry-over` / `sprint9-spawn-prompt-update` / `sprint9-pakda-term-zero`) `.claude/agents/` 의존 제거.
4. `scripts/receipt/sprint-13.sh` 임계 `workers_with_constitution ≥ 7` 제거.
5. `scripts/receipt/.receipt-runner/sprint14-worktree-bypass-clause.mjs` 제거 + `sprint-14.sh` 임계 `worktree_bypass_clause_count = 7` 제거.
6. Sprint 14/15 dev doc 사전 점검 §2 (헌법 #13 영속 검증) 제거 + 본문 헌법 #13 / 7 워커 정합 raw text 갱신.
7. 메모 3종 갱신 — `project_synapse.md` (7 서브에이전트 문구 제거) / `feedback_agent_view_orchestration.md` (폐지 또는 SUPERSEDED 마크) / `feedback_worker_worktree_bypass.md` (폐지).
8. `scripts/receipt/sprint-15.sh` 단독 PASS — wrap 안 sprint-9.sh / sprint-13.sh / sprint-14.sh 모두 단독 PASS.

**Receipt 명령**:
```bash
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-16.sh
```
exit 0 + Sprint 15 wrap 단독 PASS + Sprint 16 신규 단계.

## 3. Scope

**In**:
- T1: 위 §2 1~8 일괄.

**Out** (Sprint 17 carry-over 로 이월):
- T2~T4 후보 P1 3건 (위 §1 참조) — Sprint 16 진행 도중 PM 결정으로 T2~T4 슬라이스 합류 시 In 으로 이동 가능.
- Sprint 14 carry-over 低 3건 중 `O-S14-worktree-bypass-commit-history-scan` 은 본 T1 으로 자동 무효화. 나머지 2건 (`O-S14-mobile-jest-actual-run-threshold` / `O-S14-jest-expo-pnpm-coupling`) 은 Sprint 17 이월.
- 미해소 D-S9-* 5종 + 1 reconfirm (외부 데이터 의존).

## 4. Architecture & Data Flow

**T1 (7 워커 구조 폐지)**:
- 데이터 흐름: `.claude/agents/*.md` 의존 fixture → 의존 라인 제거 + dev doc raw text 검증으로 대체 가능한 경우 그곳으로 swap (예: 7 워커 list 검증 → sprint dev doc 의 §5 File Ownership 테이블 워커 7개 raw text 매칭).
- 헌법 #13 영속 검증 (worktree-bypass) 은 7 워커 파일 의존 — 폐지. 단, *worktree-bypass 사례 자체* 의 영속 기록은 메모 `feedback_worker_worktree_bypass.md` 가 보존. fixture 만 제거.
- pakda-term-zero (D-S9 헌법 #12) 는 7 워커 파일 line 9~12 영역 grep 의존 — 본 검증 *대체 source* 가 필요. 옵션: (a) dev doc 의 §11 Decisions Made 안 pakda 토큰 0 grep 으로 대체 / (b) commit message 본문 grep 으로 대체 / (c) 검증 제거 + 메모 `feedback_no_pakda_term.md` 만으로 정책 보존.

## 5. File Ownership

| 워커 | 영역 |
|---|---|
| T1 tester | `scripts/receipt/sprint-{2,13,14,15,16}.sh`, `scripts/receipt/.receipt-runner/sprint{7,8,9,14}-*.mjs` (의존 fixture 7+1), `docs/sprints/sprint-{14,15}-*.md` 사전 점검 §2, `.claude/agents/*.md` git rm, 메모 3종 |
| T5 PM | `docs/sprints/sprint-16-inheritance-cleanup.md` §10/§11/§12, `docs/sprints/_current.txt`, `docs/sprints/sprint-17-*.md` skeleton |

## 5.5 Worker Slices

```
T1 (tester) ──► T5 (PM consumer)
```

T1 단독 — Sprint 16 시작 시점 P0 1 슬라이스만 frozen scope. PM 결정으로 T2~T4 추가 가능.

## 6. Tasks

### T1 — 7 워커 구조 폐지 + receipt 리팩터링 (tester, producer-only)

**Input**:
- Sprint 15 D-S15-7-worker-structure-supersede 결정
- Sprint 15 마감 시점 `.claude/agents/` working tree deletion 상태
- 본 dev doc §2 Deliverable 1~8 명세

**Tasks** (PM 결정 후 보강 — 위 §2 참조).

### T5 — PM consumer (PM 직접, T1 머지 후)

(PM 합류 시 보강)

## 7. Interfaces / Contracts
(워커 머지 후 PM 큐레이션)

## 8. Test Scenarios
(워커 머지 후 PM 큐레이션)

## 9. Demo Script
(워커 머지 후 PM 큐레이션)

## 10. Implementation Map
(워커 머지 후 PM 큐레이션)

## 11. Decisions Made / Open Issues
(워커 머지 후 PM 큐레이션)

## 12. Carry-over + Retrospective

> 본 §12 + Sprint 15 §12 두 dev doc 만 읽고 Sprint 17 PM 이 시작 가능해야 함 (헌법 #2 자가완결).

(워커 머지 + receipt 검증 후 PM 보강)
