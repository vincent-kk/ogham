# Error Handling

The transport has already retried 429 and 5xx before returning an envelope; treat it as final and do not retry those failures again.

## Errors

| Status    | Action                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 400       | Field/body validation — compare against the domain `schema.md`; for markdown bodies re-check the rendered output (see the skill) |
| 401       | Recover per [401 recovery](#401-recovery)                                                                                        |
| 403       | Missing permission or role (project role, space permission, JSM agent). Report; do not retry                                     |
| 404       | Wrong key/ID or deployment mismatch — check the selected service skill's routing and Cloud-only restrictions                     |
| 409       | Version conflict — follow the version recovery contract in [`Confluence`](../confluence/SKILL.md#call-contract)                  |
| 429 · 5xx | Already retried — report the failure with the message and any `Retry-After`                                                      |

## 401 recovery

On a response with `error.reauth_required: true`:

1. Ask, in the user's language: "Atlassian authentication is required. Run setup now?"
2. Yes → invoke `/atlassian:setup`, then retry the failed request once.
3. No → stop with a short note on how to run `/atlassian:setup` later.
