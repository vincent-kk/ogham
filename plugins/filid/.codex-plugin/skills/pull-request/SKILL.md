---
name: pull-request
user_invocable: true
description: '[filid:pull-request] Sync INTENT.md and DETAIL.md via update, then automatically generate a structured GitHub PR with Architecture, Code, and Test sections from the current branch changes.'
argument-hint: '[--base REF] [--skip-update] [--draft] [--title TITLE]'
version: '1.2.1'
complexity: medium
plugin: filid
---

> **EXECUTION MODEL (Tier-2b interactive-aware)**: Execute all stages as
> a SINGLE CONTINUOUS OPERATION EXCEPT at the step marked
> `<!-- [INTERACTIVE] -->` (existing-PR overwrite confirmation). NEVER
> yield after `Skill("filid:update")` returns, git command completion,
> or `gh` CLI operations — chain the next stage in the same turn.
>
> **Valid reasons to yield**:
>
> 1. The `[INTERACTIVE]` existing-PR confirmation
> 2. Terminal marker: the GitHub PR URL
>    (`https://github.com/<owner>/<repo>/pull/<N>`) or an abort message

# pull-request — FCA-Aware Pull Request Generator

Synchronize FCA context documents (INTENT.md/DETAIL.md) with the latest
code, then analyze branch changes and generate a structured GitHub PR.
The update sync is a hard prerequisite — PR creation is blocked on sync
failure unless explicitly skipped.

> **Reference**: `reference.md` — git/gh command signatures, base-branch
> detection algorithm, PR body template, error handling map.

## When to Use

- After completing branch work, before opening a PR
- When FCA context documents and code need synchronized PR delivery
- When a structured PR body (Architecture / Code / Test) is required

Related: `/filid:update` (invoked in Stage 1), `/filid:cross-review`
(chain after PR creation), `/filid:structure-review` (run separately
before PR creation).

## Core Workflow

### Stage 0 — Prerequisites

Sequential checks (details: `reference.md` §0):

1. Inside a git repository
2. Not on `main`/`master`, not detached HEAD
3. Worktree state: clean → pass; only `INTENT.md`/`DETAIL.md` dirty →
   pass (Stage 1 commits them); any other dirty file → abort. With
   `--skip-update`, dirty FCA documents also abort (Stage 1 is their
   sole committer).
4. `gh auth status` — failure sets `GH_AUTH = false` (continue through
   Stage 3, save the body locally in Stage 4)

### Stage 1 — FCA Context Sync

`Skill("filid:update")` — on failure, print the BLOCKED message
(`reference.md` §1) and exit; `--skip-update` skips this stage.

After update completes, if `git status --porcelain` reports changes,
stage **only** `INTENT.md`/`DETAIL.md` paths and commit:
`docs(filid): sync INTENT.md / DETAIL.md via update`. Non-FCA
modifications from update surface as a Stage 0 abort on the next run —
this is the expected contract.

### Stage 2 — Base Branch Resolution

`--base=<ref>` → verify with `git rev-parse --verify`. Otherwise
auto-detect: `git remote show origin` HEAD branch, falling back to
`origin/main` then `origin/master` (`reference.md` §2). No candidate →
abort: "Specify --base explicitly."

### Stage 3 — Change Analysis & PR Body

Collect the base↔HEAD diff, stats, and commit messages
(`reference.md` §3), then generate the 4-section body:

- **Summary** — purpose, scope, affected modules (3-5 lines)
- **Architecture Changes (FCA Context Diff)** — INTENT/DETAIL diff and
  structural/interface changes
- **Code Changes** — per-module changes with intent; ≤30 changed files →
  file-level detail, >30 → directory-level summary
- **Test Plan** — reviewer checklist + collapsible Given-When-Then
  scenarios

Empty diff → abort: "No changes detected."

### Stage 4 — PR Publication

1. Write the generated body to `.filid/pr-draft/<branch>.md` — every
   path below passes it via `--body-file` (inline `--body` breaks on
   backticks/quotes in generated markdown). Delete the file after a
   successful publication; keep it on every failure path.
2. `GH_AUTH == false` → keep the body file, print manual instructions
   (`reference.md` §4.1), END.
3. Existing open PR check (`gh pr list --head <branch>`):
   <!-- [INTERACTIVE] AskUserQuestion: replace existing PR body -->
   an open PR exists → confirm "Replace the existing PR body entirely?"
   — Overwrite → `gh pr edit <N> --body-file <file>`, emit the final
   report (status: updated), END — steps 4-5 are create-path only;
   Skip → keep the body file, print its path, END.
4. Push if the remote branch is missing: `git push -u origin <branch>`.
5. `gh pr create --base <BASE_REF> --title "<title>" --body-file <file>`
   (+ `--draft` when set), then emit the final report with the PR URL
   (`reference.md` §4.5).

## Options

> Options are LLM-interpreted hints, not strict CLI flags.

| Option          | Type   | Default | Description                                      |
| --------------- | ------ | ------- | ------------------------------------------------ |
| `--base`        | string | auto    | PR base branch (auto-detected when unspecified)  |
| `--skip-update` | flag   | off     | Skip Stage 1 (update)                            |
| `--draft`       | flag   | off     | Create as draft PR                               |
| `--title`       | string | auto    | Explicit PR title (auto-generated; max 70 chars) |

## Quick Reference

```
/filid:pull-request                       # auto base, update included
/filid:pull-request --base=main --draft
/filid:pull-request --skip-update --title="feat(filid): ..."

Stages:  0 Prerequisites → 1 FCA Sync → 2 Base Resolution →
         3 Body Generation → 4 Publication
Output:  GitHub PR URL (or .filid/pr-draft/<branch>.md when gh auth fails)
```

Key rules:

- update failure blocks PR creation (`--skip-update` to bypass)
- The existing PR body is fully replaced after user confirmation
- PR title in English; PR body in the `[filid:lang]` language (default
  English) — technical terms, identifiers, and paths stay original
