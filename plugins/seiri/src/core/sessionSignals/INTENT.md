# sessionSignals

## Purpose

Own ephemeral actor-scoped workflow participation and observations. The host and user select skills; this module never elects one.

## Conventions

- A host session and its main or child actor have separate hashed state addresses.
- Only an entry request's PreToolUse creates actor metadata, anchored on its payload's native turn. Boundary hooks update or suspend existing actors without creating them. Tool events never replace a valid existing anchor.
- Explicit lifecycle requests take effect only through paired successful host results.
- Only an entry step (`write-plan`, `execute`) or `start` can create a binding or switch it to another task; `resume` and every other step only update an existing same-task binding.
- A read of another actor's binding (for a one-time handoff) never locks or writes that actor's state.
- Store hashes and bounded counters, never commands, prompts, outputs, or transcripts.
- MCP startup retires actor files unmodified for more than 72 hours; access-time expiry remains seven days.

## Boundaries

### Always do

- Serialize each actor's read, validation, effect, and write under one lock.
- Skip effects if the lock cannot be acquired; remain nonblocking to the host.
- Create state only under an ignored directory.

### Ask first

- Add a new durable state kind or increase observation retention.

### Never do

- Inherit another actor's binding or guess a native turn from model input.
- Treat workflow finish as proof that the task succeeded.
- Block a host operation because optional assistance failed.
