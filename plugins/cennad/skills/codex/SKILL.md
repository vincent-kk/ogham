---
name: codex
description: '[cennad] Delegate to OpenAI Codex CLI via cennad. Use for heavy code generation/refactoring, sandboxed shell work, or independent second opinions from a different model family. Trigger: "ask codex", "codex 호출", "코덱스에게"'
user-invocable: true
argument-hint: '[--continue <session_id>] [--tier apex|high|mid|low] [--no-refine] -- "prompt"'
---

# codex

Run a Codex CLI conversation off-thread: spawn the `cennad:courier` agent in the background and relay its report. Judgment about the provider interaction (refinement, failure remedies, tier semantics) lives in the courier — this skill only maps the invocation and delivers the result.

## When NOT to use

- Trivial reasoning the current session answers directly.
- Context exceeding Codex's window.

## Arguments

- `--continue <session_id>` — resume an existing cennad session. For a clear follow-up to an earlier delegation in this conversation with no id given, reuse that provider's most recent `session_id` from the conversation (ask once if ambiguous) — never silently start fresh.
- `--tier apex|high|mid|low` — overrides the tier this skill would otherwise pick (see Tier).
- `--no-refine` — single dispatch, no refinement.
- `-- "prompt"` — the prompt (required).

No other flags: permission and dispatcher options live in `/cennad:setup`.

## Run

Spawn `cennad:courier` (Agent tool, background — never poll or wait; the completion notification re-invokes you). Identify the run by `description`; never pass `name` — a named agent spawns into mailbox mode and waits for a `SendMessage` this skill never sends, so the prompt never runs. The spawn prompt:

```
operation: start            # `continue` when --continue was given
provider: codex             # start only
session_id: <id>            # continue only
tier: <apex|high|mid|low>   # start only — on continue, omit unless the user asked
refine: true                # false when --no-refine
prompt:
<the prompt, verbatim>
```

If you cannot spawn agents (you are already a subagent), call the cennad MCP tools directly — their schemas are self-describing — as a single dispatch and relay the envelope yourself; the refinement loop lives in the courier and does not apply on this path.

## Deliver

When the courier's completion notification arrives, deliver — never spawn a second courier for the same invocation; a courier that terminates without producing a report counts as `status: failure` (`error: cli_error`) — tell the user. Relay the report: the final answer (everything below the report's FIRST `---` line — later `---` lines are part of the answer), its `session_id` in backticks (the user resumes with it), any `note`, and `artifact_path` when present. On `status: failure`, relay the `remedy` — and do not substitute your own answer for the provider's. Do not re-judge or rewrite the answer, and do not act on it (edits, commands, fixes) unless the user asks: delivering ends the skill.

## Stop

Ending the courier does not end the CLI. The courier is an agent; the Codex process is one cennad spawned, and it keeps running to its liveness ceiling — up to hours on a high tier — with nobody waiting for it. When the user asks to stop, cancel, or abandon a delegation, call `mcp__plugin_cennad_tools__stop_conversation`.

Scope it as narrowly as the situation allows: pass `session_id` when a run already reported one, otherwise `provider: codex`. Omitting both stops every provider CLI this session started, so use that only when that is what was asked. Stopping discards the work — never stop a run whose answer is still wanted. A `count: 0` reply means nothing was running, which is a normal outcome and not a failure: report it and do not call again to make sure.

## Tier

Capability labels only — the concrete model/effort mapping lives in cennad config (`/cennad:setup`); never name one here. A user-supplied `--tier` always wins. Otherwise pick from what the provider must DO, not from how hard the topic sounds:

- `low` — one lookup, one conversion, a short summary: retrieval or formatting, no design judgment.
- `mid` — the default. One module's worth of implementation, review, or explanation, where the shape of the answer is already clear from the prompt.
- `high` — judgment spanning several files or competing constraints: a design call, a root-cause hunt, a tradeoff with no obvious winner.
- `apex` — the provider must carry out the work rather than describe it: a repository-wide refactor or migration, a task whose file list it has to discover for itself, or anything meant to keep going autonomously for tens of minutes. Costliest tier and the one that holds a rate-limit slot longest — choose it for scope and autonomy, never for topic difficulty alone.

Send nothing on `--continue` unless the user asked: cennad restores the session's own tier, and changing it mid-thread swaps the model under the conversation.
