# CLAUDE.md — Synapse Project Entry Point

> Sprint 17+ 진입점. **단일 진실원은 [`AGENTS.md`](./AGENTS.md)** — workflow / 4 역할 / 5 파일 contract / Synapse 헌법 10 항목.
> 본 파일은 *Claude Code* 진입 시 보조 안내.

## 무엇부터?

```bash
/sprint "<feature description>"
```

자동으로 다음을 수행:
1. `.claude/state/sprints/sprint-NNN-<slug>/` 디렉토리 + `meta.json` 생성
2. `/sprint-plan` → PM 역할이 `01-prd.md` 작성 → **Gate 1: PRD 승인 대기**
3. `/sprint-execute` → Architect 가 `02-design.md` → Developer 가 코드 + `03-implementation-notes.md` → **Gate 2: 구현 승인 대기**
4. `/sprint-review` → QA-Reviewer 가 `04-review.md` (verdict: Ready to retro / Loop back to Execute / Loop back to Plan)
5. `/sprint-retro` → `05-retro.md` + `meta.json.status = completed`

## 보조 명령

- `/lang ko` — 출력 언어 설정 (디폴트 한국어, `.claude/state/language.json` 에 저장)
- `/sprint-plan` / `/sprint-execute` / `/sprint-review` / `/sprint-retro` — 개별 phase 직접 호출 (loop-back / re-run 시)

## 역할

| 역할 | 정의 위치 | 책임 |
|---|---|---|
| PM | (= 사용자 본인) | 01-prd.md 작성, Gate 1/2 승인 |
| Architect | `.claude/agents/architect.md` | 02-design.md, Work Packages 분기 |
| Developer | `.claude/agents/developer.md` | 코드 + 테스트 + 03-implementation-notes.md |
| QA-Reviewer | `.claude/agents/qa-reviewer.md` | 04-review.md (코드/테스트 편집 금지) |

## 모노레포 구조

```
apps/mobile/                  # RN + Expo
packages/conversation/        # 대화 컨텍스트 + send DI
packages/engine/              # dedup / similarity / merge
packages/orchestrator/        # 4-원 DecisionAct + cooldown
packages/storage/             # SQLite migrations + sqlite-vec
packages/llm/                 # Gemma adapter (Ollama)
packages/design-system/       # 컬러 / 타이포 / 타입
packages/protocol/            # 공통 타입 / IPC schema
scripts/export/               # 데이터 export pipeline (Sprint 15 도입)
scripts/receipt/              # Sprint 0~16 영속 receipt (Sprint 16 마감 시점 동결)
```

## 빌드 / 테스트

```bash
pnpm -r test            # 전체 패키지 jest/vitest
pnpm -r typecheck       # 전체 패키지 tsc --noEmit
pnpm -r lint            # 전체 패키지 lint
pnpm --filter @synapse/<pkg> test   # 단일 패키지
```

## 영속 자산 위치

| 종류 | 경로 |
|---|---|
| 현 sprint 작업 | `.claude/state/sprints/sprint-NNN-<slug>/` |
| Legacy sprint 영속 기록 (Sprint 0~16) | `docs/sprints/sprint-{0..16}-*.md` |
| Legacy receipt (Sprint 16 마감 시점 동결) | `scripts/receipt/sprint-{1..15}.sh` + `.receipt-runner/*.mjs` |
| 도메인 용어 단일 진실원 | `docs/glossary.md` |
| Annotation 레지스트리 | `docs/annotations.md` |
| 메모 시스템 | `/Users/kimsemin/.claude/projects/-Users-kimsemin-Desktop-2026-Synapse/memory/` |

## 외부 참조

- 기획서: `기획서.md`
- 디자인 목업 (9 화면, 402×874): `디자인 목업/`
- Remote: https://github.com/tpals0409/Synapse.git — **매 squash merge 직후 push 의무** (AGENTS.md §7.2)
- Workflow upstream: https://github.com/tpals0409/leo-agile-builder (Sprint 17 도입 시점 패턴)

## Sprint 0~16 → Sprint 17+ 전환 요약

기존 워크플로우 (단일 dev doc + 7 워커 + receipt cascading) 는 Sprint 16 마감 시점 영속 박물관으로 보존. Sprint 17 부터 leo-agile-builder 패턴 적용. 자세한 매핑: `AGENTS.md §8 Legacy → leo Migration Summary`.

외부 데이터 영구 보류 (사용자 본인 QA 로 대체). branch=C inheritance-cleanup (Sprint 8~16) 종결.
