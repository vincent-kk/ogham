# fca-migrate Reference

Detailed reference for the `migrate.sh` script that handles CLAUDE.md/SPEC.md
to INTENT.md/DETAIL.md batch migration.

---

## Script Location

```
skills/fca-migrate/migrate.sh
```

## Usage

```bash
migrate.sh <target-path> [--dry-run|--execute] [--auto-commit]
```

| Argument         | Description                                              |
| ---------------- | -------------------------------------------------------- |
| `<target-path>`  | Directory to scan (defaults to `.`)                      |
| `--dry-run`      | Preview mode — no files modified (default)               |
| `--execute`      | Perform renames and reference updates                    |
| `--auto-commit`  | Commit all changes after successful execution            |

---

## Phase 1 — Scan & Conflict Detection

The script uses `find` to locate `CLAUDE.md` and `SPEC.md` files, excluding:
- `node_modules/`
- `dist/`
- `.git/`
- `.claude/`
- `.claude-plugin/`

For each file found, it checks if the target name already exists in the same
directory:
- `CLAUDE.md` + `INTENT.md` coexist → **conflict**, skipped
- `SPEC.md` + `DETAIL.md` coexist → **conflict**, skipped

### Output

```
## Phase 1 — Scan & Conflict Detection

Found: 5 CLAUDE.md, 3 SPEC.md
  RENAME: src/core/CLAUDE.md → src/core/INTENT.md
  CONFLICT: src/ast/ — both CLAUDE.md and INTENT.md exist
  ...

Renames planned: 7
Conflicts (skipped): 1
```

---

## Phase 2 — Rename

Only runs with `--execute`.

- In git repos: `git mv CLAUDE.md INTENT.md` (preserves history)
- Outside git: `mv CLAUDE.md INTENT.md` (fallback)

### Output

```
## Phase 2 — Rename
Renamed: 7 files
```

---

## Phase 3 — Scoped Reference Update

Only runs with `--execute`. Uses **relative-path-based scoped replacement** to
avoid unintended changes to files outside renamed directories.

### How it works

Phase 2 collects which directories had renames (`_renamed_claude_dirs`,
`_renamed_spec_dirs`). Phase 3 then only searches files **under those
directories**, using depth-aware patterns:

| File depth (relative to renamed dir) | Patterns replaced |
| ------------------------------------ | ----------------------------------------- |
| 0 (same directory) | `CLAUDE.md`, `./CLAUDE.md` |
| 1 (one level deep) | `../CLAUDE.md` |
| 2 (two levels deep) | `../../CLAUDE.md` |
| N | `"../" × N + "CLAUDE.md"` |

The same logic applies for `SPEC.md` → `DETAIL.md`.

**Files outside renamed directories are never modified.** This prevents:
- Skills prompts referencing `CLAUDE.md` as a concept from being changed
- Logic code (e.g., `context-injector.ts`) with `CLAUDE.md` string constants
  from being altered when the file is not under a renamed directory

Uses `sed` with platform detection (macOS `sed -i ''` vs GNU `sed -i`).

In dry-run mode, lists matching files with their depth info without modifying.

### Output (dry-run)

```
## Phase 3 — Reference Update (scoped)
Scoped reference scan (files that would be updated):
  src/core/README.md (depth=0: bare + ./)
  src/core/__tests__/foo.test.ts (depth=1: ../CLAUDE.md)
Files with scoped references to update: 2
(dry-run — no changes made)
```

### Output (execute)

```
## Phase 3 — Reference Update (scoped)
Updated references in: 2 files
```

---

## Phase 4 — Report

Summary of all operations:

```
## Phase 4 — Report

Mode: execute
Renames: 7 planned
Renamed: 7 files
References updated: 12 files
Conflicts skipped: 1
```

### Auto-Commit

When `--auto-commit` is passed with `--execute` in a git repo:

```bash
git add -A
git commit -m "refactor: migrate CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md naming

Renamed: 7 files
References updated: 12 files
Conflicts skipped: 1"
```

Output:
```
## Auto-Commit
Committed: abc1234
```

---

## LLM Integration

The LLM should:

1. **Dry-run first**: Always run without `--execute` first
2. **Report**: Show the script output to the user
3. **Confirm**: Ask the user before running with `--execute`
4. **Post-validate** (optional): Run `structure_validate` MCP tool after execution

### Resolving the script path

The script is located relative to the filid plugin installation. Use the
plugin's skill directory:

```bash
# Find the script path from the plugin directory
bash "<plugin-dir>/skills/fca-migrate/migrate.sh" <target-path>
```

---

## Reversal

To undo the migration:

```bash
# If auto-committed, revert the commit
git revert <commit-sha>

# Or reset entirely
git reset HEAD~1
git checkout .
```
