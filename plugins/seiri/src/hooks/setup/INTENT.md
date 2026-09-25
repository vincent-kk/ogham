# setup — Silent session boundary

## Purpose

Invalidate existing actor participation on native session startup, resume, clear, or fork. Preserve continuous compaction without emitting status or election banners.

## Conventions

- SessionStart can lack a turn ID; revoke the build-selected host's existing actor without creating an anchor.
- Rule deployment and status inspection belong to explicit settings operations.

## Boundaries

### Always do

- Return nonblocking results and leave stdout empty.
- Delegate state invalidation to the actor store.

### Ask first

- Change which native session events preserve participation.

### Never do

- Elect skills, inspect all ledgers, or infer participation from installed rules.
- Write deployed rule files or create a workflow binding.
