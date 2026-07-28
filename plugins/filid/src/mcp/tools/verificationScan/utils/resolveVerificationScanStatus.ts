import { ANALYSIS_CERTAINTIES } from '../../../../constants/analysisCertainties.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import type {
  ToolDiagnostic,
  ToolStatus,
} from '../../../../types/toolEnvelope.js';

export function resolveVerificationScanStatus(
  certainty: string,
  violationCount: number,
  diagnostics: ToolDiagnostic[],
): ToolStatus {
  if (certainty === ANALYSIS_CERTAINTIES.UNSUPPORTED)
    return TOOL_STATUSES.UNSUPPORTED;
  if (
    certainty === ANALYSIS_CERTAINTIES.INDETERMINATE ||
    diagnostics.length > 0
  )
    return TOOL_STATUSES.INDETERMINATE;
  return violationCount > 0 ? TOOL_STATUSES.VIOLATIONS : TOOL_STATUSES.OK;
}
