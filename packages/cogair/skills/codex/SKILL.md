---
name: codex
description: '[cogair] Delegate to OpenAI Codex CLI via cogair. Use for heavy code generation/refactoring, sandboxed shell work, or independent second opinions from a different model family. Trigger: "ask codex", "codex 호출", "코덱스에게"'
user_invocable: true
argument-hint: '[--continue <session_id>] [--model high|mid|low|auto] -- "prompt"'
---

# codex

Delegate to Codex CLI through the cogair MCP server.

## When to use

- Heavy code generation, refactoring, or shell-driven automation that benefits from Codex's coding-specialized models.
- Work that needs an agent able to run shell commands under a sandbox policy.
- An independent second opinion from a different model family.

## When NOT to use

- Trivial reasoning the current Claude session can answer directly.
- Tasks whose context requirement exceeds Codex's window.

## Arguments

Parse the invocation. Recognize:

- `--continue <session_id>` — resume an existing cogair session.
- `--model high|mid|low|auto` — model alias (defaults to config `default_model`).
- `-- "prompt"` — everything after `--` is the prompt (required).

Permission flags (`yolo`, `sandbox`, `sandbox_backend`) and other dispatcher options are managed via `/setup` (settings UI) — they are not accepted as skill arguments.

## Call mapping

- With `--continue <session_id>` → `mcp_tools_continue_conversation({ session_id, prompt })`. Drop `model`; the resumed session keeps its original configuration.
- Otherwise → `mcp_tools_start_conversation({ provider: 'codex', prompt, model? })`. Omit `model` when alias is `auto` or unspecified.

## Response handling

Always surface the response's `session_id` to the user — the user needs it to continue later. Wrap `session_id` in backticks (`` ` ``) so it renders as a copyable inline code span.

On `status: 'failure'`, dispatch by `error.code`:

- `auth` → tell the user to run `codex login` and retry.
- `rate_limit` / `budget_exhausted` → suggest retrying after a pause, or switching to the `gemini` skill.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim to the user.

## Model alias

| alias  | resolves to                                                 |
| ------ | ----------------------------------------------------------- |
| `high` | codex-cli default unless `COGAIR_CODEX_HIGH` env var is set |
| `mid`  | codex-cli default unless `COGAIR_CODEX_MID` env var is set  |
| `low`  | codex-cli default unless `COGAIR_CODEX_LOW` env var is set  |
| `auto` | codex-cli default (omit `-m`)                               |

codex-cli does not expose stable user-facing model aliases the way
gemini-cli does — its ChatGPT-account mode whitelist accepts only concrete
`gpt-5.X` family IDs that change with each upstream release. To avoid
shipping a version-numbered ID that ages on the next release, every cogair
tier delegates to codex-cli's own default. Differentiate per tier by
exporting the env vars to whichever concrete model IDs the active codex
login can reach. The resolution lives in `src/dispatcher/codex/modelAlias.ts`.

When the relevant env var (`COGAIR_CODEX_HIGH` / `_MID` / `_LOW`) is unset, the `high` / `mid` / `low` tiers fall through to the codex-cli default — behaviorally identical to `auto`.
