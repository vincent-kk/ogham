/**
 * @file ruleEngineExempt.test.ts
 * @description Integration tests for config exemptions and peer overrides.
 *  - `wrapExempt` wrapper applied inside `applyOverrides` (AC2)
 *  - zero-peer-file object-entry branch with `paths` scoping (AC3)
 */
import { describe, expect, it } from 'vitest';

import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import { TOOL_STATUSES } from '../../../constants/toolEnvelope.js';
import {
  applyOverrides,
  evaluateRules,
  loadBuiltinRules,
} from '../../../core/rules/ruleEngine/index.js';
import { resolveProjectValidationStatus } from '../../../mcp/tools/fractalInspect/structureValidate/utils/resolveProjectValidationStatus.js';
import type { FractalNode, FractalTree } from '../../../types/fractal.js';
import type { ValidationReport } from '../../../types/report.js';
import type { RuleViolation } from '../../../types/rules.js';

/** @param overrides Node properties to replace. @returns A minimal fractal fixture. */
function makeNode(overrides: Partial<FractalNode>): FractalNode {
  return {
    path: 'packages/foo',
    name: 'foo',
    type: 'fractal',
    parent: 'packages',
    parentFractalPath: 'packages',
    children: [],
    childFractalPaths: [],
    organs: [],
    organPaths: [],
    hasIntentMd: true,
    hasDetailMd: false,
    entryPoints: [],
    peerFiles: [],
    hasIndex: false,
    hasMain: false,
    depth: 2,
    metadata: {},
    ...overrides,
  };
}

/** @param nodes Nodes to index. @returns A tree fixture for rule evaluation. */
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

