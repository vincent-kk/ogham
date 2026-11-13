import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import type { AnalysisCertainty } from '../../../types/fractal.js';
import type { RuleViolation } from '../../../types/rules.js';

/** Verification policy identities retained when evaluating a report with other scopes. */
const VERIFICATION_RULE_IDS = [
  BUILTIN_RULE_IDS.SPEC_DOCUMENT_CASE_CAP,
  BUILTIN_RULE_IDS.TEST_RECORD_CASE_CAP,
  BUILTIN_RULE_IDS.SPEC_FRAGMENTATION,
  BUILTIN_RULE_IDS.SPEC_CONTRACT_LINK,
];

/**
 * Derive verification certainty from the configured evaluation, not raw counts.
 * @param findings Evaluated findings; retained discovery uncertainty is carried
 * by the verification rules' root findings. Exempt findings do not contribute.
 * @returns Unsupported before indeterminate, otherwise exact verification evidence.
 */
export function resolveVerificationCertainty(
  findings: readonly RuleViolation[],
): AnalysisCertainty {
  const certainties = findings
    .filter(
      (finding) =>
        !finding.exemptedBy &&
        VERIFICATION_RULE_IDS.some((ruleId) => ruleId === finding.ruleId),
    )
    .map((finding) => finding.certainty);
  if (certainties.includes(ANALYSIS_CERTAINTIES.UNSUPPORTED))
    return ANALYSIS_CERTAINTIES.UNSUPPORTED;
  return certainties.includes(ANALYSIS_CERTAINTIES.INDETERMINATE)
    ? ANALYSIS_CERTAINTIES.INDETERMINATE
    : ANALYSIS_CERTAINTIES.EXACT;
}
