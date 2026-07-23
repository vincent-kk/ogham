---
name: finish
user_invocable: true
disable-model-invocation: true
description: '[seiri:finish] Close out a development branch deliberately — verify, then choose integration. Trigger: "finish this branch", "wrap this up", "작업 마무리"'
argument-hint: '[branch]'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# finish — verified first, then the user chooses

You were invoked by the user, so ask what the decision needs. The
integration choice is theirs; the verification is yours.

## Workflow

**1. Verify before offering anything.** Run this repository's designated
verification in full. Failing: report what fails and stop — there is
nothing to finish yet.

**2. Present the real options, with the branch's state.** Ahead/behind
its base, uncommitted files, where it diverged. Then, in one question:
integrate into the base branch · push for review · keep as-is · discard.

**3. Execute the choice exactly.**

- Integrate: bring the base up to date, integrate, run verification
  again on the result — a merge that was never verified is not done.
- Push for review: push and open the request; keep the working state
  for iteration.
- Keep: report where everything stands and stop.
- Discard: destructive and irreversible. Name a backup ref first,
  require the user to type the word "discard", and only then delete.

**4. Clean up only what this work created.** A workspace the harness or
the user owns stays untouched.

## Rules

- No force-push and no history rewriting unless the user explicitly
  asks for exactly that.
- Deletion without a named backup and a typed confirmation is off
  limits, regardless of how sure anyone is.
- If the user says to proceed without further questions, take the
  safest option that satisfies the request and report what you chose.
