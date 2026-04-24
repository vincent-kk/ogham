import {
  loadConfig,
  resolveMaxDepth,
} from '../../../core/infra/config-loader/config-loader.js';
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
  /**
   * Warnings emitted by `loadConfig` while parsing `.filid/config.json`
   * (strict schema violations, dropped unknown keys, invalid exempt globs).
   * Empty when the config is absent or strictly valid.
   */
  configWarnings: string[];
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

  const { config, warnings: configWarnings } = loadConfig(input.path);
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

  const maxDepth = resolveMaxDepth(config);
  const tree = await scanProject(input.path, { maxDepth });
  const report = validateStructure(tree, rulesToApply, { maxDepth });

  return {
    report,
    timestamp: new Date().toISOString(),
    rulesApplied: rulesToApply.length,
    rulesSkipped,
    configWarnings,
  };
}
