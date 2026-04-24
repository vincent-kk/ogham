/**
 * @file rule-engine-exempt.test.ts
 * @description Integration tests for Commit B runtime layer.
 *  - `withExempt` wrapper applied inside `applyOverrides` (AC2)
 *  - zero-peer-file object-entry branch with `paths` scoping (AC3)
 */
import { describe, expect, it } from 'vitest';

import {
  applyOverrides,
  evaluateRules,
  loadBuiltinRules,
} from '../../../core/rules/rule-engine/rule-engine.js';
import { BUILTIN_RULE_IDS } from '../../../constants/builtin-rule-ids.js';
import type { FractalNode, FractalTree } from '../../../types/fractal.js';

function makeNode(overrides: Partial<FractalNode>): FractalNode {
  return {
    path: 'packages/foo',
    name: 'foo',
    type: 'fractal',
    parent: 'packages',
    children: [],
    organs: [],
    hasIntentMd: true,
    hasDetailMd: false,
    hasIndex: false,
    hasMain: false,
    depth: 2,
    metadata: {},
    ...overrides,
  };
}

function treeOf(nodes: FractalNode[]): FractalTree {
  const map = new Map<string, FractalNode>();
  for (const n of nodes) map.set(n.path, n);
  return {
    root: nodes[0]?.path ?? '/root',
    nodes: map,
    depth: 2,
    totalNodes: nodes.length,
  };
}

describe('rule-engine exempt (Commit B)', () => {
  describe('applyOverrides + withExempt (AC2)', () => {
    it('suppresses module-entry-point violations on paths matching exempt glob', () => {
      const node = makeNode({ path: 'packages/foo', hasIndex: false });
      const rules = loadBuiltinRules({
        [BUILTIN_RULE_IDS.MODULE_ENTRY_POINT]: {
          enabled: true,
          exempt: ['packages/**'],
        },
      });
      const result = evaluateRules(treeOf([node]), rules);
      const mep = result.violations.filter(
        (v) => v.ruleId === BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
      );
      expect(mep).toHaveLength(0);
    });

    it('leaves violations intact on paths NOT matching exempt glob', () => {
      const node = makeNode({ path: 'src/deep', hasIndex: false });
      const rules = loadBuiltinRules({
        [BUILTIN_RULE_IDS.MODULE_ENTRY_POINT]: {
          enabled: true,
          exempt: ['packages/**'],
        },
      });
      const result = evaluateRules(treeOf([node]), rules);
      const mep = result.violations.filter(
        (v) => v.ruleId === BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
      );
      expect(mep.length).toBeGreaterThan(0);
    });

    it('applyOverrides keeps rule.check pure when exempt is absent', () => {
      const rules = loadBuiltinRules();
      const overridden = applyOverrides(rules, {
        [BUILTIN_RULE_IDS.NAMING_CONVENTION]: { enabled: false },
      });
      const target = overridden.find(
        (r) => r.id === BUILTIN_RULE_IDS.NAMING_CONVENTION,
      );
      expect(target?.enabled).toBe(false);
    });
  });

  describe('zero-peer-file object-entry branch (AC3)', () => {
    it('allows CLAUDE.md under packages/** but not elsewhere', () => {
      const allowedNode = makeNode({
        path: 'packages/foo',
        hasIndex: true,
        metadata: { peerFiles: ['CLAUDE.md'] },
      });
      const disallowedNode = makeNode({
        path: 'src/deep',
        hasIndex: true,
        metadata: { peerFiles: ['CLAUDE.md'] },
      });
      const rules = loadBuiltinRules(undefined, [
        { basename: 'CLAUDE.md', paths: ['packages/**'] },
      ]);
      const result = evaluateRules(
        treeOf([allowedNode, disallowedNode]),
        rules,
      );
      const zpf = result.violations.filter(
        (v) => v.ruleId === BUILTIN_RULE_IDS.ZERO_PEER_FILE,
      );
      expect(zpf.map((v) => v.path)).toEqual(['src/deep']);
    });

    it('treats bare string entries as globally allowed (backward-compat)', () => {
      const node = makeNode({
        path: 'src/any',
        hasIndex: true,
        metadata: { peerFiles: ['type.ts'] },
      });
      const rules = loadBuiltinRules(undefined, ['type.ts']);
      const result = evaluateRules(treeOf([node]), rules);
      const zpf = result.violations.filter(
        (v) => v.ruleId === BUILTIN_RULE_IDS.ZERO_PEER_FILE,
      );
      expect(zpf).toHaveLength(0);
    });

    it('object entry without `paths` applies to every node', () => {
      const node = makeNode({
        path: 'src/any',
        hasIndex: true,
        metadata: { peerFiles: ['LICENSE'] },
      });
      const rules = loadBuiltinRules(undefined, [{ basename: 'LICENSE' }]);
      const result = evaluateRules(treeOf([node]), rules);
      const zpf = result.violations.filter(
        (v) => v.ruleId === BUILTIN_RULE_IDS.ZERO_PEER_FILE,
      );
      expect(zpf).toHaveLength(0);
    });
  });
});
