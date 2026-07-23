---
name: verify
user_invocable: true
disallowed-tools: AskUserQuestion
description: '[seiri:verify] Evidence before claims. Use when about to say done, fixed, or passing — before committing, merging, or moving to the next task.'
argument-hint: '[the claim to prove]'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# verify — run it, read it, then say it

This skill may be invoked automatically. Do not ask the user questions.
When a choice is needed, take the conservative default and say so in one
line.

## The gate

**1. Name the command that would prove the claim.** No command names
itself — "it should work" identifies nothing.

**2. Run it fresh and in full.** Not the cached result, not the subset
that passed earlier, and against the artifact you actually changed —
verification against the wrong build always passes.

**3. Read the output.** Exit status, failure count, warnings — before
any reaction to it.

**4. Claim only what the output shows, citing it.** If it does not
support the claim, state the actual result instead. A disclosed failure
beats a confident guess.

## What proof looks like

- "Tests pass" — this run's output, zero failures.
- "Bug fixed" — the original symptom re-checked; its covering check
  fails on pre-fix code and passes now.
- A delegate's "done" — the diff inspected; the report is a claim, not
  evidence.
- "Requirements met" — each requirement checked off against the spec,
  not inferred from green tests.

## Red flags — stop

"Should work now" · satisfaction voiced before anything ran · citing an
earlier run as if it were this one · a green result you have not
confirmed exercises the changed code.

## Rules

- Hand off: substantial work goes to request-review before merging; the
  integration decision itself belongs to the user — suggest finish.
