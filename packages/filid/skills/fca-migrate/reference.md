# fca-migrate Reference

Detailed workflow for migrating CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md.

---

## Section 1 — Scan

Use `fractal_scan` to discover the project hierarchy:

```
fractal_scan({ path: "<project-root>" })
```

Then use `Glob` to find all legacy files:

```
Glob({ pattern: "**/CLAUDE.md", path: "<project-root>" })
Glob({ pattern: "**/SPEC.md", path: "<project-root>" })
```

Exclude `node_modules/`, `dist/`, and other build artifacts from results.

Build two lists:

1. **CLAUDE.md files**: All directories where `CLAUDE.md` exists
2. **SPEC.md files**: All directories where `SPEC.md` exists

If no `CLAUDE.md` or `SPEC.md` files are found, report "Nothing to migrate" and exit.

---

## Section 2 — Analysis

For each file found in Phase 1:

### Conflict Detection

Check if both old and new names coexist in the same directory:

```
Glob({ pattern: "INTENT.md", path: "<directory>" })
Glob({ pattern: "DETAIL.md", path: "<directory>" })
```

- `CLAUDE.md` + `INTENT.md` coexist: **warn** — partial prior migration
- `SPEC.md` + `DETAIL.md` coexist: **warn** — partial prior migration
- Do NOT rename in conflicting directories; ask the user to resolve manually

### Reference Scan

Read the content of each `CLAUDE.md` and `SPEC.md` file. Find internal references:

| Pattern to find | Replacement |
|-----------------|-------------|
| `CLAUDE.md` (in dependency lists, links) | `INTENT.md` |
| `SPEC.md` (in dependency lists, links) | `DETAIL.md` |
| `validateClaudeMd` | `validateIntentMd` |
| `validateSpecMd` | `validateDetailMd` |
| `hasClaudeMd` | `hasIntentMd` |
| `hasSpecMd` | `hasDetailMd` |
| `claudeMd` (in variable references) | `intentMd` |
| `specMd` (in variable references) | `detailMd` |

Use `Grep` to locate references across all project files (not just the files being renamed):

```
Grep({ pattern: "CLAUDE\\.md", path: "<project-root>", glob: "*.md" })
Grep({ pattern: "SPEC\\.md", path: "<project-root>", glob: "*.md" })
```

Build a migration plan: list of `{ source, target, contentReplacements[] }`.

---

## Section 3 — Dry-Run Report

Display the migration plan in a structured format:

```
## Migration Plan

### File Renames (N files)
  src/core/CLAUDE.md → src/core/INTENT.md
  src/core/SPEC.md → src/core/DETAIL.md
  src/hooks/CLAUDE.md → src/hooks/INTENT.md
  ...

### Content Updates (M references)
  src/core/INTENT.md: line 12: "see ../hooks/CLAUDE.md" → "see ../hooks/INTENT.md"
  ...

### Cross-File References (K files outside migration scope)
  src/tools/scanner.ts: line 45: "CLAUDE.md" → "INTENT.md"
  ...

### Conflicts (J directories) — require manual resolution
  src/ast/: both CLAUDE.md and INTENT.md exist
  ...

To execute this migration, run: /filid:fca-migrate --execute
```

If `--dry-run` (default), stop here.

---

## Section 4 — Execute

Only runs when `--execute` is passed.

### Step 4a — Rename Files

For each non-conflicting rename in the migration plan:

```bash
git mv <source> <target>
```

Example:
```bash
git mv src/core/CLAUDE.md src/core/INTENT.md
git mv src/core/SPEC.md src/core/DETAIL.md
```

### Step 4b — Update Content References

For each renamed file, read its content and apply the replacement patterns
from Section 2. Use the `Edit` tool:

```
Edit({
  file_path: "src/core/INTENT.md",
  old_string: "see ../hooks/CLAUDE.md",
  new_string: "see ../hooks/INTENT.md"
})
```

Also update cross-file references found by `Grep` in Section 2 — any `.md`
files outside the migration scope that reference old names.

### Step 4c — Validate

For each renamed INTENT.md file:
```
Read file → check line count ≤ 50 and 3-tier boundary sections present
```

For each renamed DETAIL.md file:
```
Read file → check no append-only violation
```

Report any validation failures.

---

## Section 5 — Verification

After all renames and content updates:

```
structure_validate({ path: "<project-root>" })
```

Confirm:
- All fractal nodes have `INTENT.md` (not `CLAUDE.md`)
- No orphaned `CLAUDE.md` or `SPEC.md` files remain (except in conflicting directories)
- All `INTENT.md` files pass validation
- All `DETAIL.md` files pass validation

### Auto-Commit (optional)

When `--auto-commit` is set:

```bash
git add -A
git commit -m "refactor: migrate CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md naming"
```

The commit message should include:
- Number of files renamed
- Number of references updated
- Any conflicts skipped

### Final Report

```
## Migration Complete

  Renamed: N files (M CLAUDE.md → INTENT.md, K SPEC.md → DETAIL.md)
  Content updates: X references updated
  Cross-file updates: Y references in non-migrated files
  Conflicts skipped: Z directories (manual resolution needed)
  Validation: all passed
  Committed: yes/no (commit SHA if applicable)
```

---

## Reversal

To undo the migration:

```bash
# If auto-committed, revert the commit
git revert <commit-sha>

# Or manually reverse each rename
git mv src/core/INTENT.md src/core/CLAUDE.md
git mv src/core/DETAIL.md src/core/SPEC.md
# ... repeat for all renamed files

# Revert content changes
git checkout HEAD~1 -- <list of modified files>
```

Or simply:
```bash
git reset HEAD~1
git checkout .
```
