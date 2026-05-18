---
description: Main sprint orchestrator. Runs plan, execute, review, and retro with approval gates.
argument-hint: <feature description>
---

# /sprint

Run a full sprint for `$ARGUMENTS`.

## 0. Pre-flight

- Confirm `.claude/config.json`, the four phase commands, and the four role
  prompts exist.
- Confirm `.claude/state/language.json` exists; if missing, create it with
  `code: "match-user"` and `label: "Match user language"`.
- If any are missing, stop and list the missing paths.

## 1. Create Sprint State

1. Ensure `.claude/state/sprints/` exists, then scan it.
2. Let `N` be one more than the highest existing sprint number, including
  aborted and in-progress sprints.
3. Create slug from `$ARGUMENTS`: lowercase, alphanumeric plus hyphens, max 5
  words or 40 chars.
4. Create `.claude/state/sprints/sprint-NNN-<slug>/`.
5. Write `meta.json`:

```json
{
  "sprint_id": "<sprint-id>",
  "slug": "<slug>",
  "domain": null,
  "tags": [],
  "language": {
    "code": "<code from .claude/state/language.json>",
    "label": "<label from .claude/state/language.json>"
  },
  "status": "in_progress",
  "created_at": "<ISO 8601 UTC now>",
  "completed_at": null,
  "feature_request": "<verbatim $ARGUMENTS>",
  "revision_notes": [],
  "review_issue_counts": {}
}
```

Each later `revision_notes` entry must be an object:

```json
{
  "phase": "plan | execute | review",
  "at": "<ISO 8601 UTC timestamp>",
  "source": "gate | review | architect",
  "action": "revise | waive_open_question | route_back",
  "note": "<human-readable feedback or reason>"
}
```

## 2. Plan

Invoke `/sprint-plan <sprint-id>`.

Every new `/sprint <feature>` starts here after sprint state creation. Do not
invoke `/sprint-execute` until Gate 1 explicitly approves the PRD or waives the
blocking Open Questions.
Use `meta.json.language` for all sprint artifacts and gate summaries. If the
code is `match-user`, use the language of the user's feature request.

If `01-prd.md` has blocking Open Questions, ask the user. Each blocking question
must have a stable id such as `Q-001-auth-provider`. The user may answer (handle
via `revise`), `waive` specific question ids, or `abort`. Non-blocking
questions may remain if explicitly marked as deferred.

Gate 1:

- Present the PRD path, problem statement, success criteria summary, and domain.
- Ask: `Approve PRD and proceed? (yes / revise / waive / abort)`
- `yes`: continue.
- `revise`: append a `revision_notes` entry with `phase: "plan"`,
  `source: "gate"`, and `action: "revise"`, clear
  `meta.json.review_issue_counts`, then rerun `/sprint-plan <sprint-id>`.
- `waive`: for each blocking Open Question the user chose to skip, append a
  `revision_notes` entry with `phase: "plan"`, `source: "gate"`,
  `action: "waive_open_question"`, and the question id plus question text in
  `note`. Then continue.
- `abort`: set `status` to `aborted`, then stop.

## 3. Execute

Invoke `/sprint-execute <sprint-id>`.

If `02-design.md` contains `ROUTE_BACK: plan`, show the reason, append a
`revision_notes` entry with `phase: "execute"`, `source: "architect"`, and
`action: "route_back"`, clear `meta.json.review_issue_counts`, and rerun
`/sprint-plan <sprint-id>`.

Gate 2:

- Present paths to `02-design.md` and `03-implementation-notes.md`.
- Present files changed, verification results, deviations, and TODOs.
- Ask: `Approve implementation and proceed? (yes / revise / abort)`
- `yes`: continue.
- `revise`: append a `revision_notes` entry with `phase: "execute"`,
  `source: "gate"`, and `action: "revise"`, clear
  `meta.json.review_issue_counts`, then rerun `/sprint-execute <sprint-id>`.
- `abort`: set `status` to `aborted`, then stop.

## 4. Review

Invoke `/sprint-review <sprint-id>`.

Read `04-review.md -> Verdict`:

- `Ready to retro`: continue.
- `Loop back to Execute`: print blocking issue ids and rerun
  `/sprint-execute <sprint-id>` with `04-review.md` attached.
- `Loop back to Plan`: print blocking issue ids, append a `revision_notes` entry
  with `phase: "review"`, `source: "review"`, and `action: "route_back"`, clear
  `meta.json.review_issue_counts`, and rerun `/sprint-plan <sprint-id>`.

Track repeated blocking issues by stable issue id in
`meta.json.review_issue_counts`. After each review, increment counts for
blocking issue ids present in the current review and remove counts for blocking
issue ids that are no longer present. If the same blocking issue id reaches
three consecutive reviews, stop and ask the user how to proceed. Reset this map
only when the user changes approved direction through a gate revision, when
review or architect routes back to Plan, on abort, or at the start of a new
sprint.
Loop-backs keep `meta.json.status` as `in_progress`.

## 5. Retro

Invoke `/sprint-retro <sprint-id>`.

After it finishes, confirm `meta.json.status` is `completed` and print:

- sprint id
- domain and tags
- one-line outcome
- total files changed
- artifact directory

## Failure Modes

- Phase command errors: surface the error and stop.
- User aborts: keep partial artifacts and set `status` to `aborted`.
- Missing required artifact: stop and report the missing path.
