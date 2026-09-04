---
name: pull-request
user-invocable: true
description: 'Sync branch FCA documents through enrich-docs, then open or update a structured GitHub pull request. Use when a branch is ready for a PR with INTENT/DETAIL drift closed first.'
argument-hint: '[--base REF] [--skip-enrich] [--draft] [--title TITLE] [--auto-approve] [--push|--no-push]'
version: '1.1.0'
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
6. Remote state — `git rev-parse --verify -q refs/remotes/origin/<BRANCH>`; when it resolves, `git rev-list --count origin/<BRANCH>..HEAD`. Set `UNPUSHED = true` when the remote branch is missing or that count is above zero. Not an abort: `--push` is on by default, so Stage 4 pushes the branch before opening the PR; with `--no-push` Stage 4 saves the body instead of calling `gh`, whose own error (`Head sha can't be blank`) never names the cause.

## Stage 1 — FCA Document Sync

Skipped entirely when `--skip-enrich` is passed.

1. Derive the changed paths: `git diff --name-only <BASE_REF>...HEAD`.
2. Map all changed paths to their owning fractals with one `fractal_inspect` `resolve` batch:

   ```text
   mcp__plugin_filid_tools__fractal_inspect({
     action: "resolve",
     path: PROJECT_ROOT,
     requests: [
       { targetPath: <changed path 1> },
       { targetPath: <changed path 2> }
     ]
   })
   ```

   Read `data.results`, or the artifact results when inline `data` is absent, and preserve changed-path order. A `resolved: true` item contributes its `result.summary.ownerFractalPath`, including a target under a config-excluded directory name; keep its diagnostics visible without discarding the resolved owner. For `resolved: false`, classify the path as existing ownerless non-FCA only when every diagnostic code is `context-target-unresolved` and `git cat-file -e HEAD:<path>` succeeds. Read `structure.additionalExcludedDirectories` from `.filid/config.json` to label that ownerless result as config-declared when a project-relative directory segment exactly matches; otherwise label it structural ownerless. A failed result for a path absent from `HEAD` — including a deleted or renamed source — or any other diagnostic stops the run. Collect distinct owners from the resolved items. This is the audit scope — **do not enrich the whole tree.** PR scope and FCA document scope must match.

3. Report every config-declared and structural ownerless non-FCA path with its reason, and carry a count summary into the PR body's Architecture section. These paths stay in Stage 3's PR change analysis; only FCA document sync excludes them. When the owner list is empty, do not invoke enrich-docs and set document sync to `no-change`.
4. Otherwise invoke `Skill("filid:enrich-docs", "<owner fractal paths>")`. Append `--auto-approve` **exactly when this skill received it** — never by inferring that a pipeline is running. An orchestrator that wants unattended document sync passes the flag; without it, enrich-docs keeps its own approval step and a standalone run stays interactive.
5. On enrich-docs failure, print the BLOCKED message (`reference.md` §1) and exit. `--skip-enrich` bypasses this stage.
6. If `git status --porcelain` now reports changes, stage **only** `INTENT.md` / `DETAIL.md` paths and commit:

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

1. `UNPUSHED = true` and `--push` on (the default): run `git push -u origin <BRANCH>` first — a PR opened from a stale remote head would review commits the branch no longer matches. `UNPUSHED = true` and `--push` off (`--no-push`): skip `gh` entirely, save the body as in step 5, and print the §1 unpushed-branch message. `UNPUSHED = false`: continue.
2. `gh pr view` decides create versus update.
3. <!-- [INTERACTIVE] --> An existing PR requires an explicit overwrite confirmation before its body is replaced.
4. `--draft` creates a draft PR.
5. With `GH_AUTH = false`, write the body to `.filid/review/<branch>/pr-body.md` and report the path instead of publishing. The branch segment is required — a flat `.filid/review/pr-body.md` lets a second branch overwrite the first branch's saved body.

## Options

| Option           | Type   | Default | Effect                                                                                                              |
| ---------------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `--base REF`     | string | auto    | Base branch for the diff and the PR                                                                                 |
| `--skip-enrich`  | flag   | off     | Skip Stage 1 document sync                                                                                          |
| `--auto-approve` | flag   | off     | Forwarded to `enrich-docs`, which then writes without asking                                                        |
| `--draft`        | flag   | off     | Create the PR as a draft                                                                                            |
| `--title TITLE`  | string | auto    | PR title; generated when omitted                                                                                    |
| `--push`         | flag   | on      | Push an unpushed branch before Stage 4; `--no-push` turns it off, and the run then ends with a saved body, not a PR |

## Invariants

- This skill never edits source code. Stage 1 changes documents only, through `enrich-docs`, which validates what it writes and asks for approval unless `--auto-approve` was forwarded.
- `--push` is on by default: an unpushed branch is pushed before the PR opens, and the push is always named in the terminal output — never silent. With `--no-push` the run ends in a saved body and a message naming the cause.
- Only `INTENT.md` / `DETAIL.md` are staged by this skill. Any other staged path is a defect.
- Generated paths are classified so the cycle can continue, never staged and never committed. Committing build output stays the developer's call.
- Config-declared and existing ownerless non-FCA paths are reported and excluded only from document sync. An unresolved path missing from `HEAD` or carrying another diagnostic still blocks PR creation.
- Document sync failure blocks PR creation. `--skip-enrich` is the only bypass, and it is recorded in the terminal output.
- Base resolution never guesses silently; an unresolvable base is an error.

## Terminal Output

```text
Pull request: <created|updated|body-saved> <url-or-path>
Document sync: <committed|no-change|skipped>
Branch push: <pushed|up-to-date|declined>
```
