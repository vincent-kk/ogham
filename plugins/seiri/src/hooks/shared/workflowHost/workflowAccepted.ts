import type {
  WorkflowHostAdapter,
  WorkflowRequest,
} from '../../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../workflowAdapter.js';

/**
 * Match successful Claude content arrays and Codex MCP envelopes to the request.
 * @param response Raw MCP tool call response; anything other than a non-error object with a content array yields `false`.
 * @param request Request the response is checked against; every field must match a parsed reply block.
 * @param adapter Host adapter fixed at build time; supplies the content envelope shape.
 * @returns Whether any content block reports the same accepted action, task and intent as `request`.
 */
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
