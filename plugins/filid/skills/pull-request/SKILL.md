---
name: pull-request
user-invocable: true
description: '[filid:pull-request] Bring the branch FCA documents up to date through enrich-docs, then open a structured GitHub pull request from the branch changes.'
argument-hint: '[--base REF] [--skip-enrich] [--draft] [--title TITLE] [--auto-approve]'
version: '1.0.0'
complexity: complex
plugin: filid
---

# pull-request — Documented PR Creation

Run this skill as one continuous operation. Do not ask whether to continue between stages. Yield only at the marked overwrite confirmation, for an unrecoverable source-state error, or after the terminal output.

The PR is where document currency becomes non-optional: Stage 1 closes INTENT.md / DETAIL.md drift for the fractals this branch touched, and commits those documents before the PR body is written.

## References

Resolve files relative to this `SKILL.md`:

- `reference.md` — abort messages, PR body layout, base resolution order.

Related: `/filid:enrich-docs` (invoked in Stage 1), `/filid:cross-review` (chain after the PR exists), `/filid:pipeline` (runs this as `pr-create`).

## Stage 0 — Prerequisites

1. Resolve absolute `PROJECT_ROOT`.
2. Read the current branch. A detached or empty branch name is an unrecoverable input error.
3. The branch must have at least one commit not on the base ref.
4. Worktree state — ask the tool, do not classify by hand:

   ```text
   mcp__plugin_filid_tools__review_state({
     action: "assess",
     projectRoot: PROJECT_ROOT,
     branchName: BRANCH
   })
   ```

   Act on `summary.worktreeDisposition` (`reference.md` §5 explains the classes):

   | `worktreeDisposition`                         | Stage 0       |
   | --------------------------------------------- | ------------- |
   | `clean` · `documents-only` · `generated-only` | pass          |
   | `source-dirty`                                | abort with §1 |

   Report the paths in `data.assessment.worktree.source` with the abort message. A build artifact is never a reason to refuse a PR, and generated paths are never staged here. With `--skip-enrich`, `documents-only` also aborts — nothing will commit them.

5. `gh auth status` — on failure set `GH_AUTH = false`, continue through Stage 3, and save the body locally in Stage 4.

## Stage 1 — FCA Document Sync

Skipped entirely when `--skip-enrich` is passed.

1. Derive the changed paths: `git diff --name-only <BASE_REF>...HEAD`.
2. Map each changed path to its owning fractal:

   ```text
   mcp__plugin_filid_tools__context_resolve({
     path: PROJECT_ROOT,
     targetPath: <changed path>
   })
   ```

   Collect the distinct `ownerFractalPath` values. This is the audit scope — **do not enrich the whole tree.** PR scope and document scope must match.

3. Invoke `Skill("filid:enrich-docs", "<owner fractal paths>")`. Append `--auto-approve` **exactly when this skill received it** — never by inferring that a pipeline is running. An orchestrator that wants unattended document sync passes the flag; without it, enrich-docs keeps its own approval step and a standalone run stays interactive.
4. On enrich-docs failure, print the BLOCKED message (`reference.md` §1) and exit. `--skip-enrich` bypasses this stage.
5. If `git status --porcelain` now reports changes, stage **only** `INTENT.md` / `DETAIL.md` paths and commit:

```text
docs(filid): sync INTENT.md / DETAIL.md via enrich-docs
```

Source modifications left by Stage 1 surface as a Stage 0 abort on the next run. That is the intended contract, not a defect. Generated paths do not — they are classified, not staged.

## Stage 2 — Base Branch Resolution

Use `--base` when given. Otherwise resolve in the order documented in `reference.md` §2 (configured remote default → `origin/main` → `origin/master`). Verify the ref exists before continuing.

## Stage 3 — Change Analysis and PR Body

1. Collect the commit subjects and the changed-file list for `<BASE_REF>...HEAD`.
2. Build the body with the three canonical sections in `reference.md` §3: **Architecture**, **Code**, **Test**. Every section is present even when its content is "none".
3. Record the FCA document commit from Stage 1 in the Architecture section when one was made.
4. The PR title is English. The body follows the `[filid:lang]` language; technical terms, identifiers, and paths stay in their original form.

## Stage 4 — PR Publication

1. `gh pr view` decides create versus update.
2. <!-- [INTERACTIVE] --> An existing PR requires an explicit overwrite confirmation before its body is replaced.
3. `--draft` creates a draft PR.
4. With `GH_AUTH = false`, write the body to `.filid/review/<branch>/pr-body.md` and report the path instead of publishing. The branch segment is required — a flat `.filid/review/pr-body.md` lets a second branch overwrite the first branch's saved body.

## Options

| Option           | Type   | Default | Effect                                                       |
| ---------------- | ------ | ------- | ------------------------------------------------------------ |
| `--base REF`     | string | auto    | Base branch for the diff and the PR                          |
| `--skip-enrich`  | flag   | off     | Skip Stage 1 document sync                                   |
| `--auto-approve` | flag   | off     | Forwarded to `enrich-docs`, which then writes without asking |
| `--draft`        | flag   | off     | Create the PR as a draft                                     |
| `--title TITLE`  | string | auto    | PR title; generated when omitted                             |

## Invariants

- This skill never edits source code. Stage 1 changes documents only, through `enrich-docs`, which validates what it writes and asks for approval unless `--auto-approve` was forwarded.
- Only `INTENT.md` / `DETAIL.md` are staged by this skill. Any other staged path is a defect.
- Generated paths are classified so the cycle can continue, never staged and never committed. Committing build output stays the developer's call.
- Document sync failure blocks PR creation. `--skip-enrich` is the only bypass, and it is recorded in the terminal output.
- Base resolution never guesses silently; an unresolvable base is an error.

## Terminal Output

```text
Pull request: <created|updated|body-saved> <url-or-path>
Document sync: <committed|no-change|skipped>
```
