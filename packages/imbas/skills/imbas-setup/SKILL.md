---
name: imbas-setup
user_invocable: true
description: "[imbas:imbas-setup] Initialize .imbas/ directory, select provider (jira/github/local), create config.json, and cache project metadata. Supports subcommands: init, show, set-project, set-provider, set-language, refresh-cache, clear-temp. Trigger: \"setup imbas\", \"imbas 설정\", \"imbas init\""
version: "1.0.0"
complexity: simple
plugin: imbas
---

# imbas-setup — Initialization & Configuration

Initialize the `.imbas/` working directory, select a provider (`jira`, `github`, or `local`),
configure project settings, and populate metadata caches. Entry point for all imbas workflows.

## When to Use This Skill

- First-time imbas setup in a project
- Checking remote tool availability (Atlassian MCP, GitHub CLI)
- Selecting or changing the issue tracking provider
- Changing the default project reference
- Refreshing stale metadata caches
- Viewing current configuration
- Cleaning up temporary media files

## Arguments

```
/imbas:imbas-setup [subcommand] [args...]

Subcommands:
  init              (default) Interactive initialization — project key, language → config.json + cache
  show              Display config.json + cache status
  set-project <KEY> Change default project + refresh cache
  set-provider <PROVIDER>      Change provider (jira, github, local) + re-run health check
  set-language <field> <lang>  Change language setting (e.g., set-language documents en)
  refresh-cache [KEY]          Force-refresh metadata cache (provider-specific)
  clear-temp        Delete .imbas/.temp/ directory (media temp files)
```

## References

- [Subcommand Behaviors](./references/subcommands.md) — show, set-project, set-language, refresh-cache, clear-temp
- [Init Workflow](./references/init-workflow.md) — Steps 0–7 of interactive initialization (provider-aware)
- [Health Check](./references/health-check.md) — Step 0 remote tool checks, auto-setup actions, output format
- [Tools Used](./references/tools.md) — imbas MCP tools, Jira operations ([OP:]), health check tools
- [Error Handling & State Transitions](./references/errors.md) — error table and state notes
