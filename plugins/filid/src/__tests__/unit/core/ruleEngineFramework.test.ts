import { describe, expect, it } from 'vitest';

import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import { loadBuiltinRules } from '../../../core/rules/ruleEngine/ruleEngine.js';
import type { FractalNode, FractalTree } from '../../../types/fractal.js';
import type { RuleContext } from '../../../types/rules.js';

// 테스트용 헬퍼 - FractalNode 생성 (진입점 없는 fractal이 기본)
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
    hasIndex: false,
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

function entryRule() {
  return loadBuiltinRules().find(
    (r) => r.id === BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
  )!;
}

describe('module-entry-point — framework awareness', () => {
  it('passes a framework entry point reported by an adapter', () => {
    const rule = entryRule();
    const node = makeNode({
      entryPoints: [
        {
          path: '/root/module/framework.entry',
          kind: 'framework',
          adapterId: 'fixture',
          surface: 'enumerated',
        },
      ],
    });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('passes a configured entry point after its adapter reports it', () => {
    const rule = entryRule();
    const node = makeNode({
      entryPoints: [
        {
          path: '/root/module/configured.entry',
          kind: 'module',
          adapterId: 'fixture',
          surface: 'enumerated',
        },
      ],
    });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('still flags a framework grouping dir with no entry file', () => {
    const rule = entryRule();
    const node = makeNode({
      metadata: { peerFiles: [], frameworkReservedFiles: ['page.tsx'] },
    });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(1);
  });

  it('still flags a non-framework fractal without adapter evidence', () => {
    const rule = entryRule();
    const node = makeNode({ metadata: { peerFiles: ['helper.ts'] } });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(1);
  });

  it('passes any framework-owned entry path supplied by its adapter', () => {
    const rule = entryRule();
    const node = makeNode({
      entryPoints: [
        {
          path: '/root/module/alternate.framework-entry',
          kind: 'framework',
          adapterId: 'fixture',
          surface: 'enumerated',
        },
      ],
    });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not infer an entry point from an unclaimed peer file', () => {
    const rule = entryRule();
    const node = makeNode({ peerFiles: ['unclaimed.peer'] });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(1);
  });
});
