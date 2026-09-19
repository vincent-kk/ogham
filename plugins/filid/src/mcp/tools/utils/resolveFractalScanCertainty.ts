import { ANALYSIS_AXES } from '../../../constants/analysisAxes.js';
import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import type {
  AnalysisCertainty,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

import { affectsAnalysisAxis } from './affectsAnalysisAxis.js';
import { isFindingDiagnostic } from './isFindingDiagnostic.js';

/**
 * Resolve whether a fractal scan has usable evidence for every measured axis.
 * @param snapshot Snapshot whose graph and verification certainty are measured.
 * @param diagnostics Snapshot and config diagnostics attached to the envelope.
 * @param verificationCertainty Verification certainty for the requested scope.
 * @param graphCertainty Dependency certainty for the requested scope; the
 *   whole graph's by default, the review scope's for a review.
 * @returns The aggregate certainty after excluding diagnostics that restate
 *   findings or declare no affected axis (`affects: []`).
 */
export function resolveFractalScanCertainty(
  snapshot: ProjectSnapshot,
  diagnostics: ToolDiagnostic[],
  verificationCertainty: AnalysisCertainty = snapshot.verification.certainty,
  graphCertainty: AnalysisCertainty = snapshot.dependencyGraph.certainty,
): AnalysisCertainty {
  if (
    graphCertainty === ANALYSIS_CERTAINTIES.UNSUPPORTED &&
    verificationCertainty === ANALYSIS_CERTAINTIES.UNSUPPORTED
  )
    return ANALYSIS_CERTAINTIES.UNSUPPORTED;
  if (
    graphCertainty !== ANALYSIS_CERTAINTIES.EXACT ||
    verificationCertainty !== ANALYSIS_CERTAINTIES.EXACT ||
    diagnostics.some(
      (d) => !isFindingDiagnostic(d) && affectsAnalysisAxis(d, ANALYSIS_AXES),
    )
  )
    return ANALYSIS_CERTAINTIES.INDETERMINATE;
  return ANALYSIS_CERTAINTIES.EXACT;
}
