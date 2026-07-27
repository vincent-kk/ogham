import { ANALYSIS_CERTAINTIES } from '../../../../constants/analysisCertainties.js';
import type {
  AnalysisCertainty,
  ProjectSnapshot,
} from '../../../../types/fractal.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';

export function resolveFractalScanCertainty(
  snapshot: ProjectSnapshot,
  diagnostics: ToolDiagnostic[],
): AnalysisCertainty {
  const graphCertainty = snapshot.dependencyGraph.certainty;
  const verificationCertainty = snapshot.verification.certainty;
  if (
    graphCertainty === ANALYSIS_CERTAINTIES.UNSUPPORTED &&
    verificationCertainty === ANALYSIS_CERTAINTIES.UNSUPPORTED
  )
    return ANALYSIS_CERTAINTIES.UNSUPPORTED;
  if (
    graphCertainty !== ANALYSIS_CERTAINTIES.EXACT ||
    verificationCertainty !== ANALYSIS_CERTAINTIES.EXACT ||
    diagnostics.length > 0
  )
    return ANALYSIS_CERTAINTIES.INDETERMINATE;
  return ANALYSIS_CERTAINTIES.EXACT;
}
