---
name: crosscheck
description: '[cennad] Cross-validate a prompt by dispatching it in parallel to every enabled provider (codex, antigravity, claude), then synthesize their answers. Trigger: "crosscheck", "cross check", "교차검증", "양쪽에 물어봐"'
user_invocable: true
argument-hint: '[--tier high|mid|low] -- "prompt"'
---

# crosscheck

Cross-validate a prompt across the cennad providers — codex, antigravity, and
claude — by dispatching the SAME prompt to each **enabled** provider in
parallel via the cennad MCP server, then synthesizing their
`ConversationResponse` envelopes into one consolidated answer.

Disabled providers are skipped entirely. A real cross-check needs at least two
independent viewpoints to compare. When only one provider is enabled, the
**host LLM** (the session that invoked this skill) supplies the second
viewpoint so the cross-check can still happen.

## When to use

- Independent second opinion across model families on the same question.
- Architectural / design decisions where disagreement is informative.
- Spec or PR review where code-leaning (codex), research/UX-leaning
  (antigravity), and isolated-reasoning (claude) perspectives each add signal.

## When NOT to use

- Prompts containing secrets the user does not want shared widely — the same
  prompt is forwarded to EVERY enabled provider (codex → OpenAI,
  antigravity → Google, claude → Anthropic).
- Trivial tasks the current Claude session can answer directly.
- Tasks that only one provider's strength fits — use `/cennad:codex`,
  `/cennad:antigravity`, or `/cennad:claude` directly.
- Multi-turn conversations — crosscheck is single-shot. Use
  `/cennad:<provider> --continue` for follow-ups on any side.

## Arguments

Parse the invocation. Recognize:

- `--tier high|mid|low` — optional; applied to EVERY dispatched provider, or omit to use each provider's configured default. If given: `mid` for normal work, `low` for clearly simple tasks, `high` only with a specific reason to expect `mid` is insufficient (`high` is far more rate-limit/budget-prone).
- `-- "prompt"` — everything after `--` is the prompt (required).

Permission flags (`yolo`, `sandbox`, `skip_permissions`) and other
dispatcher options are managed via `/setup` (settings UI) — they are not
accepted as skill arguments.

`--continue` is intentionally NOT supported (each crosscheck starts fresh
sessions). If the invoker passes `--continue <id>`, **abort immediately — do
not issue any MCP calls**, and tell the user to resume via
`/cennad:<provider> --continue <id>` (echo back the id they provided) for the
desired side.

## Provider activation gate

cennad dispatches only to **enabled** providers. Read the active set from the
SessionStart `[cennad] Static policy` block (the `Active providers:` line).
The participants are the enabled providers among codex, antigravity, and
claude. Branch on how many are enabled BEFORE issuing any MCP call:

- **Two or more enabled** → standard crosscheck: dispatch every enabled
  provider in parallel (Call mapping below) and synthesize. The host LLM does
  NOT participate — there are already enough external viewpoints.
- **Exactly one enabled** → only one external provider exists, so mobilize the
  host LLM as the second viewpoint:
  1. BEFORE dispatching, draft your own (the host LLM's) independent answer to
     the SAME prompt from your own reasoning. Commit to it first so the
     provider's response cannot anchor you.
  2. Dispatch the single enabled provider via MCP (Call mapping below).
  3. Treat the host answer and the provider answer as two participants and
     synthesize them with the standard Synthesis format, attributing each
     point to `host` vs the provider (e.g. `host + codex`).
     Note to the user that the host LLM was mobilized because only one provider
     is enabled, and suggest enabling another provider via `/cennad:setup` for a
     fully external cross-check.
- **None enabled** → issue NO MCP call. Tell the user all providers are
  disabled and to enable at least one via `/cennad:setup` (one enabled
  provider is enough — the host LLM supplies the second viewpoint).

If a `start_conversation` call returns `error.code: 'disabled'` (the static
policy was stale — config changed mid-session), drop that provider from the
participant set and re-evaluate against the counts above.

## Call mapping

Issue one call per enabled provider, all **in parallel** (single message, one
tool use each) — include only the providers in the participant set:

- `mcp__plugin_cennad_tools__start_conversation({ provider: 'codex', prompt, tier? })`
- `mcp__plugin_cennad_tools__start_conversation({ provider: 'antigravity', prompt, tier? })`
- `mcp__plugin_cennad_tools__start_conversation({ provider: 'claude', prompt, tier? })`

`tier` is optional — omit to use each provider's configured default; if given,
`high` only with a specific reason to expect `mid` is insufficient (`high` is
far more rate-limit/budget-prone).

## Response handling

Surface every available `session_id` (each in backticks) so the user can
`--continue` any side later. On partial failure, surface only the surviving
providers' `session_id`s.

### Failure dispatch

For each provider independently:

- `auth` → tell the user to authenticate that provider: `codex login` for
  codex, sign in to `agy` (Google OAuth) for antigravity, or run `claude`
  once interactively and complete the login for claude.
- `rate_limit` / `budget_exhausted` → suggest retrying after a pause or
  invoking a surviving provider via `/cennad:<provider>`.
- `disabled` → the provider was switched off in config. Drop it from the
  participant set (re-evaluate the activation gate), or tell the user to
  re-enable it via `/cennad:setup`.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim.

### Partial-failure synthesis

- If **two or more** providers succeed → synthesize the successful answers
  normally AND note each failed provider's `error.code` / `error.message`.
- If **exactly one** provider succeeds → mobilize the host LLM as the second
  viewpoint: draft your own independent answer to the SAME prompt, then
  synthesize host vs the surviving provider with the standard Synthesis
  format (attributing points to `host` vs the provider) AND note each failed
  provider's error. Do NOT abort.
- If **all** providers fail → surface every error and skip synthesis. Relay
  the per-code remedy (from Failure dispatch above) for each before retrying.

### Partial-failure template

One `## <Provider> response` block per surviving provider, then one
`## <Provider> error` block per failed provider:

```
## <Provider> response
<answer body>

## <Provider> error
`error.code`: error.message

> <one-line remedy from the failure dispatch above>
```

## Synthesis format (two or more viewpoints)

When two or more viewpoints are available (enabled providers, or one provider
plus the mobilized host LLM), render exactly four sections. Attribute each
point to the viewpoints behind it (e.g. `codex + claude`, or `host + codex`)
so the user can trace every viewpoint to its source:

```
## Agreed
- <points the responses converge on>

## Conflicting
- <points where responses disagree — name each side and the provider holding it>

## Final direction
<your recommendation + one-line rationale grounded in the responses>

## Action checklist
- [ ] <concrete next step>
- [ ] ...
```

When `artifact_path` is present on any envelope (config opt-in), include a
`## Artifacts` section linking to each available `artifact_path` so the user
can open the full responses. List only the paths actually present in the
envelopes.

## Tier

Every dispatched provider receives the SAME tier. See `/cennad:codex`,
`/cennad:antigravity`, and `/cennad:claude` for each provider's tier → model
mapping.
