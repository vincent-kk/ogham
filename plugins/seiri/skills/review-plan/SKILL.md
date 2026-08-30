---
name: review-plan
user-invocable: true
description: 'Review a plan against its selected planning method, common invariants, and repository evidence before execution.'
argument-hint: '[path to the plan]'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# review-plan — respect the method; prove the claims

This skill may be invoked automatically. It acts before execution — the cheap moment to be wrong — so its one focused question needs no blocker; everywhere else, prefer autonomous judgment: take the conservative default and say so in one line. The question's moment here is the challenge fork: delegate the review, or proceed on grounding alone.

## Workflow

**1. Triage out loud.** One line names the depth and why. _Skip_ only a plan that already identifies its planning method and carries reproducible evidence for its current-state claims and requirement coverage. _Ground_ is the default for every plan. _Challenge_ when a trigger holds: a broad refactor, a new module or feature, a hard-to-reverse step (deletion, migration, a public-contract change), or a plan this session did not write. A silent skip is the failure mode; a stated one is a judgment.

**2. Resolve the review contract.** Review the plan against its selected planning method and the common invariants. Confirm the method from the user's request, repository instructions, or the host's skill-selection rules — the plan's own label records the choice but does not grant it authority. Read the selected method before judging its structure. Apply the default method only when no other method was selected. Do not impose the default method's structure on a selected method.

**3. Ground every current-state claim.** Confirm existing paths, symbols, signatures, consumers, and commands with tools — never from memory or the plan's prose. Check requirement coverage in both directions without demanding a particular table or heading. Proposed files are expected to be absent; only claims about what exists now can fail grounding. Read commands but do not rehearse them: a migration run during review is the damage it was meant to prevent. An unconfirmed claim is a finding, not a footnote. When `/seiri:execute` will perform the plan, review its ledger too: every gate states a result rather than an activity, CHECK produces EXPECT only on success, and every reported number has a measuring gate. A runnable gate without EXPECT is rework. A CHECK or EXPECT outside a Markdown code span is rework. A delegated challenge receives the ledger with the plan.

**4. Hand off or proceed** (challenge only). No trigger: record the verdict and move on. A trigger holds: ask the one question — hand the review to unprejudiced eyes, or proceed on grounding alone. Delegation hands the package `/seiri:request-review` demands — scope, the original requirements verbatim, known risks, the rule files that bind — and ends the turn; any capable reviewer serves, and it inherits none of this session's context. Skipping it leaves the verdict `grounded-only`, never a cleared challenge.

**5. Return findings to the selected method, once.** Record `cleared`, `grounded-only`, or `rework-required` with every finding and its evidence in the selected method's normal review location; when it has none, use the plan file. Fixes follow that method plus the common invariants. A wrong approach reopens `/seiri:write-plan`; changed claims receive one scoped recheck, never a second full review.

## Rules

- The verdict and every finding cite tool output or the reviewer's words — a review's claims are claims too.
- Documents follow the session's response language; machine-read tokens, identifiers, paths, code, and commands stay verbatim.
- Hand off: a `cleared` or `grounded-only` plan — or a stated skip — is `/seiri:execute`'s moment; `rework-required` hands back to `/seiri:write-plan`.
