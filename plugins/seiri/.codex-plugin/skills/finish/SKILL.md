---
name: finish
user-invocable: true
description: 'Close out the requested development branch: integrate, push for review, keep, or discard. Match verification to that choice and the task scope.'
argument-hint: '[branch]'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# finish — verified first, then the user chooses



You were invoked by the user, so ask what the decision needs. The integration choice is theirs; the verification is yours.

## Workflow

**0. Identify this work.** Read the relevant plan and, if it has a ledger, call `mcp__seiri__gates({ action: "status", task })`. Do not let unrelated task ledgers govern this branch. Preserve task records.

**1. Establish the state.** Inspect changes and valid verification evidence. Integration requires the repository's designated checks. Missing or failing checks must be disclosed; they do not prevent the user from keeping the branch or requesting review of incomplete work.

**2. Present the real options, with the branch's state.** Ahead/behind its base, uncommitted files, where it diverged. Then, in one question: integrate into the base branch · push for review · keep as-is · discard.

**3. Execute the choice exactly.**

- Integrate: bring the base up to date, integrate, run verification again on the result — a merge that was never verified is not done.
- Push for review: push and open the request; keep the working state for iteration.
- Keep: report where everything stands and stop.
- Discard: destructive and irreversible. Name a backup ref first, require the user to type the word "discard", and only then delete.

**4. Close assistance and clean up only what this work created.** If this task used hooks, follow [workflow lifecycle](../execute/references/workflow-lifecycle.md) and call `finish` for it whatever the user chose — integrate, push for review, keep, or discard: invoking this skill is the deliberate close. Later work on the same task re-enters through its entry step or `start`. Do not start assistance just to close a branch. A workspace the harness or the user owns stays untouched.

## Rules

- No force-push and no history rewriting unless the user explicitly asks for exactly that.
- Deletion without a named backup and a typed confirmation is off limits, regardless of how sure anyone is.
- If the user says to proceed without further questions, take the safest option that satisfies the request and report what you chose.
