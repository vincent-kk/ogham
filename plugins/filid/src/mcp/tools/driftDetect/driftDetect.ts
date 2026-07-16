import {
  loadConfig,
  resolveMaxDepth,
} from '../../../core/infra/configLoader/configLoader.js';
import {
  detectDrift,
  generateSyncPlan,
} from '../../../core/rules/driftDetector/driftDetector.js';
import { SEVERITY_ORDER } from '../../../core/rules/driftDetector/driftDetector.js';
import { validateStructure } from '../../../core/rules/fractalValidator/fractalValidator.js';
import {
  getActiveRules,
  loadBuiltinRules,
} from '../../../core/rules/ruleEngine/ruleEngine.js';
import { scanProject } from '../../../core/tree/fractalTree/fractalTree.js';
import type {
  DriftItem,
  DriftSeverity,
  SyncPlan,
} from '../../../types/drift.js';

export interface DriftDetectInput {
  path: string;
  severity?: DriftSeverity;
  generatePlan?: boolean;
}

export interface McpDriftReport {
  items: DriftItem[];
  totalDrifts: number;
  bySeverity: Record<DriftSeverity, number>;
  scanTimestamp: string;
  syncPlan?: SyncPlan;
  /**
   * Warnings emitted by `loadConfig` while parsing `.filid/config.json`
   * (strict schema violations, dropped unknown keys, invalid exempt globs).
   * Empty when the config is absent or strictly valid.
   */
  configWarnings: string[];
}

/**
 * Handle drift-detect MCP tool calls.
 *
 * Detects structural drift between the current project layout and
 * fractal principles. Optionally filters by severity and generates
 * a SyncPlan for correcting the detected drift items.
 */
export async function handleDriftDetect(
  args: unknown,
): Promise<McpDriftReport> {
  const input = args as DriftDetectInput;

  if (!input.path) throw new Error('path is required');

  const { config, warnings: configWarnings } = loadConfig(input.path);

  // Drift is derived from rule violations, so it must run the SAME configured
  // rule set as structure_validate. Dropping the config here made drift report
  // violations the project had explicitly exempted (rule overrides,
  // additional-allowed, additional-entry-points, additional-route-patterns).
  const rules = getActiveRules(
    loadBuiltinRules(
      config?.rules ?? {},
      config?.['additional-allowed'],
      config?.['additional-entry-points'],
      config?.['additional-route-patterns'],
    ),
  );

  const maxDepth = resolveMaxDepth(config);
  const tree = await scanProject(input.path, { maxDepth });
  const validation = validateStructure(tree, rules, { maxDepth });
  const driftResult = detectDrift(tree, validation.result.violations, {
    generatePlan: false,
  });

  let items: DriftItem[] = driftResult.items;

  // Apply severity filter if provided
  if (input.severity) {
    const minOrder = SEVERITY_ORDER[input.severity];
    items = items.filter((item) => SEVERITY_ORDER[item.severity] <= minOrder);
  }

  const bySeverity: Record<DriftSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const item of items) bySeverity[item.severity]++;

  const report: McpDriftReport = {
    items,
    totalDrifts: items.length,
    bySeverity,
    scanTimestamp: new Date().toISOString(),
    configWarnings,
  };

  if (input.generatePlan) report.syncPlan = generateSyncPlan(items);

  return report;
}
