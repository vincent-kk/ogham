---
name: mcp-setup
user_invocable: true
description: External MCP server setup — modify Execution Area .mcp.json + .claude/settings.json
version: 1.0.0
complexity: medium
context_layers: []
orchestrator: mcp-setup skill
plugin: maencof
---

# mcp-setup — External MCP Server Setup

Installs and configures MCP servers for external data sources (GitHub, Atlassian, Slack, Notion, etc.) in the current project.
This skill can run the MCP setup step of `/maencof:setup` independently.

> **Area distinction (important)**:
>
> | Area | Path | Modified by this skill |
> |------|------|----------------------|
> | **Execution Area** | `{CWD}/.mcp.json` | **yes** |
> | **Execution Area** | `{CWD}/.claude/settings.json` | **yes** |
> | **Execution Area** | `{CWD}/.claude/settings.local.json` | **never** |
> | **Plugin Area** | `packages/maencof/.mcp.json` | **never** (maencof's own MCP) |
>
> `{CWD}/.mcp.json` is the external MCP server registration file for the user project.
> It is a different file from `packages/maencof/.mcp.json` (maencof's own MCP).

## When to Use This Skill

- When adding external MCP tools such as GitHub, Jira, or Slack to a project
- After registering a source with `/maencof:connect`, to install the MCP server
- When manually verifying or reconfiguring an MCP server connection

## Prerequisites

- maencof must be initialized
- If data sources are registered, the corresponding MCP is automatically suggested
  (see `.maencof-meta/data-sources.json`)

## Supported MCP Servers

| Data source | MCP package | Install command |
|-------------|------------|----------------|
| GitHub | `@modelcontextprotocol/server-github` | `claude mcp add github` |
| Atlassian (Jira/Confluence) | `atlassian-mcp` | `claude mcp add atlassian` |
| Slack | `@modelcontextprotocol/server-slack` | `claude mcp add slack` |
| Notion | `notion-mcp` | `claude mcp add notion` |
| Linear | `linear-mcp` | `claude mcp add linear` |

## Workflow

### Step 1 — Check Current Status

Verify registered data sources and already-installed MCP servers.

```
Current status:
  Data sources: GitHub (github-main), Slack
  Installed MCP: (none)

Required MCP servers:
  - GitHub -> @modelcontextprotocol/server-github (not installed)
  - Slack  -> @modelcontextprotocol/server-slack  (not installed)
```

### Step 2 — Select MCP Servers to Install

```
Which MCP servers would you like to install?
  [x] @modelcontextprotocol/server-github (GitHub)
  [x] @modelcontextprotocol/server-slack (Slack)
  [ ] atlassian-mcp (Jira/Confluence)
  [ ] notion-mcp (Notion)
  [ ] Enter manually...
```

### Step 3 — Modify Execution Area Files

For each selected MCP server:

#### 3a. Update {CWD}/.mcp.json

If a file already exists, preserve the existing content and only add new servers.

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}"
      }
    }
  }
}
```

#### 3b. Update {CWD}/.claude/settings.json

Add the required permission settings.

```json
{
  "permissions": {
    "allow": [
      "mcp__github__*",
      "mcp__slack__*"
    ]
  }
}
```

> **Never modify**: `{CWD}/.claude/settings.local.json`
> This file contains personal user settings that maencof will never modify.

### Step 4 — Collect API Keys/Tokens

Guide authentication information collection via environment variables or direct input.

```
GitHub authentication setup:

GITHUB_TOKEN is required.

How to set it:
  1. Set as environment variable (recommended):
     export GITHUB_TOKEN=ghp_xxxx
  2. Add to .env file (must be gitignored):
     GITHUB_TOKEN=ghp_xxxx

Do not enter tokens directly in code.
.mcp.json references environment variables as ${GITHUB_TOKEN}.
```

### Step 5 — Verify Connection

Confirm that MCP servers respond correctly.

```
Verifying connections...
  GitHub MCP: connected
  Slack MCP:  failed (SLACK_BOT_TOKEN not set)
```

Provide debugging guidance on failure.

### Step 6 — Completion Guide

```
MCP setup complete!

Installed servers:
  - GitHub MCP (@modelcontextprotocol/server-github)
  - Slack MCP — SLACK_BOT_TOKEN setup required

Next steps:
  - Verify after setting token: `/maencof:mcp-setup --verify`
  - Start data ingestion: `/maencof:ingest`
```

## File Scope (Execution Area only)

| File | Operation | Note |
|------|-----------|------|
| `{CWD}/.mcp.json` | create/update | preserve existing content |
| `{CWD}/.claude/settings.json` | create/update | preserve existing content |

**Files that are never modified**:
- `{CWD}/.claude/settings.local.json` — permanently off-limits
- `packages/maencof/.mcp.json` — Plugin Area (maencof's own MCP server configuration)
- All files under `packages/maencof/` — Plugin Area

## Options

```
/maencof:mcp-setup [options]
```

| Option | Description |
|--------|-------------|
| `--verify` | Verify existing MCP server connection status only |
| `--list` | List installed MCP servers |
| `--remove <name>` | Remove a specific MCP server |

## Guide for Non-developers

This skill involves technical configuration. If the following concepts are unfamiliar,
please ask for help:

- MCP (Model Context Protocol): how Claude uses external services
- API token: authentication key for external services
- Environment variable: a secure way to store sensitive information

```
Say "Help me set up GitHub MCP" and
you will be guided step by step.
```

## Error Handling

- **maencof not initialized**: guide to run `/maencof:setup`
- **Existing .mcp.json parse error**: create a backup and suggest manual merge
- **MCP server connection failure**: guide to check token/installation
- **Permission error**: guide to manually edit `.claude/settings.json`
