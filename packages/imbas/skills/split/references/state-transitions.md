# State Transitions

```
Entry state:
  validate.status = "completed", validate.result in ["PASS", "PASS_WITH_WARNINGS"]
  split.status = "pending"

During execution:
  start_phase("split") → split.status = "in_progress"

Exit states:
  complete_phase("split", pending_review=false):
    → split.status = "completed", split.pending_review = false
    → devplan phase entry ALLOWED

  complete_phase("split", pending_review=true):
    → split.status = "completed", split.pending_review = true
    → devplan phase entry DENIED until review approved

  escape_phase("split", escape_code="E2-1"):
    → split.status = "escaped" — needs human elaboration
    → devplan phase entry DENIED

  escape_phase("split", escape_code="E2-2"):
    → split.status = "escaped" — needs human decision on conflicts
    → devplan phase entry DENIED

  escape_phase("split", escape_code="E2-3"):
    → split.status = "escaped" — split unnecessary, already appropriate size
    → devplan phase entry ALLOWED

  escape_phase("split", escape_code="EC-1"):
    → split.status = "escaped" — uninterpretable, scope frozen
    → devplan phase entry DENIED

  escape_phase("split", escape_code="EC-2"):
    → split.status = "escaped" — source defect, re-validate recommended
    → devplan phase entry DENIED
```

# Output

`stories-manifest.json` saved in the run directory at:
`.imbas/<KEY>/runs/<run-id>/stories-manifest.json`

Schema defined in `agents/imbas-planner.md` (stories-manifest.json output section).
