---
name: craft-skill
user_invocable: true
description: Define custom skills via conversation and auto-generate SKILL.md files — covers frontmatter, tool requirements, execution context, workflow design, and supporting files.
version: 1.1.0
complexity: medium
context_layers: []
orchestrator: configurator
plugin: maencof
---

# craft-skill — Custom Skill Generator

Define custom skills via conversation and auto-generate `{CWD}/.claude/skills/{name}/SKILL.md`. Follows the latest Claude Code skill spec.

## When to Use This Skill

- Create a new slash-command skill for a repeatable workflow
- Generate a skill that wraps MCP tools with custom logic
- Build a skill that delegates to a specific agent

> For agent creation, use `/maencof:craft-agent`. For MCP install + skill in one step, use `/maencof:bridge`.

## Scope

| Area | Path | Write |
|------|------|-------|
| Execution | `{CWD}/.claude/skills/{name}/SKILL.md` | **Yes** |
| Execution | `{CWD}/.claude/skills/{name}/` (supporting) | **Yes** |
| Execution | `{CWD}/.claude/settings.local.json` | **Never** |
| Plugin | `packages/maencof/` | **Never** |

## Workflow

### Step 1 — Identify Purpose
Collect skill description; extract core purpose, argument needs, output format.

### Step 2 — Invocation Settings
Determine user_invocable, argument-hint, disable-model-invocation.

### Step 3 — Tool Requirements
Identify required tools, check MCP availability, optionally restrict via allowed-tools.

### Step 4 — Execution Context
Choose normal, fork (independent context), or agent delegation.

### Step 5 — Design Workflow
Collaboratively define execution steps in conversation.

### Step 6 — Generate Files
Create SKILL.md + optional supporting files (prompt.md, template.md, config.json).

### Step 7 — Test Guidance
Show file location, test command, and troubleshoot reference.

> Load `reference.md` for frontmatter spec, detailed step workflows, generation examples, and error handling.

## Resources

| File | Content |
|------|---------|
| `reference.md` | Frontmatter field spec, detailed workflow steps, generated file examples, error handling, acceptance criteria |

## Options

```
/maencof:craft-skill [name]
```

No subcommands — always interactive. Pass a name to skip the naming step.
