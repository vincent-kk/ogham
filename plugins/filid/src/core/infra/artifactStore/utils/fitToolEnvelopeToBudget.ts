import {
  TOOL_ARTIFACT_DIAGNOSTIC_CODE,
  TOOL_ARTIFACT_DIAGNOSTIC_MESSAGE,
  TOOL_ARTIFACT_TEXT_ENCODING,
  TOOL_INLINE_BUDGET_BYTES,
  TOOL_INLINE_ENVELOPE_BUDGET_ERROR_MESSAGE,
} from '../../../../constants/toolEnvelope.js';
import type { ToolResultEnvelope } from '../../../../types/toolEnvelope.js';
import { serializeCompactJson } from '../serialization/serializeCompactJson.js';

export function fitToolEnvelopeToBudget<Summary>(
  envelope: ToolResultEnvelope<Summary, never>,
): ToolResultEnvelope<Summary, never> {
  const serializedEnvelope = serializeCompactJson(envelope);
  if (
    Buffer.byteLength(serializedEnvelope, TOOL_ARTIFACT_TEXT_ENCODING) <=
    TOOL_INLINE_BUDGET_BYTES
  )
    return envelope;

  const boundedEnvelope = {
    ...envelope,
    diagnostics: [
      {
        code: TOOL_ARTIFACT_DIAGNOSTIC_CODE,
        message: TOOL_ARTIFACT_DIAGNOSTIC_MESSAGE,
        path: envelope.artifact?.path,
      },
    ],
  };
  if (
    Buffer.byteLength(
      serializeCompactJson(boundedEnvelope),
      TOOL_ARTIFACT_TEXT_ENCODING,
    ) > TOOL_INLINE_BUDGET_BYTES
  )
    throw new Error(TOOL_INLINE_ENVELOPE_BUDGET_ERROR_MESSAGE);

  return boundedEnvelope;
}
