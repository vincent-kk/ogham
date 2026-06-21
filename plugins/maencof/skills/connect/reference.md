# connect — Reference

Interactive prompt templates, source-specific configuration, the data-sources.json schema, and completion guides for the connect skill.

## Interactive Mode Flow

### Step 1 — Display Current Status

Read `.maencof-meta/data-sources.json` and display currently connected sources.

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

### Step 2 — Select Source

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

### Step 3 — Configure Ingestion Frequency

For each selected source:

```
Select the ingestion frequency for {source name}:
  1. Every session start (default)
  2. Once a day
  3. Once a week
  4. Manual only
```

### Step 4 — Source-specific Configuration

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

### Step 5 — Save data-sources.json

Create/update `.maencof-meta/data-sources.json`.

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

### Step 6 — Completion Guide

```
Data source configuration complete!

Connected sources:
  - GitHub (every session) — github-main
  - Local ./docs/ (manual)

Next steps:
  - If external MCP tools are needed: `/maencof:mcp-setup`
  - To ingest now: `/maencof:ingest`
```
