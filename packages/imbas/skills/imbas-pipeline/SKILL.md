---
name: imbas-pipeline
user_invocable: true
description: "[imbas:imbas-pipeline] End-to-end pipeline orchestration. Runs validate, split, manifest-stories, devplan, manifest-devplan in a single command with auto-approval at quality gates. Stops with structured blocker report on any gate failure. Trigger: \"pipeline\", \"full pipeline\", \"전체 파이프라인\", \"자동 실행\", \"한번에 실행\""
version: "1.0.0"
complexity: complex
plugin: imbas
---

# imbas-pipeline — End-to-End Pipeline Orchestration

Run the entire imbas pipeline from document to Jira tickets in a single command.
Auto-approves at each phase boundary when all quality gates pass.
Stops immediately with a structured blocker report when any gate fails.

## When to Use This Skill

- Single-command execution of the full validate → split → devplan → Jira creation flow
- When the planning document is expected to be clean enough for autonomous processing
- To generate Subtasks/Tasks from existing Jira Stories without going through validate+split
- Partial execution with `--stop-at` for incremental pipeline runs

## Arguments

```
/imbas:imbas-pipeline <source-or-stories> [options]

<source-or-stories> : One of:
                      - Document path (local md/txt) or Confluence URL → full pipeline
                      - Jira Story key(s), comma-separated (e.g., PROJ-42 or PROJ-42,PROJ-43) → devplan pipeline
--project           : Jira project key (overrides config.defaults.project_ref)
--supplements       : Supplementary material paths (comma-separated)
--parent            : Parent Epic key or "new" or "none" (default: "new"; only for document mode)
--stop-at           : Stop after phase: validate | split | manifest-stories | devplan
                      (manifest-devplan is the terminal phase; stopping after it is
                      equivalent to full completion and is therefore not accepted)
--dry-run           : Run all phases but skip Jira issue creation (manifest shows preview only)
```

Minimal invocations:

```bash
# Full pipeline — document to Jira tickets
/imbas:imbas-pipeline requirements.md

# Devplan pipeline — existing Stories to Subtasks/Tasks
/imbas:imbas-pipeline PROJ-42
/imbas:imbas-pipeline PROJ-42,PROJ-43,PROJ-44
```

## Two Pipeline Modes

### Mode A: Document Pipeline (full)

Input is a document path or Confluence URL. Runs all 5 phases:

```
document → validate → split → manifest-stories → devplan → manifest-devplan
```

### Mode B: Devplan Pipeline (from Stories)

Input is one or more Jira Story keys. Skips validate+split, starts at devplan:

```
Story keys → devplan → manifest-devplan
```

Mode is auto-detected from the first argument — no flag needed:
- Looks like a file path or URL → Document Pipeline
- Looks like Jira key(s) (PROJ-NNN pattern) → Devplan Pipeline

### Smart Defaults (Phase 0)

Before execution begins, pipeline auto-resolves all missing options and displays
a confirmation banner:

```
imbas pipeline — configuration
  Input:    requirements.md
  Mode:     document pipeline (validate → split → devplan → Jira)
  Project:  PROJ (from config)
  Parent:   new Epic (auto)
  Jira:     live
  Proceeding...
```

```
imbas pipeline — configuration
  Input:    PROJ-42, PROJ-43 (2 Stories)
  Mode:     devplan pipeline (devplan → Jira)
  Project:  PROJ (from Story keys)
  Jira:     live
  Proceeding...
```

Resolution order for each option:

| Option | Document Mode | Devplan Mode |
|--------|--------------|--------------|
| `--project` | argument → config default → STOP | extracted from Story keys → argument → config |
| `--parent` | argument → "new" | N/A (Stories already exist) |
| `--stop-at` | argument → none (full) | argument → none (full) |
| `--dry-run` | argument → false | argument → false |

## Pipeline Flow

### Document Pipeline (Mode A)

```
Phase 1: VALIDATE
  Spawn imbas-analyst → validation-report.md
  >>> GATE 1: PASS/PASS_WITH_WARNINGS → continue | BLOCKED → STOP

Phase 2: SPLIT
  Spawn imbas-planner → Story splitting
  Spawn imbas-analyst → reverse-inference verification
  Auto horizontal split if needed
  >>> GATE 2: All verification fields PASS → auto-approve | Any failure → STOP

Phase 2.5: MANIFEST STORIES
  Batch-create Epic + Stories + Links in Jira
  >>> Failed items → STOP (devplan requires all issue_refs)

Phase 3: DEVPLAN
  Spawn imbas-engineer → codebase exploration + EARS Subtask generation
  Cross-Story Task extraction + B→A feedback
  >>> GATE 3: Manifest valid + no needs_review → auto-approve | Any flag → STOP

Phase 3.5: MANIFEST DEVPLAN
  Batch-create Tasks + Subtasks + Links + Feedback comments in Jira
  >>> GATE 4: Execution Result — all items created → success report | partial failure → non-blocking report (see references/auto-approval-gates.md for full gate criteria)

FINAL: Pipeline completion report
```

### Devplan Pipeline (Mode B)

```
Phase 0: Load Stories from Jira (getJiraIssue per key)

Phase 3: DEVPLAN
  Spawn imbas-engineer → codebase exploration + EARS Subtask generation
  Cross-Story Task extraction (if multiple Stories) + B→A feedback
  >>> GATE 3: Manifest valid + no needs_review → auto-approve | Any flag → STOP

Phase 3.5: MANIFEST DEVPLAN
  Batch-create Tasks + Subtasks + Links + Feedback comments in Jira
  >>> GATE 4: Execution Result — all items created → success report | partial failure → non-blocking report (see references/auto-approval-gates.md for full gate criteria)

FINAL: Pipeline completion report
```

## Key Design Principles

- **Minimal input**: One argument is enough. Mode, project, parent — all auto-detected.
- **Two modes, one command**: Document path → full pipeline. Story keys → devplan pipeline. No flag needed.
- **Auto-approval gates**: Replace manual review steps with verification field checks.
- **Fail-fast**: Stop at the first gate failure with actionable blocker report.
- **Resume-friendly**: Stopped pipelines can be resumed manually via individual skill commands.
- **Existing infrastructure**: Uses the same MCP tools and agents as individual skills. No new code.

## References

- [references/workflow.md](./references/workflow.md) — Phase 0 routing, 5-Phase orchestration, devplan-only mode
- [references/auto-approval-gates.md](./references/auto-approval-gates.md) — Gate criteria for autonomous phase progression
- [references/blocker-report.md](./references/blocker-report.md) — Stopped and success report templates
- [references/tools.md](./references/tools.md) — Combined MCP tools and agent spawn table
- [references/errors.md](./references/errors.md) — Error conditions, recovery, and resume guidance
