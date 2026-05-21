---
name: gemini
description: '[cogair] Delegate to Google Gemini CLI via cogair. Use for live web-grounded research, very-large-context synthesis, or knowledge past Claude''s cutoff. Trigger: "ask gemini", "gemini 호출", "제미니에게"'
user_invocable: true
argument-hint: '[--continue <session_id>] [--model high|mid|low|auto] [--option key=value]... -- "prompt"'
---

# gemini

Delegate to Gemini CLI through the cogair MCP server.

## When to use

- Research requiring live web search or grounding outside Claude's knowledge cutoff.
- 1M+ token context synthesis across many large documents at once.
- YouTube or URL ingestion as part of the prompt.

## When NOT to use

- Reasoning about local code or short text — no need to leave Claude.
- Trivially answerable without web grounding.

## Arguments

Parse the invocation. Recognize:

- `--continue <session_id>` — resume an existing cogair session.
- `--model high|mid|low|auto` — model alias (defaults to config `default_model`).
- `--option key=value` — repeatable. Accumulate into an `options` object.
- `-- "prompt"` — everything after `--` is the prompt (required).

For each `--option key=value`, infer the value type:

- `true` / `false` → boolean.
- Integer or float literal → number.
- Valid JSON object/array string → parsed JSON.
- Otherwise → raw string.

## Call mapping

- With `--continue <session_id>` → `mcp_tools_continue_conversation({ session_id, prompt })`. Drop `model` and `options`; the resumed session keeps its original configuration.
- Otherwise → `mcp_tools_start_conversation({ provider: 'gemini', prompt, model?, options? })`. Omit `model` when alias is `auto` or unspecified. Omit `options` when no `--option` flags were given.

## Response handling

Always surface the response's `session_id` and `meta.ignored_options` to the user — the session id is needed to continue later, and ignored options signal that some `--option` flags fell outside the v1 whitelist.

On `status: 'failure'`, dispatch by `error.code`:

- `auth` → tell the user to run `gemini auth login` and retry.
- `rate_limit` / `budget_exhausted` → suggest retrying after a pause, or switching to the `codex` skill.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim to the user.

## Model alias

| alias  | tier                                                                 |
| ------ | -------------------------------------------------------------------- |
| `high` | most capable gemini model (env override: `COGAIR_GEMINI_HIGH`)       |
| `mid`  | balanced gemini model (env override: `COGAIR_GEMINI_MID`)            |
| `low`  | fastest / cheapest gemini model (env override: `COGAIR_GEMINI_LOW`)  |
| `auto` | gemini-cli default (omit `-m`)                                       |

The concrete model IDs each tier resolves to live in the dispatcher
(`src/dispatcher/gemini/modelAlias.ts`) so they can track upstream renames
without touching this skill.
