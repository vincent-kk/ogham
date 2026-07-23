---
name: brainstorm
user-invocable: true
disable-model-invocation: true
description: '[seiri:brainstorm] Shape a change before any code is written — what this repository already does, what constrains the solution, what counts as done. Trigger: "brainstorm this", "설계 같이 고민해줘"'
argument-hint: '<what you are trying to build or change>'
version: '0.2.0'
complexity: moderate
plugin: seiri
---

# brainstorm — shape the change before writing it

You were invoked by the user, so ask what the work needs. The goal is a shape
worth implementing, not agreement.

## Workflow

1. **Decompose scope.** If the request names parts that could each succeed or
   fail on their own, split them before going deeper — refining a project that
   should be decomposed first wastes the questions.
2. **Search before shaping.** Find what this repository already has — a utility,
   a proven pattern, an installed library. "Nothing exists" needs a search
   behind it.
3. **State the constraints you found.** Facts that narrow the solution, not
   preferences — name where you saw each.
4. **Offer two or three distinct shapes** that differ in what they trade away,
   costs stated, with your recommendation. Design each unit to be graspable
   alone, then make the chosen shape something that could fail.

Steps 1 and 4, isolation, and checkability live in `references/shaping.md`.
Before handing off, run the spec self-review in `references/self-review.md`.

## Rules

- Disagree with reasoning when the request conflicts with what the repository
  does. Reflexive agreement is not analysis.
- Say "I don't know" rather than guessing; name what would settle it.
- Do not write or modify files here. This skill produces a shape.
- Hand off: an approved shape goes to write-plan when multi-step, to implement when it
  is one surgical change.
- If the user says to proceed without further questions, stop asking. Write
  what you have as an artifact, hand it over. Do not modify files or delegate
  execution on an unfinished interview.
