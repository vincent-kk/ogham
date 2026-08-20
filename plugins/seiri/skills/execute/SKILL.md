---
name: execute
user-invocable: true
description: '[seiri:execute] Carry a written plan to done without losing your place. Use when a plan has cleared review — or carries its stated skip — and the work is to perform it.'
argument-hint: '[path to the plan]'
version: '0.2.0'
complexity: moderate
plugin: seiri
---

# execute — the plan governs, the ledger remembers

This skill may be invoked automatically. Prefer autonomous judgment: when a choice is needed, take the conservative default and say so in one line. A genuine blocker — a decision only the user can resolve — earns one crisp AskUserQuestion; a routine checkpoint does not.

## Workflow

**1. Read the plan critically before task one.** Contradictions, gaps that block starting, steps that fight the repository's conventions — report them in one batch, not one interrupt per discovery. Nothing blocking: begin.

**2. Keep a progress ledger beside the plan.** One line per completed task: what landed, where, how it was verified. Conversation memory does not survive compaction — after any resume, trust the ledger and the version history over recollection, and never redo a task the ledger marks complete.

**3. Per task, follow the steps exactly.** The implement discipline carries each change; verify closes the task; a failure mid-task is trace-cause's job, not a cue to improvise around the plan.

**4. Do not pause between tasks to ask whether to continue.** The plan was the approval. Stop only for: a blocker you cannot resolve, ambiguity that genuinely prevents progress, or all tasks complete.

**5. Delegate with files, not history.** A delegated task gets its own task text, the interfaces it touches, and the constraints that bind it — never a paste of this session. A subagent inherits none of this session's instructions, so name the rule files the task must satisfy. The contract binds the return leg too: full output lands in a file and the reply carries a short status — whatever a delegate prints back stays resident in this session. Review arrives from the delegator, never from a reviewer the delegate spawns for itself — that is a second seat on the same diff.

## Rules

- Deviations from the plan are recorded in the ledger with the reason, in the same turn they happen.
- All tasks done: run this repository's designated verification in full, then hand off — load `/seiri:request-review` for the work; suggest `/seiri:finish` to the user for the integration decision.
