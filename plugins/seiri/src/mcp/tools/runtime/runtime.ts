import type {
  DirectiveLog,
  DirectiveOperation,
  DirectiveScope,
  DirectivesResult,
} from '../../../types/directives.js';
import type {
  WorkflowReply,
  WorkflowRequest,
} from '../../../types/workflow.js';

import type { DialOp, DialResult } from './handlers/applyDial.js';
import { applyDial } from './handlers/applyDial.js';
import { applyDirectives } from './handlers/applyDirectives.js';
import { handleWorkflow } from './handlers/handleWorkflow.js';

/** Participation, dial control, and directive management actions. */
export type RuntimeAction = WorkflowRequest['action'] | 'dial' | 'directives';

/** Raw arguments of one runtime tool call. */
export interface RuntimeInput {
  /** Participation transition, dial control, or directive operation. */
  action: RuntimeAction;
  /** Workspace root; must be absolute. */
  project_root: string;
  /** Required for participation actions; unused by `dial`. */
  task?: string;
  /** Required for action `step`; unused by other actions. */
  step?: WorkflowRequest['step'];
  /** Required for `start` and `resume`; optional (derived) for `step`; unused by `dial`. */
  intent?: WorkflowRequest['intent'];
  /** For `dial`, default `get`; unused by participation actions. */
  dial_op?: DialOp | null;
  /** Dial position for `dial_op: "set"`; unused by participation actions. */
  intervention?: string | null;
  /** Operation required by action `directives`. */
  directives_op?: DirectiveOperation;
  /** Kebab-case local directive set, required by action `directives`. */
  set?: string;
  /** Audience for bind, defaulting to this session. */
  scope?: DirectiveScope;
  /** Record that `append` extends. */
  log?: DirectiveLog;
  /** Entry content for `append`; nonblank, at most 1,000 characters. */
  text?: string;
}

/** Result of participation, dial control, or a directive operation. */
export type RuntimeOutput = WorkflowReply | DialResult | DirectivesResult;

/**
 * Dispatch one runtime tool call by its explicit action.
 * @param input Raw MCP tool call arguments.
 * @param now Clock value in epoch milliseconds, stamped on appended directive entries.
 * @returns The dial's read or write result for `action: "dial"`; the result of {@link applyDirectives} for directive operations; otherwise the participation reply from {@link handleWorkflow}.
 * @throws When `dial_op: "set"` is missing a valid `intervention`, when a participation request fails validation, or when `project_root` is not absolute.
 */
export function handleRuntime(input: RuntimeInput, now: number): RuntimeOutput {
  if (input.action === 'dial')
    return applyDial(
      input.project_root,
      input.dial_op ?? 'get',
      input.intervention,
    );
  if (input.action === 'directives')
    return applyDirectives(
      input.project_root,
      input.directives_op,
      input.set,
      input.scope,
      input.log,
      input.text,
      now,
    );
  return handleWorkflow(input);
}
