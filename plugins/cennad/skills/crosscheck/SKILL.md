---
name: crosscheck
description: '[cennad] Cross-validate a prompt by dispatching to codex AND the active Google engine (gemini or antigravity) in parallel, then synthesize the two answers. Trigger: "crosscheck", "cross check", "교차검증", "양쪽에 물어봐"'
user_invocable: true
argument-hint: '[--tier high|mid|low] -- "prompt"'
---

# crosscheck

Cross-validate a prompt through both Codex and the active Google engine
(gemini or antigravity) in parallel via the cennad MCP server, then synthesize
the two `ConversationResponse` envelopes into one consolidated answer.

## When to use

- Independent second opinion across two model families on the same question.
- Architectural / design decisions where disagreement is informative.
- Spec or PR review when both code-leaning (codex) and research/UX-leaning
  (gemini) perspectives matter.

## When NOT to use

- Prompts containing secrets the user does not want shared with both
  vendors — the same prompt is forwarded to BOTH codex (OpenAI) and
  gemini (Google).
- Trivial tasks the current Claude session can answer directly.
- Tasks that only one provider's strength fits — use `/cennad:codex` or
  the active Google engine skill (`/cennad:gemini` or `/cennad:antigravity`)
  directly.
- Multi-turn conversations — crosscheck is single-shot. Use
  `/cennad:codex --continue` or `/cennad:gemini --continue` for follow-ups
  on either side.

## Arguments

Parse the invocation. Recognize:

- `--tier high|mid|low` — required; applied to BOTH providers. Use `mid` for normal work, `low` for clearly simple tasks; pick `high` only with a specific reason to expect `mid` is insufficient (`high` is far more rate-limit/budget-prone).
- `-- "prompt"` — everything after `--` is the prompt (required).

Permission flags (`yolo`, `sandbox`, `sandbox_backend`) and other
dispatcher options are managed via `/setup` (settings UI) — they are not
accepted as skill arguments.

`--continue` is intentionally NOT supported (each crosscheck starts two
fresh sessions). If the invoker passes `--continue <id>`, **abort
immediately — do not issue any MCP calls**, and tell the user to resume
via `/cennad:codex --continue <id>` or `/cennad:gemini --continue <id>`
(echo back the id they provided) for the desired side.

## Provider activation gate

cennad dispatches only to **enabled** providers. Read the active set from
the SessionStart `[cennad] Static policy` block (the `Active providers:`
line). The Google engine is whichever of `gemini` / `antigravity` appears
there (they are mutually exclusive) — use that name as `<google>` below.
Branch on the active set BEFORE issuing any MCP call:

- **Both enabled** → standard two-provider crosscheck (Call mapping below).
- **Exactly one enabled** → dispatch the enabled provider via MCP, and fill
  the disabled provider's slot with an independent Claude stand-in: spawn a
  single subagent (Task tool, `general-purpose`) on the SAME prompt to
  produce a second, independent opinion. Synthesize the live provider's
  answer against the stand-in so the cross-check still has two viewpoints.
- **Neither enabled** → issue NO MCP call. Tell the user both providers are
  disabled and to enable at least one via `/cennad:setup`.

If a `start_conversation` call returns `error.code: 'disabled'` (the static
policy was stale — config changed mid-session), treat that provider as
disabled and fall back to the one-enabled flow above.

## Call mapping (both enabled)

Issue the two calls **in parallel** (single message, two tool uses):

- `mcp_tools_start_conversation({ provider: 'codex', prompt, tier })`
- `mcp_tools_start_conversation({ provider: <google>, prompt, tier })` —
  `<google>` is the active Google engine (`gemini` or `antigravity`).

`tier` is required — default to `mid`; pick `high` only with a specific reason to expect `mid` is insufficient (`high` is far more rate-limit/budget-prone).

## Response handling

Surface every available `session_id` (each in backticks) so the user can
`--continue` either side later. On partial failure where one provider
never produced a session, surface only the surviving provider's
`session_id`.

### Failure dispatch

For each provider independently:

- `auth` → tell the user to authenticate each failing provider: `codex login`
  for codex, `gemini auth login` for gemini, or sign in to `agy` (Google OAuth)
  for antigravity.
- `rate_limit` / `budget_exhausted` → suggest retrying after a pause or
  invoking only the surviving provider via `/cennad:<provider>`.
- `disabled` → the provider was switched off in config. Fall back to the
  one-enabled flow (a Claude stand-in fills the slot), or tell the user to
  re-enable it via `/cennad:setup`.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim.

### Partial-failure synthesis

- If **one** provider fails → present the surviving provider's answer
  AND clearly note the failed provider's `error.code` / `error.message`.
  Do NOT abort. The user still gets value from the single response.
  Use the partial-failure template below.
- If **both** providers fail → surface both errors and skip synthesis.
  Relay the per-code remedy message (from the Failure dispatch above) for
  each failing provider independently before the user retries.

### Partial-failure template

Substitute the actual provider name (`Codex`, `Gemini`, or `Antigravity`) for each
`<SurvivingProvider>` / `<FailedProvider>` placeholder.

```
## <SurvivingProvider> response
<answer body>

## <FailedProvider> error
`error.code`: error.message

> <one-line remedy from the failure dispatch above>
```

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

In the one-enabled flow, the Claude stand-in counts as one of the two
responses. Label it explicitly in every section (e.g.
`Gemini (disabled → Claude stand-in)`) so the user can tell which viewpoint
came from a real provider and which from the stand-in.

When `artifact_path` is present on either envelope (config opt-in),
include a `## Artifacts` section linking to each available
`artifact_path` so the user can open the full responses. List only the
paths actually present in the envelopes.

## Tier

Both providers receive the SAME tier. See `/cennad:codex` and
`/cennad:gemini` for the per-provider tier → model mapping (env override
via `CENNAD_<PROVIDER>_<TIER>`).
