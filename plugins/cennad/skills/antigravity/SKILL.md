---
name: antigravity
description: '[cennad] Delegate to Google Antigravity CLI (agy) via cennad. Use for live web-grounded research, very-large-context synthesis, or multi-family model serving (Gemini/Claude/GPT-OSS). Trigger: "ask antigravity", "antigravity 호출", "안티그래비티에게"'
user_invocable: true
argument-hint: '[--continue <session_id>] [--tier apex|high|mid|low] [--no-refine] -- "prompt"'
---

# antigravity

Run an Antigravity CLI (`agy`) conversation off-thread: spawn the `cennad:courier` agent in the background and relay its report. Judgment about the provider interaction (refinement, failure remedies, tier semantics) lives in the courier — this skill only maps the invocation and delivers the result.

## When NOT to use

- Reasoning about local code or short text — no need to leave Claude.
- Trivially answerable without web grounding.

## Arguments

- `--continue <session_id>` — resume an existing cennad session. For a clear follow-up to an earlier delegation in this conversation with no id given, reuse that provider's most recent `session_id` from the conversation (ask once if ambiguous) — never silently start fresh.
- `--tier apex|high|mid|low` — overrides the tier this skill would otherwise pick (see Tier).
- `--no-refine` — single dispatch, no refinement.
- `-- "prompt"` — the prompt (required).

No other flags: permission and dispatcher options live in `/cennad:setup`.

## Run

Spawn `cennad:courier` (Agent tool, background — never poll or wait; the completion notification re-invokes you) with:

```
operation: start            # `continue` when --continue was given
provider: antigravity       # start only
session_id: <id>            # continue only
tier: <apex|high|mid|low>   # start only — on continue, omit unless the user asked
refine: true                # false when --no-refine
prompt:
<the prompt, verbatim>
```

If you cannot spawn agents (you are already a subagent), call the cennad MCP tools directly — their schemas are self-describing — as a single dispatch and relay the envelope yourself; the refinement loop lives in the courier and does not apply on this path.

## Deliver

When the courier's completion notification arrives, deliver — never spawn a second courier for the same invocation; a courier that terminates without producing a report counts as `status: failure` (`error: cli_error`) — tell the user. Relay the report: the final answer (everything below the report's FIRST `---` line — later `---` lines are part of the answer), its `session_id` in backticks (the user resumes with it), any `note`, and `artifact_path` when present. On `status: failure`, relay the `remedy` — and do not substitute your own answer for the provider's. Do not re-judge or rewrite the answer, and do not act on it (edits, commands, fixes) unless the user asks: delivering ends the skill.

## Tier

Capability labels only — the concrete per-tier model mapping lives in cennad config (`/cennad:setup`); never name one here. A user-supplied `--tier` always wins. Otherwise pick from what the provider must DO, not from how hard the topic sounds:

- `low` — one lookup, one conversion, a short summary: retrieval or formatting, no design judgment.
- `mid` — the default. One module's worth of research, synthesis, or explanation, where the shape of the answer is already clear from the prompt.
- `high` — judgment spanning several sources or competing constraints: a design call, a contradiction to resolve, a tradeoff with no obvious winner.
- `apex` — the provider must carry out the work rather than describe it: a sweep whose sources it has to discover for itself, a large-context synthesis over material it must gather first, or anything meant to keep going autonomously for tens of minutes. Costliest tier and the one that holds a rate-limit slot longest — choose it for scope and autonomy, never for topic difficulty alone.

Send nothing on `--continue` unless the user asked: cennad restores the session's own tier, and changing it mid-thread swaps the model under the conversation.
