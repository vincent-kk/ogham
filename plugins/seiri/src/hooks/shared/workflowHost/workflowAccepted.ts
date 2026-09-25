import type {
  WorkflowHostAdapter,
  WorkflowRequest,
} from '../../../types/workflow.js';
import { WORKFLOW_ADAPTER } from '../workflowAdapter.js';

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
