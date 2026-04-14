---
name: filid-pull-request
user_invocable: true
description: "[filid:filid-pull-request] Sync INTENT.md and DETAIL.md via update, then automatically generate a structured GitHub PR with Architecture, Code, and Test sections from the current branch changes."
argument-hint: "[--base REF] [--skip-update] [--draft] [--title TITLE]"
version: "1.1.0"
complexity: medium
plugin: filid
---

> **EXECUTION MODEL**: Execute all stages as a SINGLE CONTINUOUS OPERATION.
> After each stage completes, IMMEDIATELY proceed to the next in the SAME TURN.
> NEVER yield after `Skill("filid:filid-update")` delegation returns, git
> command completion, or `gh` CLI operations.
>
> **Valid reasons to yield**:
> 1. User decision genuinely required
> 2. Terminal stage marker emitted: GitHub PR URL (`https://github.com/<owner>/<repo>/pull/<N>`) or abort message
>
> **HIGH-RISK YIELD POINTS**:
> - After Stage 1 `filid:filid-update` delegation — chain Stage 2 branch analysis in the same turn
> - After `git diff` / `git log` analysis — do NOT pause to summarize; continue to PR body composition
> - After `gh pr create` returns PR URL — emit PR URL in the final report (this is the natural terminal; further yield is permitted)
> - `--skip-update` path — proceed directly to Stage 2 without intermediate summary

# filid-pull-request — FCA-Aware Pull Request Generator

Synchronize FCA context documents (INTENT.md/DETAIL.md) with the latest code,
then analyze branch changes to automatically generate a structured GitHub PR.
The update sync is enforced as a prerequisite — PR creation is blocked on
sync failure unless explicitly skipped.

> **Detail Reference**: See `reference.md` for git command signatures, base
> branch detection algorithm, PR body templates, and error handling details.

## When to Use This Skill

- After completing branch work, before opening a PR
- When FCA context documents and implementation code need synchronized PR delivery
- When a structured PR body (Architecture / Code / Test sections) is required
- To automate repetitive manual PR authoring

### Relationship with Other Skills

- `/filid:filid-update`: Automatically invoked in Stage 1 to sync context documents
- `/filid:filid-review`: Can be chained after PR creation for the code review pipeline
- `/filid:filid-structure-review`: Run separately before PR creation for structural verification

## Core Workflow

### Stage 0 — Prerequisites & Validation

Verify preconditions before PR creation.

1. Confirm git repository
2. Verify current branch (block direct PR from main/master)
3. Check for uncommitted changes — abort only if non-FCA-document files (other than `INTENT.md`/`DETAIL.md`) are staged or unstaged; a clean worktree or FCA-document-only changes pass through
4. Verify `gh` CLI authentication

See [reference.md Section 0](./reference.md#section-0--prerequisites--validation).

### Stage 1 — FCA Context Sync

Invoke `Skill("filid:filid-update")` to synchronize INTENT.md/DETAIL.md with the
current codebase.

- **Success**: Proceed to Stage 2
- **Failure**: Block PR creation, report failure reason, and exit
- **`--skip-update`**: Skip Stage 1 entirely and proceed directly to Stage 2

After `filid:update` completes, check for uncommitted changes (`git status --porcelain`).
If changes exist (from INTENT.md/DETAIL.md updates or structural corrections),
stage and commit them before proceeding to Stage 2.

See [reference.md Section 1](./reference.md#section-1--fca-context-sync).

### Stage 2 — Base Branch Resolution

Determine the PR base branch.

- **`--base=<ref>`**: Use the specified branch
- **Unspecified**: Run merge-base distance auto-detection algorithm

See [reference.md Section 2](./reference.md#section-2--base-branch-resolution).

### Stage 3 — Change Analysis & PR Body Generation

Analyze the base↔HEAD diff and generate a 4-section structured PR body.

- **Summary**: Core purpose, change scope, affected modules
- **Architecture Changes (FCA Context Diff)**: Context document change analysis
- **Code Changes**: Per-module/file changes with development intent
- **Test Plan**: Verification steps and test checklist

Existing PR body is fully replaced (manual edits are not preserved).

See [reference.md Section 3](./reference.md#section-3--change-analysis--pr-body-generation).

### Stage 4 — PR Publication

Create or update a GitHub PR with the generated body.

1. Re-verify `gh auth status`
2. Check for existing PR → update or create new
3. `git push -u origin <branch>` (if needed)
4. Execute `gh pr create` or `gh pr edit`

See [reference.md Section 4](./reference.md#section-4--pr-publication).

## Available MCP Tools

| Tool             | Action                   | Stage | Purpose                                                       |
| ---------------- | ------------------------ | ----- | ------------------------------------------------------------- |
| `mcp_t_review_manage`  | `generate-human-summary` | 3     | (Optional) Generate human-friendly PR summary from review session |

Stage 1 delegates to `/filid:filid-update`, which internally uses its own MCP tools
(`mcp_t_cache_manage`, `mcp_t_fractal_scan`, `mcp_t_test_metrics`, etc.). All other operations use
Bash (git, gh) and the Skill tool.

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language
> works equally well (e.g., "create a PR against main" instead of `--base=main`).

```
/filid:filid-pull-request [--base=<ref>] [--skip-update] [--draft] [--title=<title>]
```

| Option          | Type   | Default | Description                                                       |
| --------------- | ------ | ------- | ----------------------------------------------------------------- |
| `--base`        | string | auto    | PR base branch (auto-detected when unspecified)                   |
| `--skip-update` | flag   | off     | Skip Stage 1 (update)                                         |
| `--draft`       | flag   | off     | Create as draft PR                                                |
| `--title`       | string | auto    | Explicit PR title (auto-generated when unspecified, max 70 chars) |

## Quick Reference

```bash
# Default execution (auto base, update included)
/filid:filid-pull-request

# Target main branch
/filid:filid-pull-request --base=main

# Skip update (already ran manually)
/filid:filid-pull-request --skip-update

# Create as draft PR
/filid:filid-pull-request --draft

# Explicit title
/filid:filid-pull-request --title="feat(filid): add pull-request skill"
```

```
Stages:   Stage 0 (Prerequisites) → Stage 1 (FCA Sync) → Stage 2 (Base Resolution) → Stage 3 (Change Analysis) → Stage 4 (PR Publication)
Agents:   (Stage 1 delegates to update internal agents)
Output:   GitHub PR URL
Language: PR title in English; PR body in the language specified by the `[filid:lang]` tag (default: English). Tech terms / code identifiers kept as-is.
```

Key rules:

- update failure blocks PR creation (`--skip-update` to bypass)
- Existing PR body is fully replaced after user confirmation
- If `gh` auth fails, PR body is saved locally to `.filid/pr-draft/<branch>.md`
- PR title written in English; PR body language follows the `[filid:lang]` tag configured in `.filid/config.json` (default: English); technical terms and code identifiers remain in original form
- File-level detail for ≤30 changed files; directory-level summary for >30 files
