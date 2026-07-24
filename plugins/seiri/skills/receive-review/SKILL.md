---
name: receive-review
user-invocable: true
disallowed-tools: AskUserQuestion
description: '[seiri:receive-review] Verify feedback against the code before implementing it. Use when review feedback arrives, before acting on any of it.'
argument-hint: '[the feedback]'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# receive-review — evaluate, then implement

This skill may be invoked automatically. Do not ask the user questions. When a choice is needed, take the conservative default and say so in one line.

## Workflow

**1. Read every item before acting on any.** Items relate; partial understanding produces wrong fixes.

**2. Check each claim against this codebase.** Does it hold here? Would the fix break something that works? Is there a reason the code is the way it is? Feedback describes a codebase the reviewer imagines — yours is the one that counts.

**3. Sound items: fix in order.** Breaking issues, then simple, then complex — each verified individually.

**4. Unsound items: push back with evidence.** A working check outranks an opinion. If you push back and turn out wrong, state the correction factually and fix it — no ceremony either way.

**5. Unclear items: do not guess.** Implementing a guess is worse than leaving it open. List each unclear item in one line; proceed with the clear ones.

## Rules

- No performative agreement — no "you're absolutely right", no thanks. Restate the requirement or act; the diff is the acknowledgment.
- Feedback that conflicts with the owner's earlier decisions goes back to the owner, not silently into the code.
- Hand off: changed code re-enters verify-done before any completion claim.
