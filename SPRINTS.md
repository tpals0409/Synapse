# SPRINTS.md — Synapse Sprint Index

## Sprint 17+ (leo-agile-builder workflow)

`/sprint <feature>` 로 시작. 디렉토리: `.claude/state/sprints/sprint-NNN-<slug>/` (5 파일 + meta.json + receipt.sh).
단일 진실원: `AGENTS.md` §1~§8.

| Sprint | Slug | Domain | Status | 진입점 |
|---|---|---|---|---|
| 017 | leo-workflow-bootstrap | workflow | completed | `.claude/state/sprints/sprint-017-leo-workflow-bootstrap/` |
| 018 | working-tree-cleanup-s17-close | workflow | in_progress | `.claude/state/sprints/sprint-018-working-tree-cleanup-s17-close/` |

## Sprint 0~16 (Legacy workflow, 영속 박물관)

기존 12 섹션 dev doc + 7 워커 + receipt cascading 구조. Sprint 16 마감 시점 동결.
편집 0 (Sprint 17+ 부터 본 영역 수정 금지).

| Sprint | 주제 | dev doc |
|---|---|---|
| 0 | Scaffolding | `docs/sprints/sprint-0-scaffolding.md` |
| 1 | Conversation Loop | `docs/sprints/sprint-1-conversation-loop.md` |
| 2 | Memory Formation | `docs/sprints/sprint-2-memory-formation.md` |
| 3 | Recall L1~L3 | `docs/sprints/sprint-3-recall-l1-l3.md` |
| 4 | Orchestrator | `docs/sprints/sprint-4-orchestrator.md` |
| 5 | Hyper-Recall | `docs/sprints/sprint-5-hyper-recall.md` |
| 6 | Failure & Hygiene | `docs/sprints/sprint-6-failure-hygiene.md` |
| 7 | Polish | `docs/sprints/sprint-7-polish.md` |
| 8 | PII Policy (D-S8 Rule 1~5) | `docs/sprints/sprint-8-pii-policy.md` |
| 9 | Inheritance Cleanup (1st) | `docs/sprints/sprint-9-inheritance-cleanup.md` |
| 10~12 | (3 연속 no-op, origin/main 미동기화 발견) | `docs/sprints/sprint-{10,11,12}-*.md` |
| 13 | Agent View 1:1 정렬 + 헌법 #13 | `docs/sprints/sprint-13-agent-view-alignment.md` |
| 14 | Inheritance Cleanup (carry-over 4 회수) | `docs/sprints/sprint-14-inheritance-cleanup.md` |
| 15 | External Data Arrival (8th inheritance) + PII 0007 + mobile theme | `docs/sprints/sprint-15-external-data-arrival.md` |
| 16 | Inheritance Cleanup (9th) + 7 워커 폐지 P0 | `docs/sprints/sprint-16-inheritance-cleanup.md` |

## Legacy receipt 영속 가드 (Sprint 0~16)

`scripts/receipt/sprint-{1..15}.sh` + `.receipt-runner/*.mjs` 41 fixture. wrap cascading 패턴 (sprint-N.sh wraps sprint-(N-1).sh). Sprint 16 마감 시점 동결.

회귀 검증 필요 시:
```bash
SKIP_OLLAMA=1 SKIP_SPRINT1_E2E=1 bash scripts/receipt/sprint-15.sh
```

Sprint 17+ 의 신규 receipt 는 `.claude/state/sprints/sprint-NNN-<slug>/receipt.sh` 단독 실행. cascading 없음.

## 전환 결정 근거

- **Sprint 15 D-S15-7-worker-structure-supersede**: 7 워커 구조 → 4 역할 전환 결정.
- **Sprint 16 P0**: `.claude/agents/*.md` 7 파일 폐지 + receipt 의존 정리.
- **Sprint 17 (본 sprint)**: leo-agile-builder 패턴 도입 + 본 인덱스 작성.
- **D-S17-external-data-permanent-defer**: 외부 데이터 영구 보류 → branch=C inheritance-cleanup (Sprint 8~16) 종결.

자세한 내용: `AGENTS.md §8 Legacy → leo Migration Summary` + 메모리 `workflow_leo_agile_builder`.
