import { BUILTIN_RULE_IDS } from '../../../../../constants/builtinRuleIds.js';
import { VERIFICATION_ROLES } from '../../../../../constants/mcpContracts.js';
import {
  SPEC_DOCUMENT_CASE_CAP,
  TEST_RECORD_CASE_CAP,
} from '../../../../../constants/verificationThresholds.js';
import type { AnalysisCertainty } from '../../../../../types/fractal.js';
import type { VerificationScanSummary } from '../../../../../types/report.js';
import type {
  VerificationFileAnalysis,
  VerificationViolation,
} from '../../../../../types/verification.js';

import { summarizeVerificationRole } from './summarizeVerificationRole.js';

/**
 * Builds the bounded role-aware verification summary.
 *
 * @param projectRoot - Absolute root shared by the snapshot evidence.
 * @param snapshotHash - Identity of the snapshot being summarized.
 * @param files - Selected verification-file analyses.
 * @param violations - Selected verification-policy findings.
 * @param certainty - Aggregate certainty of verification discovery and counts.
 * @returns Counts, caps, fragmentation, findings, and certainty.
 */
export function buildVerificationScanSummary(
  projectRoot: string,
  snapshotHash: string,
  files: readonly VerificationFileAnalysis[],
  violations: readonly VerificationViolation[],
  certainty: AnalysisCertainty,
): VerificationScanSummary {
  return {
    projectRoot,
    snapshotHash,
    fileCount: files.length,
    specDocument: summarizeVerificationRole(
      files,
      VERIFICATION_ROLES.SPEC_DOCUMENT,
      SPEC_DOCUMENT_CASE_CAP,
    ),
    testRecord: summarizeVerificationRole(
      files,
      VERIFICATION_ROLES.TEST_RECORD,
      TEST_RECORD_CASE_CAP,
    ),
    fragmentationCount: violations.filter(
      (violation) => violation.ruleId === BUILTIN_RULE_IDS.SPEC_FRAGMENTATION,
    ).length,
    violationCount: violations.length,
    certainty,
  };
}
