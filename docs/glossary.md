# Glossary

Domain terms introduced in code must be listed here in the same sprint.

## Domains

Synapse 워크플로우 시작 시점 (Sprint 17 부터 leo-agile-builder 전환) 의 기본 도메인 모음.
새 sprint 가 신규 도메인을 도입할 때 PM 이 `01-prd.md -> Glossary Additions Proposed` 에 제안, Developer 가 실제 코드에 처음 등장할 때 본 파일에 반영.

### memory

| Term | Definition |
|---|---|
| Memory-Native AI | 사용자 대화/지식의 영속 메모리를 1순위로 다루는 mobile-first AI 아키텍처. |
| concept | 대화에서 추출된 의미 단위. embedding + label + provenance 보유. |
| recall | 과거 concept 를 현재 대화 컨텍스트에 재진입시키는 동작. |
| dedupConcepts | 중복 concept 를 cosine similarity + normalize label 기반으로 병합하는 engine 함수. |
| MergePlan | dedupConcepts 가 반환하는 병합 계획. survivor / discarded / reason 3-필드. |
| EmbedSimilarityFn | concept 두 개 사이의 embedding cosine 을 계산하는 함수 타입. |
| NormalizeLabelFn | label 비교용 정규화 함수 타입. |
| DEFAULT_DEDUP_EMBED_THRESHOLD | dedup 디폴트 임계 (수치는 frozen). |

### decision

| Term | Definition |
|---|---|
| DecisionAct | Orchestrator 가 매 turn 발행하는 4-원 결정. enum 값은 frozen. |
| silence | DecisionAct 4-원 중 하나. 침묵 디폴트 (반응 안 함). |
| ghost | DecisionAct 4-원 중 하나. 백그라운드 신호 (사용자 미인지). |
| suggestion | DecisionAct 4-원 중 하나. 가벼운 제안. |
| strong | DecisionAct 4-원 중 하나. 강한 개입 (확신 시). |
| Humble Retraction | Sprint 6 도입. send 가 LLM 거절 시 같은 reject 동작 재사용. |
| cooldown | Orchestrator 가 동일 결정 반복을 막는 시간 구간. |

### telemetry

| Term | Definition |
|---|---|
| decision_log | 결정 1건당 1 row. timestamp + act + confidence + context_hash. |
| satisfaction_survey | 사용자 만족도 응답 저장 테이블. |
| recall_log | recall 발생 1건당 1 row. |
| session_hash | 1 세션 단위 그룹핑 키. 0007 migration 으로 3 테이블에 추가. |
| telemetryStore | mobile 쪽 telemetry emit 엔트리. session_hash 부착 책임. |

### storage

| Term | Definition |
|---|---|
| sqlite-vec | SQLite extension. KNN + cosine similarity 지원. |
| 0007_pii_session_hash | D-S8-pii-policy Rule 1 의 영속화 migration. NULL 허용. |
| concept_embeddings | concept 의 embedding 영구 저장 테이블. |

### mobile

| Term | Definition |
|---|---|
| useTheme | apps/mobile/src/themeStore 의 훅. effectiveTheme 기반 colorsHex 반환. |
| effectiveTheme | system / light / dark 중 실제 적용 테마. |
| themeStore | zustand 기반 글로벌 테마 상태 저장소. |
| colorsHex | 현재 테마의 hex 색 키 집합. 직접 `.light.*` 참조 금지. |
| ThemeColors | useTheme 반환 타입. paper / ink / synapse 3-그룹. |

### design-system

| Term | Definition |
|---|---|
| paper | ThemeColors 그룹 1. 배경 / 표면. |
| ink | ThemeColors 그룹 2. 텍스트 / 아이콘. |
| synapse | ThemeColors 그룹 3. accent / 강조. |
| demoHint | 데모 가이드용 컴포넌트. theme-aware. |

### protocol

| Term | Definition |
|---|---|
| feature_request | meta.json 의 사용자 원본 입력 (verbatim). |
| Decision-version | PM 결정에 부여되는 단조 증가 태그. revision_notes 와 1:1 대응. |

### workflow

| Term | Definition |
|---|---|
| leo-agile-builder | 본 sprint workflow 의 upstream template. Sprint 17 부터 도입. |
| Gate 1 | PRD 승인 게이트. /sprint-plan 종료 시점. |
| Gate 2 | 구현 승인 게이트. /sprint-execute 종료 시점. |
| revision_notes | meta.json 의 게이트 피드백 + route-back 영속 기록. |
| Work Packages | 02-design.md 의 병렬 Developer 분기 섹션. Files: disjoint. |
| Agent View | Claude Code 의 background developer 세션 dispatch UI. isolation=worktree. |
| working-tree-hygiene | Sprint 종료 시 `git status --short` 가 본 sprint 작업물 외 0 줄 + `main == origin/main` 상태. Sprint 18 도입. |
| 3-group-commit-split | 한 sprint 안에서 분리된 sprint 결과물을 sprint 별 1 commit 으로 split 하는 패턴. Sprint 18 의 working tree 정리에서 첫 적용. |

### constitution

| Term | Definition |
|---|---|
| FROZEN marker | 파일 상단 영속 결정 마커. `[FROZEN v<date> <decision-id>]`. |
| DIRECTIVE marker | 파일 상단 정책 도입 마커. `[DIRECTIVE v<date> <decision-id>]` + 5 항 ack. |
| HOLD-DECIDE-RESUME | PM 결정 분기 직렬화 패턴. stale 메시지 + race 방지. |
| Decision-version | revision_notes 안 단조 증가 결정 식별자. |
| origin/main sync | 매 squash merge 후 push 의무. worktree base stale 방지. |

### deprecated

> 신규 코드 / dev doc 에 등장하면 QA-Reviewer 가 blocking issue 로 표시.

| Term | 사유 |
|---|---|
| team-leader | Sprint 13 폐지. PM 단독 큐레이션 + Agent View 직접 dispatch 패턴으로 대체. |
| 7 워커 구조 | Sprint 15 SUPERSEDED + Sprint 16 P0 폐지. 4 역할 (pm/architect/developer/qa-reviewer) 로 전환. |
| /start /end | Sprint 13 폐지. `/sprint <feature>` 로 대체. |
| "박다" / "박았음" / "박음" | Sprint 9 PM directive. 대체: 추가 / 작성 / 기록 / 확정 / 보존. |
| LEGACY_WRAP_FAIL_TOLERATED | Sprint 15 T1 영구 제거 환경변수. |
| pakda-term | "박다" 토큰. 0 건 강제. |
| branch=C inheritance-cleanup | Sprint 8~16 10 연속 패턴. Sprint 17 부터 종결. |
| external-data N≥3 의존 | 외부 데이터 영구 보류 정책 (D-S17). 사용자 본인 QA 로 대체. |

## Naming

- Domain names are short, lowercase, and hyphen-free.
- Definitions are one sentence.
- If a term collides across domains, disambiguate code identifiers
  (`AuthSession`, `CheckoutSession`) and keep each term under its domain.
