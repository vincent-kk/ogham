---
name: status
user_invocable: true
description: "[imbas:status] Show current or historical imbas run status, including phase progress, manifest summaries, and blocking issues. Trigger: \"imbas status\", \"런 상태\", \"imbas 진행상황\""
version: "1.0.0"
complexity: simple
plugin: imbas
---

# status — Run Status & History

Display current or historical imbas run status including phase progress,
manifest summaries, and blocking issues. Supports resuming interrupted runs.

## When to Use This Skill

- Check progress of current imbas pipeline run
- View history of all runs for a project
- Get detailed status of a specific run
- Resume an interrupted run from the last completed phase

## Arguments

```
/imbas:status [subcommand] [args...]

Subcommands:
  (default)         Show the most recent run's status
  list              List all runs with status summary
  <run-id>          Show detailed status for a specific run
  resume <run-id>   Resume an interrupted run (guides to next phase)
```

## References

- [Subcommand Behaviors](./references/subcommands.md) — default, list, \<run-id\>, resume display logic and resume guidance table
- [Tools Used & Agent Spawn](./references/tools.md) — imbas MCP tools, Atlassian tools, agent spawn note
- [Error Handling & State Transitions](./references/errors.md) — error table and read-only state note
