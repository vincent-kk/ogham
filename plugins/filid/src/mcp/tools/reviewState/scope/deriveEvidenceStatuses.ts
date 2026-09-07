import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import type {
  AnalysisCertainty,
  ProjectSnapshot,
} from '../../../../types/fractal.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';
import { isFindingDiagnostic } from '../../utils/isFindingDiagnostic.js';
import { resolveFractalScanCertainty } from '../../utils/resolveFractalScanCertainty.js';
import { resolveFractalScanStatus } from '../../utils/resolveFractalScanStatus.js';
import { resolveVerificationScanStatus } from '../../utils/resolveVerificationScanStatus.js';
import type { ReviewEvidenceStatuses } from '../state/reviewStateTypes.js';

function isConclusive(status: ReviewEvidenceStatuses['structure']): boolean {
  return status === TOOL_STATUSES.OK || status === TOOL_STATUSES.VIOLATIONS;
}

/**
 * Derive per-axis statuses and whether canonical evidence is conclusive.
 * @param snapshot Project snapshot that supplied all FCA evidence.
 * @param diagnostics Snapshot diagnostics attached to the tool result.
 * @param structureViolationCount Retained changed-scope structure row count.
 * @param verificationViolationCount Retained changed-scope verification row count.
 * @param scopedVerificationCertainty Verification certainty within changed scope.
 * @returns Structure and verification statuses plus aggregate completeness.
 */
export function deriveEvidenceStatuses(
  snapshot: ProjectSnapshot,
  diagnostics: readonly ToolDiagnostic[],
  structureViolationCount: number,
  verificationViolationCount: number,
  scopedVerificationCertainty: AnalysisCertainty,
): ReviewEvidenceStatuses {
  const mutableDiagnostics = [...diagnostics];
  const structure = resolveFractalScanStatus(
    resolveFractalScanCertainty(
      snapshot,
      mutableDiagnostics,
      scopedVerificationCertainty,
    ),
    structureViolationCount,
  );
  const verification = resolveVerificationScanStatus(
    scopedVerificationCertainty,
    verificationViolationCount,
    mutableDiagnostics.filter((diagnostic) => !isFindingDiagnostic(diagnostic)),
  );
  return {
    structure,
    verification,
    evidenceComplete: isConclusive(structure) && isConclusive(verification),
  };
}
