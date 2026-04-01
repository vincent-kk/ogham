---
name: fca-migrate
user_invocable: true
description: Migrate an existing FCA-AI project from the legacy CLAUDE.md and SPEC.md naming convention to the new INTENT.md and DETAIL.md naming using a shell script for batch processing. Use when upgrading a project initialized with filid older than 0.1.0, after updating the filid plugin, or when fca-scan reports CLAUDE.md files that should be INTENT.md. Supports dry-run preview and auto-commit.
version: "2.0.0"
complexity: simple
plugin: filid
---

# fca-migrate — CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md Migration

Migrate an existing FCA-AI project from the legacy `CLAUDE.md`/`SPEC.md` naming
convention to the new `INTENT.md`/`DETAIL.md` naming. Uses a shell script for
batch processing — the LLM only reads the script output and reports to the user.

> **Detail Reference**: For script usage and implementation details,
> read the `reference.md` file in this skill's directory.

## When to Use This Skill

- Upgrading a project initialized with filid < 0.1.0 that uses `CLAUDE.md`/`SPEC.md`
- After updating the filid plugin and wanting to adopt the new naming convention
- When `fca-scan` reports `CLAUDE.md` files that should be `INTENT.md`

### Relationship with Other Skills

- **fca-scan**: May report legacy `CLAUDE.md` files as violations — run this skill to fix them.
- **fca-init**: Generates `INTENT.md`/`DETAIL.md` for new projects. This skill migrates old projects to the same convention.
- **fca-update**: After migration, use `fca-update` to verify INTENT.md/DETAIL.md content is current.

## Core Workflow

All phases are handled by `migrate.sh`. The LLM executes the script and
reports the output to the user.

### Step 1 — Dry-Run (default)

Run the script without `--execute` to preview the migration plan:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/fca-migrate/migrate.sh" <target-path>
```

> **Script resolution**: Use `${CLAUDE_PLUGIN_ROOT}` to resolve the absolute path.
> If `CLAUDE_PLUGIN_ROOT` is not set, use `Glob(**/skills/fca-migrate/migrate.sh)`
> to locate the script. If the script is not found, abort with an error message.

The script outputs:
- Phase 1: Files found, conflicts detected
- Phase 2: Renames planned (skipped in dry-run)
- Phase 3: Cross-file references that would be updated
- Phase 4: Summary report

Report the output to the user and ask for confirmation before proceeding.

### Step 2 — Execute (requires user confirmation)

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/fca-migrate/migrate.sh" <target-path> --execute [--auto-commit]
```

The script performs:
1. `git mv` renames (falls back to `mv` if not a git repo)
2. `sed` reference updates across `.md`, `.ts`, `.js` files
3. Optional auto-commit with structured commit message

### Step 3 — Post-Migration Validation (optional)

After execution, optionally run `structure_validate` to confirm compliance.

## Options

```
/filid:fca-migrate [path] [--execute] [--auto-commit]
# Without --execute: dry-run mode (default), no files modified
```

| Option           | Type   | Default                   | Description                                          |
| ---------------- | ------ | ------------------------- | ---------------------------------------------------- |
| `path`           | string | Current working directory | Scope migration to a specific subdirectory           |
| `--execute`      | flag   | off                       | Actually perform the renames and content updates      |
| `--auto-commit`  | flag   | off                       | Auto-commit migration changes after execution         |

## Reversibility

Migration uses `git mv`, so it is fully reversible via `git checkout` or by
running the inverse renames. See reference.md for reversal steps.

## Quick Reference

```bash
# Preview migration plan (dry-run, default)
/filid:fca-migrate

# Migrate a specific sub-directory
/filid:fca-migrate src/payments

# Execute migration
/filid:fca-migrate --execute

# Execute and auto-commit
/filid:fca-migrate --execute --auto-commit
```

Key rules:

- `--dry-run` (default) never modifies files
- Directories with both `CLAUDE.md` and `INTENT.md` are **skipped** — resolve manually
- Same conflict check for `SPEC.md` + `DETAIL.md` coexistence
- `--auto-commit` creates a single commit with all migration changes
