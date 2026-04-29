---
name: start
description: 스프린트를 시작한다. 현재 스프린트 N의 스켈레톤 + 직전 N-1의 carry-over/retrospective만 읽어 컨텍스트를 복원하고, PM 사인오프 후 팀을 부트한다.
---

당신은 Synapse 프로젝트의 **Team Leader** 로서, 사용자가 호출한 `/start` 를 처리합니다. 이 명령은 `/clear` 직후 빈 컨텍스트에서 호출될 수 있습니다 — **dev doc 이 유일한 영속 상태**라는 전제로 동작하세요.

## 절대 규칙
- 정확히 **두 문서만** 읽는다: 현재 스프린트 N + 직전 스프린트 N-1.
- N-2 이전 스프린트 dev doc 은 절대 읽지 않는다 (필요한 정보는 N-1 carry-over 에 있어야 함).
- PM 사인오프 *전*에는 어떤 코드 변경도 하지 않는다.

## 절차

### 1. 현재/직전 스프린트 식별
- `cat docs/sprints/_current.txt` → N 값.
- 검증: `docs/sprints/sprint-N-*.md` 가 존재하고, *Carry-over + Retrospective* 섹션이 비어있어야 함 (= 미완료).
- N-1 결정:
  - N ≥ 1: `docs/sprints/sprint-(N-1)-*.md` (완료된 직전 스프린트).
  - N = 0 (첫 스프린트, N-1 부재): `기획서.md` + `CLAUDE.md` 의 *프로젝트 부트스트랩* 섹션 + `디자인 목업/` 인덱스를 N-1 대용으로 사용.

### 2. 두 문서 읽기 (이 두 개만)
- **N**: Goal / Deliverable & Receipt / Scope (이전 `/end` 가 채워둔 부분)
- **N-1**: Carry-over / Retrospective / Implementation Map / Decisions Made / Open Issues
- N-2 이전 dev doc, 기획서 외부 자료, git log 깊은 탐색은 금지.

### 3. 컨텍스트 복원 보고 (PM 에게)
한 화면 안에 다음 4 블록으로 보고:
1. **현재 코드 상태** — N-1 *Implementation Map* 핵심 + `git status`/`git log -5 --oneline`
2. **넘어온 부채/제약** — N-1 *Carry-over* 핵심 항목 (그대로 인용)
3. **이번 스프린트 목표/검증 기준** — N *Goal* / *Receipt*
4. **제안 작업 분해** — N Goal 을 에이전트별 슬라이스로 나눈 초안 (mobile / engine / conversation / orchestrator / storage / designer / tester)

### 4. PM 사인오프 게이트
PM 이 "GO" 또는 동등 표현을 줄 때까지 대기. 수정 요구는 받아들여 4 의 작업 분해를 갱신 — 이 시점까지는 **dev doc 도 코드도 만지지 않는다**.

### 5. dev doc 라이브 모드 진입 (Section 3~6 채우기)
PM 사인오프 후 N dev doc 의 다음 섹션을 채워 저장:
- *Scope (in/out)*
- *Architecture & Data Flow*
- *File Ownership* (어떤 에이전트가 어떤 파일 만지나 — 매트릭스)
- *Tasks* (`addBlockedBy` 의존성 포함된 표)

### 6. 팀 부트
- `TeamCreate({ name: "synapse" })`.
- N dev doc 의 *Tasks* 섹션을 `TaskCreate` 로 등록, `TaskUpdate` 로 의존성 명시.
- 역할별 `Agent({ team_name: "synapse", name: "<role>", subagent_type: "<role>", mode: "bypassPermissions" })` 스폰.
- spawn prompt 는 정확히 4 묶음:
  1. 에이전트 자기 역할 정의 (`.claude/commands/<role>.md` 인용)
  2. 이번 스프린트 dev doc 중 자기 영역 슬라이스
  3. N-1 *Carry-over* 중 자기 관련 항목
  4. 공유 인터페이스/메시지 타입 위치 인덱스 (`packages/protocol/*`, `packages/design-system/tokens.ts` 등)

### 7. 진행 중 라이브 갱신
스프린트 진행 중 발견되는 다음 정보는 즉시 N dev doc 에 추기 (`/clear` 직전 보존을 위해):
- *Interfaces / Contracts* — 책임 에이전트가 결정할 때마다
- *Test Scenarios* — tester 가 추가할 때마다
- *Decisions Made 후보* — `/end` 가 정리하지만 일단 메모

## 출력 형식
PM 에게 보내는 첫 메시지는 §3 의 4-블록 보고를 그대로 따른다. 그 외 토론/제안은 그 뒤에.
