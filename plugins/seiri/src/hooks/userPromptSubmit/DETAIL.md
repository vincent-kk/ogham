# userPromptSubmit — Contract

## Requirements

- Every trusted user turn replaces its native-turn anchor. Initial skill selection belongs to the host or user.
- off/advisory suspend prior participation (`observeBoundary(..., { suspend: true })`) and stay silent. standard/strict do not suspend (`suspend: false`): an active binding keeps its progress line every turn; a paused binding gets nothing at standard and the one-line chain at strict, and strict adds that same chain line when there is no binding at all.
- Missing host provenance or storage failure yields no assistance.

## API Contracts

- The processor accepts the native host payload and returns a nonblocking HookOutput. `additionalContext` reflects the same-transaction binding snapshot `observeBoundary` returns — never a pre-update read.
- Shared normalization preserves Claude prompt_id, Codex turn_id, tool_use_id and independent child agent_id. No IDs come from model arguments.

## Acceptance Criteria

### AC-conditional-participation — Explicit scope

- Inactive (off/advisory) sessions receive no progress line, chain reminder, or gate writes.
- Bound workflows cannot cross turns, actors, tasks or invocation generations through late results.
- standard/strict keep an active binding across unrelated turns until a switching entry `step`, `pause`, or `finish` retires it; only off/advisory and session boundaries suspend it.
- A paused (suspended) binding receives no progress line; at strict the turn receives the one-line chain instead.

### AC-native-invocation-provenance — Recorded host envelopes

- Recorded Claude and Codex fixtures retain matched invocation identities, independent children and their distinct successful MCP response envelopes.
- Synthetic race tests do not claim to reproduce native host scheduling.

## Last Updated

2026-09-26
