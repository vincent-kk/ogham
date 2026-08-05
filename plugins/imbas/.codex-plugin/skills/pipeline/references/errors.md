# Error Handling

| Error                                        | Action                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| No project key available                     | STOP at Phase 0: "No project key configured. Run /imbas:setup first or pass --project KEY."            |
| Source file not found / Confluence fetch     | STOP at Phase 1 with the refine skill's error message.                                                 |
| `analyst` agent fails                        | Treat as refine BLOCKED; STOP with note: "Agent error during refinement."                              |
| `estimator` agent fails                      | STOP at Phase 2; resume: "/imbas:estimate --run <run-id>" or re-run pipeline with --skip-estimate.     |
| Estimation manifest invalid (GATE 2)         | STOP with validation error list.                                                                       |
| Escape condition during split (except E2-3)  | STOP with escape report (GATE 3).                                                                      |
| Verification field failure (GATE 3)          | STOP with affected Story list; resume via "/imbas:split --run <run-id>" for interactive review.        |
| Provider creation failure (GATE 4)           | STOP with partial-failure report; "/imbas:split --run <run-id>" retries idempotently.                  |
| DRIFT detected during creation               | Default: auto-resolve (reset missing to pending) and note in the report; with --strict-drift: STOP.    |
| run_transition precondition failure          | Display the tool's message — indicates phase-order violation (e.g., estimate pending when split runs). |
