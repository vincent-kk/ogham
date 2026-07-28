import { ANALYSIS_CERTAINTIES } from '../../../../constants/analysisCertainties.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import type { ValidationReport } from '../../../../types/report.js';
import type {
  ToolDiagnostic,
  ToolStatus,
} from '../../../../types/toolEnvelope.js';

export function resolveProjectValidationStatus(
  report: ValidationReport,
  diagnostics: ToolDiagnostic[],
): ToolStatus {
  const certainties = report.result.violations.map(
    (violation) => violation.certainty,
  );
  if (certainties.includes(ANALYSIS_CERTAINTIES.UNSUPPORTED))
    return TOOL_STATUSES.UNSUPPORTED;
  if (
    diagnostics.length > 0 ||
    certainties.includes(ANALYSIS_CERTAINTIES.INDETERMINATE)
  )
    return TOOL_STATUSES.INDETERMINATE;
  return report.result.violations.length > 0
    ? TOOL_STATUSES.VIOLATIONS
    : TOOL_STATUSES.OK;
}
