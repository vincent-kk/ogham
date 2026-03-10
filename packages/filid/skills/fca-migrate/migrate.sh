#!/bin/sh
# fca-migrate — Batch migration of CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md
#
# Usage: migrate.sh <target-path> [--dry-run|--execute] [--auto-commit]
#
# Phases:
#   1. Scan & Conflict Detection
#   2. Rename (--execute only)
#   3. Reference Update (--execute only)
#   4. Report
#
# POSIX sh compatible. Handles macOS sed -i '' vs GNU sed -i.

set -e

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
TARGET_PATH=""
MODE="dry-run"
AUTO_COMMIT=0

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
for arg in "$@"; do
  case "$arg" in
    --dry-run)   MODE="dry-run" ;;
    --execute)   MODE="execute" ;;
    --auto-commit) AUTO_COMMIT=1 ;;
    --help|-h)
      echo "Usage: migrate.sh <target-path> [--dry-run|--execute] [--auto-commit]"
      echo ""
      echo "Options:"
      echo "  --dry-run      Show migration plan without modifying files (default)"
      echo "  --execute      Perform the actual migration"
      echo "  --auto-commit  Auto-commit changes after successful migration"
      echo ""
      echo "Phases:"
      echo "  1. Scan & Conflict Detection"
      echo "  2. Rename (--execute only)"
      echo "  3. Reference Update (--execute only)"
      echo "  4. Report"
      exit 0
      ;;
    -*)
      echo "[fca-migrate] Unknown option: $arg" >&2
      exit 1
      ;;
    *)
      if [ -z "$TARGET_PATH" ]; then
        TARGET_PATH="$arg"
      else
        echo "[fca-migrate] Error: Multiple paths provided" >&2
        exit 1
      fi
      ;;
  esac
done

# Default to current directory
if [ -z "$TARGET_PATH" ]; then
  TARGET_PATH="."
fi

# Resolve to absolute path
TARGET_PATH=$(cd "$TARGET_PATH" && pwd)

if [ ! -d "$TARGET_PATH" ]; then
  echo "[fca-migrate] Error: Directory not found: $TARGET_PATH" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Detect sed -i flavor (macOS vs GNU)
# ---------------------------------------------------------------------------
_sed_inplace() {
  if sed --version >/dev/null 2>&1; then
    # GNU sed
    sed -i "$@"
  else
    # macOS BSD sed
    sed -i '' "$@"
  fi
}

# ---------------------------------------------------------------------------
# Detect if inside a git repo
# ---------------------------------------------------------------------------
IS_GIT=0
if git -C "$TARGET_PATH" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  IS_GIT=1
fi

# ---------------------------------------------------------------------------
# Phase 1 — Scan & Conflict Detection
# ---------------------------------------------------------------------------
echo "## Phase 1 — Scan & Conflict Detection"
echo ""

# Find CLAUDE.md files (exclude node_modules, dist, .git, .claude)
CLAUDE_FILES=$(find "$TARGET_PATH" \
  -name "CLAUDE.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/.git/*" \
  -not -path "*/.claude/*" \
  -not -path "*/.claude-plugin/*" \
  2>/dev/null | sort)

# Find SPEC.md files
SPEC_FILES=$(find "$TARGET_PATH" \
  -name "SPEC.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/.git/*" \
  -not -path "*/.claude/*" \
  -not -path "*/.claude-plugin/*" \
  2>/dev/null | sort)

# Count totals
CLAUDE_COUNT=0
SPEC_COUNT=0
if [ -n "$CLAUDE_FILES" ]; then
  CLAUDE_COUNT=$(echo "$CLAUDE_FILES" | wc -l | tr -d ' ')
fi
if [ -n "$SPEC_FILES" ]; then
  SPEC_COUNT=$(echo "$SPEC_FILES" | wc -l | tr -d ' ')
fi

TOTAL_FOUND=$((CLAUDE_COUNT + SPEC_COUNT))

if [ "$TOTAL_FOUND" -eq 0 ]; then
  echo "Nothing to migrate. No CLAUDE.md or SPEC.md files found."
  exit 0
