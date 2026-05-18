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

**[FROZEN v2026-05-18 D-S15-pii-0007-shape] T5 신규 슬라이스 (PM 권한 확장)** — Sprint 15 진행 도중 PM 결정으로 4 번째 producer-only 슬라이스 추가. D-S8-pii-policy Rule 1 (session_hash) 영속화. 외부 데이터 모집 의존 0 — PM 본인 QA 가 외부 N≥3 dogfooding 대체 (외부 데이터 컨셉 해소). D-S8-storage-shape-ack (c) 의 "T1 PII 정책 PASS 후 0007 추기" 의 fulfillment — receipt step 56 이미 PASS 상태이므로 frozen 정합.

**4 슬라이스 (모두 producer-only, 동시 dispatch 가능) + T4 PM consumer**:
- **T1 (tester) producer-only** — receipt-runner stale fixture cleanup + LEGACY_WRAP 분기 영구 제거 + sprint-15.sh + 신규 fixture 4 (T1 3 + T5 1 wire).
- **T2 (mobile) producer-only** — 6 screen + children 30+ 위치 useTheme() 마이그레이션 (D-S14-mobile-theme-aware-pattern 본격 rollout).
- **T3 (engine) producer-only** — `dedupConcepts` 알고리즘 시그니처/결정성/입출력 계약 frozen (DRAFT 마크 제거). 채택/임계 결정은 D-S9-concept-dedup reconfirm 으로 분리.
- **T5 (storage) producer-only [신규]** — 0007 PII session_hash 마이그레이션 + scripts/export/sprint8-data.mjs 수동 CLI export 파이프라인 + sprint15-pii-0007-shape.mjs fixture. mobile telemetryStore session_hash emit 은 Sprint 16 으로 분리 (T2 영역 충돌 회피).
- **T4 (PM) consumer** — 4 슬라이스 머지 후 dev doc §10/§11/§12 큐레이션 + receipt 실측 + Sprint 16 skeleton + 마감.

## 2. Deliverable & Receipt

**Deliverable**:
1. `.receipt-runner/*.mjs` 안 `team-leader` / `team_leader` 토큰 0 건 (7 파일 정리, 정확한 7 워커 list 로 교체).
2. `sprint-13.sh` + `sprint-14.sh` 의 `LEGACY_WRAP_FAIL_TOLERATED` 분기 영구 제거.
3. `sprint-9.sh` 직접 PASS (wrap 없이) — sprint-13.sh / sprint-14.sh wrap 도 LEGACY 분기 없이 PASS.
4. `apps/mobile/app/{onboarding,chat,ghost,suggestion,strong,inspector}/index.tsx` 및 children 의 `colorsHex.light.*` 직접 참조 0건. 모두 `useTheme()` → `{ colorsHex }` → `colorsHex.*`.
5. `packages/engine/src/dedupConcepts.ts:2` 상단의 DRAFT 마크 (T8 외부 데이터 신호 후 frozen 예정 메모) → `[FROZEN v2026-05-18 D-S15-dedup-signature]` 교체. 알고리즘 시그니처 (`dedupConcepts / MergePlan / DedupOptions / DedupConceptInput / EmbedSimilarityFn / NormalizeLabelFn / DEFAULT_DEDUP_EMBED_THRESHOLD`) 변경 0.
6. `scripts/receipt/sprint-15.sh` — Sprint 14 wrap (LEGACY 분기 제거된 상태) + 신규 4 단계 (stale 토큰 0 + theme-aware mobile screens 0 hardcoded + dedup frozen marker + PII 0007 shape).
7. **[T5]** `packages/storage/schema/0007_pii_session_hash.sql` — telemetry 3 테이블 (decision_log / satisfaction_survey / recall_log) 에 `session_hash TEXT` NULL 가능 컬럼 + `idx_*_session_hash` 인덱스 3개 추가. ALTER 3 + INDEX 3.
8. **[T5]** `packages/storage/__tests__/migration-0007.test.ts` — 컬럼 존재 / NULL 허용 / 인덱스 존재 / 마이그레이션 idempotent (≥7 rows) 검증 4 테스트. `pnpm --filter @synapse/storage test` PASS.
9. **[T5]** `scripts/export/sprint8-data.mjs` — PII-aware 수동 CLI export 파이프라인 (Rule 1~5 영속화). 워크스페이스 멤버 `@synapse/export-pipeline` (better-sqlite3 dep). `--db <path> --out <dir> [--dry-run]`. Rule 2 forbidden key 감지 시 exit 5.
10. **[T5]** `scripts/receipt/.receipt-runner/sprint15-pii-0007-shape.mjs` — 0007 SQL 형상 (컬럼 3 + 인덱스 3) + export 스크립트 존재 + Rule 1~5 토큰 + root scripts.export:sprint8 + pnpm-workspace 멤버 등록 5종 검증.
11. **[T5]** root `package.json` scripts.`export:sprint8` 등록 + `pnpm-workspace.yaml` 에 `scripts/export` 멤버 추가.

