# estimate — Workflow

```
Step 1 — Load Run & Verify Preconditions
  1. Load config via mcp__plugin_imbas_tools__config_get (estimation coefficients,
     languages). Apply --team-size / --buffer overrides for this run only
     (recorded in estimation.json config_used; config files are not modified).
  2. If --run provided: mcp__plugin_imbas_tools__run_get(project_ref, run_id).
     Else: mcp__plugin_imbas_tools__run_get(project_ref) → most recent run.
  3. Verify refine.status == "completed" and refine.result in
     ["PASS", "PASS_WITH_WARNINGS"] — else error:
     "Phase 1 (refine) must pass first. Run /imbas:refine <source>."
  4. Verify estimate.status in ["pending", "skipped"] — a completed estimate is
     re-run only after user confirmation ("Re-estimate and overwrite?").
     Re-running a skipped estimate is allowed (skipped → start is a restart).
  5. mcp__plugin_imbas_tools__run_transition:
     - action: "start_phase", phase: "estimate"

Step 2 — estimator Agent Spawn
  - Spawn agent via Task tool (subagent_type: "imbas:estimator")
  - Model: config.defaults.llm_model.estimate (default: "opus")
  - Input provided to agent:
    - refined.md (full content) — fall back to source.md ONLY if refined.md is
      missing (legacy runs), with a warning in the report
    - supplements/*.md
    - config.estimation coefficients (with CLI overrides applied)
    - config.language settings (report language per config.language.reports)
  - Agent instructions: follow references/method.md —
    3-view decomposition → reconciliation → S/M/L/XL + 3-point PERT per unit →
    dependency extraction → track layout → milestones.
    Return a JSON payload conforming to references/output-schema.md
    plus the rendered markdown report body.
  - Agent returns: { estimation: <json>, report: <markdown> }

Step 3 — Validated Save
  1. mcp__plugin_imbas_tools__manifest_save:
     - project_ref, run_id, type: "estimation", manifest: <estimation json>
     → Zod-validated write to estimation.json; returns summary
       { units, sum_expected, buffered_total, total_weeks }
  2. mcp__plugin_imbas_tools__manifest_validate(type: "estimation")
     → integrity check (deps, track uniqueness, confidence interval);
       on errors: fix the payload with the estimator's data and re-save.

Step 4 — Report Render
  Save the report markdown to <run_dir>/estimation-report.md (Write tool) with:
  - Summary: buffered_total man-days, confidence interval, total_weeks,
    team_size tracks
  - WBS table: unit id, name, views, complexity, o/m/p, expected ± sigma
  - Mermaid gantt of tracks and milestones
  - Assumptions list (numbered)
  - Top risks (impact-ordered)
  - single_view confirmation list ("only the <view> view surfaced these — confirm")

Step 5 — State Update & Summary
  1. mcp__plugin_imbas_tools__run_transition:
     - action: "complete_phase", phase: "estimate"
     - estimated_manday: <rollup.buffered_total>
  2. Display the summary block and next-step guidance:
     "Estimation complete: <buffered_total> man-days (CI <lo>–<hi>), <total_weeks>
      weeks on <team_size> tracks. Report: estimation-report.md.
      Next: /imbas:split [--run <run-id>] to decompose and create issues."
```
