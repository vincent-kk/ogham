# subagentStart — Independent child authority

## Purpose

Establish only a child's first native-turn anchor. Child participation belongs to that actor and is never copied from its parent.

## Conventions

- Require the native child agent ID and turn provenance.
- Keep resumed children without a trusted new boundary unassisted.
- Disabled assistance creates no new child state.

## Boundaries

### Always do

- Remain silent and nonblocking.
- Preserve separation between parent and child task bindings.

### Ask first

- Change child identity or inheritance semantics.

### Never do

- Inherit the parent's binding, re-inject status, or elect child skills.
- Write deployed rules or return permission decisions.
