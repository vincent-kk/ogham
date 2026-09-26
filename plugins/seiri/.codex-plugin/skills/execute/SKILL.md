---
name: execute
user-invocable: true
description: 'Carry a written plan to done without losing your place. Use when a plan has cleared review — or carries its stated skip — and the work is to perform it.'
argument-hint: '[path to the plan]'
version: '0.2.0'
complexity: moderate
plugin: seiri
---

# execute — the plan governs, the ledger remembers



This skill may be invoked automatically. Prefer autonomous judgment: when a choice is needed, take the conservative default and say so in one line. A genuine blocker — a decision only the user can resolve — earns one crisp AskUserQuestion; a routine checkpoint does not.

## Workflow

Follow [workflow lifecycle](references/workflow-lifecycle.md). Call `mcp__seiri__runtime({ action: "step", step: "execute", project_root, task })` with a kebab-case task name and read its reply before starting other tools in this skill; do not retry or wait for the hook acknowledgement. execute is entered with an approved plan or its stated skip; a single surgical change needs no call.

**0. Resume from the plan and its evidence.** If this task has a ledger, call `mcp__seiri__gates({ action: "status", task })`. Otherwise use the plan's completion criteria; do not create a ledger merely to run this skill.

**1. Read the plan critically before task one.** Contradictions, gaps that block starting, steps that fight the repository's conventions — report them in one batch, not one interrupt per discovery. Nothing blocking: begin.

**2. Close outcomes with evidence.** When a ledger exists, run its CHECKs and inspect the task's status; an unmet gate is not completed work. Reuse evidence only while its artifact, environment, and scope remain valid. A delegate's report needs inspection; rerun checks when their evidence is missing or invalidated. Record a deliberately omitted gate with its reason.

**3. Preserve the outcome and boundaries.** Adjust reversible implementation details as the repository provides better evidence. Record material deviations and reopen decisions whose assumptions fail. Use diagnosis for an unexplained failure; an expected red test or a corrected tool argument does not require a separate workflow.

**4. Do not pause between tasks to ask whether to continue.** The plan was the approval. Stop only for: a blocker you cannot resolve, ambiguity that genuinely prevents progress, or all tasks complete.

**5. Delegate with files, not history.** A delegated task gets its own task text, the interfaces it touches, and the constraints that bind it — never a paste of this session. A subagent inherits none of this session's instructions, so name the rule files the task must satisfy. The contract binds the return leg too: full output lands in a file and the reply carries a short status — whatever a delegate prints back stays resident in this session. Review arrives from the delegator, never from a reviewer the delegate spawns for itself — that is a second seat on the same diff.

## Rules

- Record material deviations in the plan or its ledger with the reason.
- Before handing off substantial changes, complete the repository's required verification and any needed review — load `/seiri:request-review` for the work. Reuse valid evidence; integration remains the user's decision. Suggest `/seiri:finish` to the user to close the task.
