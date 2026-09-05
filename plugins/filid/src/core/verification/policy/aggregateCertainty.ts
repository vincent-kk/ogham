import type { AnalysisCertainty } from '../../../types/adapters.js';
import type { VerificationFileAnalysis } from '../../../types/verification.js';

/**
 * Preserve the least conclusive case-count certainty across selected files.
 * @param files Verification analyses whose count certainty is aggregated.
 * @returns Unsupported or indeterminate when present, otherwise exact.
 */
export function aggregateCertainty(
  files: readonly VerificationFileAnalysis[],
): AnalysisCertainty {
  if (files.some((file) => file.count.certainty === 'unsupported'))
    return 'unsupported';
  if (files.some((file) => file.count.certainty === 'indeterminate'))
    return 'indeterminate';
  return 'exact';
}
