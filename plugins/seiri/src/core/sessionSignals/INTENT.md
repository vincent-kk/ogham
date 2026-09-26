# sessionSignals

## Purpose

Own ephemeral actor-scoped workflow participation and observations. The host and user select skills; this module never elects one.

## Conventions

- A host session and its main or child actor have separate hashed state addresses.
- A trusted native turn boundary must precede tool observations. Tools cannot create that boundary.
- Explicit lifecycle requests take effect only through paired successful host results.
- Store hashes and bounded counters, never commands, prompts, outputs, or transcripts.

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
