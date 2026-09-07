import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { TOOL_STATUSES } from '../../../constants/toolEnvelope.js';
import type {
  ToolDiagnostic,
  ToolStatus,
} from '../../../types/toolEnvelope.js';

import { isFindingDiagnostic } from './isFindingDiagnostic.js';

/**
 * Resolve the verification scan status from certainty and retained evidence.
 * @param certainty Aggregate verification certainty.
 * @param violationCount Number of retained verification violations.
 * @param diagnostics Snapshot diagnostics that may make evidence incomplete.
 * @returns Public tool status for the verification evidence.
 */
export function resolveVerificationScanStatus(
  certainty: string,
  violationCount: number,
  diagnostics: ToolDiagnostic[],
): ToolStatus {
  if (certainty === ANALYSIS_CERTAINTIES.UNSUPPORTED)
    return TOOL_STATUSES.UNSUPPORTED;
  if (
    certainty === ANALYSIS_CERTAINTIES.INDETERMINATE ||
    diagnostics.some((d) => !isFindingDiagnostic(d))
  )
    return TOOL_STATUSES.INDETERMINATE;
  return violationCount > 0 ? TOOL_STATUSES.VIOLATIONS : TOOL_STATUSES.OK;
}
