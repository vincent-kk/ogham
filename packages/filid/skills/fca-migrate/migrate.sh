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
_renamed_claude_dirs=""
_renamed_spec_dirs=""

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
      _renamed_claude_dirs="${_renamed_claude_dirs}${dir}
"
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
      _renamed_spec_dirs="${_renamed_spec_dirs}${dir}
"
      _renamed_count=$((_renamed_count + 1))
    done
    IFS="$_ifs_save"
  fi

  echo "Renamed: $_renamed_count files"
else
  # Collect directories for dry-run Phase 3 scoping
  if [ -n "$_tmp_rename_claude" ]; then
    _ifs_save="$IFS"
    IFS='
'
    for file in $_tmp_rename_claude; do
      [ -z "$file" ] && continue
      dir=$(dirname "$file")
      _renamed_claude_dirs="${_renamed_claude_dirs}${dir}
"
    done
    IFS="$_ifs_save"
  fi
  if [ -n "$_tmp_rename_spec" ]; then
    _ifs_save="$IFS"
    IFS='
'
    for file in $_tmp_rename_spec; do
      [ -z "$file" ] && continue
      dir=$(dirname "$file")
      _renamed_spec_dirs="${_renamed_spec_dirs}${dir}
"
    done
    IFS="$_ifs_save"
  fi
  echo "(dry-run — skipped)"
fi

# ---------------------------------------------------------------------------
# Phase 3 — Scoped Reference Update
# ---------------------------------------------------------------------------
echo ""
echo "## Phase 3 — Reference Update (scoped)"

_ref_files_updated=0

# _build_rel_prefix depth — outputs "../" repeated $1 times
_build_rel_prefix() {
  _depth=$1
  _prefix=""
  _i=0
  while [ "$_i" -lt "$_depth" ]; do
    _prefix="${_prefix}../"
    _i=$((_i + 1))
  done
  echo "$_prefix"
}

# _count_slashes path — counts '/' chars to measure directory depth
_count_slashes() {
  echo "$1" | tr -cd '/' | wc -c | tr -d ' '
}

# _scoped_update renamed_dirs old_name new_name mode
#   old_name/new_name are plain filenames (e.g. "CLAUDE.md", "INTENT.md").
#   For each renamed dir, find files underneath and apply depth-aware replacements.
#   mode: "execute" applies sed, "dry-run" only lists matches.
_scoped_update() {
  _dirs="$1"
  _old_name="$2"
  _new_name="$3"
  _run_mode="$4"
  _updated=0

  [ -z "$_dirs" ] && echo "$_updated" && return

  # Escape old_name for sed regex (dot → \.)
  _old_name_sed=$(echo "$_old_name" | sed 's|\.|\\.|g')

  _ifs_save="$IFS"
  IFS='
'
  for _rdir in $_dirs; do
    [ -z "$_rdir" ] && continue
    [ ! -d "$_rdir" ] && continue

    _base_depth=$(_count_slashes "$_rdir")

    _files=$(find "$_rdir" \
      \( -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
      -not -path "*/node_modules/*" \
      -not -path "*/dist/*" \
      -not -path "*/.git/*" \
      2>/dev/null)

    [ -z "$_files" ] && continue

    _ifs_save2="$IFS"
    IFS='
'
    for _file in $_files; do
      [ -z "$_file" ] && continue
      [ ! -f "$_file" ] && continue

      _file_dir=$(dirname "$_file")
      _file_depth=$(_count_slashes "$_file_dir")
      _depth=$((_file_depth - _base_depth))

      if [ "$_depth" -eq 0 ]; then
        # Same directory: match bare "CLAUDE.md" and "./CLAUDE.md"
        if [ "$_run_mode" = "execute" ]; then
          if grep -qF "$_old_name" "$_file" 2>/dev/null; then
            _sed_inplace "s|\\./$_old_name_sed|./$_new_name|g" "$_file"
            _sed_inplace "s|$_old_name_sed|$_new_name|g" "$_file"
            _updated=$((_updated + 1))
          fi
        else
          if grep -qF "$_old_name" "$_file" 2>/dev/null; then
            echo "  $_file (depth=0: bare + ./)"
            _updated=$((_updated + 1))
          fi
        fi
      else
        # Subdirectory: match only "../"*depth + "CLAUDE.md"
        _prefix=$(_build_rel_prefix "$_depth")
        _grep_pat="${_prefix}${_old_name}"
        # Escape prefix for sed (dots → \.)
        _escaped_prefix=$(echo "$_prefix" | sed 's|\.|\\.|g')
        _sed_pat="${_escaped_prefix}${_old_name_sed}"
        _sed_rep="${_prefix}${_new_name}"

        if [ "$_run_mode" = "execute" ]; then
          if grep -qF "$_grep_pat" "$_file" 2>/dev/null; then
            _sed_inplace "s|${_sed_pat}|${_sed_rep}|g" "$_file"
            _updated=$((_updated + 1))
          fi
        else
          if grep -qF "$_grep_pat" "$_file" 2>/dev/null; then
            echo "  $_file (depth=$_depth: $_grep_pat)"
            _updated=$((_updated + 1))
          fi
        fi
      fi
    done
    IFS="$_ifs_save2"
  done
  IFS="$_ifs_save"

  echo "$_updated"
}

if [ "$MODE" = "execute" ]; then
  _claude_updated=$(_scoped_update "$_renamed_claude_dirs" "CLAUDE.md" "INTENT.md" "execute")
  _spec_updated=$(_scoped_update "$_renamed_spec_dirs" "SPEC.md" "DETAIL.md" "execute")
  _ref_files_updated=$((_claude_updated + _spec_updated))
  echo "Updated references in: $_ref_files_updated files"
else
  echo "Scoped reference scan (files that would be updated):"
  _claude_preview=$(_scoped_update "$_renamed_claude_dirs" "CLAUDE.md" "INTENT.md" "dry-run")
  _spec_preview=$(_scoped_update "$_renamed_spec_dirs" "SPEC.md" "DETAIL.md" "dry-run")

  # Extract count from last line of output (the echo "$_updated" line)
  _claude_count=$(echo "$_claude_preview" | tail -1)
  _spec_count=$(echo "$_spec_preview" | tail -1)

  # Print file listings (all lines except the last count line)
  _claude_list=$(echo "$_claude_preview" | sed '$d')
  _spec_list=$(echo "$_spec_preview" | sed '$d')
  [ -n "$_claude_list" ] && echo "$_claude_list"
  [ -n "$_spec_list" ] && echo "$_spec_list"

  _ref_preview_count=0
  [ -n "$_claude_count" ] && _ref_preview_count=$((_ref_preview_count + _claude_count))
  [ -n "$_spec_count" ] && _ref_preview_count=$((_ref_preview_count + _spec_count))

  if [ "$_ref_preview_count" -eq 0 ]; then
    echo "No scoped cross-file references found."
  else
    echo "Files with scoped references to update: $_ref_preview_count"
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
