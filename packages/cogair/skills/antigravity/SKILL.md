---
name: antigravity
description: '[cogair] Delegate to Google Antigravity CLI (agy) via cogair. Use for live web-grounded research, very-large-context synthesis, or multi-family model serving (Gemini/Claude/GPT-OSS). Trigger: "ask antigravity", "antigravity 호출", "안티그래비티에게"'
user_invocable: true
argument-hint: '[--continue <session_id>] [--model high|mid|low|auto] -- "prompt"'
---

# antigravity

Delegate to the Antigravity CLI (`agy`) through the cogair MCP server.

## When to use

- Research requiring live web search or grounding outside Claude's knowledge cutoff.
- Large-context synthesis across many large documents at once.
- Work that benefits from a specific model family (Gemini, Claude, GPT-OSS) that agy can serve.

## When NOT to use

- Reasoning about local code or short text — no need to leave Claude.
- Trivially answerable without web grounding.

## Arguments

Parse the invocation. Recognize:

- `--continue <session_id>` — resume an existing cogair session.
- `--model high|mid|low|auto` — model alias (defaults to config `default_model`).
- `-- "prompt"` — everything after `--` is the prompt (required).

Permission flags (`sandbox`, `skip_permissions`) and the per-tier model mapping are managed via `/setup` (settings UI) — they are not skill arguments. Antigravity has no sandbox-backend option; its `--sandbox` restricts terminal commands only.

## Call mapping

- With `--continue <session_id>` → `mcp_tools_continue_conversation({ session_id, prompt })`. Drop `model`; the resumed session keeps its original configuration.
- Otherwise → `mcp_tools_start_conversation({ provider: 'antigravity', prompt, model? })`. Omit `model` when alias is `auto` or unspecified.

> antigravity and gemini are mutually exclusive Google engines in cogair config (the Gemini CLI service ends 2026-06-18). If antigravity is not the enabled engine, `start_conversation` returns `error.code: 'disabled'`.

## Response handling

Always surface the response's `session_id` to the user — it is needed to continue later. Wrap `session_id` in backticks (`` ` ``) so it renders as a copyable inline code span.

On `status: 'failure'`, dispatch by `error.code`:

- `auth` → tell the user to sign in to Antigravity: run `agy` once interactively and complete the Google OAuth flow (agy has no API-key auth), then retry.
- `disabled` → antigravity is not the enabled Google engine. Tell the user to switch the Google engine to antigravity and enable it via `/cogair:setup`. Do not retry.
- `rate_limit` / `budget_exhausted` → model availability depends on the subscription tier; suggest retrying after a pause, a different tier, or switching to the `codex` skill.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim. A `cli_error` mentioning empty stdout is Antigravity CLI Issue #76 (agy dropped its output in a non-TTY context).

## Model alias

| alias  | tier                                                                            |
| ------ | ------------------------------------------------------------------------------- |
| `high` | the model mapped to this tier in `/setup` (per-tier model dropdown)             |
| `mid`  | the model mapped to this tier in `/setup`                                       |
| `low`  | the model mapped to this tier in `/setup`                                       |
| `auto` | agy default (omit `-m`) — Claude may pick a model via `list_antigravity_models` |

Antigravity serves multiple model families (e.g. Gemini 3.5 Flash / 3.1 Pro,
Claude Sonnet 4.5 / Opus 4.6, GPT-OSS 120B), subject to your subscription. The
concrete model each tier maps to is configured in `/setup` from the live
`agy models` list and stored in cogair config (`model_map.antigravity`). Call
the `list_antigravity_models` MCP tool to see what is currently available.
