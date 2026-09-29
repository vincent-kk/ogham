# userPromptSubmit — Turn authority and progress line

## Purpose

Advance the native-turn anchor of an existing actor; create nothing. Under standard/strict, keep an active binding active across turns and report its progress, or state a dial-specific entry line when no task is active; under off/advisory, suspend previous participation instead. Skill selection belongs to the user or host, including whether a later request continues the same task.

## Conventions

- Under standard/strict, advance an existing actor's trusted turn anchor without creating an actor or suspending its binding, and read the post-anchor snapshot for the progress line.
- Under off/advisory, revoke existing metadata and create no new anchor.
- Do not inspect prompt prose to infer task intent.
- Progress-line and entry-line rendering live in `hooks/shared/progressLine/`'s concrete files; none import an election or posture constant, so no `Election` text can reach these bundles.

## Boundaries

### Always do

- Advance an existing actor's current turn through the actor store, suspending only under off/advisory.
- Render progress from the same-transaction snapshot the anchor call returns; when no binding is active, render the current dial's entry line.

### Ask first

- Change native-boundary authority or the injection contract.

### Never do

- Infer task intent from prompt prose, enumerate task ledgers, or start/resume a task automatically.
- Copy rule bodies or import internal barrels.
