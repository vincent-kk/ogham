# subagentStart — Contract

## Requirements

- Create no child actor and never inherit the parent's task or binding. A never-participating child is first on every start, receives the handoff again, and may enter a workflow through its own entry request. Parent prompt/turn changes do not invalidate the child's paired tool calls or lifecycle results.
- Under standard/strict, when the parent is the main actor and holds an active binding, inject one progress line naming that task and its current step — read through `readActorBinding`, lock-free and without writing. No election text.
- off/advisory suppress new observations and injection; trusted boundaries still suspend existing participation.

## API Contracts

- The processor accepts the native host payload and returns a nonblocking HookOutput. Empty additional context produces no stdout when the parent has no active binding or the read fails.
- Shared normalization hashes `JSON.stringify(['agent', agent_id])` for a child turn on both hosts. Only main actors use Claude `prompt_id` or Codex `turn_id`; child turns do not require either field. Actor identity still includes host, session and agent, and call identity uses `tool_use_id`. No IDs come from model arguments.
- `readActorBinding(identity, now)` reads the parent's `host + session_id + 'main'` actor under the same project root, validates structure, TTL, and `.revoked`·`.revoked-suspend`, and returns a binding only when `state === 'active'`.

## Acceptance Criteria

### AC-child-boundary — Independent child actor

- A child's first SubagentStart creates no actor; the parent's binding and task are never visible to the child beyond the one progress line.
- A SubagentStart for an already-participating child whose generation is above zero leaves it unanchored, increments generation, discards pending calls and suspends any existing binding, even though its normalized child turn stays constant.
- A payload without `agent_id` or host provenance changes no state and returns an empty nonblocking result.

### AC-subagent-progress-line — One-time parent handoff

- The progress line is injected while the child has never participated, only when the parent actor is main and its binding is active; a paused, absent, or non-main parent binding injects nothing.
- The bundle contains no `/Election/` literal.
- A never-participating child receives the handoff on repeated SubagentStart events; a resumed child that already participated (generation above zero) receives nothing.

## Last Updated

2026-09-27
