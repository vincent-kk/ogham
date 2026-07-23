---
name: write-plan
user-invocable: true
disallowed-tools: AskUserQuestion
description: '[seiri:write-plan] Write an implementation plan a stranger could execute without this conversation. Use when work spans multiple steps or sittings, before touching code.'
argument-hint: '[the spec or goal to plan]'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# write-plan — write it so the session is not needed

This skill may be invoked automatically. Do not ask the user questions.
When a choice is needed, take the conservative default and say so in one
line.

## Workflow

**1. Map the files first.** Name every file to create or modify, with
exact paths, and one responsibility each. Decomposition is decided here,
not mid-task.

**2. Cut tasks at reviewable seams.** A task is the smallest unit a
reviewer could reject while approving its neighbour, and it ends with an
independently verifiable deliverable. Fold scaffolding and config into
the task whose deliverable needs them.

**3. Write steps a stranger could run.** Exact paths, real code, real
commands with expected output. These are plan failures, not shorthand:
"TBD" · "add proper error handling" · "similar to task N" · a code step
with no code.

**4. Declare the interfaces between tasks.** What each task consumes
from earlier ones and produces for later ones — exact names, signatures,
types. A task's implementer sees only their own task.

**5. Self-review once, fix inline.** Every requirement maps to a task;
no placeholder patterns survive; names and signatures agree across
tasks. Fix what you find and move on — no re-review loop.

## Rules

- Save the plan where this repository already keeps them; if no
  convention exists, state where you put it in one line.
- Global constraints (versions, naming, platform limits) go in one
  header section, copied verbatim — every task inherits them.
- Hand off: an approved plan goes to execute. A single surgical change
  does not need a plan.
