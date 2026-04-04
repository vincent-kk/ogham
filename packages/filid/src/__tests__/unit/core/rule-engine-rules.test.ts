import { describe, expect, it } from 'vitest';

import { loadBuiltinRules } from '../../../core/rules/rule-engine/rule-engine.js';
import type { FractalNode, FractalTree } from '../../../types/fractal.js';
import { BUILTIN_RULE_IDS } from '../../../types/rules.js';
import type { RuleContext } from '../../../types/rules.js';

// 테스트용 헬퍼 - FractalNode 생성
function makeNode(overrides: Partial<FractalNode> = {}): FractalNode {
  return {
    path: '/root/module',
    name: 'module',
    type: 'fractal',
    parent: '/root',
    children: [],
    organs: [],
    hasIntentMd: false,
    hasDetailMd: false,
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

describe('rule-engine (rules)', () => {
  describe('module-entry-point rule', () => {
    it('should fail for fractal without index.ts or main.ts', () => {
      const rule = loadBuiltinRules().find(
        (r) => r.id === BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
      )!;
      const node = makeNode({
        type: 'fractal',
        hasIndex: false,
        hasMain: false,
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(1);
    });

    it('should pass for fractal with index.ts', () => {
      const rule = loadBuiltinRules().find(
        (r) => r.id === BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
      )!;
      const node = makeNode({
        type: 'fractal',
        hasIndex: true,
        hasMain: false,
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
        metadata: { peerFiles: ['index.ts', 'stray.ts'] },
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      const violations = rule.check(ctx);
      expect(violations).toHaveLength(1);
      expect(violations[0].ruleId).toBe(BUILTIN_RULE_IDS.ZERO_PEER_FILE);
      expect(violations[0].severity).toBe('warning');
    });

    it('should pass for fractal node with only static-allowed files', () => {
      const rule = getRule();
      const node = makeNode({
        metadata: { peerFiles: ['index.ts', 'INTENT.md', 'DETAIL.md'] },
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
        metadata: {
          peerFiles: ['index.ts', 'user-service.ts'],
          eponymousFile: 'user-service.ts',
        },
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(0);
    });

    it('should allow framework reserved files', () => {
      const rule = getRule();
      const node = makeNode({
        metadata: {
          peerFiles: ['index.ts', 'layout.tsx', 'page.tsx'],
          frameworkReservedFiles: ['layout.tsx', 'page.tsx'],
        },
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(0);
    });

    it('should flag files not in framework reserved list', () => {
      const rule = getRule();
      const node = makeNode({
        metadata: {
          peerFiles: ['index.ts', 'layout.tsx', 'random.ts'],
          frameworkReservedFiles: ['layout.tsx'],
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
          metadata: { peerFiles: ['anything.ts'] },
        });
        const tree = makeTree([node]);
        const ctx: RuleContext = { node, tree };
        expect(rule.check(ctx)).toHaveLength(0);
      },
    );

    it('should pass when metadata.peerFiles is missing or empty', () => {
      const rule = getRule();
      const node1 = makeNode({ metadata: {} });
      const node2 = makeNode({ metadata: { peerFiles: [] } });
      const tree1 = makeTree([node1]);
      const tree2 = makeTree([node2]);
      expect(rule.check({ node: node1, tree: tree1 })).toHaveLength(0);
      expect(rule.check({ node: node2, tree: tree2 })).toHaveLength(0);
    });

    it('should apply to hybrid nodes with stray files', () => {
      const rule = getRule();
      const node = makeNode({
        type: 'hybrid',
        metadata: { peerFiles: ['index.ts', 'stray.ts'] },
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      expect(rule.check(ctx)).toHaveLength(1);
    });

    it('should allow all index/main variants and docs', () => {
      const rule = getRule();
      const node = makeNode({
        metadata: {
          peerFiles: [
            'index.ts',
            'index.js',
            'index.tsx',
            'index.mjs',
            'index.cjs',
            'main.ts',
            'main.js',
            'INTENT.md',
            'DETAIL.md',
          ],
        },
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
        metadata: {
          peerFiles: [
            'index.ts',
            'my-feature.ts',
            'page.tsx',
            'INTENT.md',
            'stray.ts',
          ],
          eponymousFile: 'my-feature.ts',
          frameworkReservedFiles: ['page.tsx'],
        },
      });
      const tree = makeTree([node]);
      const ctx: RuleContext = { node, tree };
      const violations = rule.check(ctx);
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain('stray.ts');
    });
  });
});
