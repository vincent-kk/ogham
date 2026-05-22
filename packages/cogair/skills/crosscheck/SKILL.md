---
name: crosscheck
description: '[cogair] Cross-validate a prompt by dispatching to codex AND gemini in parallel, then synthesize the two answers. Trigger: "crosscheck", "cross check", "교차검증", "양쪽에 물어봐"'
user_invocable: true
argument-hint: '[--model high|mid|low|auto] [--option key=value]... -- "prompt"'
---

# crosscheck

Cross-validate a prompt through both Codex and Gemini in parallel via the
cogair MCP server, then synthesize the two `ConversationResponse` envelopes
into one consolidated answer.

## When to use

- Independent second opinion across two model families on the same question.
- Architectural / design decisions where disagreement is informative.
- Spec or PR review when both code-leaning (codex) and research/UX-leaning
  (gemini) perspectives matter.

## When NOT to use

- Trivial tasks the current Claude session can answer directly.
- Tasks that only one provider's strength fits — use `/cogair:codex` or
  `/cogair:gemini` directly.
- Multi-turn conversations — crosscheck is single-shot. Use
  `/cogair:codex --continue` or `/cogair:gemini --continue` for follow-ups
  on either side.
- Prompts containing secrets the user does not want shared with both
  vendors — the same prompt is forwarded to BOTH codex (OpenAI) and
  gemini (Google).

## Arguments

Parse the invocation. Recognize:

- `--model high|mid|low|auto` — applied to BOTH providers (defaults to
  config `default_model`).
- `--option key=value` — repeatable. Same `options` object passed to both
  providers.
- `-- "prompt"` — everything after `--` is the prompt (required).

For each `--option key=value`, infer the value type:

- `true` / `false` → boolean.
- Integer or float literal → number.
- Valid JSON object/array string → parsed JSON.
- Otherwise → raw string.

`--continue` is intentionally NOT supported (each crosscheck starts two
fresh sessions). If the invoker passes `--continue`, ignore the flag and
tell the user to resume via `/cogair:codex --continue <id>` or
`/cogair:gemini --continue <id>` for the desired side.

## Call mapping

Issue the two calls **in parallel** (single message, two tool uses):

- `mcp_tools_start_conversation({ provider: 'codex', prompt, model?, options? })`
- `mcp_tools_start_conversation({ provider: 'gemini', prompt, model?, options? })`

Omit `model` when alias is `auto` or unspecified. Omit `options` when no
`--option` flags were given.

## Response handling

Always surface BOTH `session_id` values (each in backticks) so the user
can `--continue` either side later. Surface `meta.ignored_options` for
each provider when non-empty.

### Failure dispatch

For each provider independently:

- `auth` → tell the user to run `codex login` / `gemini auth login`
  for the failing side.
- `rate_limit` / `budget_exhausted` → suggest retrying after a pause or
  invoking only the surviving provider via `/cogair:<provider>`.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim.

### Partial-failure synthesis

- If **one** provider fails → present the surviving provider's answer
  AND clearly note the failed provider's `error.code` / `error.message`.
  Do NOT abort. The user still gets value from the single response.
- If **both** providers fail → surface both errors. Skip synthesis.

## Synthesis format (success path)

When both responses succeed, render exactly four sections:

```
## Agreed
- <points both providers converge on>

## Conflicting
- <points where the providers disagree, with each side's stance>

## Final direction
<your recommendation + one-line rationale grounded in the two responses>

## Action checklist
- [ ] <concrete next step>
- [ ] ...
```

When `artifact_path` is present on either envelope (config opt-in),
include a `## Artifacts` section linking to both files so the user can
open the full responses.

## Model alias

Both providers receive the SAME alias. See `/cogair:codex` and
`/cogair:gemini` for the per-provider tier → model mapping (env override
via `COGAIR_<PROVIDER>_<TIER>`).
