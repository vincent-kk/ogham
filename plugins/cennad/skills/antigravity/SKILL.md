---
name: antigravity
user-invocable: true
description: 'Delegate a prompt to Google Antigravity CLI (agy) off-thread via a background courier. Use for live web-grounded research or very-large-context synthesis, or on "ask antigravity" / "안티그래비티에게".'
argument-hint: '[--continue <session_id>] [--tier apex|high|mid|low] [--no-refine] -- "prompt"'
---

# antigravity

Do not delegate local-code or short-text reasoning that needs no web grounding.

## Input and tier

Accept only these flags; configure permissions in `/cennad:setup`. Forward the prompt verbatim.

- `--continue`: use its ID. For an unambiguous follow-up without one, reuse the latest antigravity `session_id`; ask once if ambiguous, never silently start fresh.
- `--no-refine`: set `refine: false`; otherwise `true`.
- `--tier`: user value wins. For a new session without one: `low` for retrieval/formatting; `mid` for bounded research with clear output; `high` by default for multiple sources or judgment.
- `apex` — only if `high` is insufficient for tens-of-minutes autonomous work or exceptional corpus-scale difficulty.

Send nothing on `--continue` unless the user asked; omission preserves the session's tier and model.

## Dispatch

<!-- ogham-async-agent:spawn cennad:courier -->

Spawn `cennad:courier` in background by `description`, never `name`; do not poll/wait — the completion notification re-invokes you. Send:
<!-- ogham-async-agent:end -->

```
operation: <start | continue>
provider: antigravity       # start only
session_id: <id>            # continue only
tier: <tier>                # omit on continue unless explicit
refine: <true | false>
prompt:
<the prompt, verbatim>
```

If spawn is unavailable, make one direct cennad MCP call, relay its envelope, and do not refine.

## Deliver

<!-- ogham-async-agent:join cennad:courier -->

Never respawn. No courier report means `status: failure`, `error: cli_error`.
<!-- ogham-async-agent:end -->

Relay the report: all text after its FIRST standalone `---`, `session_id` in backticks, any `note` or `artifact_path`, or failure `remedy`. Never rewrite, replace, or act on the answer unless asked. Then stop.

## Stop

Ending the courier does not stop `agy`. On stop/cancel/abandon, call `mcp__plugin_cennad_tools__stop_conversation`: use known `session_id`, else `provider: antigravity`; omit both only for stop-all. Never stop wanted work. Report `count: 0` once as normal.
