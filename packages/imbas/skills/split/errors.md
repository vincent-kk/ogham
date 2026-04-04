# Error Handling

| Error | Action |
|-------|--------|
| Precondition not met (validate incomplete) | Display: "Phase 1 must complete first. Run /imbas:validate <source>." |
| PASS_WITH_WARNINGS and user declines | Display warnings and ask: "Proceed despite warnings, or re-validate?" |
| Epic key not found | Display: "Epic <KEY> not found. Check the key or choose 'Create new Epic'." |
| imbas-planner produces no Stories | Trigger escape E2-3 if document is already atomic; otherwise E2-1. |
| Manifest validation fails | Log errors, attempt auto-fix (ID dedup, link resolution), re-validate. |
| imbas_run_transition fails | Display precondition error from tool. |
