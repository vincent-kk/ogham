# subagentStart — Contract

## Requirements

- Create only the child actor's first native-turn anchor, without inheriting the parent's task or binding.
- Under standard/strict, when the parent is the main actor and holds an active binding, inject one progress line naming that task and its current step — read through `readActorBinding`, lock-free and without writing. No election text.
- off/advisory suppress new observations and injection; trusted boundaries still suspend existing participation.

## API Contracts

- The processor accepts the native host payload and returns a nonblocking HookOutput. Empty additional context produces no stdout when the parent has no active binding or the read fails.
- Shared normalization preserves Claude prompt_id, Codex turn_id, tool_use_id and independent child agent_id. No IDs come from model arguments.
- `readActorBinding(identity, now)` reads the parent's `host + session_id + 'main'` actor under the same project root, validates structure, TTL, and `.revoked`, and returns a binding only when `state === 'active'`.

## Acceptance Criteria

### AC-child-boundary — Independent child actor

- A child's first SubagentStart anchors only that child's actor; the parent's binding and task are never visible to the child beyond the one progress line.
- A SubagentStart for a child whose generation is already above zero leaves it unanchored and suspends any existing binding.
- A payload without `agent_id` or host provenance changes no state and returns an empty nonblocking result.

### AC-subagent-progress-line — One-time parent handoff

- The progress line is injected once, only when the parent actor is main and its binding is active; a paused, absent, or non-main parent binding injects nothing.
- The bundle contains no `/Election/` literal.
- The progress line is injected only on the child's first SubagentStart; a resumed child (generation above zero) receives nothing.

## Last Updated

2026-09-26
