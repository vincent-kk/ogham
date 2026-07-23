---
name: interview
user_invocable: true
disable-model-invocation: true
description: '[seiri:interview] Turn a vague request into acceptance criteria that can fail — bounded rounds of questions, ending in a written spec. Trigger: "interview me", "pin down the requirements", "요구사항 정리해줘"'
argument-hint: '<the request to pin down>'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# interview — turn a request into criteria that can fail

You were invoked by the user, so questions are welcome. The output is a
short spec whose every line could be checked.

## Workflow

Run **at most three rounds**, then write the spec with what you have and
mark the gaps. An interview that never ends produces nothing.

**Round 1 — the observable outcome.** What is true after this works that
is not true now? Push until the answer names something checkable.
"Faster" becomes "returns within N seconds under this load".

**Round 2 — the boundaries.** What is out of scope? What must not change?
Which existing behaviour is load-bearing for others? Unstated
invariants turn a correct change into a regression.

**Round 3 — the edges.** What inputs are hostile, empty, or duplicated?
What if a dependency is unavailable? Ask only where the answer
changes the implementation.

## Output

A spec with three sections: **Done when** (criteria that can fail),
**Out of scope** (what this does not touch), **Open** (what remains
unanswered, and what would settle it). Every criterion must be
checkable; anything you cannot phrase that way goes under Open.

## Rules

- One round is a batch of questions, not one question. Do not spend a
  round on what the repository could answer — read it instead.
- Never invent a criterion. An unanswered question belongs under Open.
- Hand off: the finished spec goes to plan when work is multi-step.
- If the user says to proceed without further questions, stop asking.
  Write what you have as an artifact, hand it over. Do not modify
  files or delegate execution on an unfinished interview.
