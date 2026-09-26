---
name: trace-cause
user-invocable: true
description: 'Diagnose an unexplained failure or a fix that did not hold. Skip expected red tests, search no-match results, and straightforward tool-input corrections.'
argument-hint: '[the failing test or symptom]'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# trace-cause — fix where it started

This skill may be invoked automatically. Prefer autonomous judgment: when a choice is needed, take the conservative default and say so in one line. A genuine blocker — a decision only the user can resolve — earns one crisp AskUserQuestion; a routine checkpoint does not.

## Workflow

Standalone diagnosis does not activate a workflow. Return to the enclosing task; use [workflow lifecycle](../execute/references/workflow-lifecycle.md) only if an actual change chain needs assistance.

First distinguish an unexplained defect from an expected red test, a search with no matches, or a straightforward tool-input correction. Correct the latter locally and continue the original task.

**1. Reproduce first.** Use the reported symptom's reproduction command; use this repo's designated verification command when it reproduces that symptom. Capture the failure to a scratch file outside the repo, and quote it — re-running a suite to grep it differently pays twice. Without a reproduction there is nothing to verify a fix against; say so rather than guess.

**2. Separate where it appeared from where it lives.** The failing line is evidence, not the answer. Trace backward through the values that reached it to where state first went wrong.

**3. Confirm the cause before fixing.** Make the smallest change that would break if your explanation were wrong, and check it. An explanation that predicts nothing is a story.

**4. Fix, then prove it.** Run the same reproduction command, and confirm the check could have failed: it must fail against pre-fix code, for the bug's own reason. A check that passes with and without the change certifies the bug as handled.

## Rules

- A fix that did not hold reopens step 2 — record the refuted explanation and trace again; never patch the same symptom twice.
- Change only what the diagnosis requires; mention other findings.
- Hand off: after a fix, before declaring done, load `/seiri:verify`.
- Report an unresolved cause plainly — a disclosed dead end beats a plausible fix nobody verified.
