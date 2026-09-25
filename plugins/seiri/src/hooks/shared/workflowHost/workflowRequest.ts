import { realpathSync } from 'node:fs';

import { samePath } from '@ogham/cross-platform';

import { parseWorkflowRequest } from '../../../core/sessionSignals/workflow/parseWorkflowRequest.js';
import { findRepoRoot } from '../../../core/utils/findRepoRoot.js';
import type {
  WorkflowHostAdapter,
  WorkflowRequest,
} from '../../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../workflowAdapter.js';

/** Restrict lifecycle effects to this plugin's two compiled tool addresses. */
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
