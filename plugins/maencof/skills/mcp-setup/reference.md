# mcp-setup — Reference

Detailed step-by-step workflow, JSON examples, token-collection guidance, and the non-developer guide.

## Detailed Workflow

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
    "allow": ["mcp__github__*", "mcp__slack__*"]
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

## Acceptance Criteria

- `{CWD}/.mcp.json` contains an entry under `mcpServers` for each selected server, with existing entries preserved.
- `{CWD}/.claude/settings.json` grants the matching `mcp__<server>__*` permission for each installed server, with existing permissions preserved.
- `{CWD}/.claude/settings.local.json` and all `plugins/maencof/` files are left untouched.
- Tokens are referenced via `${ENV_VAR}` placeholders; no secrets are written into `.mcp.json` or any tracked file.
- Connection verification reports per-server status and provides debugging guidance for any failure.
