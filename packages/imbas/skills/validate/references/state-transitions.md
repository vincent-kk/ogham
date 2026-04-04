# imbas-validate — State Transitions & Output

## Output

`validation-report.md` saved in the run directory at:
`.imbas/<KEY>/runs/<run-id>/validation-report.md`

Report format is defined by the imbas-analyst agent (see `agents/imbas-analyst.md`).

## State Transitions

```
Entry state:
  validate.status = "pending"

During execution:
  start_phase("validate") → validate.status = "in_progress"

Exit states:
  complete_phase("validate", result="PASS")
    → validate.status = "completed", validate.result = "PASS"
    → split phase entry ALLOWED

  complete_phase("validate", result="PASS_WITH_WARNINGS")
    → validate.status = "completed", validate.result = "PASS_WITH_WARNINGS"
    → split phase entry ALLOWED (warnings displayed)

  complete_phase("validate", result="BLOCKED")
    → validate.status = "completed", validate.result = "BLOCKED"
    → split phase entry DENIED until re-validation passes
```
