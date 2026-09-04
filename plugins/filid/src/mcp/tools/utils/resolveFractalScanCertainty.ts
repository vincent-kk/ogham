import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import type {
  AnalysisCertainty,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

import { isFindingDiagnostic } from './isFindingDiagnostic.js';

/**
 * Resolve whether a fractal scan has usable evidence for every measured axis.
 * @param snapshot Snapshot whose graph and verification certainty are measured.
 * @param diagnostics Snapshot and config diagnostics attached to the envelope.
 * @param verificationCertainty Verification certainty for the requested scope.
 * @returns The aggregate certainty after excluding diagnostics that restate findings.
 */
export function resolveFractalScanCertainty(
  snapshot: ProjectSnapshot,
  diagnostics: ToolDiagnostic[],
  verificationCertainty: AnalysisCertainty = snapshot.verification.certainty,
): AnalysisCertainty {
  const graphCertainty = snapshot.dependencyGraph.certainty;
  if (
    graphCertainty === ANALYSIS_CERTAINTIES.UNSUPPORTED &&
    verificationCertainty === ANALYSIS_CERTAINTIES.UNSUPPORTED
  )
    return ANALYSIS_CERTAINTIES.UNSUPPORTED;
  if (
    graphCertainty !== ANALYSIS_CERTAINTIES.EXACT ||
    verificationCertainty !== ANALYSIS_CERTAINTIES.EXACT ||
    diagnostics.some((d) => !isFindingDiagnostic(d))
  )
    return ANALYSIS_CERTAINTIES.INDETERMINATE;
  return ANALYSIS_CERTAINTIES.EXACT;
}
