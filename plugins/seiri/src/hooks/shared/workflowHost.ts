import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';

import { samePath } from '@ogham/cross-platform';

import { loadIntervention } from '../../core/infra/configLoader/loaders/loadIntervention.js';
import { parseWorkflowRequest } from '../../core/sessionSignals/workflow/parseWorkflowRequest.js';
import { findRepoRoot } from '../../core/utils/findRepoRoot.js';
import type { HookBaseInput } from '../../types/hooks.js';
import type {
  WorkflowHostAdapter,
  WorkflowIdentity,
  WorkflowRequest,
} from '../../types/workflow.js';

import { WORKFLOW_ADAPTER } from './workflowAdapter.js';

/** Hash-only provenance: raw host IDs and commands never enter actor metadata. */
export function workflowHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

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

/** Both enabled dial positions use explicit participation, never global election. */
export function workflowEnabled(root: string): boolean {
  try {
    return ['standard', 'strict'].includes(
      loadIntervention(findRepoRoot(realpathSync(root))).effective,
    );
  } catch {
    return false;
  }
}

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

/** Match successful Claude content arrays and Codex MCP envelopes to the request. */
export function workflowAccepted(
  response: unknown,
  request: WorkflowRequest,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
): boolean {
  if (!response || typeof response !== 'object') return false;
  const envelope = response as { isError?: boolean; content?: unknown };
  if (envelope.isError) return false;
  const content = adapter.content(response);
  if (!Array.isArray(content)) return false;
  return content.some((block) => {
    if (!block || block.type !== 'text' || typeof block.text !== 'string')
      return false;
    try {
      const result = JSON.parse(block.text);
      return (
        result.status === 'accepted' &&
        result.action === request.action &&
        result.task === request.task &&
        result.intent === request.intent
      );
    } catch {
      return false;
    }
  });
}
