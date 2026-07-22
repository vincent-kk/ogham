---
name: debug
user_invocable: true
disallowed-tools: AskUserQuestion
description: '[seiri:debug] Trace a failure to where it started rather than where it surfaced. Use when a test fails, an error is thrown, or a fix did not hold.'
argument-hint: '[the failing test or symptom]'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# debug — fix where it started

This skill may be invoked automatically. Do not ask the user questions.
When a choice is needed, take the conservative default and say so in one
line.

## Workflow

**1. Reproduce first.** Run this repository's designated verification
command, capture the failure to a scratch file outside the repository
tree, and quote that file — re-running a suite to grep it differently
pays twice. Without a reproduction there is nothing to verify a fix
against; say so rather than guessing.

**2. Separate where it appeared from where it lives.** The failing line
is evidence, not the answer. Trace backward through the values that
reached it, to the first place the state was already wrong.

**3. Confirm the cause before fixing.** Make the smallest change that
would break if your explanation were wrong, and check it. An explanation
that predicts nothing is a story.

**4. Fix, then prove it.** Run the same command, then confirm the test
could have failed: it must fail against pre-fix code, for the bug's own
reason. A test that passes with and without the change certifies the bug
as handled.

## Red flags — stop

The same symptom fixed twice · each fix revealing a new problem elsewhere
· "should work now" without fresh output · a passing run you have not
confirmed exercises the code you edited.

Repeated failure of one approach indicts the approach. Reconsider the
assumption rather than patching again.

## Rules

- Cite tool output for every claim. Your reasoning about output is not
  output.
- Change only what the diagnosis requires; mention other findings.
- Report an unresolved cause plainly — a disclosed dead end beats a
  plausible fix nobody verified.
