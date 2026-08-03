# Partial-failure handling

Load this when any participant's envelope is failed or unusable. Count **usable viewpoints** = envelopes with `status: 'success'` AND a non-empty `response`. Everything else is a **failed entry**: `status: 'failure'` envelopes, and successes whose `response` is empty.

## Remedies

An envelope carries `error.code` and `error.message` but no remedy — derive it here:

| `error.code`                        | Remedy                                                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`                              | codex: `codex login` · antigravity: run `agy` once and finish the Google OAuth flow · claude: run `claude` once and finish the login. Then retry.    |
| `disabled`                          | Enable the provider in `/cennad:setup`, then retry.                                                                                                  |
| `rate_limit` / `budget_exhausted`   | Pause and retry, or use another provider's skill.                                                                                                    |
| `timeout`                           | A limit fired while the provider was still running; `error.message` names which one. Suggest a higher tier or a narrower task — never a plain retry. |
| `cancelled`                         | The run was stopped on purpose and its work is gone. Re-run the delegation if it is still wanted.                                                    |
| `network` / `cli_error` / `unknown` | Relay `error.message` verbatim.                                                                                                                      |

A success with an empty `response` carries no `error.code`; its remedy is "the provider returned an empty response — retry, or continue the session".

## Synthesis policy

- **2+ usable viewpoints** → synthesize normally AND note each failed entry's `error.code` + remedy.
- **Exactly 1 usable viewpoint** → mobilize the host LLM as the second viewpoint: draft your own independent answer to the SAME prompt (commit to it before consulting the surviving response again — it has already been seen once, so this only limits anchoring), then synthesize host vs the survivor with the standard format, noting each failed entry. Do NOT abort.
- **0 usable viewpoints** → skip synthesis; surface every entry's `error.code` + remedy. If the participant gate had already mobilized a host draft (exactly-one-enabled path), present it clearly labeled as the host's own unverified answer — it is not a cross-check.

## Template

One `## <Provider> response` block per usable viewpoint, then one `## <Provider> error` block per failed entry:

```
## <Provider> response
<answer body>

## <Provider> error
`<error code>`

> <remedy>
```
