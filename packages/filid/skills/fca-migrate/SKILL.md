---
name: fca-migrate
user_invocable: true
description: Migrate FCA-AI project from CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md naming
version: 1.0.0
complexity: low
---

# fca-migrate — CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md Migration

Migrate an existing FCA-AI project from the legacy `CLAUDE.md`/`SPEC.md` naming
convention to the new `INTENT.md`/`DETAIL.md` naming. Renames files via `git mv`
to preserve history, and updates internal cross-references within the documents.

> **Detail Reference**: For detailed workflow steps, MCP tool examples,
> and output format templates, read the `reference.md` file in this
> skill's directory (same location as this SKILL.md).

## When to Use This Skill

- Upgrading a project initialized with filid < 0.1.0 that uses `CLAUDE.md`/`SPEC.md`
- After updating the filid plugin and wanting to adopt the new naming convention
- When `fca-scan` reports `CLAUDE.md` files that should be `INTENT.md`

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--dry-run` | **yes** | Show planned changes without executing them |
| `--execute` | no | Actually perform the renames and content updates |
| `--path <dir>` | project root | Scope migration to a specific subdirectory |

## Core Workflow

### Phase 1 — Scan

Scan the project tree to find all `CLAUDE.md` and `SPEC.md` files.
See [reference.md Section 1](./reference.md#section-1--scan).

### Phase 2 — Analysis

For each file found, analyze internal references (dependency lists, see-also
links) that point to other `CLAUDE.md` or `SPEC.md` files.
Detect conflicts where both `CLAUDE.md` and `INTENT.md` exist in the same directory.
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
See [reference.md Section 5](./reference.md#section-5--verification).

## Reversibility

Migration uses `git mv`, so it is fully reversible via `git checkout` or by
running the inverse renames. The reference.md documents the exact reversal steps.
