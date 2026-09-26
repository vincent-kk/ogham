# setup — Session boundary and chain election

## Purpose

Suspend existing actor participation on native session startup, resume, clear, or fork; preserve it across compaction. In standard/strict, state the stable chain and an election line at each session start, resume, clear, fork, and compaction, alongside an active-rule-status summary the render composes independently of any binding. At compact, when this actor's own binding is active, its progress line is read back and appended last so the task stays visible right after compaction.

## Conventions

- SessionStart can lack a turn ID; suspend the build-selected host's existing actor without creating an anchor.
- Rule deployment stays an explicit settings operation; this hook only reports status.
- Election, posture, and rule-summary text live in `hooks/setup/render/`, kept out of every other hook's bundle; the one-line chain comes from `WORKFLOW_CHAIN_LINE` (`constants/workflowChain.ts`) via `renderPostureLines`, the same source UserPromptSubmit's fallback chain line reads through `hooks/shared/progressLine/`. The compact progress line reuses `renderProgressLine` from `hooks/shared/progressLine/`, the same function and arguments UserPromptSubmit uses for an active binding.

## Boundaries

### Always do

- Return nonblocking results and leave stdout empty under off/advisory.
- Delegate state suspension to the actor store.
- Render the election and chain lines even when rule status cannot be read.

### Ask first

- Change which native session events preserve participation.
- Change the election or chain wording.

### Never do

- Force a skill call from the election line, inspect all ledgers, or infer participation from installed rules.
- Write deployed rule files or create a workflow binding.
