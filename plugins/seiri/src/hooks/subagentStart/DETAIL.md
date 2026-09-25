# subagentStart — Contract

## Requirements

- Create only the child actor's first native-turn anchor, without inheriting the parent's task. Remain silent.
- Hooks never block a tool or inject global election instructions. Missing host provenance or storage failure yields no assistance.
- off/advisory suppress new observations and injection; trusted boundaries still invalidate existing participation.

## API Contracts

- The processor accepts the native host payload and returns a nonblocking HookOutput. Empty additional context produces no stdout.
- Shared normalization preserves Claude prompt_id, Codex turn_id, tool_use_id and independent child agent_id. No IDs come from model arguments.

## Acceptance Criteria

### AC-conditional-participation — Explicit scope

- Inactive sessions receive no workflow banner or gate writes.
- Bound workflows cannot cross turns, actors, tasks or invocation generations through late results.

### AC-native-invocation-provenance — Recorded host envelopes

- Recorded Claude and Codex fixtures retain matched invocation identities, independent children and their distinct successful MCP response envelopes.
- Synthetic race tests do not claim to reproduce native host scheduling.

## Last Updated

2026-09-26
