---
name: trace-cause
user-invocable: true
disallowed-tools: AskUserQuestion
description: '[seiri:trace-cause] Trace a failure to where it started rather than where it surfaced. Use when a test fails, an error is thrown, or a fix did not hold.'
argument-hint: '[the failing test or symptom]'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# trace-cause — fix where it started

This skill may be invoked automatically. Do not ask questions. When a choice is needed, take the conservative default and say so in one line.

## Workflow

**1. Reproduce first.** Run this repo's designated verification command, capture the failure to a scratch file outside the repo, and quote it — re-running a suite to grep it differently pays twice. Without a reproduction there is nothing to verify a fix against; say so rather than guess.

**2. Separate where it appeared from where it lives.** The failing line is evidence, not the answer. Trace backward through the values that reached it to where state first went wrong.

**3. Confirm the cause before fixing.** Make the smallest change that would break if your explanation were wrong, and check it. An explanation that predicts nothing is a story.

**4. Fix, then prove it.** Run the same command, and confirm the test could have failed: it must fail against pre-fix code, for the bug's own reason. A test that passes with and without the change certifies the bug as handled.

## Red flags — stop

One symptom fixed twice · each fix revealing a new problem · "should work now" without fresh output · a passing run not confirmed to exercise edited code.

Repeated failure of one approach indicts the approach. Reconsider the assumption rather than patching again.

## Rules

- Cite tool output for every claim. Your reasoning about output is not output.
- Change only what the diagnosis requires; mention other findings.
- Hand off: completion claims go through verify-done.
- Report an unresolved cause plainly — a disclosed dead end beats a plausible fix nobody verified.
