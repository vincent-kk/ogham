---
name: rule
user-invocable: true
description: '[maencof:rule] Manages AI behavioral rules on hosts with a dedicated rule surface and explicitly routes unsupported hosts to project instructions.'
argument-hint: '[mode] [name]'
version: '1.1.0'
complexity: medium
context_layers: []
orchestrator: configurator
plugin: maencof
---

# rule — Behavioral Rule Management

Manage behavioral rules via conversation. Claude supports global rules (no `paths`) and conditional rules (`paths` frontmatter with glob patterns) in `.claude/rules/`.

Before resolving any path, load `../.shared/host-configuration.md` and select the current runtime host row. That generated reference is canonical: do not reconstruct host paths inside this skill. If the selected row reports behavioral rules as unsupported, stop the file-rule workflow, report the capability honestly, and offer `/maencof:instruct` for the maencof-owned instruction section. Never substitute command approval rules.

## When to Use This Skill

- Add, edit, or remove behavioral rules
- Create file-pattern-specific conditional rules
- Migrate inline CLAUDE.md rules to `.claude/rules/` files

> For CLAUDE.md changes, use `/maencof:instruct` instead.

## Scope

The table and workflow below apply only when the selected host exposes the Claude Markdown rule surface.

| Area      | Path                                | Write                        |
| --------- | ----------------------------------- | ---------------------------- |
| Execution | `{CWD}/.claude/rules/*.md`          | **Yes**                      |
| Execution | `{CWD}/CLAUDE.md`                   | No — use `/maencof:instruct` |
| Execution | `{CWD}/.claude/settings.local.json` | **Never**                    |

## Workflow

### Step 1 — Display Current Rules

Scan `.claude/rules/` and show registered rules (global vs conditional).

### Step 2 — Identify Intent

Detect action from natural language or menu: add, edit, remove, show.

### Step 3 — Define Rule

Collect rule content and scope (global or conditional with glob patterns).

### Step 4 — Create/Edit File

Write rule file with optional `paths` frontmatter after user confirmation.

### Step 5 — Confirmation

Report created/modified rule with file path, scope, and entry count.

> Load `reference.md` for detailed step workflows, examples, and glob pattern reference.

## Resources

| File           | Content                                                                               |
| -------------- | ------------------------------------------------------------------------------------- |
| `reference.md` | Detailed workflow steps, glob patterns, examples, error handling, acceptance criteria |

## Options

```
/maencof:rule [mode] [name]
```

| Option          | Description                       |
| --------------- | --------------------------------- |
| `list`          | Display current rule list         |
| `add`           | Add a new rule (interactive)      |
| `edit <name>`   | Edit an existing rule             |
| `remove <name>` | Remove a rule file                |
| `show <name>`   | Display a specific rule's content |
