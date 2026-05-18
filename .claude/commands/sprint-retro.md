---
description: Phase 4. Writes 05-retro.md and finalizes meta.json.
argument-hint: [sprint-id]
---

# /sprint-retro

Run the retro phase for `$ARGUMENTS`.

If omitted, use the most recent `in_progress` sprint whose review verdict is
`Ready to retro`.

## Preconditions

- All prior artifacts exist.
- `04-review.md` verdict is `Ready to retro`.
- `meta.json.language` is present; use it for the retro artifact.

## Steps

### 1. Write Retro

The main loop writes `05-retro.md`:

```markdown
# Retro — <sprint-id>

## Outcome
<1-2 sentences>

## Changes to carry forward
- ...

## Action items
- [ ] ...

## Stats
- Files changed: <N>
- Tests added: <N>
- Blocking issues found: <N>
- Loop-backs: <N>
```

### 2. Finalize `meta.json`

Update:

- `status`: `completed`
- `completed_at`: current ISO 8601 UTC timestamp
- `tags`: additional domains touched, if any. Derive these from changed files'
  `@domain` annotations and approved glossary updates, deduplicate them, and
  exclude the primary `meta.json.domain`.

Keep `revision_notes` unchanged for auditability. Do not change
`feature_request`, `created_at`, or `sprint_id`.

### 3. Hand Back

Print:

- path to `05-retro.md`
- final status
- one-line outcome

## Failure Modes

- Review verdict is not `Ready to retro`: refuse and tell the user which phase
  must run next.
- `meta.json` write fails: surface the error and stop.
