# fca-migrate Reference

Detailed workflow for migrating CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md.

---

## Section 1 — Scan

Use the `fractal_scan` MCP tool to discover all legacy files:

```
fractal_scan({ path: "<project-root>" })
```

From the scan result, build two lists:

1. **CLAUDE.md files**: All directories where `CLAUDE.md` exists (check filesystem, not just `hasIntentMd`)
2. **SPEC.md files**: All directories where `SPEC.md` exists

Use `Glob` or `Bash` to find the actual files:

```bash
find <project-root> -name "CLAUDE.md" -not -path "*/node_modules/*"
find <project-root> -name "SPEC.md" -not -path "*/node_modules/*"
```

If no `CLAUDE.md` or `SPEC.md` files are found, report "Nothing to migrate" and exit.

---

## Section 2 — Analysis

For each file found in Phase 1:

### Conflict Detection

Check if both `CLAUDE.md` AND `INTENT.md` exist in the same directory:
- If yes: **warn** — this directory has a partial prior migration
- Do NOT rename `CLAUDE.md` in conflicting directories; ask the user to resolve manually
- Same check for `SPEC.md` + `DETAIL.md` coexistence

### Reference Scan

Read the content of each `CLAUDE.md` and `SPEC.md` file. Find internal references:

| Pattern to find | Replacement |
|-----------------|-------------|
| `CLAUDE.md` (in dependency lists, links) | `INTENT.md` |
| `SPEC.md` (in dependency lists, links) | `DETAIL.md` |
| `validateClaudeMd` (if mentioned) | `validateIntentMd` |
| `validateSpecMd` (if mentioned) | `validateDetailMd` |
| `hasClaudeMd` (if mentioned) | `hasIntentMd` |
| `hasSpecMd` (if mentioned) | `hasDetailMd` |

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

### Conflicts (K directories) — require manual resolution
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

### Step 4c — Validate

For each renamed INTENT.md file:
```
validateIntentMd(content) → must pass (≤ 50 lines, 3-tier boundaries)
```

For each renamed DETAIL.md file:
```
validateDetailMd(content) → must pass (no append-only violation)
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

### Final Report

```
## Migration Complete

  Renamed: N files (M CLAUDE.md → INTENT.md, K SPEC.md → DETAIL.md)
  Content updates: X references updated
  Conflicts skipped: Y directories (manual resolution needed)
  Validation: all passed
```

---

## Reversal

To undo the migration:

```bash
# Reverse each rename
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
