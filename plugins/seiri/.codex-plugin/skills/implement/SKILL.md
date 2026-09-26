---
name: implement
user-invocable: true
description: 'Implement a behavior change with a check that fails without it. Use characterization for refactors and artifact checks for documentation or formatting changes.'
argument-hint: '[the change to make]'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# implement — no change without a failure seen first



This skill may be invoked automatically. Prefer autonomous judgment: when a choice is needed, take the conservative default and say so in one line. A genuine blocker — a decision only the user can resolve — earns one crisp AskUserQuestion; a routine checkpoint does not.

## Workflow

Within an assisted task, follow [workflow lifecycle](../execute/references/workflow-lifecycle.md). A routine edit needs no activation. If a `[seiri]` progress line or workflow acknowledgement in this session names an active task, call `mcp__seiri__runtime({ action: "step", step: "implement", project_root, task })` with that task and continue without waiting. If you are clearly performing a different task, call it with that task's name instead and follow its acknowledgement. Standalone use needs no call.

Choose verification for the change. Behavior changes follow the fail-first steps below. Refactors preserve existing assertions and add characterization before moving uncovered behavior. Documentation and formatting changes use the relevant artifact checks; do not invent an executable failure for prose.

**1. Write the check first.** Before any implementation, express what this change should make true as a check that can fail, using this repository's designated verification means. One behaviour, named for it.

**2. Watch it fail for the change's own reason.** Not a typo, not an unrelated missing import. When the change introduces a new symbol, a new symbol's absence is the expected pre-change failure; otherwise a missing import is a setup error. A check that passes before the change exists is testing something else — rewrite it until you have seen the right failure.

**3. Write the minimum that passes.** No options nobody asked for, no improving neighbours on the way through.

**4. Watch it pass, everything else still green.** Output clean. A new check passing while an old one breaks is not done.

**5. Clean up under green.** Names, duplication, extraction — without adding behaviour, keeping every check green.

## Rules

- This repository's explicit instructions outrank this sequence.
- Preserve useful exploration. Before claiming a behavior change works, demonstrate that its check fails on the pre-change behavior and passes with the change.
- Verify the actual claim before handing off — load `/seiri:verify`; reuse valid evidence from this implementation.
