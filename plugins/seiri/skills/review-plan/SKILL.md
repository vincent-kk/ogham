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

<!-- ogham-mcp-tools:seiri -->

Use when a plan has material uncertainty or needs independent review. Reuse a valid review of the same scope and repository state; ask only when a consequential choice is unresolved, and not again once independent review is already authorized.

## Workflow

Follow [workflow lifecycle](../execute/references/workflow-lifecycle.md). If a `[seiri]` progress line or workflow acknowledgement in this session names an active task, call `mcp__plugin_seiri_tools__runtime({ action: "step", step: "review-plan", project_root, task })` with that task and continue without waiting. If you are clearly performing a different task, call it with that task's name instead and follow its acknowledgement. Standalone use needs no call.

**1. Choose the depth autonomously.** State it briefly when it affects execution, and ground uncertain current-state claims. Seek independent challenge for consequential boundary changes, migrations, or unresolved risk — not for a new file or another author alone. Record why existing evidence suffices when reusing a review.

**2. Resolve the review contract.** Review the plan against its selected planning method and the common invariants. Confirm the method from the user's request, repository instructions, or host skill-selection rules — the plan's label records the choice but doesn't grant authority. Read the selected method before judging its structure. Apply the default method only when no other method was selected. Do not impose the default method's structure on a selected method.

**3. Ground every current-state claim.** Confirm existing paths, symbols, signatures, consumers, and commands with tools — never from memory or the plan's prose. Check requirement coverage in both directions without demanding a particular table or heading. Proposed files are expected absent; only current-state claims can fail grounding. Read commands without rehearsing them: a migration run during review is the damage it was meant to prevent. An unconfirmed claim is a finding, not a footnote. If this task has a ledger, review it too: every gate states a result not an activity, CHECK tests the actual result condition and emits its literal EXPECT marker only on success, and every reported number has a measuring gate. A command that only reports data needs an assertion before its success marker. A runnable gate without EXPECT is rework. A CHECK or EXPECT outside a Markdown code span is rework. A delegated challenge receives the ledger with the plan.

**4. Obtain the needed review.** If independent review is authorized and useful, give a separate reviewer the scope, original requirements, known risks, applicable rules, and any ledger, and continue independent work while it runs. Without it, call the verdict `grounded-only` rather than impersonate a second reviewer. Ask only when delegation needs authorization not already present.

**5. Return findings to the selected method, once.** Record `cleared`, `grounded-only`, or `rework-required` with every finding and its evidence in the selected method's normal review location; when it has none, use the plan file. Fixes follow that method plus the common invariants; a wrong approach reopens `/seiri:write-plan`, and changed claims receive one scoped recheck, never a second full review.

## Rules

- The verdict and every finding cite tool output or the reviewer's words — a review's claims are claims too.
- Documents follow the session's response language; machine-read tokens, identifiers, paths, code, and commands stay verbatim.
- Hand off: a `cleared` or `grounded-only` plan — or a stated skip — is `/seiri:execute`'s moment; `rework-required` hands back to `/seiri:write-plan`.