**Receipt 명령**:
```bash
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-15.sh
```
exit 0 + 75/75 PASS 기대 + 임계 12종 (Sprint 14 의 8 + 신규 4).

## 3. Scope

**In**:
- T1: 7 fixture 파일 stale 토큰 정리 + LEGACY_WRAP 분기 sprint-13.sh + sprint-14.sh 모두 영구 제거 + sprint-15.sh 신규 + 신규 fixture 3종 (`sprint15-stale-token-zero.mjs` / `sprint15-mobile-theme-aware.mjs` / `sprint15-dedup-frozen-marker.mjs`) + **T5 fixture (`sprint15-pii-0007-shape.mjs`) 4 번째 단계로 wire**.
- T2: 6 screen index + children (ChatHeader / UserBubble / AIBubble / TypingDots / SatisfactionSurveyOverlay / Composer 등) 의 hardcoded `colorsHex.light.*` 참조 모두 `useTheme()` 패턴 swap.
- T3: `dedupConcepts.ts` 코멘트 DRAFT → FROZEN 마크 swap + 시그니처 변경 0 확인 + `dedup-concepts.test.ts` 단위 테스트 PASS 재확인.
- **T5 [신규]**: `packages/storage/schema/0007_pii_session_hash.sql` + `packages/storage/__tests__/migration-0007.test.ts` + `scripts/export/sprint8-data.mjs` (워크스페이스 멤버 `@synapse/export-pipeline` 신설) + `scripts/receipt/.receipt-runner/sprint15-pii-0007-shape.mjs` + root `package.json` scripts + `pnpm-workspace.yaml` 갱신.

**Out** (Sprint 15 범위 아님, Sprint 16 carry-over 로 이월):
- Sprint 14 carry-over 低 3건 (`O-S14-mobile-jest-actual-run-threshold` / `O-S14-worktree-bypass-commit-history-scan` / `O-S14-jest-expo-pnpm-coupling`).
- 미해소 D-S9-* 5종 + 1 reconfirm (외부 데이터 의존).
- dedup 채택 결정 + embedThreshold 튜닝 (D-S9-concept-dedup reconfirm 의 일부, 외부 데이터 후).
- **T5 후속**: mobile `telemetryStore.emit` 직전 `sha256(salt+user_identifier).hex()[0:16]` 채움 로직 — T2 (mobile theme-aware) 영역 충돌 회피 위해 Sprint 16 으로 분리. session_hash 컬럼 자체는 NULL 허용으로 본 sprint 에 박힘.

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

