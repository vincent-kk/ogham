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
    children: [],
    organs: [],
    hasIntentMd: false,
    hasDetailMd: false,
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

function entryRule(additionalEntryPoints?: string[]) {
  return loadBuiltinRules(undefined, undefined, additionalEntryPoints).find(
    (r) => r.id === BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
  )!;
}

function namingRule(additionalRoutePatterns?: string[]) {
  return loadBuiltinRules(
    undefined,
    undefined,
    undefined,
    additionalRoutePatterns,
  ).find((r) => r.id === BUILTIN_RULE_IDS.NAMING_CONVENTION)!;
}

describe('module-entry-point — framework awareness', () => {
  // --- basic ---
  it('passes a route segment with page.tsx and no index.ts', () => {
    const rule = entryRule();
    const node = makeNode({
      metadata: {
        peerFiles: ['page.tsx'],
        frameworkReservedFiles: ['page.tsx', 'layout.tsx'],
      },
    });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('passes a node holding a configured additional-entry-point', () => {
    const rule = entryRule(['api.tsx']);
    const node = makeNode({ metadata: { peerFiles: ['api.tsx'] } });
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

  // --- complex ---
  it('still flags a non-framework fractal without index.ts (regression)', () => {
    const rule = entryRule();
    const node = makeNode({ metadata: { peerFiles: ['helper.ts'] } });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(1);
  });

  it('passes a route segment with route.ts', () => {
    const rule = entryRule();
    const node = makeNode({
      metadata: {
        peerFiles: ['route.ts'],
        frameworkReservedFiles: ['route.ts'],
      },
    });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not treat page.tsx as an entry point without framework detection', () => {
    const rule = entryRule();
    const node = makeNode({ metadata: { peerFiles: ['page.tsx'] } });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(1);
  });
});

describe('naming-convention — framework awareness', () => {
  // --- basic ---
  it('passes a route group name (app) when a framework is detected', () => {
    const rule = namingRule();
    const node = makeNode({
      name: '(app)',
      metadata: { frameworkReservedFiles: ['page.tsx'] },
    });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('passes a dynamic segment name [id] when a framework is detected', () => {
    const rule = namingRule();
    const node = makeNode({
      name: '[id]',
      metadata: { frameworkReservedFiles: ['page.tsx'] },
    });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('still flags a route-group-shaped name in a non-framework project', () => {
    const rule = namingRule();
    const node = makeNode({ name: '(app)', metadata: {} });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(1);
  });

  // --- complex ---
  it('passes a catch-all segment name [...slug] when a framework is detected', () => {
    const rule = namingRule();
    const node = makeNode({
      name: '[...slug]',
      metadata: { frameworkReservedFiles: ['page.tsx'] },
    });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('passes a name matching a configured additional-route-pattern', () => {
    const rule = namingRule(['^@@']);
    const node = makeNode({ name: '@@special', metadata: {} });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('skips an uncompilable additional-route-pattern without crashing', () => {
    const rule = namingRule(['[']);
    const node = makeNode({ name: 'has space', metadata: {} });
    const tree = makeTree([node]);
    const ctx: RuleContext = { node, tree };
    expect(rule.check(ctx)).toHaveLength(1);
  });
});
