# userPromptSubmit — Silent turn authority

## Purpose

Establish the current native turn and suspend previous participation. Skill selection belongs to the user or host, including whether a later request continues the same task.

## Conventions

- Under standard/strict, anchor the trusted turn even without a binding.
- Under off/advisory, revoke only existing metadata and create no new anchor.
- Do not inspect prompt prose to infer task intent.

## Boundaries

### Always do

- Clear prior in-flight authority through the actor store.
- Return a nonblocking result with no injected context.

### Ask first

- Change native-boundary authority or the silent-output contract.

### Never do

- Inject reminders, enumerate task ledgers, or start/resume a task automatically.
- Copy rule bodies or import internal barrels.
