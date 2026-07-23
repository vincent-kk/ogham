---
name: brainstorm
user-invocable: true
disable-model-invocation: true
description: '[seiri:brainstorm] Shape a change before any code is written — what this repository already does, what constrains the solution, what counts as done. Trigger: "brainstorm this", "설계 같이 고민해줘"'
argument-hint: '<what you are trying to build or change>'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# brainstorm — shape the change before writing it

You were invoked by the user, so ask what the work needs. The goal is a
shape worth implementing, not agreement.

## Workflow

**1. Find what already exists.** Search this repository for prior art
first: a utility that does part of this, the closest proven pattern, an
installed library. Report near-misses — "nothing exists" needs a
search behind it.

**2. State the constraints you found.** Not preferences — facts that
narrow the solution: an interface callers depend on, a convention
neighbouring files follow, a limit the runtime imposes. Name where you
saw each one.

**3. Offer distinct shapes, not variations.** Two or three options that
differ in what they trade away, costs stated. If one is clearly right
given the constraints, say so and why.

**4. Make it checkable.** Turn the chosen shape into something that can
fail: "these inputs are rejected, shown by a check that fails first and
passes after" beats "add validation". If you cannot say how it would
be verified, the shape is not finished.

## Rules

- Disagree with reasoning when the request conflicts with what the
  repository does. Reflexive agreement is not analysis.
- Say "I don't know" rather than guessing; name what would settle it.
- Do not write or modify files here. This skill produces a shape.
- Hand off: an approved shape goes to plan when multi-step, to
  implement when it is one surgical change.
- If the user says to proceed without further questions, stop asking.
  Write what you have as an artifact, hand it over. Do not modify
  files or delegate execution on an unfinished interview.
