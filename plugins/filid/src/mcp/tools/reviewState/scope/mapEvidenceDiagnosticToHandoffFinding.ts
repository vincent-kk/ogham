import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';
import type { ReviewScopeViolation } from '../state/reviewStateTypes.js';

/**
 * Convert a scan-level diagnostic into one handoff finding input.
 * @param diagnostic Non-finding diagnostic preserved in the tool envelope.
 * @returns Indeterminate finding whose final note starts with code and message.
 */
export function mapEvidenceDiagnosticToHandoffFinding(
  diagnostic: ToolDiagnostic,
): {
  violation: ReviewScopeViolation;
  class: 'indeterminate';
  notePrefix: '';
} {
  return {
    violation: {
      source: 'structure',
      severity: 'warning',
      path: diagnostic.path ?? '.',
      ruleId: diagnostic.code,
      message: `${diagnostic.code}: ${diagnostic.message}`,
    },
    class: 'indeterminate',
    notePrefix: '',
  };
}
