# imbas-status — Subcommand Behaviors

> **Provider scope**: This skill is fully provider-agnostic and is NOT
> partitioned. It reads only imbas run state (`mcp_tools_run_get`, `mcp_tools_run_list`) and
> manifest summary counts. Issue-count displays work identically for every
> provider because they count `issue_ref` presence, which is provider-agnostic
> by schema (see `src/types/manifest.ts:StoryItemSchema.issue_ref`). During
> the RALPLAN v2 local-provider cycle the divergence was estimated at ~45
> lines, but on inspection it turned out to be 0 lines. Recorded as an
> honest deviation from the per-skill divergence table in
> `.metadata/imbas/specs/SPEC-skills.md`.


## (default) — Current Run Status

1. Call `mcp_tools_run_get(project_ref)` with no run_id (returns most recent run).
2. If no runs exist: display "No imbas runs found. Start with /imbas:imbas-validate <source>."
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

## list — All Runs

1. Call `mcp_tools_run_list(project_ref)`.
2. Display table:

```
Run ID         | Phase     | Status       | Created
---------------|-----------|--------------|--------------------
20260404-002   | devplan   | in_progress  | 2026-04-04 11:00
20260404-001   | split     | escaped(E2-1)| 2026-04-04 10:00
20260403-001   | devplan   | completed    | 2026-04-03 09:00
```

3. If no runs: display "No runs found for project <KEY>."

## \<run-id\> — Specific Run Detail

1. Call `mcp_tools_run_get(project_ref, run_id)`.
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

## resume \<run-id\> — Resume Interrupted Run

1. Call `mcp_tools_run_get(project_ref, run_id)`.
2. If run not found: display "Run <run-id> not found."
3. Analyze current state and determine next action:

| Current State | Guidance |
|---------------|----------|
| validate.status == "pending" | "Run /imbas:imbas-validate <source> --run <run-id>" |
| validate.status == "in_progress" | "Validate was interrupted. Re-run /imbas:imbas-validate <source>" |
| validate.status == "completed", result == "BLOCKED" | "Validation blocked. Fix source document, then re-validate." |
| validate.status == "completed", result in [PASS, PASS_WITH_WARNINGS] && split.status == "pending" | "Run /imbas:imbas-split --run <run-id>" |
| split.status == "in_progress" | "Split was interrupted. Re-run /imbas:imbas-split --run <run-id>" |
| split.status == "escaped", code in [E2-1, E2-2, EC-1, EC-2] | "Split escaped (<code>). Human intervention required. See escape report." |
| split.status == "escaped", code == "E2-3" | "Split unnecessary. Run /imbas:imbas-devplan --run <run-id>" |
| split.status == "completed", pending_review == true | "Split needs review. Run /imbas:imbas-split --run <run-id> to review." |
| split.status == "completed", pending_review == false && stories pending | "Run /imbas:imbas-manifest stories --run <run-id>" |
| split.status == "completed" && all stories created && devplan.status == "pending" | "Run /imbas:imbas-devplan --run <run-id>" |
| devplan.status == "in_progress" | "Devplan was interrupted. Re-run /imbas:imbas-devplan --run <run-id>" |
| devplan.status == "completed", pending_review == true | "Devplan needs review. Run /imbas:imbas-devplan --run <run-id> to review." |
| devplan.status == "completed", pending_review == false | "Run /imbas:imbas-manifest devplan --run <run-id>" |

4. Display the guidance message with the exact command to run.