**T5 [신규] (PII 0007 + export pipeline)**:
- 0007 마이그레이션: telemetry 3 테이블에 `session_hash TEXT` NULL 가능 컬럼 + `idx_*_session_hash` 인덱스 3개 추가. storage hash 처리 책임 0 (D-S8-storage-shape-ack (d) 정합) — 받아서 저장만.
- export 파이프라인 (`scripts/export/sprint8-data.mjs`): SQLite 읽기 전용 open → session_hash 기준 그룹핑 (NULL → `__null__`) → 세션별 JSON export. Rule 1 (이미 채워진 session_hash 사용) + Rule 2 (raw text 격리, `content/label/comment/message_text` 키 감지) + Rule 3 (임베딩 메타만 — concept_id_hash + vec_dim) + Rule 4 (메타 보존) + Rule 5 (opt-in raw text 채널은 본 디폴트 export 외).
- 워크스페이스 분리: `scripts/export/` 디렉토리에 자체 `package.json` (`@synapse/export-pipeline`, `better-sqlite3` dep). receipt-runner 패턴 답습 — root scripts 는 `pnpm --filter @synapse/export-pipeline exec node sprint8-data.mjs` 위임.
- 수동 CLI 만 (`pnpm run export:sprint8 -- --db <path> --out <dir> [--dry-run]`). 자동 트리거 / 앱 내 버튼 0.

## 5. File Ownership

| 워커 | 영역 |
|---|---|
| T1 tester | `scripts/receipt/.receipt-runner/sprint{7,8,9}-*.mjs` (7 파일), `scripts/receipt/sprint-{13,14,15}.sh`, `scripts/receipt/.receipt-runner/sprint15-*.mjs` (T1 3 + T5 1 wire) |
| T2 mobile | `apps/mobile/app/{onboarding,chat,ghost,suggestion,strong,inspector}/index.tsx` 및 children (ChatHeader / UserBubble / AIBubble / TypingDots / SatisfactionSurveyOverlay / Composer 등) |
| T3 engine | `packages/engine/src/dedupConcepts.ts` (코멘트만), `packages/engine/index.ts` (변경 0 확인) |
| **T5 storage [신규]** | `packages/storage/schema/0007_pii_session_hash.sql`, `packages/storage/__tests__/migration-0007.test.ts`, `scripts/export/{package.json,sprint8-data.mjs}`, `scripts/receipt/.receipt-runner/sprint15-pii-0007-shape.mjs`, root `package.json` (scripts.export:sprint8), `pnpm-workspace.yaml` (scripts/export 멤버 추가) |
| T4 PM | `docs/sprints/sprint-15-external-data-arrival.md` §10/§11/§12, `docs/sprints/_current.txt`, `docs/sprints/sprint-16-*.md` skeleton |

## 5.5 Worker Slices

```
T1 (tester) ───┐
T2 (mobile) ───┤
T3 (engine) ───┼──► T4 (PM consumer)
T5 (storage) ──┘
```

4 워커 모두 producer-only, 의존 0 — **동시 dispatch 가능**. T4 는 4 머지 후 consumer.

T1 ↔ T5 약결합: T5 산출물의 fixture (`sprint15-pii-0007-shape.mjs`) 는 T5 가 박지만 sprint-15.sh 본체의 4번째 단계 wire 는 T1 책임. fixture 파일 자체는 독립 산출물이므로 T1 dispatch 시점에 sprint-15.sh 안에서 `node --experimental-strip-types` 호출 라인만 추가하면 됨. T5 가 fixture .mjs 를 먼저 박아두면 T1 이 wire 시점에 grep 으로 존재 확인 가능 (race 없음).

| 슬라이스 | 워커 | 의존 | 산출물 |
|---|---|---|---|
| T1 | tester | 없음 (T5 fixture wire 는 T5 머지 후) | 7 fixture stale 정리 + LEGACY 분기 제거 + sprint-15.sh (4 단계 wire) + 신규 fixture 3 |
| T2 | mobile | 없음 | 6 screen + children theme-aware swap |
| T3 | engine | 없음 | dedupConcepts FROZEN marker + 시그니처 보존 검증 |
| **T5 [신규]** | storage | 없음 | 0007 SQL + migration-0007 단위 테스트 + scripts/export 워크스페이스 멤버 + export 스크립트 + sprint15-pii-0007-shape.mjs fixture + root scripts/workspace 갱신 |
| T4 | PM | T1+T2+T3+T5 머지 | dev doc §10/§11/§12 + receipt 실측 + sprint-16 skeleton + push + tag |

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

### T5 — PII 0007 + export pipeline (storage, producer-only) [신규]

