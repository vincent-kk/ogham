---
name: maencof-bridge
user_invocable: true
description: "[maencof:maencof-bridge] Connects an external service (Slack, Jira, GitHub, Notion) to maencof end-to-end: installs the MCP server, defines data workflows, and auto-generates a ready-to-use integration skill."
argument-hint: "[service]"
version: "1.1.0"
complexity: complex
context_layers: []
orchestrator: configurator
plugin: maencof
---

# maencof-bridge — MCP Integration and Workflow Builder

End-to-end external service integration pipeline. Discovers MCP servers, installs them, defines workflows, and auto-generates dedicated skills — all in one session.

## When to Use This Skill

- Connect a new external service (Slack, Jira, GitHub, Notion, Linear, etc.)
- Install an MCP server **and** build a workflow skill that uses it
- Set up periodic data collection into maencof

> **vs related skills**: `/maencof:maencof-mcp-setup` = install only. `/maencof:maencof-connect` = register only. `/maencof:maencof-bridge` = **install + register + workflow skill** in one.

## Prerequisites

- For data source registration: maencof vault initialized
- For MCP installation: may require API tokens (guided during setup)

## Scope

| Area | Path | Access |
|------|------|--------|
| Execution | `{CWD}/.mcp.json` | Delegated → `/maencof:maencof-mcp-setup` |
| Execution | `{CWD}/.claude/settings.json` | Delegated → `/maencof:maencof-mcp-setup` |
| Execution | `{CWD}/.maencof-meta/data-sources.json` | Delegated → `/maencof:maencof-connect` |
| Execution | `{CWD}/.claude/skills/{name}/SKILL.md` | Delegated → `/maencof:maencof-craft-skill` |
| Execution | `{CWD}/.claude/settings.local.json` | **Never** |
| Plugin | `packages/maencof/` | **Never** |

## Workflow

### Step 1 — Discovery
Read `.mcp.json` to list installed/available servers. Select service to connect.

### Step 2 — MCP Installation
Delegate to `/maencof:maencof-mcp-setup` for uninstalled servers.

### Step 3 — Workflow Definition
Define data collection via conversation: target, layer, tags, frequency, processing.

### Step 4 — Auto-Generate Workflow Skill
Delegate to `/maencof:maencof-craft-skill` to create a dedicated workflow skill.

### Step 5 — Register Data Source
Delegate to `/maencof:maencof-connect` to register the data source.

### Step 6 — Confirmation and Test
Show all created files and offer end-to-end test.

> Load `reference.md` for detailed step workflows, service examples, pipeline diagram, and error handling.

## Resources

| File | Content |
|------|---------|
| `reference.md` | Pipeline diagram, detailed step workflows, service-specific examples, generated skill samples, error handling, acceptance criteria |

## Options

```
/maencof:maencof-bridge [service]
```

| Option | Description |
|--------|-------------|
| `service` | Service name (e.g., `slack`, `jira`). Omit to start with discovery. |
