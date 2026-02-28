---
name: connect
user_invocable: true
description: External data source registration/management — configure Execution Area .coffaen-meta/data-sources.json
version: 1.0.0
complexity: medium
context_layers: []
orchestrator: connect skill
plugin: coffaen
---

# connect — Data Source Registration/Management

Connects external data sources (GitHub, Jira, Slack, etc.) to coffaen and configures ingestion schedules.
This skill can run the data source registration step of `/coffaen:setup` independently.

> **Area distinction**:
> - **Execution Area** (what this skill modifies): `{CWD}/.coffaen-meta/data-sources.json`
> - **Plugin Area** (do not modify): `packages/coffaen/` source code
>
> This skill modifies the Execution Area only.

## When to Use This Skill

- When connecting a new external data source to coffaen
- When changing the ingestion frequency of an existing data source
- When reviewing the list of connected sources
- When disabling/removing a specific source

## Prerequisites

- coffaen must be initialized (`.coffaen-meta/` directory must exist)
- If not initialized: "Please run `/coffaen:setup` first."

## Supported Data Sources

| Source | MCP Tool | Collected Content |
|--------|---------|------------------|
| GitHub | `mcp__github__*` | Issues, PRs, Discussions, code changes |
| Jira | `mcp__jira__*` | Issues, sprints, projects |
| Slack | `mcp__slack__*` | Channel messages, threads |
| Notion | `mcp__notion__*` | Pages, databases |
| Local directory | filesystem direct | Markdown, text files |
| RSS/Web | HTTP | Blogs, news feeds |

## Workflow

### Mode Selection

```
/coffaen:connect          -- interactive (add/modify source)
/coffaen:connect list     -- list connected sources
/coffaen:connect add      -- add a new source
/coffaen:connect remove   -- remove a source
/coffaen:connect disable  -- disable a source (without deleting)
/coffaen:connect enable   -- re-enable a disabled source
```

### Interactive Mode Flow

#### Step 1 — Display Current Status

Read `.coffaen-meta/data-sources.json` and display currently connected sources.

```
Currently connected data sources:
  [active] GitHub (every session)
  [inactive] Slack

What would you like to do?
  1. Add a new source
  2. Modify an existing source
  3. Disable/remove a source
  4. Done
```

#### Step 2 — Select Source

```
Which source would you like to connect? (multiple selection allowed)
  [ ] GitHub (Issues, PRs)
  [ ] Jira
  [ ] Slack
  [ ] Notion
  [ ] Local directory
  [ ] RSS/Web
  [ ] None (configure later)
```

#### Step 3 — Configure Ingestion Frequency

For each selected source:

```
Select the ingestion frequency for {source name}:
  1. Every session start (default)
  2. Once a day
  3. Once a week
  4. Manual only
```

#### Step 4 — Source-specific Configuration

**GitHub**:
```
GitHub repository settings:
- Repository: {owner}/{repo} (e.g., vincent-kk/ogham)
- Collect: [x] Issues  [x] PRs  [ ] Discussions
- Status filter: [x] open  [ ] closed  [ ] all
```

**Local directory**:
```
Local directory settings:
- Path: {absolute path or CWD-relative path}
- File pattern: *.md, *.txt (default)
- Recursive: [Yes/No]
```

#### Step 5 — Save data-sources.json

Create/update `.coffaen-meta/data-sources.json`.

```json
{
  "sources": [
    {
      "id": "github-main",
      "type": "github",
      "enabled": true,
      "schedule": "session",
      "config": {
        "repo": "vincent-kk/ogham",
        "collect": ["issues", "prs"]
      },
      "last_collected": null,
      "created_at": "2026-02-28T10:00:00Z"
    }
  ],
  "updated_at": "2026-02-28T10:00:00Z"
}
```

#### Step 6 — Completion Guide

```
Data source configuration complete!

Connected sources:
  - GitHub (every session) — github-main
  - Local ./docs/ (manual)

Next steps:
  - If external MCP tools are needed: `/coffaen:mcp-setup`
  - To ingest now: `/coffaen:ingest`
```

## Available MCP Tools

This skill does not use coffaen MCP tools directly. It reads and writes `.coffaen-meta/data-sources.json` via filesystem access (Read/Write tools). External MCP tools (e.g., `mcp__github__*`) are referenced in the Supported Data Sources table above but are invoked by `/coffaen:ingest`, not by this skill.

## File Scope (Execution Area only)

| File | Location | Operation |
|------|----------|-----------|
| `data-sources.json` | `{CWD}/.coffaen-meta/` | create/update |

**Files that are never modified**:
- `{CWD}/.mcp.json` -> handled by `/coffaen:mcp-setup`
- `{CWD}/.claude/settings.json` -> handled by `/coffaen:mcp-setup`
- `{CWD}/.claude/settings.local.json` -> permanently off-limits (user personal settings)
- All files under `packages/coffaen/` -> Plugin Area (do not modify)

## Options

```
/coffaen:connect [mode] [sourceId]
```

| Option | Description |
|--------|-------------|
| `list` | Display current source list |
| `add` | Add a new source (interactive) |
| `remove <id>` | Remove a source |
| `disable <id>` | Disable a source |
| `enable <id>` | Enable a source |

## Error Handling

- **coffaen not initialized**: guide to run `/coffaen:setup`
- **JSON parse error**: back up existing file and suggest recreation
- **Duplicate source**: confirm whether to overwrite existing configuration
