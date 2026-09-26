import { realpathSync } from 'node:fs';

import { findRepoRoot } from '../../../core/utils/findRepoRoot.js';
import type { HookBaseInput } from '../../../types/hooks.js';
import type {
  WorkflowHostAdapter,
  WorkflowIdentity,
} from '../../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../workflowAdapter.js';

import { workflowHash } from './workflowHash.js';

/**
 * Resolve native provenance using the adapter fixed at build time.
 * Child turns hash the native agent ID independently of the parent's turn;
 * resumed-child boundaries invalidate stale calls through generation changes.
 * @param input Hook payload; `cwd` and `session_id` must both be present or the call yields `undefined`.
 * @param adapter Host adapter fixed at build time; supplies the namespace and native turn reader.
 * @returns The hashed actor identity, with an agent-stable child `turn` or the main actor's reported native turn, and `call` only when reported; `undefined` when `cwd`/`session_id` are missing or the repository root cannot be resolved.
 */
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
  const turn = input.agent_id
    ? JSON.stringify(['agent', input.agent_id])
    : adapter.turn(input);
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
