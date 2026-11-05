import { describe, expect, it } from 'vitest';

import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import { buildFractalTree } from '../../tree/fractalTree/index.js';
import { buildRequiredArtifacts } from '../planner/buildRequiredArtifacts.js';
import { resolveContractIntent } from '../planner/resolveContractIntent.js';
import { validateRequiredArtifacts } from '../validator/validateRequiredArtifacts.js';

/** Minimal snapshot fields consumed by contract inference, with no file-system reads. */
const SNAPSHOT: ProjectSnapshot = {
  schemaVersion: 1,
  projectRoot: '/project',
  outputLanguage: 'ko',
  snapshotHash: 'fixture',
  dependencyGraph: {
    nodePaths: ['/project'],
    edges: [],
    cycles: [],
    unknownFiles: [],
    certainty: 'exact',
  },
  adapterIds: ['fixture'],
  verificationPaths: [],
  verification: { files: [], violations: [], certainty: 'exact' },
  legacyCriteriaLedger: null,
  diagnostics: [],
  normalizedFacts: [],
  filesOutsideFactsScope: 0,
  collectedAxes: ALL_SNAPSHOT_AXES,
  createdAt: 'fixture',
  tree: buildFractalTree([
    {
      path: '/project',
      name: 'project',
      type: 'fractal',
      hasIntentMd: true,
      hasDetailMd: false,
      entryPoints: [
        {
          path: '/project/module.entry',
          kind: 'module',
          adapterId: 'fixture',
          surface: 'enumerated',
        },
      ],
    },
  ]),
};

describe('optional DETAIL contract inference', () => {
  it('infers independent from INTENT and an entry point without DETAIL', () => {
    expect(resolveContractIntent(SNAPSHOT, '/project')).toBe('independent');
  });

  it('plans and validates only INTENT and entry-point artifacts for a fractal', () => {
    const requiredArtifacts = buildRequiredArtifacts(
      SNAPSHOT,
      '/project',
      'fractal',
    ).artifacts;
    const node = SNAPSHOT.tree.nodes.get('/project');
    if (!node) throw new Error('fixture node missing');
    expect(requiredArtifacts.map(({ role }) => role)).toEqual([
      'intent-document',
      'entry-point',
    ]);
    expect(
      validateRequiredArtifacts(
        {
          sourcePath: '/source',
          targetPath: '/project',
          unitKind: 'fractal',
          targetNodeType: 'fractal',
          basis: 'lowest-common-fractal',
          consumerPaths: [],
          lowestCommonFractalPath: '/project',
          reason: 'fixture',
          requiredArtifacts,
          affectedImports: [],
          preservedImports: [],
          requiresDecision: false,
          decisionReasons: [],
          decisions: [],
        },
        node,
      ),
    ).toEqual([]);
  });

  it('does not infer independent when INTENT is missing', () => {
    const tree = buildFractalTree([
      {
        path: '/project',
        name: 'project',
        type: 'fractal',
        hasIntentMd: false,
        hasDetailMd: true,
        entryPoints: SNAPSHOT.tree.nodes.get('/project')?.entryPoints ?? [],
      },
    ]);
    expect(resolveContractIntent({ ...SNAPSHOT, tree }, '/project')).toBe(
      'unknown',
    );
  });
});
