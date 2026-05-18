# Sprint 15 — Inheritance Cleanup (branch=C, eighth inheritance pattern)

> 이 문서는 *영속 메모리* 입니다. PM 단독 큐레이션. 워커는 transcript 4 줄만 남기고, PM 이 본 dev doc §10/§11/§12 를 직접 작성.

## 사전 점검 의무 (Sprint 13 강화 + Sprint 14 신규)

1. **origin/main 동기화 (헌법 #3)** — `git rev-parse main == git rev-parse origin/main` 1회. 본 sprint 시작 시점 base = `bafccca` (Sprint 14 마감 commit).
2. **헌법 #13 (worktree-bypass) 영속 검증** — `grep -l D-S14-worktree-bypass-prohibition .claude/agents/*.md | wc -l == 7`.
3. **stale fixture 사전 검증 의무 (Sprint 14 신규)** — `.receipt-runner/*.mjs` 안 `team-leader` 토큰 grep 결과 7 파일 잔존 확인 완료 (T1 슬라이스 입력):
   - `sprint7-contract-gap-policy.mjs:24` `'team-leader.md'`
   - `sprint7-inspector-unlink-decision.mjs:1` header
   - `sprint8-external-data-index.mjs:1` header
   - `sprint8-frozen-decisions-carry-over.mjs:1` header
   - `sprint8-pii-policy.mjs:1` header
   - `sprint9-pakda-term-zero.mjs:141` 8 워커 list
   - `sprint9-spawn-prompt-update.mjs:28` 8 워커 list
4. **PM worktree 생명주기 (Sprint 14 신규)** — Sprint 시작 시 1회 EnterWorktree → 매 phase 사이 base ff merge → 마감 시 ExitWorktree. Phase 도중 새 worktree 생성 금지.

## 1. Goal

**[FROZEN v2026-05-18 D-S15-branch] branch=C inheritance-cleanup (eighth inheritance pattern, 외부 데이터 8 연속 미도착 회피).**

외부 데이터 N≥3 미도착 8 연속 (Sprint 8~15). branch=A 불가. branch=B no-op 은 5 연속 (Sprint 10/11/12 + 12-X4 + 본 sprint 시) 위험으로 거부. Sprint 14 신규 carry-over 5건 중 高 1건 (`O-S14-receipt-runner-stale-fixture-cleanup`) + 中 1건 (`O-S14-mobile-screen-theme-aware-migration`) 회수 + 사전 합의된 시스템 부채 1건 (`dedupConcepts` 알고리즘 시그니처 frozen, 채택/임계 결정은 외부 데이터 후로 분리) 발효.

**3 슬라이스 (모두 producer-only, 동시 dispatch 가능) + T4 PM consumer**:
- **T1 (tester) producer-only** — receipt-runner stale fixture cleanup + LEGACY_WRAP 분기 영구 제거 + sprint-15.sh + 신규 fixture 3.
- **T2 (mobile) producer-only** — 6 screen + children 30+ 위치 useTheme() 마이그레이션 (D-S14-mobile-theme-aware-pattern 본격 rollout).
- **T3 (engine) producer-only** — `dedupConcepts` 알고리즘 시그니처/결정성/입출력 계약 frozen (DRAFT 마크 제거). 채택/임계 결정은 D-S9-concept-dedup reconfirm 으로 분리.
- **T4 (PM) consumer** — 3 슬라이스 머지 후 dev doc §10/§11/§12 큐레이션 + receipt 실측 + Sprint 16 skeleton + 마감.

## 2. Deliverable & Receipt

**Deliverable**:
1. `.receipt-runner/*.mjs` 안 `team-leader` / `team_leader` 토큰 0 건 (7 파일 정리, 정확한 7 워커 list 로 교체).
2. `sprint-13.sh` + `sprint-14.sh` 의 `LEGACY_WRAP_FAIL_TOLERATED` 분기 영구 제거.
3. `sprint-9.sh` 직접 PASS (wrap 없이) — sprint-13.sh / sprint-14.sh wrap 도 LEGACY 분기 없이 PASS.
4. `apps/mobile/app/{onboarding,chat,ghost,suggestion,strong,inspector}/index.tsx` 및 children 의 `colorsHex.light.*` 직접 참조 0건. 모두 `useTheme()` → `{ colorsHex }` → `colorsHex.*`.
5. `packages/engine/src/dedupConcepts.ts:2` 상단의 DRAFT 마크 (T8 외부 데이터 신호 후 frozen 예정 메모) → `[FROZEN v2026-05-18 D-S15-dedup-signature]` 교체. 알고리즘 시그니처 (`dedupConcepts / MergePlan / DedupOptions / DedupConceptInput / EmbedSimilarityFn / NormalizeLabelFn / DEFAULT_DEDUP_EMBED_THRESHOLD`) 변경 0.
6. `scripts/receipt/sprint-15.sh` — Sprint 14 wrap (LEGACY 분기 제거된 상태) + 신규 3 단계 (stale 토큰 0 + theme-aware mobile screens 0 hardcoded + dedup frozen marker).

**Receipt 명령**:
```bash
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-15.sh
```
exit 0 + 74/74 PASS 기대 + 임계 11종 (Sprint 14 의 8 + 신규 3).

## 3. Scope

**In**:
- T1: 7 fixture 파일 stale 토큰 정리 + LEGACY_WRAP 분기 sprint-13.sh + sprint-14.sh 모두 영구 제거 + sprint-15.sh 신규 + 신규 fixture 3종 (`sprint15-stale-token-zero.mjs` / `sprint15-mobile-theme-aware.mjs` / `sprint15-dedup-frozen-marker.mjs`).
- T2: 6 screen index + children (ChatHeader / UserBubble / AIBubble / TypingDots / SatisfactionSurveyOverlay / Composer 등) 의 hardcoded `colorsHex.light.*` 참조 모두 `useTheme()` 패턴 swap.
- T3: `dedupConcepts.ts` 코멘트 DRAFT → FROZEN 마크 swap + 시그니처 변경 0 확인 + `dedup-concepts.test.ts` 단위 테스트 PASS 재확인.

**Out** (Sprint 15 범위 아님, Sprint 16 carry-over 로 이월):
- Sprint 14 carry-over 低 3건 (`O-S14-mobile-jest-actual-run-threshold` / `O-S14-worktree-bypass-commit-history-scan` / `O-S14-jest-expo-pnpm-coupling`).
- 미해소 D-S9-* 5종 + 1 reconfirm (외부 데이터 의존).
- dedup 채택 결정 + embedThreshold 튜닝 (D-S9-concept-dedup reconfirm 의 일부, 외부 데이터 후).

## 4. Architecture & Data Flow

**T1 (receipt-runner cleanup)**:
- stale 토큰 7 위치 → 정확한 7 워커 list (`conversation / designer / engine / mobile / orchestrator / storage / tester`, Sprint 13 commit `7419216`) 로 교체. 카운트 의존 코드는 `7` 로 갱신.
- LEGACY 분기 제거: `sprint-13.sh:64~87` + `sprint-14.sh:60~79` 의 `LEGACY_WRAP_FAIL_TOLERATED` 환경 우회 + 관련 echo 영구 삭제. sprint-9.sh 가 단독 PASS 해야만 wrap 통과.
- sprint-15.sh: sprint-14.sh wrap (분기 제거된 상태) + 신규 3 단계 raw marker 검증.

**T2 (theme-aware migration)**:
- 6 screen 의 stylesheet / inline 색상 ref `colorsHex.light.*` → `const { colorsHex } = useTheme(); … colorsHex.*` swap.
- 디자인 토큰 자체 변경 0 — light/dark inversion 은 `themeStore` 책임. consumer 는 토큰 ref 만.

**T3 (dedup frozen)**:
- 알고리즘 변경 0. 코멘트만 DRAFT → FROZEN marker swap.
- engine root index 의 `dedupConcepts / MergePlan / DEFAULT_DEDUP_EMBED_THRESHOLD` export 변경 0 (사전 확인: 모두 존재).

## 5. File Ownership

| 워커 | 영역 |
|---|---|
| T1 tester | `scripts/receipt/.receipt-runner/sprint{7,8,9}-*.mjs` (7 파일), `scripts/receipt/sprint-{13,14,15}.sh`, `scripts/receipt/.receipt-runner/sprint15-*.mjs` (신규 3) |
| T2 mobile | `apps/mobile/app/{onboarding,chat,ghost,suggestion,strong,inspector}/index.tsx` 및 children (ChatHeader / UserBubble / AIBubble / TypingDots / SatisfactionSurveyOverlay / Composer 등) |
| T3 engine | `packages/engine/src/dedupConcepts.ts` (코멘트만), `packages/engine/index.ts` (변경 0 확인) |
| T4 PM | `docs/sprints/sprint-15-external-data-arrival.md` §10/§11/§12, `docs/sprints/_current.txt`, `docs/sprints/sprint-16-*.md` skeleton |

## 5.5 Worker Slices

```
T1 (tester) ───┐
T2 (mobile) ───┼──► T4 (PM consumer)
T3 (engine) ───┘
```

3 워커 모두 producer-only, 의존 0 — **동시 dispatch 가능**. T4 는 3 머지 후 consumer.

| 슬라이스 | 워커 | 의존 | 산출물 |
|---|---|---|---|
| T1 | tester | 없음 | 7 fixture stale 정리 + LEGACY 분기 제거 + sprint-15.sh + 신규 fixture 3 |
| T2 | mobile | 없음 | 6 screen + children theme-aware swap |
| T3 | engine | 없음 | dedupConcepts FROZEN marker + 시그니처 보존 검증 |
| T4 | PM | T1+T2+T3 머지 | dev doc §10/§11/§12 + receipt 실측 + sprint-16 skeleton + push + tag |

## 6. Tasks

### T1 — receipt-runner stale fixture cleanup (tester, producer-only)

**Input**:
- B2 진단 (Sprint 14 §11): 7 파일 stale 토큰 정확한 라인 위치 (위 사전 점검 §3 참조)
- 7 워커 정확한 list: `conversation / designer / engine / mobile / orchestrator / storage / tester` (Sprint 13 commit `7419216`)
- 헌법 #13 worktree-bypass 준수 의무

**Tasks**:
1. 7 파일 stale 토큰 (`team-leader / team_leader / 'team-leader.md' / 8 워커 list`) 정확한 라인 위치 grep + 정확한 7 워커 list 로 교체. 카운트 의존 코드는 `7` 로 갱신.
2. `sprint-13.sh:64~87` + `sprint-14.sh:60~79` 의 `LEGACY_WRAP_FAIL_TOLERATED` 분기 + 관련 echo + 환경변수 export 영구 삭제. `sprint-9.sh` 가 직접 PASS 해야만 wrap 통과.
3. `sprint-13.sh` + `sprint-14.sh` 단독 실측 PASS 검증 (LEGACY 우회 없이).
4. `scripts/receipt/sprint-15.sh` 작성:
   - sprint-14.sh wrap (LEGACY 분기 제거된 상태)
   - 신규 3 단계 + fixture 3:
     - `sprint15-stale-token-zero.mjs` — `.receipt-runner/*.mjs` 안 team-leader 계열 토큰 0 raw marker (`stale_team_leader_token_count=0`)
     - `sprint15-mobile-theme-aware.mjs` — 6 screen index + children 의 `colorsHex.light.` 직접 참조 0 raw marker (`hardcoded_light_token_count=0`)
     - `sprint15-dedup-frozen-marker.mjs` — `dedupConcepts.ts` 상단의 `[FROZEN v2026-05-18 D-S15-dedup-signature]` 매칭 raw marker (`dedup_frozen_marker=1`)
5. 헌법 #13 worktree-bypass 준수: 시작 시 `pwd` 1회 + commit 직전 `git rev-parse --show-toplevel` 1회.

**Output (transcript 4 줄 표준)**:
- 슬라이스 결과 (PASS/FAIL + 정리한 파일 수)
- Interfaces (sprint-15.sh raw marker 11종 또는 신규 3종 명세)
- Carry-over (Sprint 16 로 이월할 신규 발견)
- Frozen 위반 여부 (기대 0)

### T2 — mobile theme-aware migration (mobile, producer-only)

**Input**:
- D-S14-mobile-theme-aware-pattern (Sprint 14): `useTheme()` → `{ colorsHex }` → `colorsHex.ink` 직접 참조 패턴
- B1 carry-over a/b: `chat/index.tsx` 30+ 위치 + 5 화면 useTheme 미적용

**Tasks**:
1. 6 화면 (`onboarding / chat / ghost / suggestion / strong / inspector`) 의 `index.tsx` + children 의 `colorsHex.light.*` 직접 참조 grep → 각 위치 `const { colorsHex } = useTheme();` 추가 + `colorsHex.*` swap.
2. children (ChatHeader / UserBubble / AIBubble / TypingDots / SatisfactionSurveyOverlay / Composer 등) 모두 동일 패턴.
3. 디자인 토큰 자체 변경 0 — light/dark inversion 은 `themeStore` 책임.
4. light/dark 양쪽 시각 검증 (themeStore.toggle()).
5. 헌법 #13 worktree-bypass 준수.

**Output (transcript 4 줄)**: 동일 형식.

### T3 — dedupConcepts frozen (engine, producer-only)

**Input**:
- Sprint 8 T6 사전 구현 사유: 알고리즘 자체는 외부 데이터 신호와 독립 (결정성 + 정합성 단위 테스트 검증)
- 사용자 부록 A P0 (출시 체크리스트): Clustering frozen
- 사전 확인: `dedup-concepts.test.ts` 단위 테스트 존재, engine root index 의 `dedupConcepts / MergePlan / DEFAULT_DEDUP_EMBED_THRESHOLD` export 정상

**Tasks**:
1. `packages/engine/src/dedupConcepts.ts:2` 상단의 DRAFT 마크 (T8 외부 데이터 신호 후 frozen 예정 메모) → `[FROZEN v2026-05-18 D-S15-dedup-signature — 시그니처/결정성/입출력 계약 동결. 채택 결정 + embedThreshold 튜닝은 D-S9-concept-dedup reconfirm (외부 데이터 도착 후) 으로 분리.]` 교체.
2. `dedupConcepts / MergePlan / DedupOptions / EmbedSimilarityFn / NormalizeLabelFn / DedupConceptInput / DEFAULT_DEDUP_EMBED_THRESHOLD` 시그니처 변경 0 확인 (grep 결과 + 파일 diff = 코멘트만).
3. `packages/engine/index.ts` export 변경 0 확인 (이미 정상).
4. `pnpm --filter @synapse/engine test dedup-concepts` 단위 테스트 PASS 재확인.
5. 헌법 #13 worktree-bypass 준수.

**Output (transcript 4 줄)**: 동일 형식.

### T4 — PM consumer (PM 직접, T1+T2+T3 머지 후)

1. 3 워커 transcript 4 줄 × 3 확인.
2. main 으로 squash merge (각 worktree → PM 1회씩). 매 머지 직후 즉시 `git push origin main` (헌법 #3).
3. `SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-15.sh` 실측 PASS.
4. dev doc §10 Implementation Map / §11 Decisions Made / Open Issues / §12 Carry-over + Retrospective 작성.
5. `docs/sprints/_current.txt = 16` 갱신, `sprint-16-*.md` skeleton 작성 (Sprint 14 carry-over 低 3건 + D-S9 외부 데이터 의존 6 종 이월 명시).
6. `git tag sprint-15-closed` + `git push origin main --tags`.

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
- 헌법 #13 [FROZEN v2026-05-15 D-S14-worktree-bypass-prohibition] — 7 워커 파일 본문 보존, 본 sprint 워커 dispatch 직전 검증 의무.
- 헌법 #12 [FROZEN v2026-04-30 D-S9-no-pakda-term] — no-pakda 정책 (자세한 정의는 헌법 ID 참조), 본 sprint 모든 dev doc / transcript / commit / 보고 0건 강제.
- 헌법 #11 [Directive 진단 mismatch 보고] — Sprint 14 B2 first 적용 패턴 본 sprint 워커도 동일 (directive 인용 + 자기 실측 + 별개 원인 후보 + ack 보류).
- 헌법 #3 [origin/main 동기화 의무] — 매 워커 머지 직후 즉시 push, 다음 워커 dispatch 직전 동기화 1회 검증.

**Decisions Made (작성 시점)**:
- **[FROZEN v2026-05-18 D-S15-branch] branch=C inheritance-cleanup eighth** — 외부 데이터 8 연속 미도착, branch=A 불가. branch=B no-op 5 연속 위험 거부. branch=C 의 high+mid carry-over 회수 + 사전 합의된 시스템 부채 (dedup frozen) 발효.
- **[FROZEN v2026-05-18 D-S15-dedup-signature]** — `dedupConcepts` 알고리즘 시그니처/결정성/입출력 계약 동결. 채택 결정 + embedThreshold 튜닝 + storage adapter wiring 은 D-S9-concept-dedup reconfirm (외부 데이터 도착 후) 으로 분리. 출시 체크리스트 부록 A P0 Clustering frozen 정합.
- **[FROZEN v2026-05-18 D-S15-legacy-wrap-removal]** — `LEGACY_WRAP_FAIL_TOLERATED` 분기 영구 제거. Sprint 14 의 D-S14-legacy-wrap-fail-tolerated-removal REVOKED 결정을, T1 stale fixture cleanup 으로 근본 원인 해소 후 재발효.
- **[FROZEN v2026-05-18 D-S15-mobile-theme-aware-rollout]** — 6 screen + children 30+ 위치 useTheme() 패턴 적용. D-S14-mobile-theme-aware-pattern 의 본격 rollout.

**Open Issues (마감 시점 보강)**: (워커 머지 후)

## 12. Carry-over + Retrospective

> 본 §12 + Sprint 14 §12 두 dev doc 만 읽고 Sprint 16 PM 이 시작 가능해야 함 (헌법 #2 자가완결).

(워커 머지 + receipt 검증 후 PM 보강)
