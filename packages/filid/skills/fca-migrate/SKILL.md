---
name: fca-migrate
user_invocable: true
description: Migrate FCA-AI project from CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md naming — supports dry-run, scoped migration, and auto-commit
version: 1.1.0
complexity: medium
---

# fca-migrate — CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md Migration

Migrate an existing FCA-AI project from the legacy `CLAUDE.md`/`SPEC.md` naming
convention to the new `INTENT.md`/`DETAIL.md` naming. Renames files via `git mv`
to preserve history, updates internal cross-references, and validates the result
against FCA-AI rules.

> **Detail Reference**: For detailed workflow steps, MCP tool examples,
> and output format templates, read the `reference.md` file in this
> skill's directory (same location as this SKILL.md).

## When to Use This Skill

- Upgrading a project initialized with filid < 0.1.0 that uses `CLAUDE.md`/`SPEC.md`
- After updating the filid plugin and wanting to adopt the new naming convention
- When `fca-scan` reports `CLAUDE.md` files that should be `INTENT.md`

### Relationship with Other Skills

- **fca-scan**: May report legacy `CLAUDE.md` files as violations — run this skill to fix them.
- **fca-init**: Generates `INTENT.md`/`DETAIL.md` for new projects. This skill migrates old projects to the same convention.
- **fca-update**: After migration, use `fca-update` to verify INTENT.md/DETAIL.md content is current.

## Core Workflow

### Phase 1 — Scan

Scan the project tree using `fractal_scan` and `Glob` to find all `CLAUDE.md`
and `SPEC.md` files.
See [reference.md Section 1](./reference.md#section-1--scan).

### Phase 2 — Analysis

For each file found, detect naming conflicts (both old and new names coexist)
and scan internal references that need updating.
See [reference.md Section 2](./reference.md#section-2--analysis).

### Phase 3 — Dry-Run Report (default)

Display a summary of all planned renames and content updates without modifying
any files. This is the default behavior.
See [reference.md Section 3](./reference.md#section-3--dry-run-report).

### Phase 4 — Execute (requires `--execute`)

Perform the actual migration:
1. Rename files via `git mv` (preserves git history)
2. Update internal references within renamed files
3. Validate renamed files pass `validateIntentMd()` / `validateDetailMd()`

See [reference.md Section 4](./reference.md#section-4--execute).

### Phase 5 — Verification

Run `structure_validate` to confirm the migrated project structure is valid.
Optionally auto-commit all changes.
See [reference.md Section 5](./reference.md#section-5--verification).

## Available MCP Tools

| Tool                 | Phase | Purpose                                          |
| -------------------- | ----- | ------------------------------------------------ |
| `fractal_scan`       | 1     | Build project hierarchy to locate legacy files   |
| `structure_validate` | 5     | Validate post-migration structure compliance     |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well (e.g., "dry-run으로 보여줘" instead of `--dry-run`).

```
/filid:fca-migrate [path] [--execute] [--auto-commit]
# Without --execute: dry-run mode (default), no files modified
```

| Option           | Type   | Default                   | Description                                          |
| ---------------- | ------ | ------------------------- | ---------------------------------------------------- |
| `path`           | string | Current working directory | Scope migration to a specific subdirectory           |
| `--execute`      | flag   | off                       | Actually perform the renames and content updates (default: dry-run) |
| `--auto-commit`  | flag   | off                       | Auto-commit migration changes after successful execution |

## Reversibility

Migration uses `git mv`, so it is fully reversible via `git checkout` or by
running the inverse renames. See reference.md for exact reversal steps.

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

# Phases: Scan → Analysis → Dry-Run Report → Execute → Verification
# Tools:  fractal_scan (Phase 1), structure_validate (Phase 5)
```

Key rules:

- `--dry-run` (default) never modifies files
- Directories with both `CLAUDE.md` and `INTENT.md` are **skipped** — resolve manually
- Same conflict check for `SPEC.md` + `DETAIL.md` coexistence
- All renamed `INTENT.md` files must pass validation (≤50 lines, 3-tier boundaries)
- `--auto-commit` creates a single commit with all migration changes
