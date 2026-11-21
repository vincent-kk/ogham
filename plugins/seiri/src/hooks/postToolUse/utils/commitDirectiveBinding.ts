import { lstatSync } from 'node:fs';

import {
  canonicalizeTargetPathSync,
  portableIsAbsolute,
  samePath,
} from '@ogham/cross-platform';

import { updateDirectiveBinding } from '../../../core/directives/utils/updateDirectiveBinding.js';
import { findRepoRoot } from '../../../core/utils/findRepoRoot.js';
import type { PostToolUseInput } from '../../../types/hooks.js';
import type {
  WorkflowHostAdapter,
  WorkflowIdentity,
} from '../../../types/workflow.js';

/**
 * Commit a successful directive bind at the native main-actor boundary.
 * @param input Native successful PostToolUse payload.
 * @param adapter Runtime tool name and MCP result envelope for this host.
 * @param identity Resolved repository and hashed native actor.
 * @param now Epoch milliseconds used as the binding time.
 * @returns One acknowledgment when committed, or undefined on mismatch or failure.
 */
export function commitDirectiveBinding(
  input: PostToolUseInput,
  adapter: WorkflowHostAdapter,
  { actor, root }: WorkflowIdentity,
  now: number,
): string | undefined {
  if (input.agent_id !== undefined) return undefined;
  const {
    action,
    directives_op,
    project_root,
    set,
    scope = 'session',
  } = input.tool_input ?? {};
  if (
    action !== 'directives' ||
    directives_op !== 'bind' ||
    typeof project_root !== 'string' ||
    !portableIsAbsolute(project_root) ||
    typeof set !== 'string' ||
    (scope !== 'session' && scope !== 'all')
  )
    return undefined;

  const response = input.tool_response;
  if (
    !response ||
    typeof response !== 'object' ||
    ('isError' in response && response.isError)
  )
    return undefined;
  const content = adapter.content(response);
  if (!Array.isArray(content)) return undefined;

  try {
    const workspace = canonicalizeTargetPathSync(root, project_root);
    if (
      !lstatSync(workspace, { throwIfNoEntry: false }) ||
      !samePath(root, findRepoRoot(workspace))
    )
      return undefined;
    for (const block of content) {
      if (block?.type !== 'text' || typeof block.text !== 'string') continue;
      let reply: Partial<
        Record<'status' | 'op' | 'set' | 'scope' | 'files', unknown>
      > | null;
      try {
        reply = JSON.parse(block.text);
      } catch {
        continue;
      }
      if (
        reply?.status !== 'accepted' ||
        reply.op !== 'bind' ||
        reply.set !== set ||
        reply.scope !== scope ||
        !Array.isArray(reply.files) ||
        !reply.files.length
      )
        continue;
      if (
        updateDirectiveBinding(root, set, () => ({
          enabled: true,
          root,
          scope,
          boundAt: now,
          ...(scope === 'session' ? { actor } : {}),
        }))
      )
        return `[seiri] Directives ${set} bound (scope ${scope}, ${reply.files.length} files)`;
      return undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
