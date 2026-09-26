---
name: instruct
user-invocable: false
description: 'Adds or modifies AI instructions in the host project instruction surface; on Claude also splits oversized CLAUDE.md into @import modules and manages CLAUDE.local.md overrides. Use when editing project instructions.'
argument-hint: '[instruction to add or modify]'
version: '1.1.0'
complexity: medium
context_layers: []
orchestrator: configurator
plugin: maencof
---

# instruct — Project Instruction Management

Safely edit and manage the current host's project instructions via conversation. On Claude, this includes @import splitting, 200-line guideline enforcement, CLAUDE.local.md personal overrides, and automatic backups.

Before resolving any path, load `../.shared/host-configuration.md` and select the current runtime host row. That generated reference is canonical: do not reconstruct host paths or state-root environment overrides inside this skill. On Codex, every CLAUDE.md name in the detailed workflow below means the selected AGENTS instruction target and only the maencof-owned section; do not create Claude-only files and do not apply Claude-only local/import features.

## When to Use This Skill

- Add or modify behavioral instructions in CLAUDE.md
- Split a large CLAUDE.md into @import references
- Manage personal overrides in CLAUDE.local.md
- Audit CLAUDE.md structure and line count

> For file-pattern-specific rules, use `/maencof:rule` instead.

## Scope

The table below preserves the Claude workflow. Codex scope is the single effective instruction target selected by the shared host reference.

| Area      | Path                                | Write                   |
| --------- | ----------------------------------- | ----------------------- |
| Execution | `{CWD}/CLAUDE.md`                   | **Yes**                 |
| Execution | `{CWD}/.claude/CLAUDE.md`           | **Yes** (alternate)     |
| Execution | `{CWD}/CLAUDE.local.md`             | **Yes** (personal)      |
| Execution | `{CWD}/.claude/rules/*.md`          | **Yes** (@import split) |
| Execution | `{CWD}/.claude/settings.local.json` | **Never**               |

## Workflow

### Step 1 — Classify

Read the selected host instruction target and classify the requested change as CLAUDE.md (team), CLAUDE.local.md (personal), or `.claude/rules/` (pattern-based) when those Claude-only surfaces apply.

### Step 2 — Preview and Write

Show a diff and obtain confirmation. Create an automatic backup before writing, and require double confirmation for deletions.

### Step 3 — Size Check and Report

After a Claude instruction edit, apply the 200-line threshold and propose an @import split or subdirectory CLAUDE.md when exceeded. Report the changed target, resulting line count, and backup location.

> Load `reference.md` for detailed step workflows, diff examples, split process, and CLAUDE.md spec.

## Resources

| File           | Content                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `reference.md` | CLAUDE.md spec, detailed workflow steps, diff/split examples, classification guide, error handling, acceptance criteria |

## Options

```
/maencof:instruct [options]
```

| Option      | Description                             |
| ----------- | --------------------------------------- |
| `--scan`    | Analyze structure only (read-only)      |
| `--split`   | Auto-split sections exceeding 200 lines |
| `--local`   | Edit CLAUDE.local.md                    |
| `--restore` | Restore from most recent backup         |
