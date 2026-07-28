---
name: migrate
user_invocable: true
description: '[filid:migrate] Explicitly migrate legacy CLAUDE.md and SPEC.md names to INTENT.md and DETAIL.md with a portable dry-run-first script and post-validation.'
argument-hint: '[path] [--execute] [--auto-commit]'
version: '2.0.0'
complexity: simple
plugin: filid
---

# migrate — CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md Migration

Migrate an existing FCA-AI project from the legacy `CLAUDE.md`/`SPEC.md` naming convention to the new `INTENT.md`/`DETAIL.md` naming. Uses a cross-platform Node script for batch processing — the LLM only reads the script output and reports to the user.

> **Detail Reference**: For script usage and implementation details, read the `reference.md` file in this skill's directory.

## When to Use This Skill

- Upgrading a project initialized with filid < 0.1.0 that uses `CLAUDE.md`/`SPEC.md`
- After updating the filid plugin and wanting to adopt the new naming convention
- When `filid:scan` reports `CLAUDE.md` files that should be `INTENT.md`

### Relationship with Other Skills

- **`filid:scan`**: Reports legacy document names; this skill performs the
  explicit rename.
- **`filid:setup`**: Creates current document names for new projects; this
  workflow is only for existing legacy files.
- **`filid:enrich-docs`**: May improve document content after this naming
  migration, as a separate approved workflow.

## Core Workflow

All phases are handled by `migrate.mjs`. The LLM executes the script and reports the output to the user.

### Step 1 — Dry-Run (default)

Run the script without `--execute` to preview the migration plan:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/migrate/migrate.mjs" <target-path>
```

> **Script resolution**: Use `${CLAUDE_PLUGIN_ROOT}` to resolve the absolute path. If `CLAUDE_PLUGIN_ROOT` is not set, use `Glob(**/skills/migrate/migrate.mjs)` to locate the script. If the script is not found, abort with an error message.

The script outputs:

- Phase 1: Files found, conflicts detected
- Phase 2: Renames planned (skipped in dry-run)
- Phase 3: Cross-file references that would be updated
- Phase 4: Summary report

Report the output to the user. The user re-runs the skill with `--execute` to apply the migration; no inline confirmation prompt is issued from this skill (the explicit `--execute` flag is the gate).

### Step 2 — Execute (with `--execute` flag)

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/migrate/migrate.mjs" <target-path> --execute [--auto-commit]
```

The script performs:

1. `git mv` renames (falls back to `mv` if not a git repo)
2. portable Node reference updates across supported text files
3. Optional auto-commit with structured commit message

### Step 3 — Post-Migration Validation

After execution, call:

```text
mcp__plugin_filid_tools__structure_validate({
  path: "<target-path>",
  mode: "project",
  scopes: ["documents", "nodes", "entry-points"]
})
```

Read the findings from the returned result or, when the payload exceeds the
inline envelope budget, from its artifact — a whole-project migration can push
it over. An absent inline `data` is not an empty finding set.

Preserve diagnostics and findings in the report. A non-`ok` result means the
migration ran but compliance is not verified.

## Options

```
/filid:migrate [path] [--execute] [--auto-commit]
# Without --execute: dry-run mode (default), no files modified
```

| Option          | Type   | Default                   | Description                                      |
| --------------- | ------ | ------------------------- | ------------------------------------------------ |
| `path`          | string | Current working directory | Scope migration to a specific subdirectory       |
| `--execute`     | flag   | off                       | Actually perform the renames and content updates |
| `--auto-commit` | flag   | off                       | Auto-commit migration changes after execution    |

## Reversibility

Migration uses `git mv` inside a repository, so history records the rename.
Outside a repository, reverse the listed rename plan manually. See reference.md
for bounded reversal guidance.

## Quick Reference

```bash
# Preview migration plan (dry-run, default)
/filid:migrate

# Migrate a specific sub-directory
/filid:migrate src/payments

# Execute migration
/filid:migrate --execute

# Execute and auto-commit
/filid:migrate --execute --auto-commit
```

Key rules:

- Default mode (no `--execute` flag) is a dry run that never modifies files
- Directories with both `CLAUDE.md` and `INTENT.md` are **skipped** — resolve manually
- Same conflict check for `SPEC.md` + `DETAIL.md` coexistence
- `--auto-commit` creates a single commit containing only the migration changes
