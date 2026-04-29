---
name: end
description: 스프린트를 종료한다. Receipt 자동 검증 후 dev doc을 마감하고, 다음 스프린트 N+1의 스켈레톤(goal/deliverable/receipt)을 자동 생성한다. /clear 직전 모든 정보를 영속화한다.
---

당신은 Synapse 프로젝트의 **Team Leader** 로서, 사용자가 호출한 `/end` 를 처리합니다. **컨텍스트가 곧 `/clear` 로 사라진다**는 것을 전제로 모든 살릴 정보를 dev doc 에 영속화하세요. 이게 부실하면 다음 사이클에서 단절이 생깁니다.

## 절대 규칙
- *Carry-over* 섹션 빈 칸 종료 금지 (특이사항이 없다면 "특이사항 없음, 직전 스프린트 가정 그대로 유지" 라고 *명시*).
- Receipt 검증 결과(pass/partial/fail) 는 무조건 *Implementation Map* 또는 *Open Issues* 에 기록.
- N+1 스켈레톤이 생성되지 않으면 종료 거부.

## 절차

### 1. Receipt 검증
N dev doc 의 *Deliverable & Receipt* 항목을 자동 실행:
- `pnpm test` (단위/통합 테스트)
- `pnpm --filter mobile build` (빌드 가능 여부, 해당 스프린트에서 모바일 변경이 있을 때)
- `bash scripts/receipt/sprint-N.sh` (스프린트 전용 시나리오, 있는 경우)
- 결과: **pass** / **partial** / **fail**.
- partial/fail 인 경우: PM 에게 명시적으로 종료 여부 확인. 강제 종료 시 *Open Issues* 와 *Carry-over* 에 미해결 사항 명시.

### 2. N(현재) dev doc 마감
다음 섹션을 채워 저장:
- **Implementation Map**: 실제로 만들어진 파일/함수/엔드포인트/명령어 경로. *다음 스프린트가 코드를 찾을 수 있는 인덱스*.
- **Decisions Made**: 스프린트 중 내려진 비-자명한 결정 + 이유 (모델 버전, 인덱스 차원, 캐시 정책, oklch 변환식 등).
- **Open Issues**: 알려진 버그·한계·미구현.
- **Carry-over** (가장 중요): 다음 스프린트가 *반드시 알아야 할* 상태/제약/부채/가정. 다음 `/start` 가 N-2 까지 거슬러 가지 않도록 만드는 핵심 약속. 비어있으면 종료 거부.
- **Retrospective**: 잘 된 것 / 아팠던 것 / 다음에 다르게 할 것.
- **Demo Script**: receipt 시연용 step-by-step (다음 사이클이나 PM 데모 시 재생 가능하게).

### 3. N+1 스켈레톤 자동 생성
- `cp docs/sprints/_template.md docs/sprints/sprint-(N+1)-<slug>.md` (slug 은 `CLAUDE.md` 스프린트 로드맵에서 도출).
- 다음 4 개 섹션을 채움:
  - *Goal* (한 문장): `CLAUDE.md` 로드맵의 N+1 항목 + N *Carry-over* 의 시사점 종합.
  - *Deliverable & Receipt*: 시연 가능한 결과 + 통과 기준 (자동 검증 가능한 형태로 — `scripts/receipt/sprint-(N+1).sh` 가 무엇을 실행할지 명세).
  - *Scope (in/out)*: 초안 (다음 `/start` 시 PM 사인오프 후 확정).
- 나머지 8 개 섹션은 빈 칸 (다음 `/start` 가 채움).

### 4. 인덱스/포인터 갱신
- `SPRINTS.md`: N 행에 ✅ + 한 줄 결과 (receipt 결과 포함). N+1 행 추가 (제목·goal).
- `docs/sprints/_current.txt`: `(N+1)` 로 갱신.

### 5. 체크인 정리
- git: 스프린트 단위 커밋 + 태그 (`git tag sprint-N-end`). 사용자 동의 없이 push 는 금지.
- 팀 종료: 모든 에이전트 `shutdown_request`, `TaskUpdate` 로 모든 태스크 완료 처리, `TeamDelete({ name: "synapse" })`.

### 6. PM 안내 메시지
정확히 다음 형식으로 출력:
```
Sprint N 종료
- Receipt: <pass / partial: ... / fail: ...>
- Carry-over 핵심: <한 줄 요약>
- N+1 스켈레톤: docs/sprints/sprint-(N+1)-<slug>.md (Goal: <한 문장>)

다음 단계:
1. /clear 로 컨텍스트 리셋
2. /start 로 Sprint N+1 진입
```

## 금지
- *Carry-over* 비어있는 채로 절대 종료하지 않는다. 빈 칸은 다음 사이클의 단절.
- N+1 스켈레톤의 *Goal* / *Deliverable* / *Receipt* 중 하나라도 비워두지 않는다.
- 사용자 동의 없이 git push, 원격 배포, 외부 알림 발송 금지.
