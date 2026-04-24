import type { FractalTree } from '../../../types/fractal.js';
import type { ValidationReport } from '../../../types/report.js';
import type {
  Rule,
  RuleContext,
  RuleViolation,
} from '../../../types/rules.js';
import type { ScanOptions } from '../../../types/scan.js';

import { loadBuiltinRules } from '../rule-engine/rule-engine.js';
import { validateNode } from './validate-node.js';

/**
 * FractalTree 전체를 검증하고 ValidationReport를 반환한다.
 *
 * @param tree - 검증할 프랙탈 트리
 * @param rules - 적용할 규칙 목록 (미제공 시 rule-engine의 내장 규칙 사용)
 * @param options - 스캔 옵션 (max-depth 규칙 등이 참조)
 * @returns 검증 보고서 (규칙 평가 결과 + 타임스탬프)
 */
export function validateStructure(
  tree: FractalTree,
  rules?: Rule[],
  options?: ScanOptions,
): ValidationReport {
  const start = Date.now();
  let ruleList: Rule[];

  if (rules && rules.length > 0) {
    ruleList = rules;
  } else {
    ruleList = loadBuiltinRules();
  }

  const violations: RuleViolation[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const [, node] of tree.nodes) {
    const context: RuleContext = { node, tree, scanOptions: options };
    for (const rule of ruleList) {
      if (!rule.enabled) {
        skipped++;
        continue;
      }
      const nodeViolations = validateNode(node, context, rule);
      if (nodeViolations.length === 0) {
        passed++;
      } else {
        failed++;
        violations.push(...nodeViolations);
      }
    }
  }

  const result = {
    violations,
    passed,
    failed,
    skipped,
    duration: Date.now() - start,
  };

  return {
    result,
    timestamp: new Date().toISOString(),
  };
}
