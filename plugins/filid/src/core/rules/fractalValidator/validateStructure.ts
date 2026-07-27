import type { FractalTree, ProjectSnapshot } from '../../../types/fractal.js';
import type { ValidationReport } from '../../../types/report.js';
import type { Rule, RuleEvaluationOptions } from '../../../types/rules.js';
import { evaluateRules } from '../ruleEngine/ruleEngine.js';

export function validateStructure(
  input: ProjectSnapshot | FractalTree,
  rules?: Rule[],
  options?: RuleEvaluationOptions,
): ValidationReport {
  return {
    result: evaluateRules(input, rules, options),
    ...(options ? { scanOptions: options } : {}),
    timestamp: new Date().toISOString(),
  };
}
