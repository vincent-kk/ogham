---
name: antigravity
description: '[cennad] Delegate to Google Antigravity CLI (agy) via cennad. Use for live web-grounded research, very-large-context synthesis, or multi-family model serving (Gemini/Claude/GPT-OSS). Trigger: "ask antigravity", "antigravity 호출", "안티그래비티에게"'
user_invocable: true
argument-hint: '[--continue <session_id>] [--tier high|mid|low] [--no-refine] -- "prompt"'
---

# antigravity

Delegate to the Antigravity CLI (`agy`) through the cennad MCP server.

## When to use

- Research requiring live web search or grounding outside Claude's knowledge cutoff.
- Large-context synthesis across many large documents at once.
- Work that benefits from a specific model family (Gemini, Claude, GPT-OSS) that agy can serve.

## When NOT to use

- Reasoning about local code or short text — no need to leave Claude.
- Trivially answerable without web grounding.

## Arguments

Parse the invocation. Recognize:

- `--continue <session_id>` — resume an existing cennad session.
- `--tier high|mid|low` — optional; omit to use the provider's configured default tier (set via `/setup`). If given: `mid` for normal work, `low` for clearly simple tasks, `high` only with a specific reason to expect `mid` is insufficient (`high` is far more rate-limit/budget-prone).
- `--no-refine` — optional; disable the refinement loop below and return the first response as-is (a single dispatch).
- `-- "prompt"` — everything after `--` is the prompt (required).

Permission flags (`sandbox`, `skip_permissions`) and the per-tier model mapping are managed via `/setup` (settings UI) — they are not skill arguments. Antigravity has no sandbox-backend option; its `--sandbox` restricts terminal commands only.

## Call mapping

- With `--continue <session_id>` → `mcp__plugin_cennad_tools__continue_conversation({ session_id, prompt, tier? })`. Pass `tier` when supplied; otherwise omit it to use the provider's currently configured default.
- Otherwise → `mcp__plugin_cennad_tools__start_conversation({ provider: 'antigravity', prompt, tier? })`. `tier` is optional — omit to use the configured default; if given, `high` only with a specific reason to expect `mid` is insufficient (`high` is far more rate-limit/budget-prone).

## Response handling

Treat the first response as the opening of a conversation, not necessarily its end: evaluate it, refine via the loop below when it falls short, then surface the FINAL answer and its `session_id`. Wrap `session_id` in backticks (`` ` ``) so it renders as a copyable inline code span — it is needed to continue later.

### Refinement loop

Before dispatching, derive a completion checklist from the user's request — required deliverables, explicit constraints, and the expected format / evidence. Judge each response against THAT checklist, not against the response's own claim to be complete (a provider can sound finished while silently dropping a constraint).

Continue the SAME session only when you can NAME a specific gap:

- a checklist item the response left uncovered, partial, or ambiguous;
- a blocking question from the provider WHOSE ANSWER you already hold (in the user's request or this session) — pass it explicitly;
- a correctness defect you can actually explain or test, not merely suspect.

Stop and surface to the USER instead (do NOT continue, do NOT invent an answer) when:

- the provider asks about intent, scope, or a constraint the user never stated — relay its question verbatim and let the user resume via `--continue`;
- the only doubt is a correctness issue you cannot independently verify — state the doubt alongside the answer and let the user decide;
- the provider merely offers optional extras ("want me to also…?") — that is not a gap; do not accept on the user's behalf.

To continue, call `mcp__plugin_cennad_tools__continue_conversation({ session_id, prompt })` with the previous response's `session_id` — NOT a fresh `start_conversation`, which drops the prior turn's context. State the exact gap, supply any context the provider could not see, and ask for the corrected / completed answer (not just a critique).

Stop the loop when any holds:

- every checklist item is met;
- no specific, closable gap remains to name;
- you reach 3 provider calls in this session (initial + 2 continuations; a failed call still counts) — a rate-limit / budget ceiling, not a target. Use the 2nd continuation only if the 1st made material progress and one concrete gap remains;
- a call returns `status: 'failure'` or empty / unusable output — do not retry; handle it per the dispatch table below and return the best successful answer so far.

Do not loop on trivial or already-complete answers; under a `high` tier each extra round multiplies rate-limit / budget cost. When you went beyond the initial call, note it to the user (e.g. "refined over N follow-up(s)").

### Failure dispatch

On `status: 'failure'`, dispatch by `error.code`:

- `auth` → tell the user to sign in to Antigravity: run `agy` once interactively and complete the Google OAuth flow (agy has no API-key auth), then retry.
- `disabled` → antigravity is disabled in cennad config. Tell the user to enable it via `/cennad:setup`. Do not retry.
- `rate_limit` / `budget_exhausted` → model availability depends on the subscription tier; suggest retrying after a pause, a different tier, or switching to the `codex` skill.
- `network` / `cli_error` / `unknown` → relay `error.message` verbatim.

## Tier

| tier   | resolves to                                                         |
| ------ | ------------------------------------------------------------------- |
| `high` | the model mapped to this tier in `/setup` (per-tier model dropdown) |
| `mid`  | the model mapped to this tier in `/setup`                           |
| `low`  | the model mapped to this tier in `/setup`                           |

Antigravity serves multiple model families (e.g. Gemini 3.5 Flash / 3.1 Pro,
Claude Sonnet 4.5 / Opus 4.6, GPT-OSS 120B), subject to your subscription. The
concrete model each tier maps to is configured in `/setup` from the live
`agy models` list and stored in cennad config (`model_map.antigravity`). To see
what is currently available, open the settings UI via `/setup` or run `agy
models` directly.
