---
name: codex
user-invocable: true
description: 'Delegate a prompt to OpenAI Codex CLI off-thread via a background courier. Use for heavy code generation/refactoring, sandboxed shell work, or a second opinion from another model family — "ask codex" / "코덱스에게".'
argument-hint: '[--continue <session_id>] [--tier apex|high|mid|low] [--no-refine] -- "prompt"'
---

# codex

Do not delegate trivial reasoning or material exceeding Codex's context window.

## Input and tier

Accept only these flags; configure permissions in `/cennad:setup`. Forward the prompt verbatim.

- `--continue`: use its ID. For an unambiguous follow-up without one, reuse the latest codex `session_id`; ask once if ambiguous, never silently start fresh.
- `--no-refine`: set `refine: false`; otherwise `true`.
- `--tier`: user value wins. For a new session without one: `low` for retrieval/formatting; `mid` for a bounded clear task; `high` by default for several files, constraints, or judgment.
- `apex` — only if `high` is insufficient for tens-of-minutes autonomous work or exceptional repository-scale difficulty.

Send nothing on `--continue` unless the user asked; omission preserves the session's tier and model.

## Dispatch

<!-- ogham-async-agent:spawn cennad:courier -->

Spawn `cennad:courier` in background by `description`, never `name`; do not poll/wait — the completion notification re-invokes you. Send:
<!-- ogham-async-agent:end -->

```
operation: <start | continue>
provider: codex             # start only
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

Ending the courier does not stop Codex. On stop/cancel/abandon, call `mcp__plugin_cennad_tools__stop_conversation`: use known `session_id`, else `provider: codex`; omit both only for stop-all. Never stop wanted work. Report `count: 0` once as normal.
