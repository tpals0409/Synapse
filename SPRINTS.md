# Synapse — Sprint Index

진행 중인 스프린트는 `docs/sprints/_current.txt` 에 기록된다.
상세 dev doc: `docs/sprints/sprint-N-<slug>.md`.

| # | Status | Title | Goal |
|---|---|---|---|
| 0 | ✅ done | [Scaffolding](docs/sprints/sprint-0-scaffolding.md) | 모노레포 + RN+Expo + 로컬 Gemma + sqlite-vec — receipt PASS, 22/22 테스트, "안녕→Gemma→SQLite" 종단 흐름 동작 |
| 1 | ✦ in-progress | [Conversation Loop](docs/sprints/sprint-1-conversation-loop.md) | Onboarding/FirstChat 화면 + LLM 스트리밍 + 메시지 영속화 |
| 2 | ☐ planned | Memory Formation | Concept 추출 + 임베딩 + Graph 모델 + CaptureToast |
| 3 | ☐ planned | Recall L1~L3 | Ghost Hint / Suggestion / Strong Recall + Inspector |
| 4 | ☐ planned | Orchestrator | Trigger / Silence rules (Attention Control) |
| 5 | ☐ planned | Hyper-Recall | Bridge / Temporal / Domain Crossing |
| 6 | ☐ planned | Failure & Hygiene | Dismiss/Unlink, Humble Retraction, Forgetting |
| 7 | ☐ planned | Polish | 애니메이션, 다크/라이트, 한/영, Empty/Error, 5명 사용자 테스트 |

범례: ✦ 진행 중 · ✅ 완료 · ☐ 예정 · ⚠ partial 종료

`/end` 가 N 행에 결과(✅ 또는 ⚠)와 한 줄 요약을 기입하고 N+1 행을 갱신한다.
