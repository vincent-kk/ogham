---
name: claude
user-invocable: true
description: 'Delegate a prompt to a fresh, isolated Claude Code CLI inheriting none of this session''s context or customizations. Use for independent reasoning, writing, analysis, or review, or on "ask claude" / "클로드에게".'
argument-hint: '[--continue <session_id>] [--tier apex|high|mid|low] [--no-refine] -- "prompt"'
---

# claude

The child inherits no session context or customizations, but retains Claude Code's built-in tools in the spawned working directory, bounded by the configured permission mode.

## Input and tier

Accept only these flags; permissions come from `/cennad:setup`. Forward the prompt verbatim.

- `--continue`: use its ID. For an unambiguous follow-up without one, reuse the latest claude `session_id`; ask once if ambiguous, never silently start fresh.
- `--no-refine`: set `refine: false`; otherwise `true`.
- `--tier`: user wins. New session: `low` for retrieval/formatting; `mid` for a clear bounded task; `high` for multiple files, constraints, or judgment.
- `apex` — only if `high` is insufficient for exceptional repository-scale or tens-of-minutes work.

Send nothing on `--continue` unless the user asked; omission preserves the session's tier and model.

## Dispatch

<!-- ogham-async-agent:spawn cennad:courier -->

Spawn `cennad:courier` in background by `description`, never `name`. Do not poll; the completion notification re-invokes you. Send:
<!-- ogham-async-agent:end -->

```
operation: <start | continue>
provider: claude            # start only
session_id: <id>            # continue only
tier: <tier>                # omit on continue unless explicit
refine: <true | false>
prompt:
<the prompt, verbatim>
```

If spawn is unavailable, make one direct cennad MCP call and relay its unrefined envelope.

## Deliver

<!-- ogham-async-agent:join cennad:courier -->

Never respawn. No courier report means `status: failure`, `error: cli_error`.
<!-- ogham-async-agent:end -->

Relay the report: everything after its FIRST standalone `---`, `session_id` in backticks, any `note`, `artifact_path`, or failure `remedy`. Do not rewrite or act unless asked. Then stop.

## Stop

Ending the courier does not stop `claude`. On stop/cancel/abandon, call `mcp__plugin_cennad_tools__stop_conversation` with known `session_id`, else `provider: claude`; omit both only for stop-all. Never stop wanted work. Report `count: 0` once.
