---
name: pipeline
user-invocable: true
description: '[imbas:pipeline] End-to-end pipeline orchestration. Accepts a document/URL and runs refine → estimate → split (decompose + create) with auto-approval at quality gates. Stops with a structured blocker report on any gate failure. Trigger: "pipeline", "full pipeline", "전체 파이프라인", "자동 실행", "한번에 실행"'
argument-hint: '<source> [--project KEY] [--supplements PATHS] [--parent KEY|new|none] [--skip-estimate] [--stop-at PHASE] [--dry-run] [--strict-drift]'
version: '2.0.0'
complexity: complex
plugin: imbas
---

> **EXECUTION MODEL**: Execute all phases as a SINGLE CONTINUOUS OPERATION. After each phase completes, IMMEDIATELY verify the gate result and proceed to the next phase in the SAME TURN. NEVER yield between phases, after an agent subagent return, MCP tool result, or [OP:] operation.
>
> **Valid reasons to yield**:
>
> 1. User decision genuinely required (ambiguity only the user can resolve)
> 2. Terminal stage marker emitted: `# imbas Pipeline — (COMPLETE|STOPPED|DRY RUN COMPLETE|STOPPED AT)`
>
> **HIGH-RISK YIELD POINTS**:
>
> - Phase 0 confirmation banner — do NOT pause after displaying; immediately invoke the first tool (`mcp__plugin_imbas_tools__run_create`)
> - GATE 1–4 decision points — after judging PASS, immediately chain the next phase's tool call
> - **Phase 3 decompose → creation boundary is the highest-stall risk point.** When GATE 3 auto-approves the stories manifest, you MUST chain the creation steps (split creation-workflow Steps 9–11) in the same turn. Emitting a "Stories decomposed" summary without continuing is a FAILURE mode.
> - Provider creation loops — after EACH item creation, save the manifest via `mcp__plugin_imbas_tools__manifest_save` and chain the next item

# pipeline — End-to-End Pipeline Orchestration

Run the entire imbas pipeline from planning document to tracked issues in a single command: refine → estimate → split (decompose + create). Auto-approves at each phase boundary when all quality gates pass. Stops immediately with a structured blocker report when any gate fails.

## When to Use This Skill

- Single-command execution of the full refine → estimate → split flow
- When the planning document is expected to be clean enough for autonomous processing
- Partial execution with `--stop-at` for incremental runs (e.g., refine-only, planning + estimation without creation)

## Arguments

```
/imbas:pipeline <source> [options]

<source>        : Planning document path (local md/txt) or Confluence URL
--project       : Project key (overrides config.defaults.project_ref)
--supplements   : Supplementary material paths (comma-separated)
--parent        : Parent Epic key or "new" or "none" (default: "new"; jira/github)
--skip-estimate : Skip Phase 2 — estimate.status is recorded "skipped" via run_transition
--stop-at       : Stop after phase: refine | estimate
--dry-run       : Run all phases but stop creation at the preview (manifest saved, nothing created)
--strict-drift  : Convert DRIFT_* findings during creation into a blocker STOP
                  (default: auto-resolve — reset missing entities to pending)
```

Minimal invocations:

```bash
# Full pipeline — document to created issues, with man-day estimation
/imbas:pipeline requirements.md

# Fast path — skip estimation
/imbas:pipeline requirements.md --skip-estimate

# Planning + estimation only — no issue creation
/imbas:pipeline requirements.md --stop-at estimate
```

## Pipeline Flow

```
Phase 1: REFINE
  Spawn `analyst` → refined.md + validation-report.md
  >>> GATE 1: PASS/PASS_WITH_WARNINGS → continue | BLOCKED → STOP

Phase 2: ESTIMATE            (skipped with --skip-estimate)
  Spawn `estimator` → estimation.json + estimation-report.md
  >>> GATE 2: estimation manifest valid → continue | invalid → STOP

Phase 3: SPLIT — decompose
  Spawn `planner` → issue splitting; `analyst` → reverse-inference
  Auto horizontal split if needed
  >>> GATE 3: all verification fields PASS + manifest valid → auto-approve
              | any failure → STOP

Phase 3 (cont.): SPLIT — create
  Batch-create Epic + issues + links on the provider (split creation-workflow)
  >>> GATE 4: all created → COMPLETE report | any failure → STOP with retry guidance

FINAL: Pipeline completion report
```

## Key Design Principles

- **Minimal input**: One argument is enough. Project, parent, provider — all auto-resolved.
- **Auto-approval gates**: Replace manual review steps with verification field checks.
- **Fail-fast**: Stop at the first gate failure with an actionable blocker report.
- **Resume-friendly**: Stopped pipelines resume via the individual skills (/imbas:refine, /imbas:estimate, /imbas:split --run).
- **Existing infrastructure**: Reuses the same MCP tools, agents, and the split skill's creation workflow. No pipeline-only machinery.

## References

- [references/workflow.md](./references/workflow.md) — Phase 0 defaults, 3-phase orchestration, creation delegation
- [references/auto-approval-gates.md](./references/auto-approval-gates.md) — Gate criteria for autonomous phase progression
- [references/blocker-report.md](./references/blocker-report.md) — Stopped and success report templates
- [references/tools.md](./references/tools.md) — Combined MCP tools and agent spawn table
- [references/errors.md](./references/errors.md) — Error conditions, recovery, and resume guidance
