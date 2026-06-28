---
name: antigravity
description: '[cennad] Delegate to Google Antigravity CLI (agy) via cennad. Use for live web-grounded research, very-large-context synthesis, or multi-family model serving (Gemini/Claude/GPT-OSS). Trigger: "ask antigravity", "antigravity 호출", "안티그래비티에게"'
user_invocable: true
argument-hint: '[--continue <session_id>] [--tier high|mid|low] -- "prompt"'
---

# antigravity

Delegate to the Antigravity CLI (`agy`) through the cennad MCP server.

## When to use

- Research requiring live web search or grounding outside Claude's knowledge cutoff.
- Large-context synthesis across many large documents at once.
- Work that benefits from a specific model family (Gemini, Claude, GPT-OSS) that agy can serve.

## When NOT to use

- Reasoning about local code or short text — no need to leave Claude.
- Trivially answerable without web grounding.

## Arguments

Parse the invocation. Recognize:

- `--continue <session_id>` — resume an existing cennad session.
- `--tier high|mid|low` — optional; omit to use the provider's configured default tier (set via `/setup`). If given: `mid` for normal work, `low` for clearly simple tasks, `high` only with a specific reason to expect `mid` is insufficient (`high` is far more rate-limit/budget-prone).
- `-- "prompt"` — everything after `--` is the prompt (required).

Permission flags (`sandbox`, `skip_permissions`) and the per-tier model mapping are managed via `/setup` (settings UI) — they are not skill arguments. Antigravity has no sandbox-backend option; its `--sandbox` restricts terminal commands only.

## Call mapping

- With `--continue <session_id>` → `mcp_tools_continue_conversation({ session_id, prompt, tier? })`. Pass `tier` when supplied; otherwise omit it to use the provider's currently configured default.
- Otherwise → `mcp_tools_start_conversation({ provider: 'antigravity', prompt, tier? })`. `tier` is optional — omit to use the configured default; if given, `high` only with a specific reason to expect `mid` is insufficient (`high` is far more rate-limit/budget-prone).

## Response handling

Always surface the response's `session_id` to the user — it is needed to continue later. Wrap `session_id` in backticks (`` ` ``) so it renders as a copyable inline code span.

On `status: 'failure'`, dispatch by `error.code`:

- `auth` → tell the user to sign in to Antigravity: run `agy` once interactively and complete the Google OAuth flow (agy has no API-key auth), then retry.
- `disabled` → antigravity is disabled in cennad config. Tell the user to enable it via `/cennad:setup`. Do not retry.
- `rate_limit` / `budget_exhausted` → model availability depends on the subscription tier; suggest retrying after a pause, a different tier, or switching to the `codex` skill.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim.

## Tier

| tier   | resolves to                                                         |
| ------ | ------------------------------------------------------------------- |
| `high` | the model mapped to this tier in `/setup` (per-tier model dropdown) |
| `mid`  | the model mapped to this tier in `/setup`                           |
| `low`  | the model mapped to this tier in `/setup`                           |

Antigravity serves multiple model families (e.g. Gemini 3.5 Flash / 3.1 Pro,
Claude Sonnet 4.5 / Opus 4.6, GPT-OSS 120B), subject to your subscription. The
concrete model each tier maps to is configured in `/setup` from the live
`agy models` list and stored in cennad config (`model_map.antigravity`). To see
what is currently available, open the settings UI via `/setup` or run `agy
models` directly.
