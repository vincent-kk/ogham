import { randomUUID } from 'node:crypto';

import type {
  HookOutput,
  PostToolUseFailureInput,
  PostToolUseInput,
} from '../../../types/hooks.js';
import type { WorkflowRequest } from '../../../types/workflow.js';
import { processToolOutcome } from '../../postToolUse/index.js';
import { processToolStart } from '../../preToolUse/index.js';
import { CLAUDE_WORKFLOW_ADAPTER } from '../../shared/workflowAdapters/claude.js';
import { CODEX_WORKFLOW_ADAPTER } from '../../shared/workflowAdapters/codex.js';
import { processSubagentStart } from '../../subagentStart/index.js';
import { processUserPromptSubmit } from '../../userPromptSubmit/index.js';

/** Synthetic native provenance for one explicitly participating test actor. */
interface WorkflowActorOptions {
  task?: string;
  session_id?: string;
  prompt_id?: string;
  turn_id?: string;
  agent_id?: string;
}

/**
 * Establish a trusted boundary and pair the actor's explicit workflow start.
 * @param cwd Isolated repository root.
 * @param options Task and native actor provenance; turn_id selects Codex.
 * @returns Lifecycle acknowledgment, or silence when the dial disables it.
 */
export function activateWorkflow(
  cwd: string,
  options: WorkflowActorOptions = {},
): HookOutput {
  const adapter =
    options.turn_id === undefined
      ? CLAUDE_WORKFLOW_ADAPTER
      : CODEX_WORKFLOW_ADAPTER;
  const native = {
    cwd,
    session_id: options.session_id ?? 'session-a',
    ...(options.turn_id === undefined
      ? { prompt_id: options.prompt_id ?? 'turn-a' }
      : { turn_id: options.turn_id }),
    ...(options.agent_id === undefined ? {} : { agent_id: options.agent_id }),
  };
  if (options.agent_id === undefined)
    processUserPromptSubmit(
      { ...native, hook_event_name: 'UserPromptSubmit' },
      adapter,
    );
  else
    processSubagentStart(
      { ...native, hook_event_name: 'SubagentStart' },
      adapter,
    );
  const request: WorkflowRequest = {
    action: 'start',
    project_root: cwd,
    task: options.task ?? 'payment-refactor',
    intent: 'change',
  };
  const invocation = {
    ...native,
    tool_use_id: randomUUID(),
    tool_input: { ...request },
    tool_name: adapter.runtimeTool,
  };
  processToolStart({ ...invocation, hook_event_name: 'PreToolUse' }, adapter);
  const content = [
    {
      type: 'text',
      text: JSON.stringify({
        status: 'accepted',
        action: 'start',
        task: request.task,
        intent: 'change',
      }),
    },
  ];
  return processToolOutcome(
    {
      ...invocation,
      hook_event_name: 'PostToolUse',
      tool_response: options.turn_id === undefined ? content : { content },
    },
    adapter,
  );
}

/**
 * Observe a distinct Bash execution, preserving the supplied host result.
 * @param input Post payload whose native actor was explicitly activated.
 * @returns Result of the paired Post; repeated calls represent new executions.
 */
export function observeBash(
  input: PostToolUseInput | PostToolUseFailureInput,
): HookOutput {
  const adapter =
    input.turn_id === undefined
      ? CLAUDE_WORKFLOW_ADAPTER
      : CODEX_WORKFLOW_ADAPTER;
  const invocation = {
    ...input,
    tool_use_id: randomUUID(),
    ...(input.turn_id === undefined
      ? { prompt_id: input.prompt_id ?? 'turn-a' }
      : {}),
  };
  processToolStart({ ...invocation, hook_event_name: 'PreToolUse' }, adapter);
  return processToolOutcome(invocation, adapter);
}
