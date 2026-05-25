# Error Handling — Provider-agnostic

Provider-specific errors live in `jira/errors.md` and `local/errors.md`.

| Error | Action |
|-------|--------|
| Depth parameter invalid (not `shallow`/`full`) | Return error: "Invalid depth: expected `shallow` or `full`". |
| Output schema assembly failure | Log the assembly error and return a degraded result with whatever fields were successfully populated. |
