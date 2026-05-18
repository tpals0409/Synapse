# Annotation Registry

Register annotation fields here before using them in repo-authored source, test,
commentable schema, or migration files.

## Fields

| Annotation | Required? | Value type | Purpose |
|---|---|---|---|
| `@domain` | required | string | DDD domain, listed in `docs/glossary.md`. |
| `@layer` | required | enum: `domain` / `application` / `infrastructure` / `interfaces` | DDD layer. |
| `@purpose` | required | one-line string | Why the file exists. |
| `@sprint` | optional | string | Sprint that created the file. |
| `@agents` | optional | array | Role agents that commonly touch the file. |
| `@stability` | optional | enum: `experimental` / `stable` / `deprecated` | Review signal. |
| `@dependencies` | optional | array of paths | Non-obvious cross-file dependencies. |
| `@last-touched` | optional | sprint id | Most recent sprint that modified the file. |

New field names should be lowercase with no separators. Existing kebab-case
fields such as `@last-touched` are grandfathered; do not add aliases for the
same concept.

Annotation checks should allow every field registered in this table, including
grandfathered kebab-case fields, and reject unregistered fields.

## Syntax

Put one annotation per line in the language's normal comment syntax at the top
of the file.

```ts
/**
 * @domain auth
 * @layer application
 * @purpose Login use-case: verify credentials and issue a session token.
 * @sprint sprint-003-add-login
 */
```

```python
"""
@domain auth
@layer application
@purpose Login use-case: verify credentials and issue a session token.
@sprint sprint-003-add-login
"""
```

## Worked Example

```ts
/**
 * @domain auth
 * @layer application
 * @purpose Login use-case: verify credentials and issue a session token.
 * @sprint sprint-003-add-login
 * @agents [architect, developer, qa-reviewer]
 * @stability stable
 * @dependencies [src/domain/auth/session.ts]
 */
```

An agent working on `billing` can read the header and skip this `auth` file.

---

## Project-Specific Extensions (Synapse)

### 영속 마커 패턴 (FROZEN / DIRECTIVE)

Synapse 는 annotation header 외에 *영속 결정 마커* 를 파일 상단에 함께 둠. 두 패턴:

```ts
// [FROZEN v2026-05-18 D-S15-dedup-signature]
// 이 파일의 7 시그니처 토큰은 동결됨. 변경 시 sprint dev doc 의 D-S* 결정 필요.
```

```sql
-- [DIRECTIVE v2026-05-18 D-S15-pii-0007-shape]
-- @domain storage
-- @layer infrastructure
-- @purpose ALTER 3 telemetry tables to add session_hash column for D-S8-pii-policy Rule 1.
-- @sprint sprint-015-external-data-arrival
-- ack: (a) NULL 허용 (b) ALTER 만 사용 (c) 인덱스 3종 (d) export pipeline 연결 (e) workspace 멤버 추가
```

### FROZEN 마커 규약

- 형식: `[FROZEN v<YYYY-MM-DD> <decision-id>]`
- 사용처: 시그니처 / enum / 알고리즘 핵심 토큰이 후속 sprint 에서 보존되어야 하는 파일.
- 위치: 파일 상단 100 라인 안. fixture 가 grep 으로 검증.
- 예: `packages/engine/src/dedupConcepts.ts:1-2`.

### DIRECTIVE 마커 규약

- 형식: `[DIRECTIVE v<YYYY-MM-DD> <decision-id>]` + `ack: (a) ... (b) ... ` 5 항 충족 ack.
- 사용처: 마이그레이션 / schema 변경 / 정책 도입 파일.
- 예: `packages/storage/schema/0007_pii_session_hash.sql`.

### Synapse 추가 annotation 필드 (기존 leo 8 종에 더해)

| Annotation | Required? | Value type | Purpose |
|---|---|---|---|
| `@frozen` | optional | string (decision-id) | 본 파일이 FROZEN 마커로 보호됨을 명시. |
| `@directive` | optional | string (decision-id) | 본 파일이 DIRECTIVE 마커로 작성됨을 명시. |
| `@receipt` | optional | string (fixture path) | 본 파일을 가드하는 receipt fixture 경로. |