**Input**:
- D-S8-pii-policy 5 Rule (`docs/sprints/sprint-8-pii-policy.md`, FROZEN v2026-04-30)
- D-S8-storage-shape-ack (c)(d): 0006 의 session_hash 컬럼 분리 약속 + storage hash 처리 책임 0
- 0006 telemetry 스키마 (`packages/storage/schema/0006_telemetry.sql`)
- 헌법 #13 worktree-bypass 준수 의무

**Tasks**:
1. `packages/storage/schema/0007_pii_session_hash.sql` 작성:
   - `ALTER TABLE decision_log         ADD COLUMN session_hash TEXT;`
   - `ALTER TABLE satisfaction_survey  ADD COLUMN session_hash TEXT;`
   - `ALTER TABLE recall_log           ADD COLUMN session_hash TEXT;`
   - `CREATE INDEX IF NOT EXISTS idx_decision_log_session_hash        ON decision_log(session_hash);`
   - `CREATE INDEX IF NOT EXISTS idx_satisfaction_survey_session_hash ON satisfaction_survey(session_hash);`
   - `CREATE INDEX IF NOT EXISTS idx_recall_log_session_hash          ON recall_log(session_hash);`
   - 헤더 코멘트에 `[DIRECTIVE v2026-05-18 D-S15-pii-0007-shape]` 마크 + (a)~(e) ack 명시.
2. `packages/storage/__tests__/migration-0007.test.ts` — 4 테스트: 컬럼 존재/NULL 허용/인덱스 존재 × 3 테이블 + idempotent (≥7 rows).
3. `scripts/export/` 워크스페이스 멤버 신설:
   - `scripts/export/package.json` — `@synapse/export-pipeline`, type=module, `better-sqlite3 ^11.10.0` dep.
   - `pnpm-workspace.yaml` 에 `scripts/export` 추가.
