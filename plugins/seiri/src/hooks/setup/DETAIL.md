# setup — Contract

## Requirements

- Session boundaries suspend existing participation (`suspendActor(identity, now)`); compact preserves it.
- Hooks never block a tool. Missing host provenance or storage failure yields no assistance beyond the render's own fallback.
- off/advisory suppress new observations and injection; trusted boundaries still suspend existing participation.
- standard/strict compose `renderSessionStart({ dial, ruleStatuses?, election, chain })`, in this order: an active-rule-status summary, the effective dial, a drift warning, a fixed election line that names, by work moment and never by word signal, `seiri:write-plan`, `seiri:execute`, `seiri:trace-cause`, and `seiri:verify` in host-neutral form, and a one-line chain summary. In strict, the election slot carries the owner contract instead — the four standard owners plus review-plan, implement, request-review, and receive-review — and a posture line follows the chain. A missing or unreadable `ruleStatuses` still yields the election and chain lines.

## API Contracts

- The processor accepts the native host payload and returns a nonblocking HookOutput. Empty additional context produces no stdout.
- Shared normalization preserves Claude prompt_id, Codex turn_id, tool_use_id and independent child agent_id. No IDs come from model arguments.
- `renderSessionStart` is a pure function in `hooks/setup/render/`; the processor only assembles its inputs and writes the result.

## Acceptance Criteria

### AC-session-boundary — Native session resets

- A `startup`, `resume`, `clear` or `fork` SessionStart suspends an existing binding, clears the turn anchor and pending invocations, and advances the actor generation.
- Any other source, including `compact`, leaves workflow state untouched.
- SessionStart never creates participation on its own.

### AC-session-start-render — Election, chain, and rule status

- standard/strict SessionStart's `additionalContext` carries the election line and the one-line chain, in both cases regardless of whether rule status could be read.
- off/advisory SessionStart injects nothing.

## Last Updated

2026-09-26
