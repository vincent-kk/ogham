import type { FractalTree } from '../../../types/fractal.js';
import type {
  Rule,
  RuleContext,
  RuleEvaluationResult,
  RuleViolation,
} from '../../../types/rules.js';
import type { ScanOptions } from '../../../types/scan.js';
import { evaluateRule } from './evaluate-rule.js';
import { getActiveRules } from './get-active-rules.js';
import { loadBuiltinRules } from './load-builtin-rules.js';

/**
 * FractalTree의 모든 노드에 대해 활성화된 규칙을 평가한다.
 *
 * @param tree - 검증할 프랙탈 트리
 * @param rules - 평가할 규칙 목록 (생략 시 내장 규칙 사용)
 * @param options - 스캔 옵션 (maxDepth 등)
 * @returns 전체 평가 결과
 */
export function evaluateRules(
  tree: FractalTree,
  rules?: Rule[],
  options?: ScanOptions,
): RuleEvaluationResult {
  const start = Date.now();
  const activeRules = getActiveRules(rules ?? loadBuiltinRules());
  const violations: RuleViolation[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const [, node] of tree.nodes) {
    const context: RuleContext = { node, tree, scanOptions: options };
    for (const rule of activeRules) {
      if (!rule.enabled) {
        skipped++;
        continue;
      }
      const nodeViolations = evaluateRule(rule, context);
      if (nodeViolations.length === 0) {
        passed++;
      } else {
        failed++;
        violations.push(...nodeViolations);
      }
    }
  }

  return {
    violations,
    passed,
    failed,
    skipped,
    duration: Date.now() - start,
  };
}
