---
name: gemini
description: '[cogair] Delegate to Google Gemini CLI via cogair. Use for live web-grounded research, very-large-context synthesis, or knowledge past Claude''s cutoff. Trigger: "ask gemini", "gemini 호출", "제미니에게"'
user_invocable: true
argument-hint: '[--continue <session_id>] [--model high|mid|low|auto] -- "prompt"'
---

# gemini

> ⚠ **Deprecation:** The Gemini CLI service ends **2026-06-18**. cogair is
> migrating to the Antigravity CLI (`agy`) — prefer `/cogair:antigravity` for
> new work. gemini and antigravity are mutually exclusive Google engines in
> cogair config; switch engines via `/cogair:setup`.

Delegate to Gemini CLI through the cogair MCP server.

## When to use

- Research requiring live web search or grounding outside Claude's knowledge cutoff.
- Large-context synthesis across many large documents at once.
- YouTube or URL ingestion as part of the prompt.

## When NOT to use

- Reasoning about local code or short text — no need to leave Claude.
- Trivially answerable without web grounding.

## Arguments

Parse the invocation. Recognize:

- `--continue <session_id>` — resume an existing cogair session.
- `--model high|mid|low|auto` — model alias (defaults to config `default_model`).
- `-- "prompt"` — everything after `--` is the prompt (required).

Permission flags (`yolo`, `sandbox`, `sandbox_backend`) and other dispatcher options are managed via `/setup` (settings UI) — they are not accepted as skill arguments.

## Call mapping

- With `--continue <session_id>` → `mcp_tools_continue_conversation({ session_id, prompt })`. Drop `model`; the resumed session keeps its original configuration.
- Otherwise → `mcp_tools_start_conversation({ provider: 'gemini', prompt, model? })`. Omit `model` when alias is `auto` or unspecified.

## Response handling

Always surface the response's `session_id` to the user — the session id is needed to continue later. Wrap `session_id` in backticks (`` ` ``) so it renders as a copyable inline code span.

On `status: 'failure'`, dispatch by `error.code`:

- `auth` → tell the user to run `gemini auth login` and retry.
- `disabled` → gemini is disabled in cogair config. Tell the user to enable it via `/cogair:setup`. Do not retry.
- `rate_limit` / `budget_exhausted` → suggest retrying after a pause, or switching to the `codex` skill.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim to the user.

## Model alias

| alias  | tier                                                                |
| ------ | ------------------------------------------------------------------- |
| `high` | most capable gemini model (env override: `COGAIR_GEMINI_HIGH`)      |
| `mid`  | balanced gemini model (env override: `COGAIR_GEMINI_MID`)           |
| `low`  | fastest / cheapest gemini model (env override: `COGAIR_GEMINI_LOW`) |
| `auto` | gemini-cli default (omit `-m`)                                      |

The concrete model IDs each tier resolves to live in the dispatcher
(`src/dispatcher/gemini/modelAlias.ts`) so they can track upstream renames
without touching this skill.
