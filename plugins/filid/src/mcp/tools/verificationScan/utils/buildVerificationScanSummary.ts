import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import { VERIFICATION_ROLES } from '../../../../constants/mcpContracts.js';
import {
  SPEC_DOCUMENT_CASE_CAP,
  TEST_RECORD_CASE_CAP,
} from '../../../../constants/verificationThresholds.js';
import type { AnalysisCertainty } from '../../../../types/fractal.js';
import type { VerificationScanSummary } from '../../../../types/report.js';
import type {
  VerificationFileAnalysis,
  VerificationViolation,
} from '../../../../types/verification.js';

import { summarizeVerificationRole } from './summarizeVerificationRole.js';

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
