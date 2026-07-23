---
name: interview
user-invocable: true
disable-model-invocation: true
description: '[seiri:interview] Turn a vague request into acceptance criteria that can fail — bounded rounds of questions, ending in a written spec. Trigger: "interview me", "pin down the requirements", "요구사항 정리해줘"'
argument-hint: '<the request to pin down>'
version: '0.2.0'
complexity: moderate
plugin: seiri
---

# interview — turn a request into criteria that can fail

You were invoked by the user, so questions are welcome. The output is a short spec whose every line could be checked.

## Workflow

Read the repository first — never spend a question on what the code answers.

Then question along four angles of clarity: **Goal**, **Constraints**, **Success criteria**, and, in an existing codebase, **Context**. Each round, aim at whichever angle is least clear and say in one line why it is the bottleneck now. A question exposes an assumption; it does not collect a feature list. Definitions, the weak-signal per angle, and question shapes are in `references/dimensions.md`.

A round is a batch of questions, not one at a time. Run at most three, then write the spec with what you have and mark the gaps.

Judge convergence by observation, not a score — stop when the request stops changing under questioning. The signals, and how to shift angle when you stall, are in `references/convergence.md`.

## Output

A spec in three sections: **Done when** (criteria that can fail), **Out of scope** (what this does not touch), **Open** (what remains unanswered, and what would settle it). Every criterion must be checkable; anything you cannot phrase that way goes under Open.

## Rules

- Never invent a criterion. An unanswered question belongs under Open.
- Hand off: the finished spec goes to write-plan when the work is multi-step.
- If the user says to proceed without further questions, stop asking. Write what you have as an artifact, hand it over. Do not modify files or delegate execution on an unfinished interview.
