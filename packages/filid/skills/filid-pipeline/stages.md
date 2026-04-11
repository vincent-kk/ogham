# Pipeline Stages — SSoT

Canonical stage alias table for `/filid:filid-pipeline`. This file is the single
source of truth for stage names used in `--from=<stage>` and internal
orchestration. All other documents (`SKILL.md`, `reference.md`, cross-skill
references) MUST refer to this table rather than duplicating aliases.

## Token Policy

- **Skill ID**: `filid:<name>` (colon-prefixed) — used only when calling a skill
  via `Skill("filid:<name>", "<args>")`.
- **Stage alias / action / type token**: bare lowercase word — used in
  `--from=<stage>`, `debt_manage(action: "<bareword>")`, fix-request
  `Type: <bareword>`, etc. Never prefixed with `filid:`.

## Stage Alias Table

| Stage alias (bare) | Canonical skill invocation     | `--from` accepts | Entry prerequisite                                        |
| ------------------ | ------------------------------ | ---------------- | --------------------------------------------------------- |
| `pr-create`        | `Skill("filid:filid-pull-request")`  | `pr-create`      | None                                                      |
| `filid-review`           | `Skill("filid:filid-review", ...)`   | `filid-review`         | PR exists (`gh pr view` exit 0)                           |
| `filid-resolve`          | `Skill("filid:filid-resolve", ...)`  | `filid-resolve`        | `.filid/review/<branch>/fix-requests.md` exists           |
| `filid-revalidate`       | `Skill("filid:filid-revalidate")`    | `filid-revalidate`     | `.filid/review/<branch>/justifications.md` exists         |

## Invocation Argument Form

When passing arguments to a skill, use the **two-argument** form —
`Skill("filid:<name>", "<args>")` — not a single string with embedded flags.

- CORRECT: `Skill("filid:filid-review", "--scope=pr")`
- WRONG: `Skill("filid:review --scope=pr")` (flag leaks into skill name)

## Ordering

```
pr-create → review → resolve → revalidate
```

Each stage's output is the next stage's input:

- `pr-create` produces a GitHub PR.
- `filid-review` writes `review-report.md` + optionally `fix-requests.md`.
- `filid-resolve` consumes `fix-requests.md`, writes `justifications.md` + commits + pushes.
- `filid-revalidate` consumes the delta since `resolve_commit_sha`, writes `re-validate.md`.

## Notes

- `pr-create` is a stage alias, **not** a skill name. The actual skill is
  `filid:pull-request`. The alias exists because "create" describes the
  pipeline's intent (creating a new review cycle) while `filid-pull-request`
  describes the skill's concrete output.
- Fix-request type values (`code-fix`, `filid-promote`, `filid-restructure`) follow the
  same bare-word token policy — see `skills/filid-resolve/SKILL.md` Step 2.
- `debt_manage` action values (`create`, `list`, `resolve`, `calculate-bias`)
  are bare words — see `src/types/handoff.ts` (`DebtAction`).
