import { describe, expect, it } from 'vitest';

import {
  validateDependencies,
  validateNode,
  validateStructure,
} from '../../../core/rules/fractal-validator/fractal-validator.js';
import { buildFractalTree } from '../../../core/tree/fractal-tree/fractal-tree.js';
import type { NodeEntry } from '../../../core/tree/fractal-tree/fractal-tree.js';
import type { CategoryType } from '../../../types/fractal.js';
import type { Rule, RuleContext } from '../../../types/rules.js';

const entry = (
  path: string,
  type: CategoryType,
  hasIntentMd = false,
  hasDetailMd = false,
  hasIndex = false,
  hasMain = false,
): NodeEntry => ({
  path,
  name: path.split('/').pop()!,
  type,
  hasIntentMd,
  hasDetailMd,
  hasIndex,
  hasMain,
});

describe('fractal-validator', () => {
  describe('validateStructure', () => {
    it('should return a ValidationReport with timestamp', () => {
      const tree = buildFractalTree([
        entry('/app', 'fractal', true, false, true),
      ]);
      const report = validateStructure(tree);

      expect(report).toBeDefined();
      expect(report.result).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(typeof report.result.passed).toBe('number');
      expect(typeof report.result.failed).toBe('number');
      expect(Array.isArray(report.result.violations)).toBe(true);
    });

    it('should detect organ with INTENT.md as violation', () => {
      const tree = buildFractalTree([
        entry('/app', 'fractal', true, false, true),
        {
          path: '/app/utils',
          name: 'utils',
          type: 'organ',
          hasIntentMd: true,
          hasDetailMd: false,
        },
      ]);
      const report = validateStructure(tree);

      const violation = report.result.violations.find(
        (v) => v.ruleId === 'organ-no-intentmd',
      );
      expect(violation).toBeDefined();
      expect(violation!.severity).toBe('error');
      expect(violation!.path).toBe('/app/utils');
    });

    it('should detect fractal without entry point as warning', () => {
      const tree = buildFractalTree([
        entry('/app', 'fractal', true, false, false, false),
      ]);
      const report = validateStructure(tree);

      const violation = report.result.violations.find(
        (v) => v.ruleId === 'module-entry-point',
      );
      expect(violation).toBeDefined();
      expect(violation!.severity).toBe('warning');
    });

    it('should pass for valid fractal with index.ts', () => {
      const tree = buildFractalTree([
        entry('/app', 'fractal', true, false, true),
        entry('/app/auth', 'fractal', true, false, true),
      ]);
      const report = validateStructure(tree);

      const entryViolations = report.result.violations.filter(
        (v) => v.ruleId === 'module-entry-point',
      );
      expect(entryViolations).toHaveLength(0);
    });

    it('should pass for valid fractal with main.ts', () => {
      const tree = buildFractalTree([
        entry('/app', 'fractal', true, false, false, true),
      ]);
      const report = validateStructure(tree);

      const entryViolations = report.result.violations.filter(
        (v) => v.ruleId === 'module-entry-point',
      );
      expect(entryViolations).toHaveLength(0);
    });

    it('should accept custom rules via parameter', () => {
      const customRule: Rule = {
        id: 'custom-test-rule',
        name: 'Custom Test Rule',
        description: 'Always fails',
        category: 'structure',
        severity: 'warning',
        enabled: true,
        check: (ctx: RuleContext) => [
          {
            ruleId: 'custom-test-rule',
            severity: 'warning',
            message: 'Always fails',
            path: ctx.node.path,
          },
        ],
      };

      const tree = buildFractalTree([
        entry('/app', 'fractal', true, false, true),
      ]);
      const report = validateStructure(tree, [customRule]);

      expect(report.result.violations).toHaveLength(1);
      expect(report.result.violations[0].ruleId).toBe('custom-test-rule');
    });

    it('should skip disabled rules', () => {
      const disabledRule: Rule = {
        id: 'disabled-rule',
        name: 'Disabled Rule',
        description: 'Should not run',
        category: 'structure',
        severity: 'error',
        enabled: false,
        check: () => [
          {
            ruleId: 'disabled-rule',
            severity: 'error',
            message: 'Should not appear',
            path: '',
          },
        ],
      };

      const tree = buildFractalTree([
        entry('/app', 'fractal', true, false, true),
      ]);
      const report = validateStructure(tree, [disabledRule]);

      expect(report.result.violations).toHaveLength(0);
      expect(report.result.skipped).toBe(1);
    });

    it('should track duration', () => {
      const tree = buildFractalTree([
        entry('/app', 'fractal', true, false, true),
      ]);
      const report = validateStructure(tree);

      expect(report.result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should propagate scanOptions.maxDepth to max-depth rule', () => {
      // buildFractalTree does not accept a depth input; we construct the tree
      // manually so the root sits at depth 2 — beyond an override of maxDepth=1.
      const tree = {
        root: '/root/app',
        nodes: new Map(),
        depth: 2,
        totalNodes: 1,
      };
      tree.nodes.set('/root/app', {
        path: '/root/app',
        name: 'app',
        type: 'fractal' as const,
        parent: null,
        children: [],
        organs: [],
        hasIntentMd: true,
        hasDetailMd: false,
        hasIndex: true,
        hasMain: false,
        depth: 2,
        metadata: {},
      });

      const withOption = validateStructure(tree, undefined, { maxDepth: 1 });
      expect(
        withOption.result.violations.some((v) => v.ruleId === 'max-depth'),
      ).toBe(true);

      const withoutOption = validateStructure(tree);
      // default maxDepth is 10 → depth=2 should not violate
      expect(
        withoutOption.result.violations.some((v) => v.ruleId === 'max-depth'),
      ).toBe(false);
    });
  });

  describe('validateNode', () => {
    it('should validate a single node with a specific rule', () => {
      const tree = buildFractalTree([
        entry('/app', 'fractal', true, false, false),
      ]);
      const node = tree.nodes.get('/app')!;
      const context: RuleContext = { node, tree };

      const rule: Rule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test',
        category: 'structure',
        severity: 'error',
        enabled: true,
        check: (ctx) =>
          ctx.node.hasIndex
            ? []
            : [
                {
                  ruleId: 'test-rule',
                  severity: 'error',
                  message: 'No index',
                  path: ctx.node.path,
                },
              ],
      };

      const violations = validateNode(node, context, rule);
      expect(violations).toHaveLength(1);
      expect(violations[0].ruleId).toBe('test-rule');
    });

    it('should run all default rules when no rule specified', () => {
      const tree = buildFractalTree([
        entry('/app', 'fractal', true, false, false),
      ]);
      const node = tree.nodes.get('/app')!;
      const context: RuleContext = { node, tree };

      const violations = validateNode(node, context);
      // fractal without index.ts/main.ts should trigger module-entry-point
      expect(violations.some((v) => v.ruleId === 'module-entry-point')).toBe(
        true,
      );
    });
  });

  describe('validateDependencies', () => {
    it('should return empty array for tree with no cycles', () => {
      const tree = buildFractalTree([
        entry('/app', 'fractal', true, false, true),
        entry('/app/auth', 'fractal', true, false, true),
        entry('/app/dashboard', 'fractal', true, false, true),
      ]);

      const violations = validateDependencies(tree);
      expect(violations).toHaveLength(0);
    });

    it('should return violations for an empty tree', () => {
      const tree = buildFractalTree([]);
      const violations = validateDependencies(tree);
      expect(violations).toHaveLength(0);
    });
  });
});
