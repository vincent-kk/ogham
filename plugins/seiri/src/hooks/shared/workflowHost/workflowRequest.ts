import { realpathSync } from 'node:fs';

import { samePath } from '@ogham/cross-platform';

import { parseWorkflowRequest } from '../../../core/sessionSignals/workflow/parseWorkflowRequest.js';
import { findRepoRoot } from '../../../core/utils/findRepoRoot.js';
import type {
  WorkflowHostAdapter,
  WorkflowRequest,
} from '../../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../workflowAdapter.js';

/**
 * Restrict lifecycle effects to this plugin's two compiled tool addresses.
 * @param tool Native tool name from the hook payload; must equal `adapter.workflowTool` or the call yields `undefined`.
 * @param input Raw tool input to parse as a {@link WorkflowRequest}.
 * @param cwd Calling host's working directory; its repository root must match `request.project_root`'s.
 * @param adapter Host adapter fixed at build time; supplies the compiled workflow tool address.
 * @returns The parsed request, or `undefined` when the tool does not match, the input does not parse, or the two paths resolve to different repository roots.
 */
export function workflowRequest(
  tool: string,
  input: unknown,
  cwd: string,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
): WorkflowRequest | undefined {
  if (tool !== adapter.workflowTool) return undefined;
  const request = parseWorkflowRequest(input);
  if (!request) return undefined;
  try {
    return samePath(
      findRepoRoot(realpathSync(cwd)),
      findRepoRoot(realpathSync(request.project_root)),
    )
      ? request
      : undefined;
  } catch {
    return undefined;
  }
}
