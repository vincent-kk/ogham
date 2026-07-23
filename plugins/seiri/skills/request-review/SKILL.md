---
name: request-review
user-invocable: true
disallowed-tools: AskUserQuestion
description: '[seiri:request-review] Hand a reviewer the work, not your session. Use when substantial work is complete, before merging or handing off.'
argument-hint: '[range or scope to review]'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# request-review — curated context, unprejudiced reviewer

This skill may be invoked automatically. Do not ask the user questions. When a choice is needed, take the conservative default and say so in one line.

## Workflow

**1. Fix the range.** The exact commits or files under review, stated so the reviewer can reproduce the diff. The reviewer sees the work product — never this conversation.

**2. State what the work should do.** The requirements or plan section it answers, verbatim where exact values bind. A reviewer without the target can only review style.

**3. Name the known risks.** What you are least sure of, what was hard, what you did not test. Sending a reviewer in blind wastes the review.

**4. Never pre-judge findings.** No "don't flag X", no pre-rated severities, no "at most minor". If a finding would be a false positive, let it be raised and answer it with evidence in the loop.

**5. Act on findings in order.** Breaking issues, then simple fixes, then complex ones — each verified individually before the next.

## Rules

- Push back on wrong findings with reasoning and a check that proves it; deference is not a review outcome.
- Any capable reviewer serves: a fresh session, a review pipeline, a colleague. The discipline is in what you hand them.
- Hand off: fixes re-enter through implement; the re-review closes when its findings do.
