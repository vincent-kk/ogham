---
name: imbas-setup
user_invocable: true
description: "[imbas:imbas-setup] Initialize .imbas/ directory, create config.json, and cache Jira project metadata. Supports subcommands: init, show, set-project, set-language, refresh-cache, clear-temp. Trigger: \"setup imbas\", \"imbas 설정\", \"imbas init\""
version: "1.0.0"
complexity: simple
plugin: imbas
---

# imbas-setup — Initialization & Configuration

Initialize the `.imbas/` working directory, configure project settings, and populate
Jira metadata caches. Entry point for all imbas workflows.

## When to Use This Skill

- First-time imbas setup in a project
- Changing the default Jira project
- Refreshing stale Jira metadata caches
- Viewing current configuration
- Cleaning up temporary media files

## Arguments

```
/imbas:imbas-setup [subcommand] [args...]

Subcommands:
  init              (default) Interactive initialization — project key, language → config.json + cache
  show              Display config.json + cache status
  set-project <KEY> Change default project + refresh cache
  set-language <field> <lang>  Change language setting (e.g., set-language documents en)
  refresh-cache [KEY]          Force-refresh Jira metadata cache
  clear-temp        Delete .imbas/.temp/ directory (media temp files)
```

## References

- [Subcommand Behaviors](./references/subcommands.md) — show, set-project, set-language, refresh-cache, clear-temp
- [Init Workflow](./references/init-workflow.md) — Steps 1–6 of interactive initialization
- [Tools Used](./references/tools.md) — imbas MCP tools, Atlassian MCP tools, agent spawn
- [Error Handling & State Transitions](./references/errors.md) — error table and state notes
