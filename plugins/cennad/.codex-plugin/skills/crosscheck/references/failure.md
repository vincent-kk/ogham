# Partial-failure handling

The entrypoint loads this after any failed or unusable envelope. A **usable viewpoint** has `status: success` and a non-empty `response`; every other entry is failed.

## Remedies

Derive one remedy per failed entry:

| Condition                           | Remedy                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `auth`                              | Reauthenticate: codex `codex login`; antigravity or claude run that CLI and finish its login flow. Then retry. |
| `disabled`                          | Enable it in `/cennad:setup`, then retry.                                                                      |
| `rate_limit` / `budget_exhausted`   | Pause and retry, or use another provider skill.                                                                |
| `timeout`                           | Suggest a higher tier or narrower task; `error.message` names the limit. Never suggest a plain retry.          |
| `cancelled`                         | Work was deliberately discarded; re-run only if still wanted.                                                  |
| `network` / `cli_error` / `unknown` | Relay `error.message` verbatim.                                                                                |
| Empty success                       | “The provider returned an empty response — retry, or continue the session.”                                    |

## Synthesis policy

- **2+ usable viewpoints** — synthesize normally and note every failed entry's code (or empty response) and remedy.
- **Exactly 1 usable viewpoint** — before consulting that response again, commit the host's independent answer to the SAME prompt; synthesize both with the standard format and note failures. Do not abort.
- **0 usable viewpoints** — do not synthesize; surface every failure and remedy. If the participant gate already created a host answer, label it an unverified host answer, not a crosscheck.

Before any standard four-section synthesis, show usable and failed entries in this order:

```
## <Provider> response
<answer>

## <Provider> error
<error code or empty response>

> <remedy>
```
