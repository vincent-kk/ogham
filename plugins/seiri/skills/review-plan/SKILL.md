---
name: review-plan
user-invocable: true
description: '[seiri:review-plan] Prove the plan before performing it. Use when a plan lands, before executing it — a plan is a set of claims about the repository, and claims want evidence.'
argument-hint: '[path to the plan]'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# review-plan — the plan is a claim set; prove it before it runs

This skill may be invoked automatically. It acts before execution — the cheap moment to be wrong — so its one focused question needs no blocker; everywhere else, prefer autonomous judgment: take the conservative default and say so in one line. The question's moment here is the challenge fork: delegate the review, or proceed on grounding alone.

## Workflow

**1. Triage out loud.** One line names the depth and why. _Skip_ only a plan that already carries its evidence — requirements mapped to tasks and claims confirmed with recorded tool output. _Ground_ is the default for every plan. _Challenge_ when a trigger holds: the blast radius that lets write-plan ask (a broad refactor, a new module or feature), a hard-to-reverse step (deletion, migration, a public-contract change), or a plan this session did not write — inherited claims have no session evidence at all. A silent skip is the failure mode; a stated one is a judgment.

**2. Ground every claim.** A plan is claims about the repository: paths, symbols, signatures, commands. Confirm each claim about what exists now with a tool — the file read, the symbol grepped, its consumers swept, requirements mapped to tasks both ways — never from memory or from the plan's own prose. What the plan will create is expected to be absent; only current-state claims can fail grounding. Confirm the plan's commands by reading them, never by rehearsing them — a migration run during review is the damage it was meant to prevent. An unconfirmed claim is a finding, not a footnote. Gates are claims too: each is a result, not an activity; its EXPECT appears only on success; the CHECK exits 0 on success (or EXPECTs against stderr); every number the report will state has a gate that measures it. A delegated challenge receives the ledger with the plan.

**3. Hand off or proceed** (challenge only). No trigger: record the verdict and move on. A trigger holds: ask the one question — hand the review to unprejudiced eyes, or proceed on grounding alone. Delegation hands the package `/seiri:request-review` demands — scope, the original requirements verbatim, known risks, the rule files that bind — and ends the turn; any capable reviewer serves, and it inherits none of this session's context. Skipping it leaves the verdict `grounded-only`, never a cleared challenge.

**4. Findings re-enter the plan, once.** Record the verdict in the plan file — `cleared`, `grounded-only`, or `rework-required` — with each finding and its evidence. Fixes land to write-plan's own standard; a wrong approach reopens `/seiri:write-plan`. Rework earns one scoped recheck of the claims it changed, never a second full review.

## Rules

- The verdict and every finding cite tool output or the reviewer's words — a review's claims are claims too.
- Hand off: a `cleared` or `grounded-only` plan — or a stated skip — is `/seiri:execute`'s moment; `rework-required` hands back to `/seiri:write-plan`.
