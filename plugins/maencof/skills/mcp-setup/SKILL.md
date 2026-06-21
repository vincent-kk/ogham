---
name: mcp-setup
user_invocable: true
description: '[maencof:mcp-setup] Installs and configures MCP servers for GitHub, Atlassian, Slack, or Notion by updating .mcp.json and .claude/settings.json. Runs standalone or as part of the `/maencof:bridge` pipeline.'
argument-hint: '[service to configure]'
version: '1.0.0'
complexity: medium
context_layers: []
orchestrator: mcp-setup skill
plugin: maencof
---

# mcp-setup — External MCP Server Setup

Installs and configures MCP servers for external data sources (GitHub, Atlassian, Slack, Notion, etc.) in the current project.
Runs standalone or as part of the `/maencof:bridge` pipeline.

> **Area distinction (important)**:
>
> | Area               | Path                                | Modified by this skill |
> | ------------------ | ----------------------------------- | ---------------------- |
> | **Execution Area** | `{CWD}/.mcp.json`                   | **yes**                |
> | **Execution Area** | `{CWD}/.claude/settings.json`       | **yes**                |
> | **Execution Area** | `{CWD}/.claude/settings.local.json` | **never**              |
>
> `{CWD}/.mcp.json` is the external MCP server registration file for the user project.

## When to Use This Skill

- When adding external MCP tools such as GitHub, Jira, or Slack to a project
- After registering a source with `/maencof:connect`, to install the MCP server
- When manually verifying or reconfiguring an MCP server connection

## Prerequisites

- maencof must be initialized
- If data sources are registered, the corresponding MCP is automatically suggested
  (see `.maencof-meta/data-sources.json`)

## Supported MCP Servers

| Data source                 | MCP package                           | Install command            |
| --------------------------- | ------------------------------------- | -------------------------- |
| GitHub                      | `@modelcontextprotocol/server-github` | `claude mcp add github`    |
| Atlassian (Jira/Confluence) | `atlassian-mcp`                       | `claude mcp add atlassian` |
| Slack                       | `@modelcontextprotocol/server-slack`  | `claude mcp add slack`     |
| Notion                      | `notion-mcp`                          | `claude mcp add notion`    |
| Linear                      | `linear-mcp`                          | `claude mcp add linear`    |

> The `claude mcp add` column is the equivalent Claude Code CLI shortcut; this skill performs the same change by editing `.mcp.json` directly (see reference.md Step 3).

## Workflow

1. **Check current status** — verify registered data sources and already-installed MCP servers
2. **Select MCP servers** — choose which servers to install (or enter manually)
3. **Modify Execution Area files** — update `{CWD}/.mcp.json` and `{CWD}/.claude/settings.json`
4. **Collect API keys/tokens** — guide authentication via environment variables or direct input
5. **Verify connection** — confirm MCP servers respond, with debugging guidance on failure
6. **Completion guide** — report installed servers and next steps

> Load **reference.md** for status/selection prompt templates, the .mcp.json and settings.json JSON examples, token-collection guidance, and the non-developer guide.

## Resources

| File           | Content                                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reference.md` | Detailed Step 1–6 workflow, status/selection prompt templates, .mcp.json + settings.json JSON examples, token-collection guidance, non-developer guide, acceptance criteria |

## File Scope (Execution Area only)

| File                          | Operation     | Note                      |
| ----------------------------- | ------------- | ------------------------- |
| `{CWD}/.mcp.json`             | create/update | preserve existing content |
| `{CWD}/.claude/settings.json` | create/update | preserve existing content |

**Files that are never modified**:

- `{CWD}/.claude/settings.local.json` — permanently off-limits
- `plugins/maencof/.mcp.json` — Plugin Area (maencof's own MCP server configuration)
- All files under `plugins/maencof/` — Plugin Area

## Options

```
/maencof:mcp-setup [options]
```

| Option            | Description                                       |
| ----------------- | ------------------------------------------------- |
| `--verify`        | Verify existing MCP server connection status only |
| `--list`          | List installed MCP servers                        |
| `--remove <name>` | Remove a specific MCP server                      |

## Error Handling

- **maencof not initialized**: guide to run `/maencof:setup`
- **Existing .mcp.json parse error**: create a backup and suggest manual merge
- **MCP server connection failure**: guide to check token/installation
- **Permission error**: guide to manually edit `.claude/settings.json`
