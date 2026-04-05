# State Transitions and Output

## Output

`devplan-manifest.json` saved in the run directory at:
`.imbas/<KEY>/runs/<run-id>/devplan-manifest.json`

Schema defined in `agents/imbas-engineer.md` (devplan-manifest.json output section).

## State Transitions

```
Entry state:
  split.status = "completed", split.pending_review = false
  OR split.status = "escaped", split.escape_code = "E2-3"
  devplan.status = "pending"

During execution:
  start_phase("devplan") → devplan.status = "in_progress"

Exit states:
  complete_phase("devplan", pending_review=false):
    → devplan.status = "completed", devplan.pending_review = false
    → manifest execution ALLOWED

  complete_phase("devplan", pending_review=true):
    → devplan.status = "completed", devplan.pending_review = true
    → manifest execution DENIED until review approved

### Blocked Exit
  complete_phase("devplan", result="BLOCKED")
    → devplan.status = "completed", devplan.result = "BLOCKED"
    → Output: devplan-blocked-report.md (in run directory)
    → User guidance: "Phase 3 blocked. Review blocked report and resolve dependencies."
```
