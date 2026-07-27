import type { McpToolName } from '../../../constants/mcpToolNames.js';
import {
  TOOL_ARTIFACT_TEXT_ENCODING,
  TOOL_INLINE_BUDGET_BYTES,
  TOOL_PERSISTENCE,
} from '../../../constants/toolEnvelope.js';
import type {
  ToolPayload,
  ToolResultEnvelope,
} from '../../../types/toolEnvelope.js';

import { serializeCompactJson } from './serialization/serializeCompactJson.js';
import { fitToolEnvelopeToBudget } from './utils/fitToolEnvelopeToBudget.js';
import { persistToolArtifact } from './utils/persistToolArtifact.js';

export function materializeToolEnvelope<Summary, Data>(
  toolName: McpToolName,
  payload: ToolPayload<Summary, Data>,
): ToolResultEnvelope<Summary, Data> {
  const inlineEnvelope = {
    status: payload.status,
    summary: payload.summary,
    ...(payload.data === undefined ? {} : { data: payload.data }),
    diagnostics: payload.diagnostics,
  };
  const shouldPersist =
    payload.persistence === TOOL_PERSISTENCE.ALWAYS ||
    Buffer.byteLength(
      serializeCompactJson(inlineEnvelope),
      TOOL_ARTIFACT_TEXT_ENCODING,
    ) > TOOL_INLINE_BUDGET_BYTES;

  if (!shouldPersist) return inlineEnvelope;

  const serializedPayload = serializeCompactJson(payload);
  const persistedEnvelope = {
    status: payload.status,
    summary: payload.summary,
    artifact: persistToolArtifact(toolName, serializedPayload),
    diagnostics: payload.diagnostics,
  };
  return fitToolEnvelopeToBudget(persistedEnvelope);
}
