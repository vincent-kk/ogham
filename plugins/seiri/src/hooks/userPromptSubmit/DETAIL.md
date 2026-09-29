# userPromptSubmit — Contract

## Requirements

- Every trusted user turn advances the anchor of an existing actor and creates nothing. Initial skill selection belongs to the host or user.
- off/advisory suspend prior participation (`observeBoundary(..., { suspend: true })`) and stay silent. standard/strict do not suspend (`suspend: false`): an active binding keeps its progress line every turn; a paused or absent binding receives the dial-specific entry line without naming the previous task.
- Missing host provenance or storage failure yields no assistance.

## API Contracts

- The processor accepts the native host payload and returns a nonblocking HookOutput. An active binding's `additionalContext` reflects the same-transaction snapshot `observeBoundary` returns — never a pre-update read. Without an active binding, the effective standard or strict dial selects the entry line.
- Shared normalization preserves Claude prompt_id, Codex turn_id, tool_use_id and independent child agent_id. No IDs come from model arguments.

## Acceptance Criteria

### AC-conditional-participation — Explicit scope

- Inactive (off/advisory) sessions receive no progress line, entry line, or gate writes.
- Bound workflows cannot cross turns, actors, tasks or invocation generations through late results.
- standard/strict keep an active binding across unrelated turns until a switching entry `step`, `pause`, or `finish` retires it; only off/advisory and session boundaries suspend it.
- A paused (suspended) binding receives no progress line; standard and strict each receive their own entry line. The same lines appear when no actor file or binding exists.

### AC-native-invocation-provenance — Recorded host envelopes

- Recorded Claude and Codex fixtures retain matched invocation identities, independent children and their distinct successful MCP response envelopes.
- Synthetic race tests do not claim to reproduce native host scheduling.

## Last Updated

2026-09-27
