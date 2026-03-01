# instruct — Reference

Detailed workflow, CLAUDE.md spec, diff/split examples, and error handling for the instruct skill.

## CLAUDE.md Spec

- **Location**: `{CWD}/CLAUDE.md` or `{CWD}/.claude/CLAUDE.md`
- **200-line guideline**: split to `@import` or `.claude/rules/` when exceeded
- **@import syntax**: `@.claude/rules/api-rules.md` to include external files
- **CLAUDE.local.md**: personal settings (add to `.gitignore`, not shared with team)
- **Subdirectory scoping**: each directory can have its own CLAUDE.md

## Classification Guide

| Content Type | Best Location | Reason |
|-------------|--------------|--------|
| Team-wide conventions | `CLAUDE.md` | Version-controlled, shared |
| Personal preferences | `CLAUDE.local.md` | Gitignored, private |
| File-pattern rules | `.claude/rules/*.md` | paths frontmatter support |
| Long specialized sections | `@import` split | 200-line guideline |

## Detailed Workflow

### Step 1 — Analyze Current CLAUDE.md

```
CLAUDE.md analysis:

  Location: {CWD}/CLAUDE.md
  Lines: 183 (under 200-line guideline)
  Sections: Project Overview, Commands, Conventions, ...
  @imports: @.claude/rules/api-rules.md (verified)

  Structure:
    # Project Overview (15 lines)
    # Commands (42 lines)
    # Conventions (68 lines)
    # Development Notes (58 lines)
```

If no CLAUDE.md exists: offer to create one.

### Step 2 — Identify Intent

Accept free-form instructions:
```
What would you like to change?

Examples:
  "Always respond in Korean"
  "Write commit messages in English"
  "Never modify code without tests"
  "Split the API rules section into a separate file"
```

### Step 3 — Classify and Route

Present recommendation and let user choose:
```
Recommendation:
  "Always respond in Korean"
  → CLAUDE.local.md (personal language preference, no need to share)

Save to CLAUDE.local.md? [Yes / CLAUDE.md instead]
```

### Step 4 — Preview Changes (Diff)

```
Proposed change:

--- CLAUDE.md (current)
+++ CLAUDE.md (after)

  ## Conventions
  - ESM modules
+ - Write commit messages in English (type: subject format)

Apply? [Yes / Edit / Cancel]
```

### Step 5 — Write File

Create automatic backup before writing:
```
Backup created: .claude/CLAUDE.md.backup.2026-03-01
```

For destructive changes (deletions), require double confirmation.

### Step 6 — 200-Line Check and Split Proposal

If the file exceeds 200 lines after editing:

```
[Advisory] CLAUDE.md is now 247 lines (200-line guideline exceeded).

Split options:
  1. Extract section to .claude/rules/ and add @import
  2. Create subdirectory-scoped CLAUDE.md
  3. Keep as-is (ignore)

Split now? [Yes / Later / Ignore]
```

Auto-split process:
```
Extracting "API Rules" section...
  Created: .claude/rules/api-rules.md
  Added to CLAUDE.md: @.claude/rules/api-rules.md

Final line count: 189 (within guideline)
```

### Step 7 — Summary

```
CLAUDE.md updated!

Changes:
  + "Write commit messages in English" added (Conventions section)
  → Lines: 183 → 185

Backup: .claude/CLAUDE.md.backup.2026-03-01
```

## Agent Collaboration

Executed by the **configurator** agent. The configurator creates backups before every modification and validates @import references after changes.

## Usage Examples

```
/maencof:instruct
/maencof:instruct --scan
/maencof:instruct --split
/maencof:instruct --local
/maencof:instruct --restore
```

Natural language:
```
"Add a rule to always respond in Korean"
"Split the long conventions section out"
"Show me the current CLAUDE.md structure"
```

## Error Handling

| Condition | Resolution |
|-----------|------------|
| CLAUDE.md not found | Offer to create a new one |
| @import path mismatch | Verify actual file path, suggest correction |
| File write permission error | Show permission check instructions |
| Backup creation failure | Offer manual backup instructions, confirm before proceeding |
| 200-line exceeded (ignored) | Respect user choice, re-suggest on next edit |

## Acceptance Criteria

- CLAUDE.md modified with correct content at correct section
- Automatic backup created before every write
- @import references validated after any split operation
- 200-line guideline checked after every modification
- User confirmation received before any write or deletion
