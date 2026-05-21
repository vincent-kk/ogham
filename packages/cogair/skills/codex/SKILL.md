---
name: codex
description: '[cogair] Delegate to OpenAI Codex CLI via cogair. Use for heavy code generation/refactoring, sandboxed shell work, or independent second opinions from a different model family. Trigger: "ask codex", "codex 호출", "코덱스에게"'
user_invocable: true
argument-hint: '[--continue <session_id>] [--model high|mid|low|auto] [--option key=value]... -- "prompt"'
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
- `--option key=value` — repeatable. Accumulate into an `options` object.
- `-- "prompt"` — everything after `--` is the prompt (required).

For each `--option key=value`, infer the value type:

- `true` / `false` → boolean.
- Integer or float literal → number.
- Valid JSON object/array string → parsed JSON.
- Otherwise → raw string.

## Call mapping

- With `--continue <session_id>` → `mcp_tools_continue_conversation({ session_id, prompt })`. Drop `model` and `options`; the resumed session keeps its original configuration.
- Otherwise → `mcp_tools_start_conversation({ provider: 'codex', prompt, model?, options? })`. Omit `model` when alias is `auto` or unspecified. Omit `options` when no `--option` flags were given.

## Response handling

Always surface the response's `session_id` and `meta.ignored_options` to the user — the user needs the session id to continue later, and ignored options signal that some `--option` flags fell outside the v1 whitelist.

On `status: 'failure'`, dispatch by `error.code`:

- `auth` → tell the user to run `codex login` and retry.
- `rate_limit` / `budget_exhausted` → suggest retrying after a pause, or switching to the `gemini` skill.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim to the user.

## Model alias

| alias  | tier                                                                |
| ------ | ------------------------------------------------------------------- |
| `high` | most capable codex model (env override: `COGAIR_CODEX_HIGH`)        |
| `mid`  | balanced codex model (env override: `COGAIR_CODEX_MID`)             |
| `low`  | fastest / cheapest codex model (env override: `COGAIR_CODEX_LOW`)   |
| `auto` | codex-cli default (omit `-m`)                                       |

The concrete model IDs each tier resolves to live in the dispatcher
(`src/dispatcher/codex/modelAlias.ts`) so they can track upstream renames
without touching this skill.
