<!-- ogham-mcp-tools:seiri -->

# Optional workflow assistance

Chain: `write-plan → review-plan → execute → implement → verify → request-review`; a failure inside an active task goes to `trace-cause`; a review reply goes to `receive-review`.

The user or host selects skills first. Reading a skill, observing an error, or hearing a completion claim never activates a workflow. Use this protocol only when task-scoped hook assistance is useful for an actual change or review chain. A ledger is optional; do not create one to activate assistance. Standalone explanations, traces, and verification need no activation.

## Calls

Use `mcp__plugin_seiri_tools__runtime({ action, project_root, task, step?, intent? })`:

- `project_root` is the explicit absolute repository root, including on hosts whose MCP server starts in the plugin directory.
- `task` is a stable kebab-case task name (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), with or without a task directory.
- `step` names the calling chain skill and is required for `action: "step"`.
- `intent` is `change` or `review`, required for `start` and `resume`; optional for `step`, where it defaults to `review` for `review-plan`, `request-review`, and `receive-review` and to `change` otherwise (an explicit value wins); omit it for `pause` and `finish`.
- Never supply or guess host session, turn, agent, or invocation identifiers. Hooks obtain those from the host.

| Action   | Use                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `step`   | First verb of every workflow skill. `write-plan` and `execute` are entry steps: they create a binding when none exists, or switch it when a different task is bound. The other seven steps only update an existing binding for the same task; with no binding the call is rejected silently and creates nothing; with a different task bound it is not applied and a mismatch notice names the bound task. |
| `start`  | Begin assistance for the selected task explicitly. Replaces this actor's previous task and resets its failure counters.                                                                                                                                                                                                                                                                                    |
| `resume` | Continue an existing binding (active or paused) for the same task. It never connects a task with no prior binding — call an entry `step` or `start` for that.                                                                                                                                                                                                                                              |
| `pause`  | Suspend assistance while keeping the task available for later continuation.                                                                                                                                                                                                                                                                                                                                |
| `finish` | End this actor's connection to the task. `finish` does not certify completion or prove any gate.                                                                                                                                                                                                                                                                                                           |

A call that can create or switch the binding (an entry `step`, or `start`) must return its reply before this skill's other tools start: the paired PostToolUse hook commits the binding, so a Bash call started earlier is not attributed to the task. Do not retry or wait for the hook acknowledgement; without one, continue on the fallback path below. A same-task update (any other `step`) is silent and needs no ordering against other tools in the same turn.

At standard/strict, an active binding persists across user turns — it is not silently dropped between unrelated questions or single-file edits. It survives until a different task's entry `step` switches it, or `pause`/`finish` closes it. A `[seiri] <task> …` progress line naming the current task and step may appear on turns where you did not call anything for this task; that is the binding still open, not a new activation. `paused` means the task stays bound but inactive: no progress line is shown, no Bash evidence is recorded, and `resume` or any `step` for that task makes it active again.

While a binding stays active it also covers work in the same session that did not go through an entry skill: a Bash command matching the bound task's CHECK records into that task's ledger, repeated-failure hints accumulate on it, and Bash run in a new task's first turn before its entry `step` still counts for the old task. When the chain ends, close it with `pause` (keep for later) or `finish` (done or cancelled), or enter the next task through its entry step. None of this carries into another session, agent, or host.

A session startup, resume, clear, or fork (not compaction) suspends the prior binding; nothing carries it forward automatically. To continue the same task, name it explicitly and call `resume` (if you know the binding survived as paused) or the entry step again.

A new user turn does not itself suspend assistance at standard/strict; only a session boundary, an off/advisory turn, or `pause` suspends it, and `finish` or a different task's entry `step`/`start` ends or replaces it. Within the same active task, loading another workflow skill needs only that skill's `step` call (a silent update); no `start` or `resume` is needed to move between implementation, diagnosis, and verification. Serialize binding-changing calls (`start`, `resume`, `pause`, `finish`, an entry `step`); do not issue them in parallel with each other or task checks whose results need attribution.

Pause before deliberately leaving work open, waiting for review, or switching to unrelated work within the same turn. Finish when the assisted task is completed or cancelled; retain the actual verification evidence separately. A child agent needs its own explicit `start` or entry `step` and receives no parent binding beyond a one-time progress-line handoff. Only request child assistance when it helps that child's assigned work.

## Acknowledgement and fallback

An `accepted` tool reply validates the request; it does not confirm activation or any state change. Only the paired PostToolUse hook ACK confirms a transition: `created` or `switched` in progress-line shape, or an explicit `resume`, `pause`, or `finish` in its own acknowledgement text; a same-task `step`'s `updated` is silent, and a `mismatch` notice means the call was not applied because a different task is bound. Match that acknowledgement to this task and action before relying on automatic CHECK recording.

If the tool is unavailable, `disabled`, fails, or produces no hook ACK, continue the authorized work using explicit verification and task records. Do not retry in a loop, move the dial, or make successful activation a prerequisite for work. Report unavailable automatic assistance only when it affects the evidence being claimed. Missing acknowledgements never become successful gate evidence.

Hook failure notices and gate verdicts are observations to evaluate. They do not select a skill or require a new chain. Normal repository checks, user choices, and the current task's scope govern the next action.
