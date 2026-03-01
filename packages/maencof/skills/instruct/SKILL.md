---
name: instruct
user_invocable: true
description: Safely edit and manage CLAUDE.md (AI behavioral instructions) via conversation — supports @import splitting, 200-line guideline enforcement, CLAUDE.local.md personal overrides, and automatic backups.
version: 1.1.0
complexity: medium
context_layers: []
orchestrator: configurator
plugin: maencof
---

# instruct — CLAUDE.md Instruction Management

Safely edit and manage CLAUDE.md via conversation. Handles @import splitting, 200-line guideline enforcement, CLAUDE.local.md personal overrides, and automatic backups.

## When to Use This Skill

- Add or modify behavioral instructions in CLAUDE.md
- Split a large CLAUDE.md into @import references
- Manage personal overrides in CLAUDE.local.md
- Audit CLAUDE.md structure and line count

> For file-pattern-specific rules, use `/maencof:rule` instead.

## Scope

| Area | Path | Write |
|------|------|-------|
| Execution | `{CWD}/CLAUDE.md` | **Yes** |
| Execution | `{CWD}/.claude/CLAUDE.md` | **Yes** (alternate) |
| Execution | `{CWD}/CLAUDE.local.md` | **Yes** (personal) |
| Execution | `{CWD}/.claude/rules/*.md` | **Yes** (@import split) |
| Execution | `{CWD}/.claude/settings.local.json` | **Never** |
| Plugin | `packages/maencof/` | **Never** |

## Workflow

### Step 1 — Analyze Current CLAUDE.md
Read file, count lines, list sections and @imports.

### Step 2 — Identify Intent
Accept free-form instructions describing the desired change.

### Step 3 — Classify and Route
Determine best location: CLAUDE.md (team), CLAUDE.local.md (personal), or .claude/rules/ (pattern-based).

### Step 4 — Preview Changes
Show diff preview and get user confirmation.

### Step 5 — Write File
Create automatic backup, then apply changes. Double-confirm for deletions.

### Step 6 — 200-Line Check
If exceeded, propose @import split or subdirectory CLAUDE.md.

### Step 7 — Summary
Report changes, new line count, and backup location.

> Load `reference.md` for detailed step workflows, diff examples, split process, and CLAUDE.md spec.

## Resources

| File | Content |
|------|---------|
| `reference.md` | CLAUDE.md spec, detailed workflow steps, diff/split examples, classification guide, error handling, acceptance criteria |

## Options

```
/maencof:instruct [options]
```

| Option | Description |
|--------|-------------|
| `--scan` | Analyze structure only (read-only) |
| `--split` | Auto-split sections exceeding 200 lines |
| `--local` | Edit CLAUDE.local.md |
| `--restore` | Restore from most recent backup |