describe('rule-engine exempt', () => {
  describe('applyOverrides + wrapExempt (AC2)', () => {
    it('replaces module-entry-point violations with an exemption finding', () => {
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
      expect(mep).toHaveLength(1);
      expect(mep[0]).toMatchObject({
        severity: 'info',
        exemptedBy: 'packages/**',
      });
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
        [BUILTIN_RULE_IDS.MAX_DEPTH]: { enabled: false },
      });
      const target = overridden.find(
        (r) => r.id === BUILTIN_RULE_IDS.MAX_DEPTH,
      );
      expect(target?.enabled).toBe(false);
    });
  });

  describe('config exemption accounting and validation status', () => {
    it('counts exempt evaluations as skipped without passing or failing', () => {
      const node = makeNode({});
      const rules = loadBuiltinRules({
        [BUILTIN_RULE_IDS.MODULE_ENTRY_POINT]: { exempt: ['packages/**'] },
      }).filter((rule) => rule.id === BUILTIN_RULE_IDS.MODULE_ENTRY_POINT);
      const result = evaluateRules(treeOf([node]), rules);
      expect(result).toMatchObject({ skipped: 1, passed: 0, failed: 0 });
      expect(result.violations).toHaveLength(1);
    });

    it('retains an info finding outside severity overrides with exact matches first', () => {
      const node = makeNode({});
      const rules = loadBuiltinRules({
        [BUILTIN_RULE_IDS.MODULE_ENTRY_POINT]: {
          severity: 'warning',
          exempt: ['packages/**', node.path],
        },
      }).filter((rule) => rule.id === BUILTIN_RULE_IDS.MODULE_ENTRY_POINT);
      const result = evaluateRules(treeOf([node]), rules);
      expect(result.violations).toEqual([
        {
          ruleId: BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
          severity: 'info',
          message: `${BUILTIN_RULE_IDS.MODULE_ENTRY_POINT} exempted by config (pattern ${node.path})`,
          path: node.path,
          suggestion:
            'Remove the pattern from rules.<id>.exempt to run the check.',
          exemptedBy: node.path,
        },
      ]);
    });

    it('excludes exemptions from violations while preserving certainty precedence', () => {
      const node = makeNode({});
      const report: ValidationReport = {
        result: {
          violations: [
            {
              ruleId: BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
              severity: 'info',
              path: node.path,
              message:
                'module-entry-point exempted by config (pattern packages/**)',
              suggestion:
                'Remove the pattern from rules.<id>.exempt to run the check.',
              exemptedBy: 'packages/**',
            },
          ],
          passed: 0,
          failed: 0,
          skipped: 1,
          duration: 0,
        },
        timestamp: '2026-10-14T00:00:00Z',
      };
      expect(resolveProjectValidationStatus(report, [])).toBe(TOOL_STATUSES.OK);
      const actual: RuleViolation = {
        ruleId: BUILTIN_RULE_IDS.MODULE_ENTRY_POINT,
        severity: 'error',
        path: 'src/deep',
        message: 'Missing entry point',
        suggestion: 'Declare an entry point.',
      };
      const mixed: ValidationReport = {
        ...report,
        result: {
          ...report.result,
          violations: [...report.result.violations, actual],
        },
      };
      expect(resolveProjectValidationStatus(mixed, [])).toBe(
        TOOL_STATUSES.VIOLATIONS,
      );
      for (const input of [report, mixed]) {
        expect(
          resolveProjectValidationStatus(input, [
            {
              code: 'UNCERTAIN_GRAPH',
              message: 'Dependency evidence is incomplete.',
              affects: ['dependencies'],
              nextAction: 'Refresh dependency evidence.',
            },
          ]),
        ).toBe(TOOL_STATUSES.INDETERMINATE);
      }
      expect(
        resolveProjectValidationStatus(
          {
            ...report,
            result: {
              ...report.result,
              violations: [
                { ...actual, certainty: 'unsupported' },
                ...report.result.violations,
              ],
            },
          },
          [],
        ),
      ).toBe(TOOL_STATUSES.UNSUPPORTED);
    });
  });

  describe('zero-peer-file object-entry branch (AC3)', () => {
    it('accepts literal and glob basenames while rejecting other peers', () => {
      const node = makeNode({
        path: 'packages/foo',
        peerFiles: ['README.extra', 'vite.config.ts', 'stray.ts'],
      });
      const rules = loadBuiltinRules(undefined, [
        { basename: 'README.extra' },
        { basename: '*.config.ts' },
      ]);
      const violations = evaluateRules(treeOf([node]), rules).violations.filter(
        (violation) => violation.ruleId === BUILTIN_RULE_IDS.ZERO_PEER_FILE,
      );
      expect(violations).toHaveLength(1);
      expect(violations[0]?.message).toContain('stray.ts');
    });

    it('allows CLAUDE.md under packages/** but not elsewhere', () => {
      const allowedNode = makeNode({
        path: 'packages/foo',
        hasIndex: true,
        peerFiles: ['CLAUDE.md'],
      });
      const disallowedNode = makeNode({
        path: 'src/deep',
        hasIndex: true,
        peerFiles: ['CLAUDE.md'],
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

    it('treats an entry without paths as allowed at every boundary', () => {
      const node = makeNode({
        path: 'src/any',
        hasIndex: true,
        peerFiles: ['type.ts'],
      });
      const rules = loadBuiltinRules(undefined, [{ basename: 'type.ts' }]);
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
        peerFiles: ['LICENSE'],
      });
      const rules = loadBuiltinRules(undefined, [{ basename: 'LICENSE' }]);
      const result = evaluateRules(treeOf([node]), rules);
      const zpf = result.violations.filter(
        (v) => v.ruleId === BUILTIN_RULE_IDS.ZERO_PEER_FILE,
      );
      expect(zpf).toHaveLength(0);
    });

    it('applies an adapter-scoped peer override only to matching nodes', () => {
      const matching = makeNode({
        path: 'src/matching',
        entryPoints: [
          {
            path: 'src/matching/public.entry',
            kind: 'module',
            adapterId: 'target-adapter',
            surface: 'enumerated',
          },
        ],
        peerFiles: ['LICENSE'],
      });
      const different = makeNode({
        path: 'src/different',
        entryPoints: [
          {
            path: 'src/different/public.entry',
            kind: 'module',
            adapterId: 'other-adapter',
            surface: 'enumerated',
          },
        ],
        peerFiles: ['LICENSE'],
      });
      const rules = loadBuiltinRules(undefined, [
        { basename: 'LICENSE', adapterId: 'target-adapter' },
      ]);

      const result = evaluateRules(treeOf([matching, different]), rules);
      const zeroPeer = result.violations.filter(
        (violation) => violation.ruleId === BUILTIN_RULE_IDS.ZERO_PEER_FILE,
      );

      expect(zeroPeer.map((violation) => violation.path)).toEqual([
        'src/different',
      ]);
    });
  });
});
