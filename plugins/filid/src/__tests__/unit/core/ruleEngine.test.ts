import { describe, expect, it } from 'vitest';

import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import {
  applyOverrides,
  evaluateRule,
  evaluateRules,
  getActiveRules,
  loadBuiltinRules,
} from '../../../core/rules/ruleEngine/ruleEngine.js';
import type { FractalNode, FractalTree } from '../../../types/fractal.js';
import type { Rule, RuleContext } from '../../../types/rules.js';

const EXPECTED_RULE_IDS = [
  'intent-document-contract',
  'detail-document-contract',
  'organ-no-intentmd',
  'entry-point-surface',
  'module-entry-point',
  'max-depth',
  'circular-dependency',
  'pure-function-isolation',
  'zero-peer-file',
  'external-import-boundary',
  'spec-document-case-cap',
  'test-record-case-cap',
  'spec-fragmentation',
  'spec-contract-link',
  'legacy-criteria-ledger',
] as const;

const SNAPSHOT_BASE = {
  schemaVersion: 1 as const,
  outputLanguage: 'en',
  snapshotHash: 'snapshot-hash',
  adapterIds: [],
  verification: {
    files: [],
    violations: [],
    certainty: 'exact' as const,
  },
  legacyCriteriaLedger: null,
  diagnostics: [],
  createdAt: '2026-07-27T00:00:00.000Z',
};

// 테스트용 헬퍼 - FractalNode 생성
function makeNode(overrides: Partial<FractalNode> = {}): FractalNode {
  return {
    path: '/root/module',
    name: 'module',
    type: 'fractal',
    parent: '/root',
    parentFractalPath: '/root',
    children: [],
    childFractalPaths: [],
    organs: [],
    organPaths: [],
    hasIntentMd: false,
    hasDetailMd: false,
    entryPoints: [],
    peerFiles: [],
    hasIndex: true,
    hasMain: false,
    depth: 1,
    metadata: {},
    ...overrides,
  };
}

// 테스트용 헬퍼 - FractalTree 생성
function makeTree(nodes: FractalNode[]): FractalTree {
  const map = new Map<string, FractalNode>();
  for (const n of nodes) map.set(n.path, n);
  const root =
    nodes.find((n) => n.parent === null)?.path ?? nodes[0]?.path ?? '/root';
  return { root, nodes: map, depth: 2, totalNodes: nodes.length };
}

function makeSnapshot(tree: FractalTree) {
  return {
    ...SNAPSHOT_BASE,
    projectRoot: tree.root,
    tree,
    dependencyGraph: {
      nodePaths: [...tree.nodes.keys()],
      edges: [],
      cycles: [],
      certainty: 'exact' as const,
    },
  };
}

