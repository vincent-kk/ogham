import {
  SNAPSHOT_TOOL_DIAGNOSTIC_CODES,
  SNAPSHOT_TOOL_DIAGNOSTIC_MESSAGES,
} from '../../../../constants/mcpContracts.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';

export function buildVerificationDiagnostics(
  snapshotDiagnostics: ToolDiagnostic[],
  missingPaths: string[],
): ToolDiagnostic[] {
  return [
    ...snapshotDiagnostics,
    ...missingPaths.map((path) => ({
      code: SNAPSHOT_TOOL_DIAGNOSTIC_CODES.VERIFICATION_PATH_NOT_FOUND,
      message: SNAPSHOT_TOOL_DIAGNOSTIC_MESSAGES.VERIFICATION_PATH_NOT_FOUND,
      path,
    })),
  ];
}
