# postToolUse — Contract

## Requirements

- Only an exact paired invocation in the active actor/turn/generation can transition the runtime state machine or record the active task's Bash evidence. Skill loading has no effect.
- `created` and `switched` transitions inject one progress-line-formatted acknowledgment naming the task, intent, and current step; `mismatch` injects one notice naming the bound task and how to close or switch it. `rejected` injects nothing. `updated` injects nothing only for a same-task `step`; an explicit `resume`, `pause`, or `finish` acknowledges on any non-rejected outcome, in the prior control-verb ACK text.
- off/advisory suppress new observations and injection; trusted boundaries still suspend existing participation.

## API Contracts

- The processor accepts the native host payload and returns a nonblocking HookOutput. Empty additional context produces no stdout.
- Shared normalization preserves Claude prompt_id, Codex turn_id, tool_use_id and independent child agent_id. No IDs come from model arguments.

## Acceptance Criteria

### AC-conditional-participation — Explicit scope

- Inactive sessions receive no progress-line acknowledgment or gate writes.
- Bound workflows cannot cross turns, actors, tasks or invocation generations through late results.
- A non-entry `step`, `resume`, `pause`, or `finish` naming a task other than the bound one leaves state untouched and injects one mismatch line instead of an acknowledgment; an entry `step` naming a different task switches instead.

### AC-native-invocation-provenance — Recorded host envelopes

- Recorded Claude and Codex fixtures retain matched invocation identities, independent children and their distinct successful MCP response envelopes.
- Synthetic race tests do not claim to reproduce native host scheduling.

## Last Updated

2026-09-26
