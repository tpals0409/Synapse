---
description: Phase 3. QA-Reviewer inspects implementation and writes 04-review.md.
argument-hint: [sprint-id]
---

# /sprint-review

Run the review phase for `$ARGUMENTS`.

If omitted, use the most recent `in_progress` sprint with
`03-implementation-notes.md` and no current `04-review.md`.

## Preconditions

- `01-prd.md`, `02-design.md`, and `03-implementation-notes.md` exist.

## Steps

### 1. Invoke QA-Reviewer

Provide:

- PRD, design, and implementation notes
- `meta.json.language`
- changed file list from implementation notes
- documented or inferred lint/test commands

QA-Reviewer writes `04-review.md` only in the main checkout. It must not edit
implementation code or tests. Do not run QA-Reviewer in worktree isolation
unless the main loop explicitly merges the resulting `04-review.md` back before
reading the verdict.
The review artifact uses `meta.json.language` for human-readable text.

Before invoking QA, record a before/after changed-file list using git when
available. If git is unavailable, record file mtimes and hashes for the changed
files listed in implementation notes plus `04-review.md`.

### 2. Review Output

`04-review.md` must include:

- verification performed
- tests reviewed and missing tests
- issues with required stable ids, severity, location, and suggested fix
- principle compliance
- project rules compliance
- verdict: `Ready to retro`, `Loop back to Execute`, or `Loop back to Plan`

Use `Loop back to Plan` only when the PRD or approved scope is wrong. Use
`Loop back to Execute` for implementation, test, annotation, glossary, or
verification failures.

## Failure Modes

- QA crashes: rerun once with the same inputs. If it fails again, surface the
  error.
- QA edits code or tests: report the violation and stop. Discard those edits
  only when a clean pre-review snapshot is available and the changed paths are
  not user edits.
- Main loop must compare the changed file list before and after review. If QA
  changed anything except `04-review.md`, treat it as this violation.
