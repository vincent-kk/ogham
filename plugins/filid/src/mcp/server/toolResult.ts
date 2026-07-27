import type { McpToolName } from '../../constants/mcpToolNames.js';
import { TOOL_CONTENT_TYPES } from '../../constants/toolEnvelope.js';
import {
  materializeToolEnvelope,
  serializeCompactJson,
} from '../../core/infra/artifactStore/index.js';
import type { ToolPayload } from '../../types/toolEnvelope.js';

/**
 * Materialize a common Filid envelope and serialize it as compact MCP text.
 */
export function toolResult<Summary, Data>(
  toolName: McpToolName,
  payload: ToolPayload<Summary, Data>,
) {
  const envelope = materializeToolEnvelope(toolName, payload);
  return {
    content: [
      {
        type: TOOL_CONTENT_TYPES.TEXT,
        text: serializeCompactJson(envelope),
      },
    ],
  };
}
