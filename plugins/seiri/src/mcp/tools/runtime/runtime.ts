import type { WorkflowReply, WorkflowRequest } from '../../../types/workflow.js';

import type { DialOp, DialResult } from './handlers/applyDial.js';
import { applyDial } from './handlers/applyDial.js';
import { handleWorkflow } from './handlers/handleWorkflow.js';

/** Every action the runtime tool accepts, participation plus the dial valve. */
export type RuntimeAction = WorkflowRequest['action'] | 'dial';

/** Raw arguments of one runtime tool call. */
export interface RuntimeInput {
  /** Participation transition, or `dial`. */
  action: RuntimeAction;
  /** Workspace root; must be absolute. */
  project_root: string;
  /** Required for participation actions; unused by `dial`. */
  task?: string;
  /** Required for `start` and `resume`; unused by `dial`. */
  intent?: WorkflowRequest['intent'];
  /** For `dial`, default `get`; unused by participation actions. */
  dial_op?: DialOp | null;
  /** Dial position for `dial_op: "set"`; unused by participation actions. */
  intervention?: string | null;
}

/** Participation reply or dial result. */
export type RuntimeOutput = WorkflowReply | DialResult;

/**
 * Dispatch one runtime tool call by its explicit action.
 * @param input Raw MCP tool call arguments.
 * @returns The dial's read or write result for `action: "dial"`; otherwise the participation reply from {@link handleWorkflow}.
 * @throws When `dial_op: "set"` is missing a valid `intervention`, when a participation request fails validation, or when `project_root` is not absolute.
 */
export function handleRuntime(input: RuntimeInput): RuntimeOutput {
  if (input.action === 'dial')
    return applyDial(
      input.project_root,
      input.dial_op ?? 'get',
      input.intervention,
    );
  return handleWorkflow(input);
}
