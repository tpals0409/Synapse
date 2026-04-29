---
name: pass-fixture
description: directive-tag-audit PASS fixture
---

## 작업 규칙
- 일반 규칙 1.
- SendMessage 예시 (코드블록):

```
SendMessage to=mobile [DIRECTIVE v2026-04-29 D-mobile-types-node]
"필수: @types/node 추가."
```

- 헌법 본문은 `## 공통 헌법` 섹션이라 검사 제외 — 아래는 일반 본문이라 검사 대상이지만 태그가 있어 PASS.

## 공통 헌법 (Sprint 2+ 적용)
1. **HOLD-DECIDE-RESUME** — `HOLD pending PM` 받으면 동결. (헌법 본문은 검사 제외)
2. **Decision-version 태그** — `[DIRECTIVE v<date> <id>]` 태그 형식 설명. (예시 placeholder, 검사 제외)
