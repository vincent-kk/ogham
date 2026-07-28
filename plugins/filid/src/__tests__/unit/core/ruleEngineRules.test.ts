import { portableJoin } from '@ogham/cross-platform/paths';
import { describe, expect, it } from 'vitest';

import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import {
  evaluateRules,
  loadBuiltinRules,
} from '../../../core/rules/ruleEngine/index.js';
import type { FractalNode, FractalTree } from '../../../types/fractal.js';
import type { RuleContext } from '../../../types/rules.js';

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

function makeSnapshot(
  tree: FractalTree,
  overrides: Record<string, unknown> = {},
) {
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
    ...overrides,
  };
}

describe('rule-engine (rules)', () => {
  describe('document contract rules', () => {
    it('reports one finding for a missing document already represented in snapshot evidence', () => {
      const rule = loadBuiltinRules().find(
        (candidate) => candidate.id === 'intent-document-contract',
      )!;
      const node = makeNode({
        hasIntentMd: false,
        documentEvidence: {
          intentPath: null,
          detailPath: '/root/module/DETAIL.md',
          status: 'missing',
          findings: [
            {
              document: 'intent',
              rule: 'missing-document',
              message: 'INTENT contract is missing.',
              severity: 'error',
            },
          ],
        },
      });
      const tree = makeTree([node]);

      expect(rule.check({ node, tree })).toEqual([
        expect.objectContaining({
          ruleId: 'intent-document-contract',
          message: 'INTENT contract is missing.',
        }),
      ]);
    });
  });

  describe('module-entry-point rule', () => {
    it('should fail for a fractal without an adapter-reported entry point', () => {
      const rule = loadBuiltinRules().find(
        (r) => r.id === BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
      )!;
      const node = makeNode({
        type: 'fractal',
        entryPoints: [],
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(1);
    });

    it('should pass for a fractal with an adapter-reported entry point', () => {
      const rule = loadBuiltinRules().find(
        (r) => r.id === BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
      )!;
      const node = makeNode({
        type: 'fractal',
        hasIndex: false,
        entryPoints: [
          {
            path: '/root/module/public.entry',
            kind: 'module',
            adapterId: 'test-structure',
            surface: 'enumerated',
          },
        ],
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(0);
    });

    it('should not apply to organ nodes', () => {
      const rule = loadBuiltinRules().find(
        (r) => r.id === BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
      )!;
      const node = makeNode({ type: 'organ', hasIndex: false, hasMain: false });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(0);
    });
  });

  describe('max-depth rule', () => {
    it('should fail when node depth exceeds maxDepth', () => {
      const rule = loadBuiltinRules().find(
        (r) => r.id === BUILTIN_RULE_IDS.MAX_DEPTH,
      )!;
      const node = makeNode({ depth: 11 });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree, scanOptions: { maxDepth: 10 } };
      expect(rule.check(ctx)).toHaveLength(1);
    });

    it('should pass when node depth equals maxDepth', () => {
      const rule = loadBuiltinRules().find(
        (r) => r.id === BUILTIN_RULE_IDS.MAX_DEPTH,
      )!;
      const node = makeNode({ depth: 10 });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree, scanOptions: { maxDepth: 10 } };
      expect(rule.check(ctx)).toHaveLength(0);
    });
  });

  describe('zero-peer-file rule', () => {
    const getRule = () =>
      loadBuiltinRules().find((r) => r.id === BUILTIN_RULE_IDS.ZERO_PEER_FILE)!;

    it('should flag any non-allowed peer file (strict, no threshold)', () => {
      const rule = getRule();
      const node = makeNode({
        peerFiles: ['public.entry', 'stray.source'],
        entryPoints: [
          {
            path: '/root/module/public.entry',
            kind: 'module',
            adapterId: 'test-structure',
            surface: 'enumerated',
          },
        ],
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      const violations = rule.check(ctx);
      expect(violations).toHaveLength(1);
      expect(violations[0].ruleId).toBe(BUILTIN_RULE_IDS.ZERO_PEER_FILE);
      expect(violations[0].severity).toBe('warning');
    });

    it('should pass with only adapter entry points and FCA documents', () => {
      const rule = getRule();
      const node = makeNode({
        peerFiles: ['public.entry', 'INTENT.md', 'DETAIL.md'],
        entryPoints: [
          {
            path: '/root/module/public.entry',
            kind: 'module',
            adapterId: 'test-structure',
            surface: 'enumerated',
          },
        ],
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(0);
    });

    it('should allow eponymous file', () => {
      const rule = getRule();
      const node = makeNode({
        name: 'user-service',
        path: '/root/user-service',
        peerFiles: ['user-service.source'],
        metadata: {
          eponymousFile: 'user-service.source',
        },
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(0);
    });

    it('should allow framework reserved files', () => {
      const rule = getRule();
      const node = makeNode({
        peerFiles: ['framework.entry', 'framework.layout'],
        metadata: {
          frameworkReservedFiles: ['framework.entry', 'framework.layout'],
        },
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(0);
    });

    it('should flag files not in framework reserved list', () => {
      const rule = getRule();
      const node = makeNode({
        peerFiles: ['framework.entry', 'random.source'],
        metadata: {
          frameworkReservedFiles: ['framework.entry'],
        },
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(1);
    });

    it.each(['organ', 'pure-function'] as const)(
      'should not apply to %s nodes',
      (nodeType) => {
        const rule = getRule();
        const node = makeNode({
          type: nodeType,
          peerFiles: ['anything.source'],
        });
        const tree = makeTree([node]);
        const ctx: RuleContext = { node, tree };
        expect(rule.check(ctx)).toHaveLength(0);
      },
    );

    it('should pass when adapter-reported peer files are empty', () => {
      const rule = getRule();
      const node = makeNode({ peerFiles: [] });
      const tree = makeTree([node]);
      expect(rule.check({ node, tree })).toHaveLength(0);
    });

    it('should apply to hybrid nodes with stray files', () => {
      const rule = getRule();
      const node = makeNode({
        type: 'hybrid',
        peerFiles: ['stray.source'],
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(1);
    });

    it('should allow adapter-reported entry points and FCA documents', () => {
      const rule = getRule();
      const node = makeNode({
        peerFiles: [
          'module.boundary',
          'runtime.boundary',
          'INTENT.md',
          'DETAIL.md',
        ],
        entryPoints: [
          {
            path: '/root/module/module.boundary',
            kind: 'module',
            adapterId: 'test-structure',
            surface: 'enumerated',
          },
          {
            path: '/root/module/runtime.boundary',
            kind: 'executable',
            adapterId: 'test-structure',
            surface: 'enumerated',
          },
        ],
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(0);
    });

    it('should compose all three categories correctly', () => {
      const rule = getRule();
      const node = makeNode({
        name: 'my-feature',
        path: '/root/my-feature',
        peerFiles: [
          'module.boundary',
          'my-feature.source',
          'framework.peer',
          'INTENT.md',
          'stray.source',
        ],
        entryPoints: [
          {
            path: '/root/my-feature/module.boundary',
            kind: 'module',
            adapterId: 'test-structure',
            surface: 'enumerated',
          },
        ],
        metadata: {
          eponymousFile: 'my-feature.source',
          frameworkReservedFiles: ['framework.peer'],
        },
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      const violations = rule.check(ctx);
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain('stray.source');
    });
  });

  describe('snapshot evidence rules', () => {
    it('should report a real dependency-graph cycle once', () => {
      const root = makeNode({
        path: '/root',
        name: 'root',
        parent: null,
        parentFractalPath: null,
        depth: 0,
      });
      const one = makeNode({ path: '/root/one', name: 'one' });
      const two = makeNode({ path: '/root/two', name: 'two' });
      const tree = makeTree([root, one, two]);
      const snapshot = makeSnapshot(tree, {
        dependencyGraph: {
          nodePaths: [...tree.nodes.keys()],
          edges: [
            {
              fromFractalPath: one.path,
              toFractalPath: two.path,
              evidence: [
                {
                  sourceFile: '/root/one/source',
                  rawSpecifier: '../two',
                  resolvedPath: '/root/two/public.entry',
                },
              ],
            },
            {
              fromFractalPath: two.path,
              toFractalPath: one.path,
              evidence: [
                {
                  sourceFile: '/root/two/source',
                  rawSpecifier: '../one',
                  resolvedPath: '/root/one/public.entry',
                },
              ],
            },
          ],
          cycles: [[one.path, two.path, one.path]],
          certainty: 'exact',
        },
      });
      const rule = loadBuiltinRules().find(
        (candidate) => candidate.id === 'circular-dependency',
      )!;

      const result = evaluateRules(snapshot, [rule]);

      expect(result.violations).toEqual([
        expect.objectContaining({
          ruleId: 'circular-dependency',
          path: one.path,
          message: expect.stringContaining(two.path),
        }),
      ]);
    });

    it('should preserve known cycles while reporting graph uncertainty', () => {
      const one = makeNode({ path: '/root/one', name: 'one' });
      const two = makeNode({ path: '/root/two', name: 'two' });
      const tree = makeTree([one, two]);
      const snapshot = makeSnapshot(tree, {
        dependencyGraph: {
          nodePaths: [one.path, two.path],
          edges: [],
          cycles: [[one.path, two.path]],
          certainty: 'indeterminate',
        },
      });
      const rule = loadBuiltinRules().find(
        (candidate) => candidate.id === 'circular-dependency',
      )!;

      const result = evaluateRules(snapshot, [rule]);

      expect(result.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ruleId: 'circular-dependency',
            severity: 'error',
          }),
          expect.objectContaining({
            ruleId: 'circular-dependency',
            severity: 'warning',
            certainty: 'indeterminate',
          }),
        ]),
      );
    });

    it('should isolate a pure function using dependency-graph evidence', () => {
      const pure = makeNode({
        path: '/root/pure',
        name: 'pure',
        type: 'pure-function',
        metadata: {},
      });
      const stateful = makeNode({
        path: '/root/stateful',
        name: 'stateful',
        type: 'fractal',
      });
      const tree = makeTree([pure, stateful]);
      const snapshot = makeSnapshot(tree, {
        dependencyGraph: {
          nodePaths: [...tree.nodes.keys()],
          edges: [
            {
              fromFractalPath: pure.path,
              toFractalPath: stateful.path,
              evidence: [
                {
                  sourceFile: '/root/pure/compute',
                  rawSpecifier: '../stateful',
                  resolvedPath: '/root/stateful/public.entry',
                },
              ],
            },
          ],
          cycles: [],
          certainty: 'exact',
        },
      });
      const rule = loadBuiltinRules().find(
        (candidate) => candidate.id === 'pure-function-isolation',
      )!;

      const result = evaluateRules(snapshot, [rule]);

      expect(result.violations).toEqual([
        expect.objectContaining({
          ruleId: 'pure-function-isolation',
          path: pure.path,
        }),
      ]);
    });

    it('should keep pure-function isolation indeterminate when graph evidence is incomplete', () => {
      const pure = makeNode({
        path: portableJoin('/root', 'pure'),
        name: 'pure',
        type: 'pure-function',
      });
      const tree = makeTree([pure]);
      const snapshot = makeSnapshot(tree, {
        dependencyGraph: {
          nodePaths: [pure.path],
          edges: [],
          cycles: [],
          certainty: 'indeterminate',
        },
      });
      const rule = loadBuiltinRules().find(
        (candidate) => candidate.id === 'pure-function-isolation',
      )!;

      const result = evaluateRules(snapshot, [rule]);

      expect(result.violations).toEqual([
        expect.objectContaining({
          ruleId: 'pure-function-isolation',
          path: pure.path,
          severity: 'warning',
          certainty: 'indeterminate',
        }),
      ]);
      expect(result.passed).toBe(0);
    });

    it('should keep import boundaries indeterminate after known compliant edges', () => {
      const source = makeNode({
        path: portableJoin('/root', 'source'),
        name: 'source',
      });
      const targetEntry = portableJoin('/root', 'target', 'public.entry');
      const target = makeNode({
        path: portableJoin('/root', 'target'),
        name: 'target',
        entryPoints: [
          {
            path: targetEntry,
            kind: 'module',
            adapterId: 'fixture',
            surface: 'enumerated',
          },
        ],
      });
      const tree = makeTree([source, target]);
      const snapshot = makeSnapshot(tree, {
        dependencyGraph: {
          nodePaths: [source.path, target.path],
          edges: [
            {
              fromFractalPath: source.path,
              toFractalPath: target.path,
              evidence: [
                {
                  sourceFile: portableJoin(source.path, 'implementation'),
                  rawSpecifier: '../target',
                  resolvedPath: targetEntry,
                },
              ],
            },
          ],
          cycles: [],
          certainty: 'indeterminate',
        },
      });
      const rule = loadBuiltinRules().find(
        (candidate) => candidate.id === 'external-import-boundary',
      )!;

      const result = evaluateRules(snapshot, [rule]);

      expect(result.violations).toEqual([
        expect.objectContaining({
          ruleId: 'external-import-boundary',
          path: tree.root,
          severity: 'warning',
          certainty: 'indeterminate',
        }),
      ]);
      expect(result.passed).toBe(0);
    });

    it('should propagate verification policy findings without recomputing them', () => {
      const node = makeNode();
      const tree = makeTree([node]);
      const verificationFinding = {
        ruleId: 'spec-document-case-cap',
        path: '/root/module/contract.spec',
        severity: 'error',
        message: 'spec-document has 16 semantic cases; the per-file cap is 15.',
      };
      const snapshot = makeSnapshot(tree, {
        verification: {
          files: [],
          violations: [verificationFinding],
          certainty: 'exact',
        },
      });
      const rule = loadBuiltinRules().find(
        (candidate) => candidate.id === verificationFinding.ruleId,
      );
      if (!rule)
        throw new Error(
          `Missing canonical rule: ${verificationFinding.ruleId}`,
        );

      const result = evaluateRules(snapshot, [rule]);

      expect(result.violations).toEqual([verificationFinding]);
    });
  });
});
