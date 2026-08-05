# status — Subcommand Behaviors

> **Provider scope**: This skill is fully provider-agnostic and is NOT partitioned. It reads only imbas run state (`mcp__plugin_imbas_tools__run_get`, `mcp__plugin_imbas_tools__run_list`) and manifest summary counts. Issue-count displays work identically for every provider because they count `issue_ref` presence, which is provider-agnostic by schema (see `src/types/manifest.ts:StoryItemSchema.issue_ref`).

## (default) — Current Run Status

1. Call `mcp__plugin_imbas_tools__run_get(project_ref)` with no run_id (returns most recent run).
2. If no runs exist: display "No imbas runs found. Start with /imbas:refine <source>."
3. Display formatted status:

```
╔══════════════════════════════════════╗
║ imbas Run: 20260805-001              ║
║ Project: PROJ                        ║
╠══════════════════════════════════════╣
║ Phase 1 (refine)    ✓ PASS           ║
║ Phase 2 (estimate)  ✓ 66.4 md        ║
║ Phase 3 (split)     ● in_progress    ║
╠══════════════════════════════════════╣
║ Epic: PROJ-100                       ║
║ Issues: 5 (3 created, 2 pending)     ║
║ Next: Finish split creation          ║
╚══════════════════════════════════════╝
```

Phase status indicators:

- `✓` completed (refine shows result PASS/PASS_WITH_WARNINGS/BLOCKED; estimate shows estimated_manday)
- `●` in_progress
- `○` pending
- `⤼` skipped (estimate only)
- `✗` escaped (with escape code)

Artifact presence line (from `manifests_available` + file checks): refined.md · validation-report.md · estimation.json · estimation-report.md · stories-manifest.json.

If manifests are available, include summary:

- stories-manifest: total/pending/created counts (+ summed estimate_manday when present)
- estimation: units, buffered_total man-days, total_weeks

## list — All Runs

1. Call `mcp__plugin_imbas_tools__run_list(project_ref)`.
2. Display table:

```
Run ID         | Phase     | Status       | Created
---------------|-----------|--------------|--------------------
20260805-002   | split     | in_progress  | 2026-08-05 11:00
20260805-001   | split     | escaped(E2-1)| 2026-08-05 10:00
20260804-001   | split     | completed    | 2026-08-04 09:00
```

3. If no runs: display "No runs found for project <KEY>."

## \<run-id\> — Specific Run Detail

1. Call `mcp__plugin_imbas_tools__run_get(project_ref, run_id)`.
2. If run not found: display "Run <run-id> not found."
3. Display full detail:

```
Run: 20260805-001
Project: PROJ
Source: requirements-v2.md
Created: 2026-08-05 10:00:00
Updated: 2026-08-05 11:30:00

Phase 1 — refine
  Status: completed
  Result: PASS_WITH_WARNINGS
  Blocking issues: 0 / Warning issues: 3
  Artifacts: refined.md, validation-report.md

Phase 2 — estimate
  Status: completed
  Estimated: 66.4 man-days
  Artifacts: estimation.json, estimation-report.md

Phase 3 — split
  Status: in_progress
  Epic: PROJ-100
  Artifacts: stories-manifest.json (5 issues, 3 created)
```

## resume \<run-id\> — Resume Interrupted Run

1. Call `mcp__plugin_imbas_tools__run_get(project_ref, run_id)`.
2. If run not found: display "Run <run-id> not found."
3. Analyze current state and determine next action:

| Current State                                                                                   | Guidance                                                                  |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| refine.status == "pending"                                                                      | "Run /imbas:refine <source>"                                              |
| refine.status == "in_progress"                                                                  | "Refine was interrupted. Re-run /imbas:refine <source>"                   |
| refine.status == "completed", result == "BLOCKED"                                               | "Refine blocked. Fix the source document, then re-run /imbas:refine."     |
| refine passed && estimate.status == "pending"                                                   | "Run /imbas:estimate --run <run-id> (or /imbas:split to skip estimation)" |
| estimate.status == "in_progress"                                                                | "Estimate was interrupted. Re-run /imbas:estimate --run <run-id>"         |
| estimate.status in [completed, skipped] && split.status == "pending"                            | "Run /imbas:split --run <run-id>"                                         |
| split.status == "in_progress"                                                                   | "Split was interrupted. Re-run /imbas:split --run <run-id>"               |
| split.status == "escaped", code in [E2-1, E2-2, EC-1, EC-2]                                     | "Split escaped (<code>). Human intervention required. See escape report." |
| split.status == "escaped", code == "E2-3"                                                       | "Single-Story manifest saved. Re-run /imbas:split --run <run-id> to create." |
| split.status == "completed", pending_review == true                                             | "Manifest saved but not executed. Re-run /imbas:split --run <run-id>."    |
| split.status == "completed", pending_review == false && stories pending                         | "Creation partially done. Re-run /imbas:split --run <run-id> to retry."   |
| split.status == "completed" && all stories created                                              | "Run complete. /imbas:scaffold-pr <issue-ref> to scaffold a draft PR."    |

4. Display the guidance message with the exact command to run.
