import {
  TOOL_CONTENT_TYPES,
  TOOL_ERROR_DIAGNOSTIC_CODE,
  TOOL_ERROR_SUMMARY,
  TOOL_STATUSES,
} from '../../../constants/toolEnvelope.js';
import type { ToolResultEnvelope } from '../../../types/toolEnvelope.js';
import { ToolDiagnosticError } from '../../errors/toolDiagnosticError.js';

/**
 * Serialize an execution failure into the common MCP error envelope.
 *
 * @param error - Failure caught at the tool execution boundary.
 * @param code - Explicit boundary code overriding a typed tool diagnostic.
 * @returns MCP error result containing one stable diagnostic.
 */
export function toolError(error: unknown, code?: string) {
  const message = error instanceof Error ? error.message : String(error);
  const diagnosticCode =
    code ??
    (error instanceof ToolDiagnosticError
      ? error.code
      : TOOL_ERROR_DIAGNOSTIC_CODE);
  const envelope: ToolResultEnvelope<typeof TOOL_ERROR_SUMMARY, never> = {
    status: TOOL_STATUSES.UNSUPPORTED,
    summary: TOOL_ERROR_SUMMARY,
    diagnostics: [
      {
        code: diagnosticCode,
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
