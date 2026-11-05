# setup — Contract

## Requirements

- Session boundaries suspend existing participation; compact preserves it and, when this actor's own binding reads back `active`, appends its progress line last.
- Hooks never block a tool. Missing host provenance or storage failure yields no assistance beyond the render's own fallback.
- off/advisory suppress new observations and injection; trusted boundaries still suspend existing participation.
- Missing or unreadable rule status still yields the election and chain lines at standard/strict. Render tests pin the order and strict-only lines.

## API Contracts

- The processor accepts the native host payload and returns a nonblocking HookOutput. Empty additional context produces no stdout.
- Shared normalization preserves Claude prompt_id, Codex turn_id, tool_use_id and independent child agent_id. No IDs come from model arguments.
- The renderer is pure; the processor only assembles its inputs and writes the result.

## Acceptance Criteria

### AC-session-boundary — Native session resets

- A `startup`, `resume`, `clear` or `fork` SessionStart suspends an existing binding, clears the turn anchor and pending invocations, and advances the actor generation.
- Any other source, including `compact`, leaves workflow state untouched.
- SessionStart never creates participation on its own.
- When this suspend fails (lock or storage), the intent is not lost: a sticky marker retains the intent, and the main actor's next UserPromptSubmit or SessionStart applies the suspend before its own effect and clears the marker on commit.

### AC-session-start-render — Election, chain, and rule status

- standard/strict SessionStart's `additionalContext` carries the election line and the one-line chain, in both cases regardless of whether rule status could be read.
- off/advisory SessionStart injects nothing.
- At standard or strict, `compact` with this actor's own binding `active` reads it back lock-free and appends its progress line as the last `additionalContext` line; with no active binding, or at any other source, no progress line appears.

## Last Updated

Update when the native session suspension, compaction, or session rendering contracts change.
