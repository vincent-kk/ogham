import { VERIFICATION_CASE_CAPS } from '../../../constants/verificationThresholds.js';
import type {
  ContractGroupsByOwner,
  VerificationFileAnalysis,
  VerificationProjectAnalysis,
  VerificationRuleId,
  VerificationViolation,
} from '../../../types/verification.js';

import { aggregateCertainty } from './aggregateCertainty.js';
import { findSpecFragmentation } from './findSpecFragmentation.js';

function capRule(role: VerificationFileAnalysis['role']): VerificationRuleId {
  return role === 'spec-document'
    ? 'spec-document-case-cap'
    : 'test-record-case-cap';
}

function evaluateCaseCap(
  file: VerificationFileAnalysis,
): VerificationViolation[] {
  const ruleId = capRule(file.role);
  if (file.count.certainty !== 'exact' || file.count.exactCount === undefined) {
    const reasons =
      file.count.reasons.join('; ') || 'exact case count unavailable';
    return [
      {
        ruleId,
        path: file.path,
        severity: 'warning',
        message: `${ruleId} is ${file.count.certainty}: ${reasons}.`,
        certainty: file.count.certainty,
        suggestion:
          'Read the lines the reasons name. Dynamic case tables, aliased case APIs and text the lexer cannot pair keep the count inexact; rewrite them as literal cases if the exact count matters, otherwise report the file as indeterminate.',
      },
    ];
  }

  const cap = VERIFICATION_CASE_CAPS[file.role];
  if (file.count.exactCount <= cap) return [];
  const unit = file.role === 'spec-document' ? 'spec document' : 'test file';
  const seam =
    file.role === 'spec-document' ? 'by contract group' : 'by behavior';
  return [
    {
      ruleId,
      path: file.path,
      severity: 'error',
      message: `${file.role} has ${file.count.exactCount} semantic cases; the per-file cap is ${cap}.`,
      certainty: file.count.certainty,
      suggestion: `Split the ${unit} ${seam} so each file stays within ${cap} cases, or merge cases that verify the same behavior.`,
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
