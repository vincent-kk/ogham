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
- `--tier high|mid|low` — optional; omit to use the provider's configured default tier (set via `/setup`). If given: `mid` for normal work, `low` for clearly simple tasks, `high` only with a specific reason to expect `mid` is insufficient.
- `--no-refine` — optional; disable the refinement loop below and return the first response as-is (a single dispatch).
- `-- "prompt"` — everything after `--` is the prompt (required).

Permission mode and the per-tier model + effort mapping are managed via `/setup`
(settings UI) — they are not skill arguments.

## Call mapping

- With `--continue <session_id>` → `mcp__plugin_cennad_tools__continue_conversation({ session_id, prompt, tier? })`. Pass `tier` when supplied; otherwise omit it to use the provider's currently configured default.
- Otherwise → `mcp__plugin_cennad_tools__start_conversation({ provider: 'claude', prompt, tier? })`. `tier` is optional — omit to use the configured default.

## Response handling

Treat the first response as the opening of a conversation, not necessarily its end:
evaluate it, refine via the loop below when it falls short, then surface the FINAL
answer and its `session_id`. Wrap `session_id` in backticks (`` ` ``) so it renders
as a copyable inline code span — it is needed to continue later.

### Refinement loop

Before dispatching, derive a completion checklist from the user's request — required
deliverables, explicit constraints, and the expected format / evidence. Judge each
response against THAT checklist, not against the response's own claim to be complete
(a provider can sound finished while silently dropping a constraint).

Continue the SAME session only when you can NAME a specific gap:

- a checklist item the response left uncovered, partial, or ambiguous;
- a blocking question WHOSE ANSWER you already hold (in the request or this session) — pass it explicitly;
- a correctness defect you can actually explain or test, not merely suspect.

Stop and surface to the USER instead (do NOT continue, do NOT invent an answer) when:

- the provider asks about intent, scope, or a constraint the user never stated — relay its question verbatim and let the user resume via `--continue`;
- the only doubt is a correctness issue you cannot independently verify — state it alongside the answer and let the user decide;
- the provider merely offers optional extras ("want me to also…?") — that is not a gap.

To continue, call `mcp__plugin_cennad_tools__continue_conversation({ session_id, prompt })`
with the previous response's `session_id` — NOT a fresh `start_conversation`, which
drops the prior turn's context. State the exact gap, supply any context the provider
could not see, and ask for the corrected / completed answer (not just a critique).

Stop the loop when any holds:

- every checklist item is met;
- no specific, closable gap remains to name;
- you reach 3 provider calls in this session (initial + 2 continuations; a failed call still counts) — a ceiling, not a target. Use the 2nd continuation only if the 1st made material progress and one concrete gap remains;
- a call returns `status: 'failure'` or empty / unusable output — do not retry; handle it below and return the best successful answer so far.

Do not loop on trivial or already-complete answers; under a `high` tier each extra
round multiplies cost. When you went beyond the initial call, note it to the user
(e.g. "refined over N follow-up(s)").

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