fi

echo "Found: $CLAUDE_COUNT CLAUDE.md, $SPEC_COUNT SPEC.md"
echo ""

# Conflict detection: check if INTENT.md/DETAIL.md already exist
RENAME_CLAUDE=""
RENAME_SPEC=""
CONFLICTS=""
CONFLICT_COUNT=0
RENAME_COUNT=0

if [ -n "$CLAUDE_FILES" ]; then
  echo "$CLAUDE_FILES" | while IFS= read -r f; do echo "$f"; done | while IFS= read -r file; do
    dir=$(dirname "$file")
    if [ -f "$dir/INTENT.md" ]; then
      echo "  CONFLICT: $dir/ — both CLAUDE.md and INTENT.md exist"
    else
      echo "  RENAME: $file → $dir/INTENT.md"
    fi
  done
fi

if [ -n "$SPEC_FILES" ]; then
  echo "$SPEC_FILES" | while IFS= read -r f; do echo "$f"; done | while IFS= read -r file; do
    dir=$(dirname "$file")
    if [ -f "$dir/DETAIL.md" ]; then
      echo "  CONFLICT: $dir/ — both SPEC.md and DETAIL.md exist"
    else
      echo "  RENAME: $file → $dir/DETAIL.md"
    fi
  done
fi

# Build lists (outside subshell for use later)
_tmp_rename_claude=""
_tmp_rename_spec=""
_tmp_conflicts=""
_conflict_count=0
_rename_count=0

if [ -n "$CLAUDE_FILES" ]; then
  _ifs_save="$IFS"
  IFS='
'
  for file in $CLAUDE_FILES; do
    dir=$(dirname "$file")
    if [ -f "$dir/INTENT.md" ]; then
      _tmp_conflicts="${_tmp_conflicts}${file}
"
      _conflict_count=$((_conflict_count + 1))
    else
      _tmp_rename_claude="${_tmp_rename_claude}${file}
"
      _rename_count=$((_rename_count + 1))
    fi
  done
  IFS="$_ifs_save"
fi

if [ -n "$SPEC_FILES" ]; then
  _ifs_save="$IFS"
  IFS='
'
  for file in $SPEC_FILES; do
    dir=$(dirname "$file")
    if [ -f "$dir/DETAIL.md" ]; then
      _tmp_conflicts="${_tmp_conflicts}${file}
"
      _conflict_count=$((_conflict_count + 1))
    else
      _tmp_rename_spec="${_tmp_rename_spec}${file}
"
      _rename_count=$((_rename_count + 1))
    fi
  done
  IFS="$_ifs_save"
fi

echo ""
echo "Renames planned: $_rename_count"
echo "Conflicts (skipped): $_conflict_count"

if [ "$_rename_count" -eq 0 ]; then
  echo ""
  echo "No files to rename (all have conflicts). Resolve manually."
  exit 0
fi

# ---------------------------------------------------------------------------
# Phase 2 — Rename (--execute only)
# ---------------------------------------------------------------------------
echo ""
echo "## Phase 2 — Rename"

_renamed_count=0

if [ "$MODE" = "execute" ]; then
  # Rename CLAUDE.md → INTENT.md
  if [ -n "$_tmp_rename_claude" ]; then
    _ifs_save="$IFS"
    IFS='
'
    for file in $_tmp_rename_claude; do
      [ -z "$file" ] && continue
      dir=$(dirname "$file")
      target="$dir/INTENT.md"
      if [ "$IS_GIT" -eq 1 ]; then
        git mv "$file" "$target"
      else
        mv "$file" "$target"
      fi
      _renamed_count=$((_renamed_count + 1))
    done
    IFS="$_ifs_save"
  fi

  # Rename SPEC.md → DETAIL.md
  if [ -n "$_tmp_rename_spec" ]; then
    _ifs_save="$IFS"
    IFS='
