# refine — State Transitions & Output

## Output

- `refined.md` — restructured planning document at `.imbas/<KEY>/runs/<run-id>/refined.md` (absent when BLOCKED)
- `validation-report.md` — findings report at `.imbas/<KEY>/runs/<run-id>/validation-report.md`

Report format is defined by the `analyst` agent (see `agents/analyst.md`).

## State Transitions

```
Entry state:
  refine.status = "pending"

During execution:
  start_phase("refine") → refine.status = "in_progress"

Exit states:
  complete_phase("refine", result="PASS")
    → refine.status = "completed", refine.result = "PASS"
    → estimate phase entry ALLOWED (split entry additionally requires
      estimate completed or skipped)

  complete_phase("refine", result="PASS_WITH_WARNINGS")
    → refine.status = "completed", refine.result = "PASS_WITH_WARNINGS"
    → estimate phase entry ALLOWED (warnings displayed)

  complete_phase("refine", result="BLOCKED")
    → refine.status = "completed", refine.result = "BLOCKED"
    → estimate/split phase entry DENIED until re-refinement passes
```
