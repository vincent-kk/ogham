import { loadConfig } from '../../../core/infra/config-loader/config-loader.js';
import { validateStructure } from '../../../core/rules/fractal-validator/fractal-validator.js';
import {
  getActiveRules,
  loadBuiltinRules,
} from '../../../core/rules/rule-engine/rule-engine.js';
import { scanProject } from '../../../core/tree/fractal-tree/fractal-tree.js';
import type { ValidationReport } from '../../../types/report.js';

export interface StructureValidateInput {
  path: string;
  rules?: string[];
}

export interface StructureValidateResult {
  report: ValidationReport;
  timestamp: string;
  rulesApplied: number;
  rulesSkipped: number;
}

/**
 * Read-only fractal structure validation. Auto-remediation is not supported —
 * structural fixes go through the `restructurer` agent under `/filid:filid-restructure`
 * or `/filid:filid-sync`.
 */
export async function handleStructureValidate(
  args: unknown,
): Promise<StructureValidateResult> {
  const input = args as StructureValidateInput;

  if (!input.path) {
    throw new Error('path is required');
  }

  const config = loadConfig(input.path);
  const overrides = config?.rules ?? {};
  const allRules = loadBuiltinRules(overrides, config?.['additional-allowed']);
  const activeRules = getActiveRules(allRules);

  let rulesToApply = activeRules;
  let rulesSkipped = 0;

  if (input.rules && input.rules.length > 0) {
    const ruleIdSet = new Set(input.rules);
    rulesToApply = activeRules.filter((r) => ruleIdSet.has(r.id));
    rulesSkipped = activeRules.length - rulesToApply.length;
  }

  const tree = await scanProject(input.path);
  const report = validateStructure(tree, rulesToApply);

  return {
    report,
    timestamp: new Date().toISOString(),
    rulesApplied: rulesToApply.length,
    rulesSkipped,
  };
}
