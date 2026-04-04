import { resolve } from 'node:path';

import { loadConfig } from '../../../core/infra/config-loader/config-loader.js';
import {
  evaluateRules,
  getActiveRules,
  loadBuiltinRules,
} from '../../../core/rules/rule-engine/rule-engine.js';
import { scanProject } from '../../../core/tree/fractal-tree/fractal-tree.js';
import type { Rule, RuleEvaluationResult } from '../../../types/rules.js';
import type { RuleCategory } from '../../../types/rules.js';

export interface RuleQueryInput {
  action: 'list' | 'get' | 'check';
  path: string;
  ruleId?: string;
  category?: string;
  targetPath?: string;
}

export interface RuleSummary {
  id: string;
  description: string;
  severity: string;
  category: string;
  enabled: boolean;
}

export interface RuleDetail extends RuleSummary {
  name: string;
}

export interface RuleListResult {
  rules: RuleSummary[];
  total: number;
  filtered: boolean;
}

export type RuleQueryResult =
  | RuleListResult
  | RuleDetail
  | RuleEvaluationResult;

/**
 * Handle rule-query MCP tool calls.
 *
 * Actions:
 * - list: Return all active rules, optionally filtered by category
 * - get: Return detail for a specific rule by ID
 * - check: Evaluate all applicable rules against a target path
 */
export async function handleRuleQuery(args: unknown): Promise<RuleQueryResult> {
  const input = args as RuleQueryInput;

  if (!input.action || !input.path) {
    throw new Error('action and path are required');
  }

  const config = loadConfig(input.path);
  const overrides = config?.rules ?? {};
  const allRules = loadBuiltinRules(overrides, config?.['additional-allowed']);
  const activeRules = getActiveRules(allRules);

  switch (input.action) {
    case 'list': {
      let rules: Rule[] = activeRules;
      const filtered = Boolean(input.category);

      if (input.category) {
        rules = activeRules.filter(
          (r) => r.category === (input.category as RuleCategory),
        );
      }

      const summaries: RuleSummary[] = rules.map((r) => ({
        id: r.id,
        description: r.description,
        severity: r.severity,
        category: r.category,
        enabled: r.enabled,
      }));

      return { rules: summaries, total: summaries.length, filtered };
    }

    case 'get': {
      if (!input.ruleId) {
        throw new Error("ruleId is required for action='get'");
      }
      const rule = allRules.find((r) => r.id === input.ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${input.ruleId}`);
      }
      return {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        severity: rule.severity,
        category: rule.category,
        enabled: rule.enabled,
      };
    }

    case 'check': {
      if (!input.targetPath) {
        throw new Error("targetPath is required for action='check'");
      }

      const tree = await scanProject(input.path);
      const result = evaluateRules(tree, activeRules);
      const absTargetPath = resolve(input.path, input.targetPath);
      const filteredViolations = result.violations.filter(
        (v) =>
          v.path === absTargetPath || v.path.startsWith(absTargetPath + '/'),
      );
      return {
        ...result,
        violations: filteredViolations,
      };
    }

    default:
      throw new Error(`Unknown action: ${input.action}`);
  }
}