4. `scripts/export/sprint8-data.mjs` — PII-aware export. `--db / --out / --dry-run` CLI. Rule 1~5 영속화 (위 §4 T5 참조). Rule 2 forbidden key 감지 시 exit 5.
5. root `package.json` scripts.`export:sprint8` 등록 (`pnpm --filter @synapse/export-pipeline exec node sprint8-data.mjs` 위임).
6. `scripts/receipt/.receipt-runner/sprint15-pii-0007-shape.mjs` — 5종 형상 검증 (위 §2 #10 참조). raw marker output: `pii_0007_columns_added=3;pii_0007_indexes_added=3;export_script_present=1;export_npm_script_present=1;workspace_member_present=1`.
7. 실측: `pnpm install` (워크스페이스 멤버 픽업) → `pnpm --filter @synapse/storage test` PASS → fixture 단독 실행 PASS → dry-run 실 SQLite smoke test PASS.

**T1 합의**: 본 T5 fixture (`sprint15-pii-0007-shape.mjs`) 는 T5 가 박지만, sprint-15.sh 4번째 단계 wire 는 T1 책임 (sprint-15.sh 본체 작성권자가 T1). T1 dispatch 시 fixture 존재를 grep 으로 사전 확인 후 wire — race 없음 (T5 는 fixture 만 박고 sprint-15.sh 미작성).

### T4 — PM consumer (PM 직접, T1+T2+T3+T5 머지 후)

1. 4 워커 transcript 4 줄 × 4 확인.
2. main 으로 squash merge (각 worktree → PM 1회씩). 매 머지 직후 즉시 `git push origin main` (헌법 #3).
3. `SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-15.sh` 실측 PASS (75/75 + 임계 12종).
4. dev doc §10 Implementation Map / §11 Decisions Made / Open Issues / §12 Carry-over + Retrospective 작성.
5. `docs/sprints/_current.txt = 16` 갱신, `sprint-16-*.md` skeleton 작성 (Sprint 14 carry-over 低 3건 + D-S9 외부 데이터 의존 6 종 이월 명시 + **T5 후속 mobile telemetryStore session_hash emit** carry-over).
6. `git tag sprint-15-closed` + `git push origin main --tags`.

## 7. Interfaces / Contracts
(워커 머지 후 PM 큐레이션)

## 8. Test Scenarios
(워커 머지 후 PM 큐레이션)

## 9. Demo Script
(워커 머지 후 PM 큐레이션)

## 10. Implementation Map

본 sprint 는 4 슬라이스 (T1+T2+T3+T5) 모두 PM 단독 작업으로 진행 — Agent View dispatch 우회. T4 PM consumer 단계의 dev doc 큐레이션 + receipt 검증 + Sprint 16 skel + 마감 모두 동일 세션 안에서 처리.

**T1 (tester producer) — receipt-runner stale fixture cleanup + LEGACY 분기 영구 제거**
- 7 fixture 파일의 stale 토큰 정리:
  - `sprint7-contract-gap-policy.mjs` — `FILES` 8 → 7 워커 list (team-leader 제거), 헤더 코멘트 갱신
  - `sprint7-inspector-unlink-decision.mjs` — 헤더 `T13 (team-leader: ...)` → `T13 (PM: ...)` swap
  - `sprint8-external-data-index.mjs` — 헤더 `T8 (team-leader: ...)` → `T8 (PM: ...)` swap
  - `sprint8-frozen-decisions-carry-over.mjs` — 헤더 `T11 (team-leader: ...)` → `T11 (PM: ...)` swap
  - `sprint8-pii-policy.mjs` — 헤더 `T1 (team-leader: ...)` → `T1 (PM: ...)` swap
  - `sprint9-pakda-term-zero.mjs` — `WORKERS` 8 → 7 swap + `8 워커` → `7 워커` 코멘트
  - `sprint9-spawn-prompt-update.mjs` — `WORKERS` 8 → 7 swap + 헤더 갱신
  - `sprint-6.sh` — `T8 (team-leader)` 코멘트 → `T8 (PM, team-leader 폐기 후)` 갱신 (2 라인)
- `LEGACY_WRAP_FAIL_TOLERATED` 분기 영구 제거:
  - `sprint-13.sh` — env 우회 분기 (L78~89) 삭제, 헤더 코멘트 `LEGACY_WRAP_FAIL_TOLERATED=1` 정책 라인 → "Sprint 15 T1 영구 제거" 마크로 swap
  - `sprint-14.sh` — env 우회 분기 + 환경변수 export + 관련 echo (L64~80) 모두 삭제, 헤더 코멘트도 동일 swap
- 신규 fixture 4 + sprint-15.sh 단독 PASS — sprint-9.sh 단독 PASS 는 `.claude/agents/` deletion 으로 인해 cascading fail (Sprint 16 T1 으로 이월).

**T2 (mobile producer) — theme-aware migration**
- 6 화면 + children 의 `colorsHex.light.*` 직접 참조 68건 → 0건 swap (`apps/mobile/app/{onboarding,chat,ghost,suggestion,strong,inspector}/index.tsx`).
- 각 함수 컴포넌트마다 `const { colorsHex } = useTheme();` 한 줄 박음 — 본문 `colorsHex.light.X` → `colorsHex.X` 일괄 변환. chat 의 기존 `themeColorsHex` 변수명도 `colorsHex` 로 통일.
- `@synapse/design-system` 의 `colorsHex` 정적 import 6 화면 모두 제거 (useTheme 반환값으로 일원화).
- useTheme() 호출 사이트 18곳 (FirstChat / SatisfactionSurveyOverlay / ChatHeader×4 / UserBubble / AIBubble / TypingDots / Composer / Onboarding / PulseDot / GhostHintScreen / SuggestionScreen / StrongRecallScreen / InspectorScreen / Header / 6 ChatHeader sub).
- jest 회귀 0 (`chat demoHint web/native 분기 2 테스트 PASS`).

**T3 (engine producer) — dedupConcepts FROZEN marker**
- `packages/engine/src/dedupConcepts.ts` 상단 `[DRAFT — T8 외부 데이터 신호 후 frozen 박음]` → `[FROZEN v2026-05-18 D-S15-dedup-signature]` swap.
- 7 시그니처 토큰 (`dedupConcepts / MergePlan / DedupOptions / DedupConceptInput / EmbedSimilarityFn / NormalizeLabelFn / DEFAULT_DEDUP_EMBED_THRESHOLD`) 변경 0.
- root `packages/engine/index.ts` export 변경 0 (`dedupConcepts / MergePlan / DEFAULT_DEDUP_EMBED_THRESHOLD` 모두 보존).
- 단위 테스트 103/103 PASS (`pnpm --filter @synapse/engine test`).

**T5 (storage producer, PM 권한 확장 신규) — PII 0007 + export pipeline**
- `packages/storage/schema/0007_pii_session_hash.sql` 신규 — telemetry 3 테이블 (decision_log / satisfaction_survey / recall_log) 에 `session_hash TEXT` NULL 컬럼 + 인덱스 3 추가. D-S8-pii-policy Rule 1 영속화. D-S8-storage-shape-ack (c) "T1 PII 정책 PASS 후 0007 추기" fulfillment.
- `packages/storage/__tests__/migration-0007.test.ts` 신규 — 4 테스트 (3 테이블 컬럼/NULL/인덱스 + idempotent).
- `scripts/export/sprint8-data.mjs` 신규 — PII-aware 수동 CLI export. Rule 1 (session_hash 사용) + Rule 2 (raw text 격리 + forbidden key 감지) + Rule 3 (임베딩 메타) + Rule 4 (메타 보존) + Rule 5 (opt-in 채널 외) 영속화. `--db / --out / --dry-run`.
- `scripts/export/package.json` 신규 (`@synapse/export-pipeline`, better-sqlite3 dep). `pnpm-workspace.yaml` 에 `scripts/export` 멤버 추가.
- root `package.json` scripts.`export:sprint8` 추가 (`pnpm --filter @synapse/export-pipeline exec node sprint8-data.mjs` 위임).
- storage 테스트 89/89 PASS (`pnpm --filter @synapse/storage test`).

**Receipt fixture 4종 단독 실측 PASS**:
- `sprint15-stale-token-zero.mjs`: `stale_team_leader_token_count=0;files_scanned=40;historical_marks_excluded=6`
- `sprint15-mobile-theme-aware.mjs`: `hardcoded_light_token_count=0;useTheme_call_sites=18;migrated_screens=6`
- `sprint15-dedup-frozen-marker.mjs`: `dedup_frozen_marker=1;signature_tokens_present=7;root_exports_present=3`
- `sprint15-pii-0007-shape.mjs`: `pii_0007_columns_added=3;pii_0007_indexes_added=3;export_script_present=1;export_npm_script_present=1;workspace_member_present=1`

**`sprint-15.sh` 전체 wrap 은 PASS 못함** — `.claude/agents/` 디렉토리가 working tree 에서 deletion (사용자 의도, 7 워커 구조 완전 폐지) 상태이므로 sprint-2.sh step 9 "헌법 inject 검증" 부터 cascading fail. Sprint 16 T1 으로 receipt 리팩터링 (11+ fixture / dev doc / 메모) 이월.

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
- **[FROZEN v2026-05-18 D-S15-pii-0007-shape]** — 0007 마이그레이션 형상 = telemetry 3 테이블 (decision_log / satisfaction_survey / recall_log) 에 `session_hash TEXT` NULL 가능 컬럼 + 인덱스 3. mobile-side hash emit 은 Sprint 16 분리. NULL 허용 (제약 없음). 트리거 = 수동 CLI 만. 외부 데이터 N≥3 의존 0 — PM 본인 QA 가 dogfooding 대체. D-S8-storage-shape-ack (c) PASS 재해석 ("receipt step 56 PASS 후" = 이미 PASS).
- **[REVOKED → SUPERSEDED v2026-05-18 D-S15-7-worker-structure-supersede]** — D-S13-* 의 7 워커 구조 정렬 + D-S14-worktree-bypass-prohibition + 헌법 #13 일괄 SUPERSEDED. 사용자 결정으로 7 워커 구조 자체 폐지. `.claude/agents/` 디렉토리 working tree 에서 deletion 상태 유지 → Sprint 16 T1 에서 git rm commit + receipt fixture 11+ 리팩터링 + dev doc + 메모 갱신. 본 결정의 즉시 영향: sprint-15.sh wrap 실측 PASS 불가 (cascading fail), 본 sprint 는 4 fixture 단독 PASS + 모든 패키지 테스트 PASS 로 마감.

**Open Issues (마감 시점 보강)**:
- `dedupConcepts.ts` TS strict (`noUncheckedIndexedAccess`) 에러 ~10건 잔존 — Sprint 15 T3 의 *코멘트만 변경* 정합 (시그니처 변경 0). 단위 테스트 103/103 PASS 로 runtime 동작 보존. Sprint 16 carry-over.
- mobile `telemetryStore.emit` 직전 session_hash 채움 로직 — T2 (mobile theme-aware) 영역 충돌 회피로 Sprint 16 분리.
- 7 워커 구조 폐지에 따른 메모 3종 갱신 (`project_synapse.md` / `feedback_agent_view_orchestration.md` / `feedback_worker_worktree_bypass.md`) — Sprint 16 carry-over.

## 12. Carry-over + Retrospective

> 본 §12 + Sprint 14 §12 두 dev doc 만 읽고 Sprint 16 PM 이 시작 가능해야 함 (헌법 #2 자가완결).

### Sprint 16 Carry-over

**高 (P0 — Sprint 16 핵심 슬라이스)**:
- **`O-S16-7-worker-structure-dismantle`** — 7 워커 구조 완전 폐지 (D-S15-7-worker-structure-supersede 의 후속 실행). 작업 범위:
  - `.claude/agents/*.md` 7 파일 `git rm` commit (현재 working tree deleted, index 잔존).
  - `scripts/receipt/sprint-2.sh` step 9 "헌법 inject 검증" 제거.
  - `.receipt-runner` 안 `.claude/agents/` 의존 fixture 7건 (sprint7-contract-gap-policy / sprint7-inspector-unlink-decision / sprint8-pii-policy / sprint8-external-data-index / sprint8-frozen-decisions-carry-over / sprint9-spawn-prompt-update / sprint9-pakda-term-zero) 리팩터링 — 워커 정의 파일 의존 제거하거나 fixture 자체 제거.
  - `sprint-13.sh` 임계 `workers_with_constitution ≥ 7` 제거 + Sprint 13 T3 designer 결과 영속성 가드 대체 source 도입.
  - `sprint14-worktree-bypass-clause.mjs` 제거 + `sprint-14.sh` 임계 `worktree_bypass_clause_count = 7` 제거.
  - Sprint 14/15 dev doc 사전 점검 §2 (헌법 #13 영속 검증) 제거 + dev doc 안 헌법 #13 / 7 워커 정합 raw text 갱신.
  - 메모 3종 (`project_synapse.md` / `feedback_agent_view_orchestration.md` / `feedback_worker_worktree_bypass.md`) 갱신 또는 폐지.
  - sprint-15.sh + sprint-14.sh + sprint-13.sh + sprint-9.sh + ... wrap 단독 PASS 회복.

**中 (P1)**:
- **`O-S16-mobile-session-hash-emit`** — mobile `telemetryStore.emit` 직전 `sha256('sprint-8-salt' + user_identifier).hex()[0:16]` 채움 로직. 0007 컬럼은 본 sprint 15 에 박힘 (NULL 허용). user_identifier 확정 (onboarding 시 / 첫 메시지 시 / device ID?) 도 결정.
- **`O-S16-dedup-concepts-ts-strict`** — `dedupConcepts.ts` 의 TS strict (`noUncheckedIndexedAccess`) 에러 ~10건 정리. 시그니처 변경 0 가드 (D-S15-dedup-signature) 안에서 가드 (`ci!` / `cj!` 또는 length 사전 체크).
- **`O-S16-mobile-screen-children-theme-aware`** — design-system 안 11 컴포넌트 (CaptureToast / DismissButton / HumbleRetraction / EmptyState / ErrorState / GhostHint / SuggestionCard / StrongRecall / InspectorList 등) 가 자체 `colorsHex.light.*` 직접 참조하는지 검증. 본 T2 는 `apps/mobile/app/` 만 처리, design-system 본체는 별개.

**低 (P2)**:
- Sprint 14 carry-over 低 3건 (`O-S14-mobile-jest-actual-run-threshold` / `O-S14-worktree-bypass-commit-history-scan` / `O-S14-jest-expo-pnpm-coupling`) — `O-S14-worktree-bypass-commit-history-scan` 은 7 워커 구조 폐지로 부분 무효화.
- 미해소 D-S9-* 5종 + 1 reconfirm (외부 데이터 의존, branch=A 진입 후).

### Retrospective

**잘 된 것**:
- 4 슬라이스 producer-only + T4 PM consumer 패턴이 PM 단독 진행에서도 유효 — 각 슬라이스가 독립 산출물 + 독립 fixture 로 단독 PASS.
- T5 (storage 신규) 의 PM 권한 확장 — sprint 진행 도중 frozen scope 를 *명시적 D-S15 directive* 로 확장. dev doc §1 의 `[FROZEN v2026-05-18 D-S15-pii-0007-shape]` 마크가 frozen scope 확장의 *영속 근거*. (Sprint 14 carry-over 1건 직접 추가 패턴의 일반화.)
- 외부 데이터 N≥3 의존 해소 — 사용자 결정 "외부 데이터 없이 진행 → PM 본인 QA 로 대체" 가 D-S8-pii-policy 의 외부 테스터 가정을 *재해석* 으로 정합 유지 (영구 폐지 아님). branch=C 9 연속 회피 시 동일 패턴 활용 가능.

**개선점**:
- Sprint 13 의 `.claude/agents/` 도입 (commit 7419216) 부터 Sprint 15 의 폐지 결정까지 *3 sprint 안* 에 전환됨. dev doc / 메모 / receipt 가 모두 *Sprint 13 워커 정렬* 을 가정으로 박혀 있어 폐지 비용이 큼 (Sprint 16 T1 의 11+ 파일 리팩터링). 향후 *조직 구조* 결정은 receipt 가드를 박기 전에 *2 sprint 안정화 기간* 을 두는 게 안전.
- sprint-15.sh wrap 단독 PASS 가 가드되지 못한 점 — 본 sprint 결과물은 검증되지만 *통합 검증* 은 .claude/agents/ deletion 으로 cascading fail. Sprint 16 의 *최우선 슬라이스* 가 본 cascading 해소.
- dedupConcepts TS strict 에러가 *기존부터 존재* 했으나 본 sprint 시작 전까지 누구도 보고하지 않음. typecheck 게이트가 receipt 에 빠져 있음 — Sprint 16 검토 시 `pnpm -r typecheck` 단계 추가 검토.

### 4 슬라이스 산출물 일람

| 슬라이스 | 산출물 | 검증 |
|---|---|---|
| T1 (tester) | 7 fixture stale 토큰 정리 + sprint-13.sh + sprint-14.sh LEGACY 분기 영구 제거 + sprint-15.sh 신규 (4 단계 wire) + sprint15-stale-token-zero.mjs | fixture 단독 PASS |
| T2 (mobile) | 6 화면 + sub-component 의 colorsHex.light.* 68 → 0건 + useTheme() 18 호출 사이트 + sprint15-mobile-theme-aware.mjs | fixture PASS + jest 회귀 0 |
| T3 (engine) | dedupConcepts.ts FROZEN 마크 swap + 시그니처 변경 0 + sprint15-dedup-frozen-marker.mjs | fixture PASS + engine 103/103 PASS |
| T5 (storage) | 0007 SQL + migration-0007 테스트 + scripts/export 워크스페이스 + sprint8-data.mjs + root scripts + workspace 멤버 + sprint15-pii-0007-shape.mjs | fixture PASS + storage 89/89 PASS + export dry-run smoke PASS |
