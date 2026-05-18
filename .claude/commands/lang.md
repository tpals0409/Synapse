---
description: Select the project output language for future sprint artifacts.
argument-hint: <language-code|language-name|show>
---

# /lang

Select the language used for future sprint artifacts and gate summaries.

## Usage

```text
/lang show
/lang ko
/lang en
/lang ja
/lang Korean
```

## Behavior

- Store the selection in `.claude/state/language.json`.
- Use `match-user` when no language is set or when the user asks to reset.
- Prefer BCP 47 language codes (`ko`, `en`, `ja`, `zh-Hans`) when possible.
- Preserve the user's requested language name as `label`.
- Update `updated_at` with the current ISO 8601 UTC timestamp.
- Do not modify existing sprint artifacts. New sprints copy the current
  language setting into `meta.json.language` at sprint creation time.

## Output

After setting the language, print:

- selected code
- selected label
- whether new sprints will use it

For `show`, print the current `.claude/state/language.json` value.

## Failure Modes

- If `.claude/state/language.json` is missing, create it with `match-user`.
- If the requested language is ambiguous, ask one concise clarification question.
