import { realpathSync } from 'node:fs';

import { findRepoRoot } from '../../../core/utils/findRepoRoot.js';
import type { HookBaseInput } from '../../../types/hooks.js';
import type {
  WorkflowHostAdapter,
  WorkflowIdentity,
} from '../../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../workflowAdapter.js';

import { workflowHash } from './workflowHash.js';

/** Resolve native provenance using the adapter fixed at build time. */
export function workflowIdentity(
  input: HookBaseInput,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
): WorkflowIdentity | undefined {
  if (!input.cwd || !input.session_id) return undefined;
  let root: string;
  try {
    root = findRepoRoot(realpathSync(input.cwd));
  } catch {
    return undefined;
  }
  const turn = adapter.turn(input);
  return {
    root,
    actor: workflowHash(
      JSON.stringify([
        adapter.name,
        input.session_id,
        input.agent_id ?? 'main',
      ]),
    ),
    ...(turn ? { turn: workflowHash(turn) } : {}),
    ...(input.tool_use_id ? { call: workflowHash(input.tool_use_id) } : {}),
  };
}
