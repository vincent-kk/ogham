# setup — Contract

## Requirements

- Session boundaries invalidate existing participation; compact preserves it.
- Hooks never block a tool or inject global election instructions. Missing host provenance or storage failure yields no assistance.
- off/advisory suppress new observations and injection; trusted boundaries still invalidate existing participation.

## API Contracts

- The processor accepts the native host payload and returns a nonblocking HookOutput. Empty additional context produces no stdout.
- Shared normalization preserves Claude prompt_id, Codex turn_id, tool_use_id and independent child agent_id. No IDs come from model arguments.

## Acceptance Criteria

### AC-session-boundary — Native session resets

- A `startup`, `resume`, `clear` or `fork` SessionStart suspends an existing binding, clears the turn anchor and pending invocations, and advances the actor generation.
- Any other source, including `compact`, leaves workflow state untouched.
- SessionStart returns an empty nonblocking result and never creates participation on its own.

## Last Updated

2026-09-26
