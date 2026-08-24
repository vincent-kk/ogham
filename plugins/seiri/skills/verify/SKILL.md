---
name: verify
user-invocable: true
description: 'Evidence before claims. Use when about to say done, fixed, or passing — before committing, merging, or moving to the next task.'
argument-hint: '[the claim to prove]'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# verify — run it, read it, then say it

This skill may be invoked automatically. Prefer autonomous judgment: when a choice is needed, take the conservative default and say so in one line. A genuine blocker — a decision only the user can resolve — earns one crisp AskUserQuestion; a routine checkpoint does not.

## The gate

**1. Name the command that would prove the claim — for a task on a ledger, that is its gate's CHECK.** No command names itself — "it should work" identifies nothing.

**2. Run it fresh and in full.** Not the cached result, not the subset that passed earlier, and against the artifact you actually changed — verification against the wrong build always passes.

**3. Read the output.** Exit status, failure count, warnings — before any reaction to it.

**4. Claim only what the output shows, citing it.** If it does not support the claim, state the actual result instead. A disclosed failure beats a confident guess.

**5. Ask the ledger.** `mcp__plugin_seiri_tools__gates({ action: "status", task })`: UNMET means the done-claim is `/seiri:execute`'s moment, not this one's. A number in the report is re-measured now or labelled unverified.

## What proof looks like

- "Tests pass" — this run's output, zero failures.
- "Bug fixed" — the original symptom re-checked; its covering check fails on pre-fix code and passes now.
- A delegate's "done" — the diff inspected; the report is a claim, not evidence.
- "Requirements met" — each requirement checked off against the spec, not inferred from green tests.

## Rules

- Hand off: substantial work loads `/seiri:request-review` before merging; the integration decision itself belongs to the user — suggest `/seiri:finish`.
