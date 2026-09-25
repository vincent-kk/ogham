<!-- ogham-mcp-tools:seiri -->

# Optional workflow assistance

The user or host selects skills first. Reading a skill, observing an error, or hearing a completion claim never activates a workflow. Use this protocol only when task-scoped hook assistance is useful for an actual change or review chain. A ledger is optional; do not create one to activate assistance. Standalone explanations, traces, and verification need no activation.

## Calls

Use `mcp__plugin_seiri_tools__workflow({ action, project_root, task, intent })`:

- `project_root` is the explicit absolute repository root, including on hosts whose MCP server starts in the plugin directory.
- `task` is a stable kebab-case task name (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), with or without a task directory.
- `intent` is `change` or `review`, required for `start` and `resume`; omit it for `pause` and `finish`.
- Never supply or guess host session, turn, agent, or invocation identifiers. Hooks obtain those from the host.

| Action | Use |
| --- | --- |
| `start` | Begin assistance for the selected task. Replaces this actor's previous task and resets its failure counters. |
| `resume` | Continue the same suspended task after deciding the current request actually continues it. With no prior binding, connects that task; it cannot replace a different task. |
| `pause` | Suspend assistance while keeping the task available for later continuation. |
| `finish` | End this actor's connection to the task. `finish` does not certify completion or prove any gate. |

A new user turn silently suspends assistance. Resume only when the new request continues this chain; answer unrelated questions without resuming. Within the same active task, there is no extra lifecycle call for loading another skill or moving between implementation, diagnosis, and verification. Serialize lifecycle calls; do not issue them in parallel with each other or task checks whose results need attribution.

Pause before deliberately leaving work open, waiting for review, or switching to unrelated work within the same turn. Finish when the assisted task is completed or cancelled; retain the actual verification evidence separately. A child agent needs its own explicit `start` and receives no parent binding. Only request child assistance when it helps that child's assigned work.

## Acknowledgement and fallback

An `accepted` tool reply validates the request; it does not confirm activation or any state change. Only the paired PostToolUse hook ACK confirms the transition. Match that acknowledgement to this task and action before relying on automatic CHECK recording.

If the tool is unavailable, `disabled`, fails, or produces no hook ACK, continue the authorized work using explicit verification and task records. Do not retry in a loop, toggle settings, or make successful activation a prerequisite for work. Report unavailable automatic assistance only when it affects the evidence being claimed. Missing acknowledgements never become successful gate evidence.

Hook failure notices and gate verdicts are observations to evaluate. They do not select a skill or require a new chain. Normal repository checks, user choices, and the current task's scope govern the next action.
