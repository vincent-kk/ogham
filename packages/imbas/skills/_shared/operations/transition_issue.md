# [OP: transition_issue]

Transition an issue to a new workflow state.

## REST Endpoint

```
POST /rest/api/3/issue/{issueIdOrKey}/transitions
```

## Request Body

```json
{
  "transition": { "id": "31" }
}
```

The `id` must come from `[OP: get_transitions]`. Do not hardcode transition IDs.

## Used By

- `imbas-manifest` — Mark split-source Story as Done after horizontal split
