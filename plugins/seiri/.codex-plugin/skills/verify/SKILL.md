---
name: verify
user-invocable: true
description: 'Check evidence for a completion or correctness claim. Verify the relevant artifact and scope, reusing evidence that remains valid.'
argument-hint: '[the claim to prove]'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# verify — run it, read it, then say it



This skill may be invoked automatically. Prefer autonomous judgment: when a choice is needed, take the conservative default and say so in one line. A genuine blocker — a decision only the user can resolve — earns one crisp AskUserQuestion; a routine checkpoint does not.

## The gate

Standalone verification does not activate a workflow. When continuing an assisted task, use [workflow lifecycle](../execute/references/workflow-lifecycle.md); reuse its active binding and finish or pause when the task ends or is left open.

**1. Name the command that would prove the claim — for a task on a ledger, that is its gate's CHECK.** No command names itself — "it should work" identifies nothing.

**2. Use valid evidence.** Run the relevant check against the changed artifact if evidence is absent or invalidated. Reuse a result only when artifact, environment, and scope still match, and identify its source. At a repository-mandated full-check boundary, run that check. Do not repeat it solely because another skill was loaded.

**3. Read the output.** Exit status, failure count, warnings — before any reaction to it.

**4. Claim only what the output shows, citing it.** If it does not support the claim, state the actual result instead. A disclosed failure beats a confident guess.

**5. Check the task's criteria.** If this task has a ledger, use `mcp__seiri__gates({ action: "status", task })` and do not claim an unmet criterion is complete. Without a ledger, verify the actual claim directly. Read-only explanations do not acquire implementation gates. State when a reported measurement was taken.

## What proof looks like

- "Tests pass" — identified output with zero failures, still valid for this artifact and environment.
- "Bug fixed" — the original symptom re-checked; its covering check fails on pre-fix code and passes now.
- A delegate's "done" — the diff inspected; the report is a claim, not evidence.
- "Requirements met" — each requirement checked off against the spec, not inferred from green tests.

## Rules

- Request review when substantial changes need it; a verified explanation does not automatically enter a development review chain. Integration remains the user's decision.
