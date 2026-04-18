# State Transitions

## Phase interaction

This skill is a **non-phase** operation. It does NOT modify `state.json.phases`.
It only reads manifests and writes new files into the run directory.

## Terminal markers

| Marker | Condition |
|---|---|
| `Implement plan generated: <path>` | Successful run (even with cycles_broken > 0 or unresolved > 0) |
| `Implement plan BLOCKED: <reason>` | Precondition failed (missing manifest, wrong state) — no file written |

## Preconditions vs Phase state

| Mode | Required phase state |
|---|---|
| `--source devplan` (default) | `phases.devplan.status === 'completed' && phases.devplan.pending_review === false` |
| `--source stories` | `phases.split.status === 'completed'` (degraded output) |

## File outputs

| File | Content |
|---|---|
| `implement-plan.json` | Machine-readable ImplementPlanManifest |
| `implement-plan-report.md` | Human-readable per-level group listing |
