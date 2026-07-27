import { ANALYSIS_CERTAINTIES } from '../../../../constants/analysisCertainties.js';
import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import { LEGACY_CRITERIA_LEDGER_RULE } from '../../../../constants/legacyCriteriaLedger.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

export function checkLegacyCriteriaLedger(
  context: RuleContext,
): RuleViolation[] {
  const snapshot = context.snapshot;
  if (!snapshot)
    return [
      {
        ruleId: BUILTIN_RULE_IDS.LEGACY_CRITERIA_LEDGER,
        severity: LEGACY_CRITERIA_LEDGER_RULE.SEVERITY,
        message: LEGACY_CRITERIA_LEDGER_RULE.SNAPSHOT_REQUIRED_MESSAGE,
        path: context.tree.root,
        certainty: ANALYSIS_CERTAINTIES.INDETERMINATE,
      },
    ];
  const evidence = snapshot.legacyCriteriaLedger;
  if (!evidence) return [];
  return [
    {
      ruleId: BUILTIN_RULE_IDS.LEGACY_CRITERIA_LEDGER,
      severity: LEGACY_CRITERIA_LEDGER_RULE.SEVERITY,
      message: LEGACY_CRITERIA_LEDGER_RULE.FOUND_MESSAGE,
      path: evidence.path,
      suggestion: `${LEGACY_CRITERIA_LEDGER_RULE.SUGGESTION_PREFIX} ${evidence.targetDetailPath}.`,
      certainty: ANALYSIS_CERTAINTIES.EXACT,
    },
  ];
}
