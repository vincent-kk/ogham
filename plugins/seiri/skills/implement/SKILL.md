---
name: implement
user-invocable: true
disallowed-tools: AskUserQuestion
description: '[seiri:implement] Prove a change with a failure you watched. Use when implementing any feature or bugfix, before writing the implementation.'
argument-hint: '[the change to make]'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# implement — no change without a failure seen first

This skill may be invoked automatically. Do not ask the user questions.
When a choice is needed, take the conservative default and say so in one
line.

## Workflow

**1. Write the check first.** Before any implementation, express what
this change should make true as a check that can fail, using this
repository's designated verification means. One behaviour, named for it.

**2. Watch it fail for the change's own reason.** Not a typo, not a
missing import. A check that passes before the change exists is testing
something else — rewrite it until you have seen the right failure.

**3. Write the minimum that passes.** No options nobody asked for, no
improving neighbours on the way through.

**4. Watch it pass, everything else still green.** Output clean. A new
check passing while an old one breaks is not done.

**5. Clean up under green.** Names, duplication, extraction — without
adding behaviour, keeping every check green.

## Rationalizations

| Excuse                         | Reality                                |
| ------------------------------ | -------------------------------------- |
| "Too simple to break"          | Simple code breaks; the check is cheap |
| "I'll add checks after"        | A check born passing proves nothing    |
| "Already verified it by hand"  | No record, nothing re-runs             |
| "Deleting the draft wastes it" | Unverified code is the waste           |

## Rules

- This repository's explicit instructions outrank this sequence.
- Exploring is fine — throw the exploration away and start from the
  check.
- Hand off: completion claims go through verify-done.
