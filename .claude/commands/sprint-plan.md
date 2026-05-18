---
description: Phase 1. Loads bounded prior context and produces 01-prd.md via the PM role.
argument-hint: [sprint-id]
---

# /sprint-plan

Run the planning phase for `$ARGUMENTS`.

If omitted, use the most recent `in_progress` sprint.

## Preconditions

- `.claude/state/sprints/<sprint-id>/meta.json` exists.
- If the sprint is `completed`, ask before overwriting artifacts.

## Steps

### 1. Load State

Read:

- `.claude/config.json -> sprintHistory`
- current `meta.json`
- `docs/glossary.md`
- `meta.json.revision_notes`
- `meta.json.language`

Validate `.claude/config.json` against `.claude/config.schema.json` when a JSON
schema validator is available. If no validator is available, check the required
keys manually before continuing.

### 2. Select Prior Sprint Context

1. Read only `meta.json` for every other sprint directory.
2. Exclude `in_progress` and `aborted` sprints unless the user explicitly asked
   to inspect them.
3. Select the `recentCount` most recent `completed` sprints.
4. Make a first-pass domain estimate from the feature request, glossary, and
   prior sprint metadata. This estimate is not the final PRD domain.
   For an initial sprint with no glossary domains or prior sprints, create a
   concise domain candidate from the feature request keywords.
5. Also select older `completed` sprints whose `domain` or `tags` match the
   estimated domain.
6. Also select `completed` sprints whose `domain` or `tags` appear in
   `alwaysIncludeDomains`.
7. Deduplicate, sort by `completed_at` descending, and open markdown artifacts
   only for selected sprints.
8. Stop before exceeding `tokenBudget`; estimate conservatively by character
   count when no tokenizer is available.

Record loaded and dropped sprints in `01-prd.md -> Context`.

### 3. PM Output

PM writes `01-prd.md` and updates only this `meta.json` field:

- `domain`

PM writes the PRD in `meta.json.language`. If the code is `match-user`, use the
language of `meta.json.feature_request`.

`01-prd.md` must include:

- Revision History, if replacing an existing PRD because of a gate revision,
  route-back, or repeated phase run
- Context loaded
- Feature request
- Problem statement
- Success criteria
- User stories, only when they clarify expected behavior
- Non-goals
- Open Questions, split into `Blocking` and `Deferred`
- Domain
- Glossary additions proposed

Blocking Open Questions must use stable sprint-scoped ids in the form
`Q-001-short-title`, `Q-002-short-title`, and so on. Preserve the same id for
the same underlying question across PRD revisions.

### 4. Hand Back

Print:

- path to `01-prd.md`
- loaded prior sprint ids
- identified domain
- blocking Open Questions, if any

## Failure Modes

- No `meta.json`: tell the user to run `/sprint <feature>` first.
- PM did not write `01-prd.md`: surface the error and stop.
- Config missing: use `recentCount=3`, `tokenBudget=8000`,
  `alwaysIncludeDomains=[]`, and warn the user.
- Config invalid: stop and report the invalid field unless the user explicitly
  asks to continue with default sprint history settings.
