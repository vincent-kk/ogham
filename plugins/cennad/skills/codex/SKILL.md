---
name: codex
description: '[cennad] Delegate to OpenAI Codex CLI via cennad. Use for heavy code generation/refactoring, sandboxed shell work, or independent second opinions from a different model family. Trigger: "ask codex", "codex 호출", "코덱스에게"'
user_invocable: true
argument-hint: '[--continue <session_id>] [--tier high|mid|low] -- "prompt"'
---

# codex

Delegate to Codex CLI through the cennad MCP server.

## When to use

- Heavy code generation, refactoring, or shell-driven automation that benefits from Codex's coding-specialized models.
- Work that needs an agent able to run shell commands under a sandbox policy.
- An independent second opinion from a different model family.

## When NOT to use

- Trivial reasoning the current Claude session can answer directly.
- Tasks whose context requirement exceeds Codex's window.

## Arguments

Parse the invocation. Recognize:

- `--continue <session_id>` — resume an existing cennad session.
- `--tier high|mid|low` — optional; omit to use the provider's configured default tier (set via `/setup`). If given: `mid` for normal work, `low` for clearly simple tasks, `high` only with a specific reason to expect `mid` is insufficient (`high` is far more rate-limit/budget-prone).
- `-- "prompt"` — everything after `--` is the prompt (required).

Permission flags (`yolo`, `sandbox`, `sandbox_backend`) and other dispatcher options are managed via `/setup` (settings UI) — they are not accepted as skill arguments.

## Call mapping

- With `--continue <session_id>` → `mcp_tools_continue_conversation({ session_id, prompt })`. Drop `tier`; the resumed session keeps its original configuration.
- Otherwise → `mcp_tools_start_conversation({ provider: 'codex', prompt, tier? })`. `tier` is optional — omit to use the configured default; if given, `high` only with a specific reason to expect `mid` is insufficient (`high` is far more rate-limit/budget-prone).

## Response handling

Always surface the response's `session_id` to the user — the user needs it to continue later. Wrap `session_id` in backticks (`` ` ``) so it renders as a copyable inline code span.

On `status: 'failure'`, dispatch by `error.code`:

- `auth` → tell the user to run `codex login` and retry.
- `disabled` → codex is disabled in cennad config. Tell the user to enable it via `/cennad:setup`. Do not retry.
- `rate_limit` / `budget_exhausted` → suggest retrying after a pause, or switching to the `antigravity` skill.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim to the user.

## Tier

| tier   | resolves to               |
| ------ | ------------------------- |
| `high` | reasoning effort `high`   |
| `mid`  | reasoning effort `medium` |
| `low`  | reasoning effort `low`    |

codex-cli runs a single coding model; the tier does not switch models.
Instead it selects the model's reasoning effort, injected as
`-c model_reasoning_effort=<value>` on the `codex exec` invocation:
`high` → `high`, `mid` → `medium`, `low` → `low`. The resolution lives in
`src/dispatcher/codex/operations/reasoningEffort.ts`.
