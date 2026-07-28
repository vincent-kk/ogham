// filid:contract AC-restructure-already-placed
import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { RESTRUCTURE_VALIDATION_CODES } from '../../../constants/restructure.js';
import type { FractalNode, ProjectSnapshot } from '../../../types/fractal.js';
import { createRestructurePlan } from '../planner/createRestructurePlan.js';
import { validatePlanPostconditions } from '../validator/validatePlanPostconditions.js';

const PATHS = {
  ROOT: '/root',
  LIB: '/root/lib',
  SOURCE: '/root/lib/logger.ts',
  FEATURE_A: '/root/featureA',
  FEATURE_A_FILE: '/root/featureA/index.ts',
  FEATURE_B: '/root/featureB',
  FEATURE_B_FILE: '/root/featureB/index.ts',
} as const;

function node(
  path: string,
  name: string,
  type: FractalNode['type'],
  depth: number,
  peerFiles: string[] = [],
): FractalNode {
  return {
    path,
    name,
    type,
    parent: depth === 0 ? null : PATHS.ROOT,
    parentFractalPath: depth === 0 ? null : PATHS.ROOT,
    children: [],
    childFractalPaths: [],
    organs: [],
    organPaths: [],
    hasIntentMd: type === NODE_TYPES.FRACTAL,
    hasDetailMd: type === NODE_TYPES.FRACTAL,
    entryPoints: [],
    peerFiles,
    hasIndex: false,
    hasMain: false,
    depth,
    metadata: {},
  };
}

const SNAPSHOT: ProjectSnapshot = {
  schemaVersion: 1,
  projectRoot: PATHS.ROOT,
  outputLanguage: 'Korean',
  snapshotHash: 'partition-fixture',
  tree: {
    root: PATHS.ROOT,
    nodes: new Map([
      [PATHS.ROOT, node(PATHS.ROOT, 'root', NODE_TYPES.FRACTAL, 0)],
      [PATHS.LIB, node(PATHS.LIB, 'lib', NODE_TYPES.ORGAN, 1, ['logger.ts'])],
      [
        PATHS.FEATURE_A,
        node(PATHS.FEATURE_A, 'featureA', NODE_TYPES.FRACTAL, 1),
      ],
      [
        PATHS.FEATURE_B,
        node(PATHS.FEATURE_B, 'featureB', NODE_TYPES.FRACTAL, 1),
      ],
    ]),
    depth: 1,
    totalNodes: 4,
  },
  dependencyGraph: {
    nodePaths: [PATHS.ROOT, PATHS.FEATURE_A, PATHS.FEATURE_B],
    edges: [
      {
        fromFractalPath: PATHS.FEATURE_A,
        toFractalPath: PATHS.ROOT,
        evidence: [
          {
            sourceFile: PATHS.FEATURE_A_FILE,
            rawSpecifier: '../lib/logger.js',
            resolvedPath: PATHS.SOURCE,
          },
          {
            sourceFile: PATHS.FEATURE_B_FILE,
            rawSpecifier: '../lib/logger.js',
            resolvedPath: PATHS.SOURCE,
          },
        ],
      },
    ],
    cycles: [],
    certainty: ANALYSIS_CERTAINTIES.EXACT,
  },
  adapterIds: ['fixture-adapter'],
  verification: {
    files: [],
    violations: [],
    certainty: ANALYSIS_CERTAINTIES.EXACT,
  },
  legacyCriteriaLedger: null,
  diagnostics: [],
  createdAt: '2026-07-28T00:00:00.000Z',
};

function planWithOrganName(organNameHint: string) {
  return createRestructurePlan(SNAPSHOT, {
    path: PATHS.ROOT,
    requests: [
      {
        sourcePath: PATHS.SOURCE,
        consumerPaths: [PATHS.FEATURE_A_FILE, PATHS.FEATURE_B_FILE],
        contractIntent: 'internal',
        organNameHint,
      },
    ],
  });
}

describe('restructure plan partitions requests that need no move', () => {
  it('routes a source-equals-target request to alreadyPlaced', () => {
    const plan = planWithOrganName('lib');

    expect(plan.moves).toEqual([]);
    expect(plan.unresolved).toEqual([]);
    expect(plan.alreadyPlaced).toHaveLength(1);
    expect(plan.alreadyPlaced[0]?.targetPath).toBe(PATHS.SOURCE);
  });

  it('counts it as alreadyPlaced rather than a move', () => {
    const plan = planWithOrganName('lib');

    expect(plan.summary.moveCount).toBe(0);
    expect(plan.summary.alreadyPlacedCount).toBe(1);
    expect(plan.summary.organsCreated).toBe(0);
  });

  it('does not report source-still-present for such a plan', () => {
    const findings = validatePlanPostconditions(
      SNAPSHOT,
      planWithOrganName('lib'),
    ).findings;

    expect(findings.map((finding) => finding.code)).not.toContain(
      RESTRUCTURE_VALIDATION_CODES.SOURCE_STILL_PRESENT,
    );
  });

  it('still routes a real relocation to moves', () => {
    const plan = planWithOrganName('shared');

    expect(plan.alreadyPlaced).toEqual([]);
    expect(plan.moves).toHaveLength(1);
    expect(plan.moves[0]?.targetPath).toBe('/root/shared/logger.ts');
    expect(plan.summary.moveCount).toBe(1);
  });

  it('keeps a decision-blocked request in unresolved even at its own path', () => {
    const plan = createRestructurePlan(SNAPSHOT, {
      path: PATHS.ROOT,
      requests: [
        {
          sourcePath: PATHS.SOURCE,
          consumerPaths: [PATHS.FEATURE_A_FILE, PATHS.FEATURE_B_FILE],
          contractIntent: 'internal',
        },
      ],
    });

    expect(plan.unresolved).toHaveLength(1);
    expect(plan.alreadyPlaced).toEqual([]);
    expect(plan.moves).toEqual([]);
  });
});
