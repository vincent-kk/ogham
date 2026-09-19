import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import { buildFractalTree } from '../../../core/tree/fractalTree/index.js';
import type { StoredToolDiagnostic } from '../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { foldReviewVerdict } from '../../../mcp/tools/reviewState/verdict/foldReviewVerdict.js';
import { resolveFractalScanCertainty } from '../../../mcp/tools/utils/resolveFractalScanCertainty.js';
import { resolveVerificationScanStatus } from '../../../mcp/tools/utils/resolveVerificationScanStatus.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

import { createVerdictFoldFixture } from './reviewState/helpers/createVerdictFoldFixture.js';

/** A snapshot whose graph and verification evidence are both exact. */
const EXACT_SNAPSHOT: ProjectSnapshot = {
  schemaVersion: 1,
  projectRoot: '/root',
  outputLanguage: 'English',
  snapshotHash: 'affects-fixture',
  tree: buildFractalTree([]),
  dependencyGraph: {
    nodePaths: [],
    edges: [],
    cycles: [],
    certainty: ANALYSIS_CERTAINTIES.EXACT,
  },
  adapterIds: ['fixture'],
  verification: {
    files: [],
    violations: [],
    certainty: ANALYSIS_CERTAINTIES.EXACT,
  },
  legacyCriteriaLedger: null,
  diagnostics: [],
  collectedAxes: ALL_SNAPSHOT_AXES,
  createdAt: '2026-09-20T00:00:00.000Z',
};

/**
 * A non-finding diagnostic declaring the given axes.
 * @param affects Axes the diagnostic declares.
 * @returns Diagnostic as a producer emits it.
 */
function diagnostic(affects: ToolDiagnostic['affects']): ToolDiagnostic {
  return {
    code: 'config-warning',
    message: 'Unknown key "unknownSetting" was ignored.',
    nextAction: 'Remove the key, or keep going.',
    affects,
  };
}

describe('a diagnostic affects only the axes it declares', () => {
  it.each([
    [[], 'exact'],
    [['boundaries'], 'indeterminate'],
    [['verification'], 'indeterminate'],
  ] as const)(
    'structure certainty with affects %j is %s',
    (affects, certainty) => {
      expect(
        resolveFractalScanCertainty(EXACT_SNAPSHOT, [diagnostic(affects)]),
      ).toBe(certainty);
    },
  );

  it.each([
    [[], 'ok'],
    [['dependencies', 'boundaries'], 'ok'],
    [['verification'], 'indeterminate'],
  ] as const)(
    'verification status with affects %j is %s',
    (affects, status) => {
      expect(
        resolveVerificationScanStatus('exact', 0, [diagnostic(affects)]),
      ).toBe(status);
    },
  );

  it('reports a stored diagnostic with affects [] as informational, not as a blocker', () => {
    const input = createVerdictFoldFixture();
    input.evidence.diagnostics = [diagnostic([])];
    const fold = foldReviewVerdict(input);
    expect(
      fold.blockers.filter(({ scope }) => scope.rule === 'config-warning'),
    ).toEqual([]);
    expect(fold.unresolved).toContainEqual(
      expect.objectContaining({
        rule: 'config-warning',
        affectsVerdict: false,
      }),
    );
  });

  it('reads a stored diagnostic without affects as affecting every axis', () => {
    const input = createVerdictFoldFixture();
    const legacy: StoredToolDiagnostic = {
      code: 'config-warning',
      message: 'Unknown key "unknownSetting" was ignored.',
    };
    input.evidence.diagnostics = [legacy];
    expect(
      foldReviewVerdict(input).blockers.some(
        ({ scope }) => scope.rule === 'config-warning',
      ),
    ).toBe(true);
  });
});
