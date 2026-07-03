# Failure handling

Load this when any `start_conversation` returns `status: 'failure'`, or when only
some providers succeed. The happy path (every dispatched provider succeeds) never
needs this file.

## Failure dispatch

For each provider independently, dispatch by `error.code`:

- `auth` → tell the user to authenticate that provider: `codex login` for
  codex, sign in to `agy` (Google OAuth) for antigravity, or run `claude`
  once interactively and complete the login for claude.
- `rate_limit` / `budget_exhausted` → suggest retrying after a pause or
  invoking a surviving provider via `/cennad:<provider>`.
- `disabled` → the provider was switched off in config. Drop it from the
  participant set (re-evaluate the activation gate), or tell the user to
  re-enable it via `/cennad:setup`.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim.

## Partial-failure synthesis

- If **two or more** providers succeed → synthesize the successful answers
  normally AND note each failed provider's `error.code` / `error.message`.
- If **exactly one** provider succeeds → mobilize the host LLM as the second
  viewpoint: draft your own independent answer to the SAME prompt, then
  synthesize host vs the surviving provider with the standard Synthesis
  format (attributing points to `host` vs the provider) AND note each failed
  provider's error. Do NOT abort.
- If **all** providers fail → surface every error and skip synthesis. Relay
  the per-code remedy (from Failure dispatch above) for each before retrying.

## Partial-failure template

One `## <Provider> response` block per surviving provider, then one
`## <Provider> error` block per failed provider:

```
## <Provider> response
<answer body>

## <Provider> error
`error.code`: error.message

> <one-line remedy from the failure dispatch above>
```