'
    for file in $_tmp_rename_spec; do
      [ -z "$file" ] && continue
      dir=$(dirname "$file")
      target="$dir/DETAIL.md"
      if [ "$IS_GIT" -eq 1 ]; then
        git mv "$file" "$target"
      else
        mv "$file" "$target"
      fi
      _renamed_count=$((_renamed_count + 1))
    done
    IFS="$_ifs_save"
  fi

  echo "Renamed: $_renamed_count files"
else
  echo "(dry-run — skipped)"
fi

# ---------------------------------------------------------------------------
# Phase 3 — Reference Update (--execute only)
# ---------------------------------------------------------------------------
echo ""
echo "## Phase 3 — Reference Update"

_ref_files_updated=0

if [ "$MODE" = "execute" ]; then
  # Find all .md, .ts, .js files to update references
  REF_FILES=$(find "$TARGET_PATH" \
    \( -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/dist/*" \
    -not -path "*/.git/*" \
    2>/dev/null)

  if [ -n "$REF_FILES" ]; then
    _ifs_save="$IFS"
    IFS='
'
    for ref_file in $REF_FILES; do
      [ -z "$ref_file" ] && continue
      [ ! -f "$ref_file" ] && continue

      # Check if file contains any references to update
      if grep -q 'CLAUDE\.md\|SPEC\.md' "$ref_file" 2>/dev/null; then
        _sed_inplace 's/CLAUDE\.md/INTENT.md/g' "$ref_file"
        _sed_inplace 's/SPEC\.md/DETAIL.md/g' "$ref_file"
        _ref_files_updated=$((_ref_files_updated + 1))
      fi
    done
    IFS="$_ifs_save"
  fi

  echo "Updated references in: $_ref_files_updated files"
else
  # Dry-run: count files that would be updated
  _ref_preview_count=0
  REF_PREVIEW=$(grep -rl 'CLAUDE\.md\|SPEC\.md' "$TARGET_PATH" \
    --include='*.md' --include='*.ts' --include='*.tsx' \
    --include='*.js' --include='*.jsx' \
    2>/dev/null | grep -v node_modules | grep -v dist | grep -v '.git/' || true)

  if [ -n "$REF_PREVIEW" ]; then
    _ref_preview_count=$(echo "$REF_PREVIEW" | wc -l | tr -d ' ')
    echo "Files with references to update: $_ref_preview_count"
    echo "$REF_PREVIEW" | while IFS= read -r f; do
      echo "  $f"
    done
  else
    echo "No cross-file references found."
  fi
  echo "(dry-run — no changes made)"
fi

# ---------------------------------------------------------------------------
# Phase 4 — Report & Auto-Commit
# ---------------------------------------------------------------------------
echo ""
echo "## Phase 4 — Report"
echo ""
echo "Mode: $MODE"
echo "Renames: $_rename_count planned"
if [ "$MODE" = "execute" ]; then
  echo "Renamed: $_renamed_count files"
  echo "References updated: $_ref_files_updated files"
fi
echo "Conflicts skipped: $_conflict_count"

if [ "$MODE" = "execute" ] && [ "$AUTO_COMMIT" -eq 1 ] && [ "$IS_GIT" -eq 1 ]; then
  echo ""
  echo "## Auto-Commit"
  git -C "$TARGET_PATH" add -A
  git -C "$TARGET_PATH" commit -m "refactor: migrate CLAUDE.md/SPEC.md to INTENT.md/DETAIL.md naming

Renamed: $_renamed_count files
References updated: $_ref_files_updated files
Conflicts skipped: $_conflict_count"
  COMMIT_SHA=$(git -C "$TARGET_PATH" rev-parse --short HEAD)
  echo "Committed: $COMMIT_SHA"
elif [ "$MODE" = "execute" ] && [ "$AUTO_COMMIT" -eq 1 ] && [ "$IS_GIT" -eq 0 ]; then
  echo ""
  echo "Warning: --auto-commit ignored (not a git repository)"
fi

if [ "$MODE" = "dry-run" ]; then
  echo ""
  echo "To execute this migration, run with --execute"
fi
