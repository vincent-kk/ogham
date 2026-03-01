---
name: craft-agent
user_invocable: true
description: Define specialized agents via conversation and auto-generate .md files in .claude/agents/ — covers tools, permissions, model selection, system prompt, and advanced options.
version: 1.1.0
complexity: medium
context_layers: []
orchestrator: configurator
plugin: maencof
---

# craft-agent — Custom Agent Generator

Define specialized agents via conversation and auto-generate `{CWD}/.claude/agents/{name}.md`. Follows the latest Claude Code sub-agent spec.

## When to Use This Skill

- Create a specialized agent for a specific role (code reviewer, test writer, etc.)
- Define an agent with restricted tool access (least-privilege)
- Set up a background or sandboxed agent for autonomous tasks

> For skill creation, use `/maencof:craft-skill`. For the built-in settings agent, see the `configurator` agent.

## Scope

| Area | Path | Write |
|------|------|-------|
| Execution | `{CWD}/.claude/agents/{name}.md` | **Yes** |
| Execution | `{CWD}/.claude/settings.local.json` | **Never** |
| Plugin | `packages/maencof/` | **Never** |

## Workflow

### Step 1 — Define Role
Collect role description; extract specialization, tool needs, permission level.

### Step 2 — Tools and Permissions
Configure tools/disallowedTools, permissionMode, and MCP server access.

### Step 3 — Advanced Settings
Set memory, background, isolation, maxTurns as needed.

### Step 4 — Generate System Prompt
Auto-generate from role definition; allow user editing.

### Step 5 — Generate Agent File
Create `{name}.md` with frontmatter + system prompt body.

### Step 6 — Confirmation and Usage Guide
Show file location, Task() invocation example, and conversation usage.

> Load `reference.md` for frontmatter field spec, detailed step workflows, generation examples, and error handling.

## Resources

| File | Content |
|------|---------|
| `reference.md` | Frontmatter field spec, detailed workflow steps, permission modes, generation examples, error handling, acceptance criteria |

## Options

```
/maencof:craft-agent [name]
```

No subcommands — always interactive. Pass a name to skip the naming step.
