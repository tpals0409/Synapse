# Sprint N — <slug>

> 이 문서는 *영속 메모리* 입니다. `/clear` 후에도 `/start` 가 이 문서만으로 컨텍스트를 복원할 수 있어야 합니다.
> 작성 책임: §1~2 = `/end` (N+1 생성 시) · §3~6 = `/start` 직후 · §7~8 = 진행 중 라이브 · §9~12 = `/end`

## 1. Goal
<한 문장>

## 2. Deliverable & Receipt
**Deliverable:**
- 

**Receipt (자동 검증 가능한 형태):**
- 

## 3. Scope
**In:**
- 

**Out:**
- 

## 4. Architecture & Data Flow
<텍스트 다이어그램 / 데이터 흐름 / 관여 패키지>

## 5. File Ownership
| Agent | Tier | Files |
|---|---|---|
| | | |

> **Tier 정의** (Sprint 11+, Agent View 단계별 dispatch 용):
> - **Tier 1 (producer-only)**: 다른 워커가 의존하는 영향력 있는 변경 — protocol 타입, storage 마이그레이션, design tokens breaking change. 동시 dispatch OK (서로 충돌 안 함).
> - **Tier 2 (의존 + 자체 export)**: Tier 1 결과를 import 하면서 자기도 새 export 제공 — engine / conversation / orchestrator 의 일반 슬라이스.
> - **Tier 3 (소비자만)**: 모든 producer 결과를 consume — mobile UI, tester e2e.
>
> `/start` 가 Tier 1 dispatch → 모두 Completed → main squash merge → Tier 2 dispatch → … 순으로 진행. 헌법 5 (Consumer 사전 진단) / 헌법 6 (Root index grep) 의 grep 기준점이 자동으로 최신 main 보장.

## 5.5 Worker Slices
<!-- 워커 슬라이스 본문. /start 가 sed 로 추출해 dispatch prompt 에 결정적 주입.
     워커가 dispatch 대상이 아니면 해당 slice 블록 통째 생략. -->

<!-- slice-begin: storage -->
**Tier**: 1
**Slice**: <한 줄 목표>
**Completion**: <정량 완료 조건 — 테스트 통과 / 파일 존재 / migration 번호 등>
**Dependencies**: <none | tier-N 워커 X 의 슬라이스 완료>
**Detail**:
- <2~5 줄 구체 작업>
<!-- slice-end: storage -->

<!-- slice-begin: designer -->
**Tier**: 1
**Slice**:
**Completion**:
**Dependencies**:
**Detail**:
-
<!-- slice-end: designer -->

<!-- slice-begin: engine -->
**Tier**: 2
**Slice**:
**Completion**:
**Dependencies**:
**Detail**:
-
<!-- slice-end: engine -->

<!-- slice-begin: conversation -->
**Tier**: 2
**Slice**:
**Completion**:
**Dependencies**:
**Detail**:
-
<!-- slice-end: conversation -->

<!-- slice-begin: orchestrator -->
**Tier**: 2
**Slice**:
**Completion**:
**Dependencies**:
**Detail**:
-
<!-- slice-end: orchestrator -->

<!-- slice-begin: mobile -->
**Tier**: 3
**Slice**:
**Completion**:
**Dependencies**:
**Detail**:
-
<!-- slice-end: mobile -->

<!-- slice-begin: tester -->
**Tier**: 3
**Slice**:
**Completion**:
**Dependencies**:
**Detail**:
-
<!-- slice-end: tester -->

## 6. Tasks
| ID | Description | Owner | Tier | Blocked By |
|---|---|---|---|---|
| | | | | |

## 7. Interfaces / Contracts
<함수 시그니처, 메시지 타입, 패키지 경계 — 책임 에이전트가 결정될 때마다 추기>

## 8. Test Scenarios
<디자인 목업/기획서 인용 시나리오 + 자동화 위치 (`e2e/scenarios/...`)>

## 9. Demo Script
<step-by-step 시연 스크립트 — receipt 재현용>

## 10. Implementation Map
<실제로 만들어진 파일/함수/엔드포인트 인덱스 — 다음 스프린트가 코드를 찾는 데 사용>

## 11. Decisions Made / Open Issues
**Decisions Made:**
- 

**Open Issues:**
- 

## 12. Carry-over + Retrospective
**Carry-over (다음 스프린트가 반드시 알아야 할 것):**
- *(빈 칸 금지. 특이사항 없으면 "직전 스프린트 가정 그대로 유지" 라고 명시.)*

**Retrospective:**
- 잘 된 것:
- 아팠던 것:
- 다음에 다르게 할 것:
