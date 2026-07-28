import { ANALYSIS_CERTAINTIES } from '../../../../constants/analysisCertainties.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import type { AnalysisCertainty } from '../../../../types/fractal.js';
import type { ToolStatus } from '../../../../types/toolEnvelope.js';

export function resolveFractalScanStatus(
  certainty: AnalysisCertainty,
  violationCount: number,
): ToolStatus {
  if (certainty === ANALYSIS_CERTAINTIES.UNSUPPORTED)
    return TOOL_STATUSES.UNSUPPORTED;
  if (certainty === ANALYSIS_CERTAINTIES.INDETERMINATE)
    return TOOL_STATUSES.INDETERMINATE;
  return violationCount > 0 ? TOOL_STATUSES.VIOLATIONS : TOOL_STATUSES.OK;
}
