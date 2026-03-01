---
name: bridge
user_invocable: true
description: End-to-end external service integration — discover and install MCP servers, define data collection workflows, and auto-generate dedicated workflow skills, all in one conversation.
version: 1.1.0
complexity: high
context_layers: []
orchestrator: configurator
plugin: maencof
---

# bridge — MCP Integration and Workflow Builder

End-to-end external service integration pipeline. Discovers MCP servers, installs them, defines workflows, and auto-generates dedicated skills — all in one session.

## When to Use This Skill

- Connect a new external service (Slack, Jira, GitHub, Notion, Linear, etc.)
- Install an MCP server **and** build a workflow skill that uses it
- Set up periodic data collection into maencof

> **vs related skills**: `/maencof:mcp-setup` = install only. `/maencof:connect` = register only. `/maencof:bridge` = **install + register + workflow skill** in one.

## Prerequisites

- For data source registration: maencof vault initialized
- For MCP installation: may require API tokens (guided during setup)

## Scope

| Area | Path | Access |
|------|------|--------|
| Execution | `{CWD}/.mcp.json` | Delegated → `/maencof:mcp-setup` |
| Execution | `{CWD}/.claude/settings.json` | Delegated → `/maencof:mcp-setup` |
| Execution | `{CWD}/.maencof-meta/data-sources.json` | Delegated → `/maencof:connect` |
| Execution | `{CWD}/.claude/skills/{name}/SKILL.md` | Delegated → `/maencof:craft-skill` |
| Execution | `{CWD}/.claude/settings.local.json` | **Never** |
| Plugin | `packages/maencof/` | **Never** |

## Workflow

### Step 1 — Discovery
Read `.mcp.json` to list installed/available servers. Select service to connect.

### Step 2 — MCP Installation
Delegate to `/maencof:mcp-setup` for uninstalled servers.

### Step 3 — Workflow Definition
Define data collection via conversation: target, layer, tags, frequency, processing.

### Step 4 — Auto-Generate Workflow Skill
Delegate to `/maencof:craft-skill` to create a dedicated workflow skill.

### Step 5 — Register Data Source
Delegate to `/maencof:connect` to register the data source.

### Step 6 — Confirmation and Test
Show all created files and offer end-to-end test.

> Load `reference.md` for detailed step workflows, service examples, pipeline diagram, and error handling.

## Resources

| File | Content |
|------|---------|
| `reference.md` | Pipeline diagram, detailed step workflows, service-specific examples, generated skill samples, error handling, acceptance criteria |

## Options

```
/maencof:bridge [service]
```

| Option | Description |
|--------|-------------|
| `service` | Service name (e.g., `slack`, `jira`). Omit to start with discovery. |
