---
name: claude
description: '[cennad] Delegate to the Anthropic Claude Code CLI via cennad. Use for an independent, isolated Claude instance to handle reasoning, writing, analysis, or review without inheriting this session''s context. Trigger: "ask claude", "claude 호출", "클로드에게"'
user_invocable: true
argument-hint: '[--continue <session_id>] [--tier high|mid|low] -- "prompt"'
---

# claude

Delegate to the Anthropic Claude Code CLI (`claude`) through the cennad MCP
server. The child runs isolated — `--strict-mcp-config` and `--safe-mode` are
always applied, so it never inherits this session's MCP servers, hooks,
CLAUDE.md, or skills.

## When to use

- A clean, independent second opinion from a fresh Claude instance with no shared
  context or tool access.
- Reasoning, writing, analysis, or review where isolation from the current
  session's state is desirable.
- Running a separate model/effort tier than the current session.

## When NOT to use

- Work the current session can already do directly with its own context — there
  is no benefit to a context-free child.
- Tasks needing this session's MCP tools or repo state; the child cannot see them.

## Arguments

Parse the invocation. Recognize:

- `--continue <session_id>` — resume an existing cennad session.
- `--tier high|mid|low` — optional; omit to use the provider's configured default tier (set via `/setup`). If given: `mid` for normal work, `low` for clearly simple tasks, `high` only with a specific reason to expect `mid` is insufficient.
- `-- "prompt"` — everything after `--` is the prompt (required).

Permission mode and the per-tier model + effort mapping are managed via `/setup`
(settings UI) — they are not skill arguments.

## Call mapping

- With `--continue <session_id>` → `mcp_tools_continue_conversation({ session_id, prompt })`. Drop `tier`; the resumed session keeps its original configuration.
- Otherwise → `mcp_tools_start_conversation({ provider: 'claude', prompt, tier? })`. `tier` is optional — omit to use the configured default.

## Response handling

Always surface the response's `session_id` to the user — it is needed to continue
later. Wrap `session_id` in backticks (`` ` ``) so it renders as a copyable inline
code span.

On `status: 'failure'`, dispatch by `error.code`:

- `auth` → tell the user to sign in to Claude Code: run `claude` once interactively and complete the login (subscription or API key), then retry.
- `disabled` → claude is disabled in cennad config. Tell the user to enable it via `/cennad:setup`. Do not retry.
- `rate_limit` / `budget_exhausted` → suggest retrying after a pause, a lower tier, or switching to the `codex` or `antigravity` skill.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim to the user.

## Tier

| tier   | resolves to                                              |
| ------ | ------------------------------------------------------- |
| `high` | the model + effort mapped to this tier in `/setup`      |
| `mid`  | the model + effort mapped to this tier in `/setup`      |
| `low`  | the model + effort mapped to this tier in `/setup`      |

Each tier maps to a `{model, effort}` pair configured in `/setup` (per-tier model
and effort dropdowns) and stored in cennad config (`model_map.claude`). Effort
options adapt to the chosen model; a model without effort support sends no effort.
Env overrides `CENNAD_CLAUDE_<TIER>_MODEL` / `CENNAD_CLAUDE_<TIER>_EFFORT` take
precedence when set.
