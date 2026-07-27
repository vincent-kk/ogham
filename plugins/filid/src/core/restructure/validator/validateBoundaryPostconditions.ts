import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import {
  RESTRUCTURE_VALIDATION_CODES,
  RESTRUCTURE_VALIDATION_MESSAGES,
} from '../../../constants/restructure.js';
import { RULE_SCOPES } from '../../../constants/ruleScopes.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { PlanValidationFinding } from '../../../types/restructure.js';
import type { RuleEvaluationOptions } from '../../../types/rules.js';
import { evaluateRules } from '../../rules/index.js';

const BOUNDARY_RULE_OPTIONS: RuleEvaluationOptions = {
  scopes: [RULE_SCOPES.BOUNDARIES],
};

export function validateBoundaryPostconditions(
  snapshot: ProjectSnapshot,
): PlanValidationFinding[] {
  return evaluateRules(snapshot, undefined, BOUNDARY_RULE_OPTIONS)
    .violations.filter(
      ({ ruleId }) => ruleId === BUILTIN_RULE_IDS.EXTERNAL_IMPORT_BOUNDARY,
    )
    .map((violation) => ({
      code: RESTRUCTURE_VALIDATION_CODES.IMPORT_BOUNDARY_VIOLATION,
      message: RESTRUCTURE_VALIDATION_MESSAGES.IMPORT_BOUNDARY_VIOLATION,
      path: violation.path,
    }));
}
