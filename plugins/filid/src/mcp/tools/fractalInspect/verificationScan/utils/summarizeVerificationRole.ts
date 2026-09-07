import type { VerificationRole } from '../../../../../types/adapters.js';
import type { VerificationRoleSummary } from '../../../../../types/report.js';
import type { VerificationFileAnalysis } from '../../../../../types/verification.js';

/**
 * Aggregates file and known-case counts for one verification role.
 *
 * @param files - Verification evidence selected for the current call.
 * @param role - Role whose files and known cases to count.
 * @param caseCap - Stable per-file cap reported for that role.
 * @returns The role-specific bounded summary.
 */
export function summarizeVerificationRole(
  files: readonly VerificationFileAnalysis[],
  role: VerificationRole,
  caseCap: number,
): VerificationRoleSummary {
  const roleFiles = files.filter((file) => file.role === role);
  return {
    fileCount: roleFiles.length,
    knownCaseCount: roleFiles.reduce(
      (total, file) => total + file.count.knownLowerBound,
      0,
    ),
    caseCap,
  };
}
