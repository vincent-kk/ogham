import type { VerificationRole } from '../../../../types/adapters.js';
import type { VerificationRoleSummary } from '../../../../types/report.js';
import type { VerificationFileAnalysis } from '../../../../types/verification.js';

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
