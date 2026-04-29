---
name: fail-fixture
description: directive-tag-audit FAIL fixture — directive 인용에 태그 누락
---

## 작업 규칙
- 일반 규칙 1.

## 동료 통보
- `SendMessage to=mobile "필수: @types/node 추가."` ← 인라인 코드 + SendMessage + directive 어휘 + 태그 누락 (위반).

## 동료 통보 2
```
SendMessage to=mobile
"MUST 즉시 typecheck 회귀 검증."
```
이 코드블록 + directive 어휘이지만 태그가 없음 (위반 — 코드블록 안의 SendMessage + directive 어휘 패턴).
