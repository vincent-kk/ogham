# subagentStart — Contract

## Requirements

- Create only the child actor's first native-turn anchor, without inheriting the parent's task. Remain silent.
- Hooks never block a tool or inject global election instructions. Missing host provenance or storage failure yields no assistance.
- off/advisory suppress new observations and injection; trusted boundaries still invalidate existing participation.

## API Contracts

- The processor accepts the native host payload and returns a nonblocking HookOutput. Empty additional context produces no stdout.
- Shared normalization preserves Claude prompt_id, Codex turn_id, tool_use_id and independent child agent_id. No IDs come from model arguments.

## Acceptance Criteria

### AC-child-boundary — Independent child actor

- A child's first SubagentStart anchors only that child's actor; the parent's binding and task are never visible to the child.
- A SubagentStart for a child whose generation is already above zero leaves it unanchored and suspends any existing binding.
- A payload without `agent_id` or host provenance changes no state, and every call returns an empty nonblocking result.

## Last Updated

2026-09-26
