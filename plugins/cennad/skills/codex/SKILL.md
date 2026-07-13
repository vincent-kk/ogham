---
name: codex
description: '[cennad] Delegate to OpenAI Codex CLI via cennad. Use for heavy code generation/refactoring, sandboxed shell work, or independent second opinions from a different model family. Trigger: "ask codex", "codex 호출", "코덱스에게"'
user_invocable: true
argument-hint: '[--continue <session_id>] [--tier high|mid|low] [--no-refine] -- "prompt"'
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
- `--tier high|mid|low` — optional. For a new session, omitting it uses the provider's configured default tier (set via `/setup`); with `--continue`, omitting it keeps the tier — and therefore the model — the session started with. If given: `mid` for normal work, `low` for clearly simple tasks, `high` only with a specific reason to expect `mid` is insufficient (`high` is far more rate-limit/budget-prone).
- `--no-refine` — optional; disable the refinement loop below and return the first response as-is (a single dispatch).
- `-- "prompt"` — everything after `--` is the prompt (required).

Permission flags (`yolo`, `sandbox`, `sandbox_backend`) and other dispatcher options are managed via `/setup` (settings UI) — they are not accepted as skill arguments.

## Call mapping

- With `--continue <session_id>` → `mcp__plugin_cennad_tools__continue_conversation({ session_id, prompt, tier? })`. Pass `tier` only when the user supplied one; otherwise omit it so the session resumes on the model it started with (passing a different tier switches the model mid-thread, which codex warns about).
- Otherwise → `mcp__plugin_cennad_tools__start_conversation({ provider: 'codex', prompt, tier? })`. `tier` is optional — omit to use the configured default; if given, `high` only with a specific reason to expect `mid` is insufficient (`high` is far more rate-limit/budget-prone).

## Response handling

Treat the first response as the opening of a conversation, not necessarily its end: evaluate it, refine when it falls short, then surface the FINAL answer and its `session_id`. Wrap `session_id` in backticks (`` ` ``) so it renders as a copyable inline code span — the user needs it to continue later.

### Refinement loop

When the first response does not fully satisfy the request, judge and improve it
over the same session per **[../\_shared/refinement-loop.md](../_shared/refinement-loop.md)**
(derive a checklist, continue only for a nameable gap via `continue_conversation`,
cap at 3 provider calls, otherwise stop or surface to the user). Skip the loop
entirely for `--no-refine` or a trivially complete answer — return the single
dispatch as-is.

### Failure dispatch

On `status: 'failure'`, dispatch by `error.code`:

- `auth` → tell the user to run `codex login` and retry.
- `disabled` → codex is disabled in cennad config. Tell the user to enable it via `/cennad:setup`. Do not retry.
- `rate_limit` / `budget_exhausted` → suggest retrying after a pause, or switching to the `antigravity` skill.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim to the user.

## Tier

Each tier resolves to a `{model, effort}` pair from the user's cennad config
(`model_map.codex`), injected as `-m <model> -c model_reasoning_effort=<effort>`.
Both model and effort are user-configurable in `/cennad:setup`, so treat the
table below as the shipped default rather than a fixed mapping:

| tier   | default model   | default effort | role                       |
| ------ | --------------- | -------------- | -------------------------- |
| `high` | `gpt-5.6-sol`   | `max`          | frontier                   |
| `mid`  | `gpt-5.6-terra` | `high`         | balanced everyday work     |
| `low`  | `gpt-5.6-terra` | `medium`       | same model, cheaper effort |

The effort scale is `low < medium < high < xhigh < max < ultra`, and which
levels a model accepts differs per model. Do not try to set a model or effort
from this skill — cennad resolves both from config, and an effort the model
does not support fails the call outright.
