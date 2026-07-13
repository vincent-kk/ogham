---
name: claude
description: '[cennad] Delegate to the Anthropic Claude Code CLI via cennad. Use for a fresh Claude instance to handle reasoning, writing, analysis, or review without inheriting this session''s context or customizations. Trigger: "ask claude", "claude 호출", "클로드에게"'
user_invocable: true
argument-hint: '[--continue <session_id>] [--tier high|mid|low] [--no-refine] -- "prompt"'
---

# claude

Delegate to the Anthropic Claude Code CLI (`claude`) through the cennad MCP
server. The child is isolated from session customizations:
`--strict-mcp-config` and `--safe-mode` are always applied, so it never inherits
this session's MCP servers, hooks, CLAUDE.md, or skills.

## When to use

- A clean, independent second opinion from a fresh Claude instance without this
  session's conversation context or MCP tools.
- Reasoning, writing, analysis, or review where isolation from the current
  session's state is desirable.
- Running a separate model/effort tier than the current session.

## When NOT to use

- Work the current session can already do directly with its own context — there
  is no benefit to a context-free child.
- Tasks needing this session's conversation context or MCP tools; the child does
  not inherit them. It can still use Claude Code's built-in tools in the spawned
  working directory according to the configured permission mode.

## Arguments

Parse the invocation. Recognize:

- `--continue <session_id>` — resume an existing cennad session.
- `--tier high|mid|low` — optional. For a new session, omitting it uses the provider's configured default tier (set via `/setup`); with `--continue`, omitting it keeps the tier — and therefore the model — the session started with. If given: `mid` for normal work, `low` for clearly simple tasks, `high` only with a specific reason to expect `mid` is insufficient.
- `--no-refine` — optional; disable the refinement loop below and return the first response as-is (a single dispatch).
- `-- "prompt"` — everything after `--` is the prompt (required).

Permission mode and the per-tier model + effort mapping are managed via `/setup`
(settings UI) — they are not skill arguments.

## Call mapping

- With `--continue <session_id>` → `mcp__plugin_cennad_tools__continue_conversation({ session_id, prompt, tier? })`. Pass `tier` only when the user supplied one; otherwise omit it so the session resumes on the model it started with.
- Otherwise → `mcp__plugin_cennad_tools__start_conversation({ provider: 'claude', prompt, tier? })`. `tier` is optional — omit to use the configured default.

## Response handling

Treat the first response as the opening of a conversation, not necessarily its end:
evaluate it, refine when it falls short, then surface the FINAL answer and its
`session_id`. Wrap `session_id` in backticks (`` ` ``) so it renders as a copyable
inline code span — it is needed to continue later.

### Refinement loop

When the first response does not fully satisfy the request, judge and improve it
over the same session per **[../\_shared/refinement-loop.md](../_shared/refinement-loop.md)**
(derive a checklist, continue only for a nameable gap via `continue_conversation`,
cap at 3 provider calls, otherwise stop or surface to the user). Skip the loop
entirely for `--no-refine` or a trivially complete answer — return the single
dispatch as-is.

### Failure dispatch

On `status: 'failure'`, dispatch by `error.code`:

- `auth` → tell the user to sign in to Claude Code: run `claude` once interactively and complete the login (subscription or API key), then retry.
- `disabled` → claude is disabled in cennad config. Tell the user to enable it via `/cennad:setup`. Do not retry.
- `rate_limit` / `budget_exhausted` → suggest retrying after a pause, a lower tier, or switching to the `codex` or `antigravity` skill.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim to the user.

## Tier

| tier   | resolves to                                        |
| ------ | -------------------------------------------------- |
| `high` | the model + effort mapped to this tier in `/setup` |
| `mid`  | the model + effort mapped to this tier in `/setup` |
| `low`  | the model + effort mapped to this tier in `/setup` |

Each tier maps to a `{model, effort}` pair configured in `/setup` (per-tier model
and effort dropdowns) and stored in cennad config (`model_map.claude`). Effort
options adapt to the chosen model; a model without effort support sends no effort.
Env overrides `CENNAD_CLAUDE_<TIER>_MODEL` / `CENNAD_CLAUDE_<TIER>_EFFORT` take
precedence when set.
