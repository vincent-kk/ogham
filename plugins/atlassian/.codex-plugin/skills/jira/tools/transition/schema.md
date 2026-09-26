# transition

Status is changed only through transitions; `fields.status` is read-only.

| Operation      | Method | Endpoint                   | Notes                                                                                       |
| -------------- | ------ | -------------------------- | ------------------------------------------------------------------------------------------- |
| List available | GET    | `/issue/{key}/transitions` | `expand: ["transitions.fields"]` shows fields a transition requires (e.g. `resolution`)     |
| Perform        | POST   | `/issue/{key}/transitions` | `{ transition: { id }, fields?, update? }` — `id` from the list; add required fields inline |

If the requested target status is not in the list, report the available ones instead of guessing an id.
