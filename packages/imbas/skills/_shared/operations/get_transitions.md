# [OP: get_transitions]

Get available workflow transitions for an issue.

## REST Endpoint

```
GET /rest/api/3/issue/{issueIdOrKey}/transitions
```

## Response Fields

- `transitions[]` — Array of available transitions
  - `id` — Transition ID (required for `[OP: transition_issue]`)
  - `name` — Transition name (e.g., "Done", "In Progress")
  - `to.name` — Target status name

## Notes

Not all transitions are always available — Jira workflow guards may restrict
which transitions can be performed from the current state. Always check this
operation before calling `[OP: transition_issue]`.

## Used By

- `imbas-manifest` — Check available transitions before status change
- `imbas-cache` — Cache workflow transitions
