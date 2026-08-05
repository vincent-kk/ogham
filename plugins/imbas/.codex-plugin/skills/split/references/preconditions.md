# Preconditions

From state.json:

- `refine.status == "completed"`
- `refine.result` in `["PASS", "PASS_WITH_WARNINGS"]`
- `estimate.status` in `["completed", "skipped"]`

If refine is not met → error: "Phase 1 (refine) must complete with PASS before splitting. Run /imbas:refine first."

## Estimate-skip flow

If refine passed but `estimate.status == "pending"`, ask the user:

> "Man-day estimation has not run for this document. Skip it and split now, or run /imbas:estimate first?"

- **Skip** → call `mcp__plugin_imbas_tools__run_transition` with `action: "skip_phases"`, `phases: ["estimate"]` (sets `estimate.status = "skipped"`), then continue.
- **Estimate first** → stop with guidance: "Run /imbas:estimate, then re-run /imbas:split."

If `estimate.status == "in_progress"`, an estimation is underway — stop with: "Finish or skip the estimate phase before splitting."
