---
name: request-review
user-invocable: true
description: 'Hand a reviewer the work, not your session. Use when substantial work is complete, before merging or handing off.'
argument-hint: '[range or scope to review]'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# request-review — curated context, unprejudiced reviewer

This skill may be invoked automatically. Prefer autonomous judgment: when a choice is needed, take the conservative default and say so in one line. A genuine blocker — a decision only the user can resolve — earns one crisp AskUserQuestion; a routine checkpoint does not.

## Workflow

For an assisted chain, follow [workflow lifecycle](../execute/references/workflow-lifecycle.md): retain an active task during immediate review, pause while waiting, and finish when its work is complete. A review request alone needs no activation.

**1. Fix the range.** The exact commits or files under review, stated so the reviewer can reproduce the diff. The reviewer sees the work product — never this conversation.

**2. State what the work should do.** The requirements or plan section it answers, verbatim where exact values bind. Include relevant verification evidence and, when this task has a ledger, its status and every ABANDON reason. Do not create a ledger for a review-only request.

**3. Name the known risks.** What you are least sure of, what was hard, what you did not test. Sending a reviewer in blind wastes the review.

**4. Never pre-judge findings.** No "don't flag X", no pre-rated severities, no "at most minor". If a finding would be a false positive, let it be raised and answer it with evidence in the loop.

## Rules

- Use an actual handoff when independent review is needed. Reuse a still-valid review of the same scope; do not create a review cycle solely because another skill finished.

- Any capable reviewer serves: a fresh session, a review pipeline, a colleague. The discipline is in what you hand them.
- A delegated reviewer inherits none of this session's instructions. Name the rule files the work must satisfy and the verification command, in the request itself.
- Hand off: findings enter through `/seiri:receive-review` and fixes through `/seiri:implement`; the re-review closes when its findings do.
