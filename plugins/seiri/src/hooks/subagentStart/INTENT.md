# subagentStart — Independent child authority, one parent handoff

## Purpose

Create no child actor; a never-participating child is first on every start and may enter a workflow through its own entry request; child participation belongs to that actor and is never copied from its parent's state. Under standard/strict, hand a never-participating child a read-only progress line on each start when its main-actor parent has an active binding, so the child knows the task it was spawned into without starting its own chain.

## Conventions

- Require native session and child agent IDs; derive the child turn from the agent ID, independently of the parent's native turn.
- Recognize resumed children that already participated by generation, suspend their bindings, revoke their anchors and pending calls, and inject no progress line.
- Disabled assistance creates no new child state and no progress line.
- Read the parent binding through `readActorBinding`; never lock or write it from this hook.

## Boundaries

### Always do

- Remain nonblocking.
- Preserve separation between parent and child task bindings; the child's own ledger still needs its own explicit `start`/entry `step`.
- Inject the parent's progress line while the child has never participated, and only when the parent is the main actor.

### Ask first

- Change child identity, inheritance semantics, or the parent-lookup conditions.

### Never do

- Inherit the parent's binding, inject an election line, or elect child skills.
- Write deployed rules, return permission decisions, or write to the parent's actor file.
