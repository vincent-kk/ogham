---
name: imbas-pipeline
user_invocable: true
description: "[imbas:imbas-pipeline] End-to-end pipeline orchestration. Runs validate, split, manifest-stories, devplan, manifest-devplan in a single command with auto-approval at quality gates. Stops with structured blocker report on any gate failure. Trigger: \"pipeline\", \"full pipeline\", \"전체 파이프라인\", \"자동 실행\", \"한번에 실행\""
argument-hint: "<source-or-stories> [--project KEY] [--codebase PATH] [--supplements PATHS] [--parent KEY|new|none] [--stop-at PHASE] [--dry-run] [--strict-drift]"
version: "1.0.0"
complexity: complex
plugin: imbas
---

> **EXECUTION MODEL**: Execute all phases as a SINGLE CONTINUOUS OPERATION.
> After each phase completes, IMMEDIATELY verify the gate result and proceed
> to the next phase in the SAME TURN. NEVER yield between phases, after an
> agent subagent return, MCP tool result, or [OP:] Jira operation.
>
> **Existing CRITICAL directives are authoritative** (do not duplicate):
> - `references/workflow.md:293` — After EACH item creation, save manifest via `manifest_save` (Phase 2.5)
> - `references/workflow.md:437` — After EACH item creation, save manifest via `manifest_save` (Phase 3.5)
>
> **Valid reasons to yield**:
> 1. User decision genuinely required (ambiguity only the user can resolve)
> 2. Terminal stage marker emitted: `# imbas Pipeline — (COMPLETE|STOPPED|DRY RUN COMPLETE|PLANNING COMPLETE|STOPPED AT)`
>
> **HIGH-RISK YIELD POINTS**:
> - Phase 0 confirmation banner — do NOT pause after displaying; immediately invoke the first tool (`run_create` / `get_issue`)
> - GATE 1–4 decision points — after judging PASS, immediately chain the next phase's tool call
> - Phase 2.5 → Phase 3 boundary — manifest-stories success is NOT pipeline completion; immediately spawn `imbas-engineer` if `--codebase` present
> - Phase 3.5 [OP:] Jira batch — honor existing `workflow.md:293,437` CRITICAL; do not add duplicate directives
>
> **⚠️ DO NOT STOP HERE**: Phase 2.5 → Phase 3 boundary is the highest-stall
> risk point. When manifest-stories completes successfully and `--codebase`
> is resolved, you MUST chain `imbas-engineer` spawn in the same turn.
> Emitting a "Stories created" summary without continuing is a FAILURE mode.
>
> **LIMITATION**: `imbas-engineer` (model: opus, maxTurns: 80) subagent-internal
> context exhaustion cannot be mitigated by this preamble. The agent may
> exhaust its own turn budget mid-exploration on large codebases. See
> follow-up issue for checkpoint file contract.

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
--codebase          : Path to the codebase for Phase 3 code exploration.
                      If omitted, resolved from config.defaults.codebase.
                      Document pipeline: when absent, pipeline stops after manifest-stories
                      (planning-only mode). Devplan pipeline: required — STOP at Phase 0 if absent.
--supplements       : Supplementary material paths (comma-separated)
--parent            : Parent Epic key or "new" or "none" (default: "new"; only for document mode)
--stop-at           : Stop after phase: validate | split | manifest-stories | devplan
                      (manifest-devplan is the terminal phase; stopping after it is
                      equivalent to full completion and is therefore not accepted)
--dry-run           : Run all phases but skip Jira issue creation (manifest shows preview only)
--strict-drift      : Convert DRIFT_* resolutions in Phase 2.5 into blocker STOP instead of
                      auto-resolving (default: auto-resolve; only applies to document pipeline)
```

Minimal invocations:

```bash
# Full pipeline — document to Jira tickets (codebase exploration included)
/imbas:imbas-pipeline requirements.md --codebase /path/to/repo

# Planning-only — Stories created, no Subtask generation
/imbas:imbas-pipeline requirements.md

