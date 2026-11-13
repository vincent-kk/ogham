import { describe, expect, it, vi } from 'vitest';

import { ALL_SNAPSHOT_AXES } from '../../../../constants/snapshotAxes.js';
import type { FractalNode, ProjectSnapshot } from '../../../../types/fractal.js';
import type { RuleOverride } from '../../../../types/rules.js';
import { evaluateVerificationPolicy } from '../../../verification/policy/evaluateVerificationPolicy.js';
import { applyOverrides } from '../evaluation/applyOverrides.js';
import { evaluateRules } from '../evaluation/evaluateRules.js';
import { loadBuiltinRules } from '../evaluation/loadBuiltinRules.js';

/** @param cycle Whether to include a representative cycle. @returns A typed project fixture. */
function snapshot(cycle = false): ProjectSnapshot {
  const node: FractalNode = {
    path: '/project', name: 'project', type: 'fractal', parent: null,
    parentFractalPath: null, children: [], childFractalPaths: [], organs: [],
    organPaths: [], hasIntentMd: true, hasDetailMd: false, entryPoints: [],
    peerFiles: [], hasIndex: false, hasMain: false, depth: 0, metadata: {},
  };
  return {
    schemaVersion: 1, projectRoot: node.path, outputLanguage: 'en', snapshotHash: 'fixture',
    adapterIds: [], tree: { root: node.path, nodes: new Map([[node.path, node]]), depth: 0, totalNodes: 1 },
    dependencyGraph: { nodePaths: ['/project/a', '/project/b'], edges: [],
      cycles: cycle ? [['/project/a', '/project/b', '/project/a']] : [], unknownFiles: [], certainty: 'exact' },
    verificationPaths: [], verification: evaluateVerificationPolicy(['one', 'two'].map((name) => ({
      path: `/project/${name}.test.ts`, adapterId: 'fixture', role: 'test-record',
      ownerFractalPath: '/project', count: { certainty: 'exact', exactCount: 33, reasons: [] },
    })), '/project'),
    legacyCriteriaLedger: null, diagnostics: [], normalizedFacts: [], filesOutsideFactsScope: 0,
    collectedAxes: ALL_SNAPSHOT_AXES, createdAt: '2026-01-01T00:00:00Z',
  };
}

/** @param input Snapshot to inspect. @param id Rule to isolate. @param override Config to apply. @returns The single-rule evaluation. */
function evaluate(input: ProjectSnapshot, id: string, override: RuleOverride) {
  return evaluateRules(input, loadBuiltinRules({ [id]: override }).filter((rule) => rule.id === id));
}

describe('project exemptions: regressions', () => {
  it('exempts a cycle only after matching all unique members', () => {
    const result = evaluate(snapshot(true), 'circular-dependency', { exempt: ['/project/a', '/project/b'] });
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({ severity: 'info', path: '/project/a', exemptedBy: '/project/a' });
    expect(result.violations[0]).not.toHaveProperty('certainty');
    expect(result.violations.filter((v) => v.severity === 'error')).toHaveLength(0);
  });
  it('exempts only one of two files above the case cap', () => {
    const result = evaluate(snapshot(), 'test-record-case-cap', { exempt: ['/project/one.test.ts'] });
    expect(result.violations.map((v) => [v.path, v.severity])).toEqual([
      ['/project/one.test.ts', 'info'], ['/project/two.test.ts', 'error'],
    ]);
  });
  it('keeps exempt findings at info outside severity remapping', () => {
    const result = evaluate(snapshot(), 'test-record-case-cap', { severity: 'warning', exempt: ['/project/one.test.ts'] });
    expect(result.violations.map((v) => v.severity)).toEqual(['info', 'warning']);
  });
  it('matches Windows finding paths against POSIX patterns', () => {
    const input = snapshot();
    input.verification.violations[0]!.path = 'C:\\project\\one.test.ts';
    const result = evaluate(input, 'test-record-case-cap', { exempt: ['C:/project/*.test.ts'] });
    expect(result.violations[0]).toMatchObject({ severity: 'info', exemptedBy: 'C:/project/*.test.ts' });
  });
});

describe('project exemptions: controls', () => {
  it('retains the cycle error when only one member is exempt', () => {
    const result = evaluate(snapshot(true), 'circular-dependency', { exempt: ['/project/a'] });
    expect(result.violations[0]).toMatchObject({ severity: 'error', certainty: 'exact' });
  });
  it('short-circuits a matching root without running the check', () => {
    const check = vi.fn(() => []);
    const rule = loadBuiltinRules().find((r) => r.id === 'circular-dependency')!;
    const result = evaluateRules(snapshot(true), applyOverrides([{ ...rule, check }], { [rule.id]: { exempt: ['/project'] } }));
    expect(check).not.toHaveBeenCalled();
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({ severity: 'info', path: '/project', exemptedBy: '/project' });
  });
  it('emits no finding for a disabled rule', () => {
    expect(evaluate(snapshot(true), 'circular-dependency', { enabled: false }).violations).toEqual([]);
  });
  it('retains root uncertainty under narrow exemptions', () => {
    const input = snapshot();
    input.dependencyGraph.certainty = 'indeterminate';
    const result = evaluate(input, 'circular-dependency', { exempt: ['/project/a'] });
    expect(result.violations[0]).toMatchObject({ path: '/project', certainty: 'indeterminate' });
  });
  it('does not increment skipped when only some findings are exempt', () => {
    const result = evaluate(snapshot(), 'test-record-case-cap', { exempt: ['/project/one.test.ts'] });
    expect(result).toMatchObject({ skipped: 0, passed: 0, failed: 1 });
  });
});
