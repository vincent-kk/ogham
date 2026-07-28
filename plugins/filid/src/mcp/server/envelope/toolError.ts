import {
  TOOL_CONTENT_TYPES,
  TOOL_ERROR_DIAGNOSTIC_CODE,
  TOOL_ERROR_SUMMARY,
  TOOL_STATUSES,
} from '../../../constants/toolEnvelope.js';
import type { ToolResultEnvelope } from '../../../types/toolEnvelope.js';

export function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const envelope: ToolResultEnvelope<typeof TOOL_ERROR_SUMMARY, never> = {
    status: TOOL_STATUSES.UNSUPPORTED,
    summary: TOOL_ERROR_SUMMARY,
    diagnostics: [
      {
        code: TOOL_ERROR_DIAGNOSTIC_CODE,
        message,
      },
    ],
  };
  return {
    content: [
      {
        type: TOOL_CONTENT_TYPES.TEXT,
        text: JSON.stringify(envelope),
      },
    ],
    isError: true as const,
  };
}
