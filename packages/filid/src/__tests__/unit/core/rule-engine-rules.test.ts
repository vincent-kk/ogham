import { describe, expect, it } from 'vitest';

import {
  loadBuiltinRules,
} from '../../../core/rule-engine.js';
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
});
