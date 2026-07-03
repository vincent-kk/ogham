---
name: crosscheck
description: '[cennad] Cross-validate a prompt by dispatching it in parallel to every enabled provider (codex, antigravity, claude), then synthesize their answers. Trigger: "crosscheck", "cross check", "교차검증", "양쪽에 물어봐"'
user_invocable: true
argument-hint: '[--tier high|mid|low] [--no-converge] -- "prompt"'
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
- User-driven multi-turn follow-ups — crosscheck owns and steers its own
  sessions (including the convergence round), but it does not accept a
  user `--continue` argument. To drive one side yourself afterward, use
  `/cennad:<provider> --continue`.

## Arguments

Parse the invocation. Recognize:

- `--tier high|mid|low` — optional; applied to EVERY dispatched provider, or omit to use each provider's configured default. If given: `mid` for normal work, `low` for clearly simple tasks, `high` only with a specific reason to expect `mid` is insufficient (`high` is far more rate-limit/budget-prone).
- `--no-converge` — optional; skip the convergence round even when a conflict is decision-changing, and synthesize the first round only.
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

Within crosscheck, each provider gets exactly ONE dispatch here plus at most one
convergence round. Do NOT apply the single-provider `/cennad:<provider>`
refinement loop to these calls — the initial dispatch and the optional convergence
round are the entire provider-call budget for a crosscheck.

## Response handling

Surface every available `session_id` (each in backticks) so the user can
`--continue` any side later. On partial failure, surface only the surviving
providers' `session_id`s.

If any provider returns `status: 'failure'`, or only some providers succeed,
load **[references/failure.md](references/failure.md)** for per-code dispatch,
partial-failure synthesis, and the partial-failure template. When every
dispatched provider succeeds, skip it and synthesize directly.

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

## Convergence rounds

The first synthesis is a snapshot, not the verdict. Inspect `## Conflicting`:
if it holds a _decision-changing_ disagreement (accepting one side would change
a recommended action, architecture, priority, safety call, or checklist item),
run ONE convergence round per **[references/convergence.md](references/convergence.md)**.
Skip — and do not load it — when the responses already agree, when the conflict
does not change the final direction, when only one viewpoint survived, or when
`--no-converge` was passed.

## Tier

Every dispatched provider receives the SAME tier. See `/cennad:codex`,
`/cennad:antigravity`, and `/cennad:claude` for each provider's tier → model
mapping.
