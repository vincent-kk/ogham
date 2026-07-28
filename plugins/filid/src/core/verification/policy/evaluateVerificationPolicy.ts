import { VERIFICATION_CASE_CAPS } from '../../../constants/verificationThresholds.js';
import type { AnalysisCertainty } from '../../../types/adapters.js';
import type {
  ContractGroupsByOwner,
  VerificationFileAnalysis,
  VerificationProjectAnalysis,
  VerificationRuleId,
  VerificationViolation,
} from '../../../types/verification.js';

import { findSpecFragmentation } from './findSpecFragmentation.js';

function capRule(role: VerificationFileAnalysis['role']): VerificationRuleId {
  return role === 'spec-document'
    ? 'spec-document-case-cap'
    : 'test-record-case-cap';
}

function aggregateCertainty(
  files: readonly VerificationFileAnalysis[],
): AnalysisCertainty {
  if (files.some((file) => file.count.certainty === 'unsupported'))
    return 'unsupported';
  if (files.some((file) => file.count.certainty === 'indeterminate'))
    return 'indeterminate';
  return 'exact';
}

function evaluateCaseCap(
  file: VerificationFileAnalysis,
): VerificationViolation[] {
  const ruleId = capRule(file.role);
  if (file.count.certainty !== 'exact' || file.count.exactCount === undefined)
    return [
      {
        ruleId,
        path: file.path,
        severity: 'warning',
        message: `${ruleId} is ${file.count.certainty}; ${file.count.reasons.join('; ') || 'exact case count unavailable'}.`,
      },
    ];

  const cap = VERIFICATION_CASE_CAPS[file.role];
  if (file.count.exactCount <= cap) return [];
  return [
    {
      ruleId,
      path: file.path,
      severity: 'error',
      message: `${file.role} has ${file.count.exactCount} semantic cases; the per-file cap is ${cap}.`,
    },
  ];
}

export function evaluateVerificationPolicy(
  files: readonly VerificationFileAnalysis[],
  contractGroups: ContractGroupsByOwner = new Map(),
): VerificationProjectAnalysis {
  const violations = [
    ...files.flatMap(evaluateCaseCap),
    ...findSpecFragmentation(files, contractGroups),
  ];
  return {
    files: [...files],
    violations,
    certainty: aggregateCertainty(files),
  };
}