describe('rule-engine', () => {
  describe('loadBuiltinRules', () => {
    it('should return exactly the canonical 15 built-in rules', () => {
      const rules = loadBuiltinRules();
      expect(rules.map((rule) => rule.id).sort()).toEqual(
        [...EXPECTED_RULE_IDS].sort(),
      );
    });

    it('should have all rules enabled by default', () => {
      const rules = loadBuiltinRules();
      expect(rules.every((r) => r.enabled)).toBe(true);
    });
  });

  describe('getActiveRules', () => {
    it('should return only enabled rules', () => {
      const rules = loadBuiltinRules();
      rules[0].enabled = false;
      const active = getActiveRules(rules);
      expect(active).toHaveLength(14);
    });

    it('should return all rules when all enabled', () => {
      const rules = loadBuiltinRules();
      expect(getActiveRules(rules)).toHaveLength(15);
    });
  });

  describe('organ-no-intentmd rule', () => {
    it('should fail when organ has INTENT.md', () => {
      const rule = loadBuiltinRules().find(
        (r) => r.id === BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD,
      )!;
      const node = makeNode({ type: 'organ', hasIntentMd: true });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      const violations = rule.check(ctx);
      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('error');
    });

    it('should pass when organ has no INTENT.md', () => {
      const rule = loadBuiltinRules().find(
        (r) => r.id === BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD,
      )!;
      const node = makeNode({ type: 'organ', hasIntentMd: false });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(0);
    });

    it('should pass when fractal has INTENT.md', () => {
      const rule = loadBuiltinRules().find(
        (r) => r.id === BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD,
      )!;
      const node = makeNode({ type: 'fractal', hasIntentMd: true });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(0);
    });
  });

  describe('evaluateRule', () => {
    it('should return empty array for disabled rule', () => {
      const rule = loadBuiltinRules()[0];
      rule.enabled = false;
      const node = makeNode({ name: 'Bad_Name' });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(evaluateRule(rule, ctx)).toHaveLength(0);
    });

    it('should report an indeterminate finding when a rule throws', () => {
      const node = makeNode();
      const tree = makeTree([node]);
      const rule: Rule = {
        id: 'throwing-rule',
        name: 'Throwing rule',
        description: 'Reproduces an unavailable analyzer.',
        category: 'dependency',
        severity: 'error',
        enabled: true,
        check: () => {
          throw new Error('adapter unavailable');
        },
      };

      expect(evaluateRule(rule, { node, tree })).toEqual([
        expect.objectContaining({
          ruleId: 'throwing-rule',
          severity: 'warning',
          path: node.path,
          message: expect.stringContaining('adapter unavailable'),
        }),
      ]);
    });
  });

  describe('evaluateRules', () => {
    it('should return evaluation result with violations', () => {
      const rootNode = makeNode({
        path: '/root',
        name: 'root',
        parent: null,
        depth: 0,
      });
      const badNode = makeNode({
        path: '/root/Bad_Module',
        name: 'Bad_Module',
        parent: '/root',
        depth: 1,
        type: 'fractal',
        hasIndex: false,
        hasMain: false,
      });
      const tree = makeTree([rootNode, badNode]);
      const result = evaluateRules(makeSnapshot(tree));
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should count passed and failed correctly', () => {
      const node = makeNode({ name: 'good-module', hasIndex: true });
      const tree = makeTree([node]);
      const result = evaluateRules(makeSnapshot(tree));
      expect(result.passed + result.failed + result.skipped).toBeGreaterThan(0);
    });

    it('should evaluate a project rule once regardless of node count', () => {
      const nodes = [
        makeNode({ path: '/root', parent: null, depth: 0 }),
        makeNode({ path: '/root/one', name: 'one' }),
        makeNode({ path: '/root/two', name: 'two' }),
      ];
      const tree = makeTree(nodes);
      let checks = 0;
      const projectRule = {
        id: 'project-probe',
        name: 'Project probe',
        description: 'Counts project-level evaluations.',
        category: 'dependency',
        severity: 'error',
        enabled: true,
        scope: 'dag',
        granularity: 'project',
        check: () => {
          checks++;
          return [];
        },
      } as Rule;

      evaluateRules(makeSnapshot(tree), [projectRule]);

      expect(checks).toBe(1);
    });

    it('should report snapshot-only scope as indeterminate for a legacy tree input', () => {
      const node = makeNode();
      const tree = makeTree([node]);
      const circularRule = loadBuiltinRules().find(
        (rule) => rule.id === BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY,
      )!;

      const result = evaluateRules(tree, [circularRule]);

      expect(result.violations).toEqual([
        expect.objectContaining({
          ruleId: BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY,
          certainty: 'indeterminate',
          path: tree.root,
        }),
      ]);
      expect(result.passed).toBe(0);
    });
  });

  describe('loadBuiltinRules with overrides', () => {
    it('should disable a rule via overrides', () => {
      const rules = loadBuiltinRules({
        'max-depth': { enabled: false },
      });
      const maxDepth = rules.find((r) => r.id === 'max-depth');
      expect(maxDepth?.enabled).toBe(false);
    });

    it('should override severity and propagate to violations', () => {
      const rules = loadBuiltinRules({
        'module-entry-point': { severity: 'error' },
      });
      const entryPoint = rules.find((r) => r.id === 'module-entry-point')!;
      expect(entryPoint.severity).toBe('error');
      const node = makeNode({ hasIndex: false, hasMain: false });
      const tree = makeTree([node]);
      const violations = entryPoint.check({ node, tree });
      expect(violations[0]?.severity).toBe('error');
    });

    it('should leave non-overridden rules unchanged', () => {
      const rules = loadBuiltinRules({
        'max-depth': { enabled: false },
      });
      const organ = rules.find((r) => r.id === 'organ-no-intentmd');
      expect(organ?.enabled).toBe(true);
      expect(organ?.severity).toBe('error');
    });

    it('should return default rules when overrides is undefined', () => {
      const rules = loadBuiltinRules();
      expect(rules).toHaveLength(15);
      expect(rules.every((r) => r.enabled)).toBe(true);
    });
  });

  describe('applyOverrides', () => {
    it('should return same rules when overrides is empty', () => {
      const rules = loadBuiltinRules();
      const applied = applyOverrides(rules, {});
      expect(applied).toEqual(rules);
    });

    it('should wrap check to override violation severity', () => {
      const rules = loadBuiltinRules();
      const applied = applyOverrides(rules, {
        'organ-no-intentmd': { severity: 'warning' },
      });
      const rule = applied.find((r) => r.id === 'organ-no-intentmd')!;
      expect(rule.severity).toBe('warning');
      const node = makeNode({ type: 'organ', hasIntentMd: true });
      const tree = makeTree([node]);
      const violations = rule.check({ node, tree });
      expect(violations[0]?.severity).toBe('warning');
    });
  });
});
