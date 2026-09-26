# metrics

No dedicated API — derive from the changelog: `GET /issue/{key}` with `expand: ["changelog"]` (inline, ≤100 histories) or `GET /issue/{key}/changelog` (paginated).

| Metric          | Computation                                                                |
| --------------- | -------------------------------------------------------------------------- |
| Cycle time      | First `status` change into an in-progress category → last change into Done |
| Lead time       | `fields.created` → last change into Done                                   |
| Status duration | Sum of intervals between consecutive `status` items, per status            |

Status categories come from `fields.status.statusCategory.key` (`new`, `indeterminate`, `done`); use them rather than status names.
