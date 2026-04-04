---
name: imbas-status
user_invocable: true
description: >
  Show current or historical imbas run status, including phase progress,
  manifest summaries, and blocking issues.
  Trigger: "imbas status", "런 상태", "imbas 진행상황"
version: "1.0.0"
complexity: simple
plugin: imbas
---

# imbas-status — Run Status & History

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

## Subcommand Behaviors

### (default) — Current Run Status

1. Call `imbas_run_get(project_key)` with no run_id (returns most recent run).
2. If no runs exist: display "No imbas runs found. Start with /imbas:validate <source>."
3. Display formatted status:

```
╔══════════════════════════════════════╗
║ imbas Run: 20260404-001              ║
║ Project: PROJ                        ║
╠══════════════════════════════════════╣
║ Phase 1 (validate)  ✓ PASS           ║
║ Phase 2 (split)     ● in_progress    ║
║ Phase 3 (devplan)   ○ pending        ║
╠══════════════════════════════════════╣
║ Epic: PROJ-100                       ║
║ Stories: 5 (3 created, 2 pending)    ║
║ Next: Complete split, then manifest  ║
╚══════════════════════════════════════╝
```

Phase status indicators:
- `✓` completed (with result for validate: PASS/PASS_WITH_WARNINGS/BLOCKED)
- `●` in_progress
- `○` pending
- `✗` escaped (with escape code)

If manifests are available, include summary:
- stories-manifest: total/pending/created counts
- devplan-manifest: tasks/subtasks/links counts

### list — All Runs

1. Call `imbas_run_list(project_key)`.
2. Display table:

```
Run ID         | Phase     | Status       | Created
---------------|-----------|--------------|--------------------
20260404-002   | devplan   | in_progress  | 2026-04-04 11:00
20260404-001   | split     | escaped(E2-1)| 2026-04-04 10:00
20260403-001   | devplan   | completed    | 2026-04-03 09:00
```

3. If no runs: display "No runs found for project <KEY>."

### <run-id> — Specific Run Detail

1. Call `imbas_run_get(project_key, run_id)`.
2. If run not found: display "Run <run-id> not found."
3. Display full detail:

```
Run: 20260404-001
Project: PROJ
Source: requirements-v2.md
Created: 2026-04-04 10:00:00
Updated: 2026-04-04 11:30:00

Phase 1 — validate
  Status: completed
  Result: PASS_WITH_WARNINGS
  Started: 2026-04-04 10:00:00
  Completed: 2026-04-04 10:15:00
  Blocking issues: 0
  Warning issues: 3
  Output: validation-report.md

Phase 2 — split
  Status: in_progress
  Started: 2026-04-04 10:20:00
  Epic: PROJ-100
  Output: stories-manifest.json (5 stories, 3 created)

Phase 3 — devplan
  Status: pending
```

### resume <run-id> — Resume Interrupted Run

1. Call `imbas_run_get(project_key, run_id)`.
2. If run not found: display "Run <run-id> not found."
3. Analyze current state and determine next action:

| Current State | Guidance |
|---------------|----------|
| validate.status == "pending" | "Run /imbas:validate <source> --run <run-id>" |
| validate.status == "in_progress" | "Validate was interrupted. Re-run /imbas:validate <source>" |
| validate.status == "completed", result == "BLOCKED" | "Validation blocked. Fix source document, then re-validate." |
| validate.status == "completed", result in [PASS, PASS_WITH_WARNINGS] && split.status == "pending" | "Run /imbas:split --run <run-id>" |
| split.status == "in_progress" | "Split was interrupted. Re-run /imbas:split --run <run-id>" |
| split.status == "escaped", code in [E2-1, E2-2, EC-1, EC-2] | "Split escaped (<code>). Human intervention required. See escape report." |
| split.status == "escaped", code == "E2-3" | "Split unnecessary. Run /imbas:devplan --run <run-id>" |
| split.status == "completed", pending_review == true | "Split needs review. Run /imbas:split --run <run-id> to review." |
| split.status == "completed", pending_review == false && stories pending | "Run /imbas:manifest stories --run <run-id>" |
| split.status == "completed" && all stories created && devplan.status == "pending" | "Run /imbas:devplan --run <run-id>" |
| devplan.status == "in_progress" | "Devplan was interrupted. Re-run /imbas:devplan --run <run-id>" |
| devplan.status == "completed", pending_review == true | "Devplan needs review. Run /imbas:devplan --run <run-id> to review." |
| devplan.status == "completed", pending_review == false | "Run /imbas:manifest devplan --run <run-id>" |

4. Display the guidance message with the exact command to run.

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `imbas_run_get` | Read state.json for a specific or most recent run |
| `imbas_run_list` | List all runs for a project |

### Atlassian MCP Tools

None. This skill only reads local imbas state.

## Agent Spawn

No agent spawn required. This skill executes directly by reading state files.

## Error Handling

| Error | Action |
|-------|--------|
| No config.json found | Display: "imbas not initialized. Run /imbas:setup first." |
| No project key configured | Display: "No default project. Run /imbas:setup set-project <KEY>." |
| Run not found | Display: "Run <run-id> not found in project <KEY>." |
| Corrupted state.json | Display: "State file corrupted for run <run-id>. Manual inspection needed at <path>." |

## State Transitions

This skill is read-only. It does not modify state.json or any manifest files.
