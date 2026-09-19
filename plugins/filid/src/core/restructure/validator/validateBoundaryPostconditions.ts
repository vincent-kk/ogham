import { pathForCompare } from '@ogham/cross-platform';

import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import { RESTRUCTURE_VALIDATION_CODES } from '../../../constants/restructure.js';
import { RULE_SCOPES } from '../../../constants/ruleScopes.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  PlanValidationFinding,
  RestructurePlan,
} from '../../../types/restructure.js';
import type { RuleEvaluationOptions } from '../../../types/rules.js';
import { evaluateRules } from '../../rules/index.js';
import { relocateThroughMoves } from '../imports/relocateThroughMoves.js';

const BOUNDARY_RULE_OPTIONS: RuleEvaluationOptions = {
  scopes: [RULE_SCOPES.BOUNDARIES],
};

/**
 * A boundary violation's identity key.
 * @param ruleId Rule that reported it.
 * @param consumerPath File holding the import.
 * @param importedPath File the import loads.
 * @returns Key comparing paths portably.
 */
function violationKey(
  ruleId: string,
  consumerPath: string,
  importedPath: string,
): string {
  return `${ruleId}\0${pathForCompare(consumerPath)}\0${pathForCompare(importedPath)}`;
}

/**
 * Check import boundaries after execution against the plan-time baseline.
 *
 * Every violation is reported. One whose identity (rule, importing file,
 * loaded file) matches a baseline violation relocated through the plan's
 * moves is `preexisting`; any other is a finding, and so is one without a
 * loaded file, which no baseline entry can match. The rule's certainty
 * warning (it carries `certainty`) is left to the unknown-file check.
 * @param snapshot Post-execution snapshot.
 * @param plan The executed plan, with its baseline.
 * @returns New violations and pre-existing ones, each with the rule's message and suggestion.
 */
export function validateBoundaryPostconditions(
  snapshot: ProjectSnapshot,
  plan: RestructurePlan,
): { findings: PlanValidationFinding[]; preexisting: PlanValidationFinding[] } {
  const baseline = new Set(
    plan.baseline.boundaryViolations.map(
      ({ ruleId, consumerPath, importedPath }) =>
        violationKey(
          ruleId,
          relocateThroughMoves(consumerPath, plan.moves),
          relocateThroughMoves(importedPath, plan.moves),
        ),
    ),
  );
  const result = {
    findings: [] as PlanValidationFinding[],
    preexisting: [] as PlanValidationFinding[],
  };
  for (const violation of evaluateRules(
    snapshot,
    undefined,
    BOUNDARY_RULE_OPTIONS,
  ).violations)
    if (
      violation.ruleId === BUILTIN_RULE_IDS.EXTERNAL_IMPORT_BOUNDARY &&
      !violation.certainty
    )
      (violation.importedPath &&
      baseline.has(
        violationKey(violation.ruleId, violation.path, violation.importedPath),
      )
        ? result.preexisting
        : result.findings
      ).push({
        code: RESTRUCTURE_VALIDATION_CODES.IMPORT_BOUNDARY_VIOLATION,
        message: violation.message,
        nextAction: violation.suggestion,
        path: violation.path,
      });
  return result;
}
