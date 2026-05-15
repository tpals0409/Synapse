# Sprint 15 — External Data Arrival (or Stale Fixture Cleanup)

> 이 문서는 *영속 메모리* 입니다. PM 단독 큐레이션. 워커는 transcript 4 줄만 남기고, PM 이 본 dev doc §10/§11/§12 를 직접 작성.
>
> **Skeleton 단계**: 본 sprint 시작 시 PM 이 Sprint 14 §12 carry-over + Sprint 13 §12 carry-over 두 dev doc 만 읽고 §1~§6 + §11 결정 + §5.5 슬라이스 확정 후 워커 dispatch.

## 사전 점검 의무 (Sprint 13 강화 + Sprint 14 신규)

1. **origin/main 동기화 (헌법 #3)** — `git rev-parse main == git rev-parse origin/main` 1회. 본 sprint 시작 시점 base 예상값 = `<sprint-14 마감 commit>` (Sprint 14 §12 carry-over 의 main HEAD 갱신값 참조).
2. **헌법 #13 (worktree-bypass) 영속 검증** — `grep -l D-S14-worktree-bypass-prohibition .claude/agents/*.md | wc -l == 7`. 7 워커 정의 line 13 항 모두 보존.
3. **stale fixture 사전 검증 의무 (Sprint 14 신규)** — PM dev doc skeleton 작성 시점에 `.receipt-runner/*.mjs` 안 stale 토큰 (이전 워커 이름 / 정적 카운트 등) 사전 grep 1회. directive mismatch 회피.
4. **PM worktree 생명주기 (Sprint 14 신규)** — Sprint 시작 시 1회 EnterWorktree → 매 phase 사이 base ff merge → 마감 시 ExitWorktree 패턴. Phase 도중 새 worktree 생성 금지.

## 1. Goal

(Sprint 14 §12 carry-over 의 patterns 후보 4종 중 PM 사인오프 후 확정)

**patterns 후보**:
- **branch=A 활성**: 외부 데이터 N≥3 도착 시 — Sprint 9 5종 보류 frozen 갱신 + 1종 reconfirm + 6 분기 본체 (dedup / negation / retention / theme-toggle / empty-error / unlink).
- **branch=B no-op close**: 8중 no-op 위험 회피 권장 X.
- **branch=C inheritance-cleanup 추가**: Sprint 14 신규 carry-over 5건 (`O-S14-receipt-runner-stale-fixture-cleanup` 高 / `O-S14-mobile-screen-theme-aware-migration` 中 / `O-S14-mobile-jest-actual-run-threshold` 低 / `O-S14-worktree-bypass-commit-history-scan` 低 / `O-S14-jest-expo-pnpm-coupling` 低) 회수.
- **branch=D 혼합**: branch=A + branch=C.

**default 권장 경로**: 외부 데이터 미도착 시 → **branch=C 시작** (`O-S14-receipt-runner-stale-fixture-cleanup` 高 우선순위 1 슬라이스만으로도 sprint-13.sh + sprint-14.sh LEGACY 분기 영구 제거 + 시스템 부채 영점화 가능).

## 2. Deliverable & Receipt

(branch 확정 후 PM 보강)

## 3. Scope

(branch 확정 후 PM 보강 — In / Out 분리)

## 4. Architecture & Data Flow

(branch 확정 후 PM 보강)

## 5. File Ownership

(branch 확정 후 PM 보강)

## 5.5 Worker Slices

(branch 확정 후 PM 보강 — 실측 path 1회 grep 의무)

## 6. Tasks

(branch 확정 후 PM 보강)

## 7. Interfaces / Contracts
(워커 머지 후 PM 큐레이션)

## 8. Test Scenarios
(워커 머지 후 PM 큐레이션)

## 9. Demo Script
(워커 머지 후 PM 큐레이션)

## 10. Implementation Map
(워커 머지 후 PM 큐레이션)

## 11. Decisions Made / Open Issues

**Constitution refs (Sprint 14 계승)**:
- 헌법 #13 [FROZEN v2026-05-15 D-S14-worktree-bypass-prohibition] — 7 워커 파일 본문 보존, 본 sprint 작업 시점에 7 워커 모두 동일 텍스트 매칭 검증.
- 헌법 #12 [FROZEN v2026-04-30 D-S9-no-pakda-term] — "박다" 용어 0건 강제, 본 sprint 모든 dev doc / transcript / commit / 보고에서 박다 토큰 0건.
- 헌법 #11 [Directive 진단 mismatch 보고] — Sprint 14 B2 first 적용 사례 (`docs/sprints/sprint-14-inheritance-cleanup.md` §10 참조). 본 sprint 워커도 같은 패턴 따름.
- 헌법 #3 [origin/main 동기화 의무] — 매 워커 머지 직후 즉시 push, 다음 워커 dispatch 직전 동기화 1회 검증.

**Decisions Made (PM 사인오프 후 보강)**: (branch 확정 시점에)

**Open Issues (마감 시점 보강)**: (워커 머지 후)

## 12. Carry-over + Retrospective

> 본 §12 + Sprint 14 §12 두 dev doc 만 읽고 Sprint 16 PM 이 시작 가능해야 함 (헌법 #2 자가완결).

(워커 머지 + receipt 검증 후 PM 보강)
