---
name: bridge
user-invocable: true
description: 'Connects an external service (Slack, Jira, GitHub, Notion) to maencof end-to-end: installs the MCP server, registers the data source, and generates a workflow skill. Use when wiring a new service in one pass.'
argument-hint: '[service]'
version: '1.1.0'
complexity: complex
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

| Area      | Path                                    | Access                                                                |
| --------- | --------------------------------------- | --------------------------------------------------------------------- |
| Execution | `{CWD}/.mcp.json`                       | Inspect; delegate missing server installation to `/maencof:mcp-setup` |
| Execution | `{CWD}/.claude/settings.json`           | Delegate MCP permissions to `/maencof:mcp-setup`                      |
| Execution | `{CWD}/.maencof-meta/data-sources.json` | Delegate source registration to `/maencof:connect`                    |
| Execution | `{CWD}/.claude/skills/{name}/SKILL.md`  | Define and create the workflow skill directly                         |
| Execution | `{CWD}/.claude/settings.local.json`     | **Never**                                                             |

## Workflow

Inspect installed servers, delegate missing MCP installation, collect the target/layer/tags/frequency/processing fields, create the workflow skill, delegate source registration, then summarize the created files and offer an end-to-end test.

> Load `reference.md` for the pipeline, configuration fields, generated skill sample, error handling, and acceptance criteria.

## Resources

| File           | Content                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------- |
| `reference.md` | Pipeline, configuration fields, generated skill sample, error handling, acceptance criteria |

## Options

```
/maencof:bridge [service]
```

| Option    | Description                                                         |
| --------- | ------------------------------------------------------------------- |
| `service` | Service name (e.g., `slack`, `jira`). Omit to start with discovery. |