# Devplan pipeline — existing Stories to Subtasks/Tasks (--codebase required)
/imbas:imbas-pipeline PROJ-42 --codebase /path/to/repo
/imbas:imbas-pipeline PROJ-42,PROJ-43,PROJ-44 --codebase /path/to/repo
```

## Three Pipeline Modes

### Mode A: Document Pipeline — Full (with `--codebase`)

Input is a document path or Confluence URL. `--codebase` provided. Runs all 5 phases:

```
document → validate → split → manifest-stories → devplan → manifest-devplan
```

### Mode A-planning: Document Pipeline — Planning Only (without `--codebase`)

Input is a document path or Confluence URL. `--codebase` absent. Stops after manifest-stories:

```
document → validate → split → manifest-stories → STOP (planning complete)
```

No codebase means the document still needs refinement at the planning level.
Subtask generation is deferred until a codebase is provided.

### Mode B: Devplan Pipeline (from Stories, `--codebase` required)

Input is one or more Jira Story keys. Skips validate+split, starts at devplan.
`--codebase` is required — STOP at Phase 0 if absent.

```
Story keys → devplan → manifest-devplan
```

Mode is auto-detected from the first argument — no flag needed:
- Looks like a file path or URL → Document Pipeline (full or planning-only based on `--codebase`)
- Looks like Jira key(s) (PROJ-NNN pattern) → Devplan Pipeline (`--codebase` required)

### Smart Defaults (Phase 0)

Before execution begins, pipeline auto-resolves all missing options and displays
a confirmation banner:

```
imbas pipeline — configuration
  Input:    requirements.md
  Mode:     document pipeline — full (validate → split → devplan → Jira)
  Codebase: /path/to/repo
  Project:  PROJ (from config)
  Parent:   new Epic (auto)
  Jira:     live
  Proceeding...
```

```
imbas pipeline — configuration
  Input:    requirements.md
  Mode:     document pipeline — planning only (validate → split → Stories)
  Codebase: (none — stops after manifest-stories)
  Project:  PROJ (from config)
  Parent:   new Epic (auto)
  Jira:     live
  Proceeding...
```

```
imbas pipeline — configuration
  Input:    PROJ-42, PROJ-43 (2 Stories)
  Mode:     devplan pipeline (devplan → Jira)
  Codebase: /path/to/repo
  Project:  PROJ (from Story keys)
  Jira:     live
  Proceeding...
```

Resolution order for each option:

| Option | Document Mode | Devplan Mode |
|--------|--------------|--------------|
| `--project` | argument → config default → STOP | extracted from Story keys → argument → config |
| `--codebase` | argument → config default → null (planning-only) | argument → config default → STOP |
| `--parent` | argument → "new" | N/A (Stories already exist) |
| `--stop-at` | argument → none (full) | argument → none (full) |
| `--dry-run` | argument → false | argument → false |

## Pipeline Flow

### Document Pipeline (Mode A / A-planning)

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

  >>> CODEBASE CHECK: --codebase resolved?
      NO  → STOP (planning-only complete). Emit planning report with resume guidance:
            "Planning pipeline complete. N Stories created.
             To generate Subtasks: /imbas:imbas-pipeline <source> --codebase /path/to/repo
             Or individually: /imbas:imbas-devplan --run <run-id> --codebase /path/to/repo"
      YES → continue to Phase 3

Phase 3: DEVPLAN (requires --codebase)
  Spawn imbas-engineer → codebase exploration + EARS Subtask generation
  Cross-Story Task extraction + B→A feedback
  >>> GATE 3: Manifest valid + no needs_review → auto-approve | Any flag → STOP

Phase 3.5: MANIFEST DEVPLAN
  Batch-create Tasks + Subtasks + Links + Feedback comments in Jira
  >>> GATE 4: Execution Result — all items created → success report | partial failure → non-blocking report (see references/auto-approval-gates.md for full gate criteria)

FINAL: Pipeline completion report
```

### Devplan Pipeline (Mode B, `--codebase` required)

```
Phase 0: Load Stories from Jira ([OP: get_issue] per key)
  >>> CODEBASE CHECK: --codebase resolved?
      NO  → STOP at Phase 0: "Devplan pipeline requires --codebase.
             Subtask generation needs a codebase to explore.
             Usage: /imbas:imbas-pipeline PROJ-42 --codebase /path/to/repo"
      YES → continue

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
