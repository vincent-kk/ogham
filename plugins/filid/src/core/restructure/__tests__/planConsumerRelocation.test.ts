// filid:contract AC-restructure-plan-relocation
import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import type {
  DependencyEvidence,
  DependencyGraph,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import type { PlacementRequest } from '../../../types/restructure.js';
import { buildFractalTree } from '../../tree/fractalTree/index.js';
import type { NodeEntry } from '../../tree/fractalTree/index.js';
import { relocateConsumerPath } from '../imports/relocateConsumerPath.js';
import { createRestructurePlan } from '../planner/createRestructurePlan.js';
import { validatePlanPostconditions } from '../validator/validatePlanPostconditions.js';

const PATHS = {
  ROOT: '/root',
  ROOT_INDEX: '/root/index.ts',
  X: '/root/x',
  X_INDEX: '/root/x/index.ts',
  CONTRACTS: '/root/x/contracts',
  TYPES: '/root/x/contracts/types.ts',
  GUARD: '/root/x/contracts/guard.ts',
  SCHEDULING: '/root/x/scheduling',
  DELAY: '/root/x/scheduling/delay.ts',
  OPS: '/root/ops',
  OPS_TYPES: '/root/ops/types.ts',
  OPS_DELAY: '/root/ops/delay.ts',
  X_OPS_GUARD: '/root/x/ops/guard.ts',
} as const;

function fractal(path: string, name: string, peerFiles: string[]): NodeEntry {
  return {
    path,
    name,
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    peerFiles,
  };
}

function organ(path: string, name: string, peerFiles: string[]): NodeEntry {
  return {
    path,
    name,
    type: NODE_TYPES.ORGAN,
    hasIntentMd: false,
    hasDetailMd: false,
    peerFiles,
  };
}

function evidence(
  sourceFile: string,
  rawSpecifier: string,
  resolvedPath: string,
): DependencyEvidence {
  return { sourceFile, rawSpecifier, resolvedPath };
}

function snapshotOf(
  entries: NodeEntry[],
  edges: DependencyGraph['edges'],
): ProjectSnapshot {
  return {
    schemaVersion: 1,
    projectRoot: PATHS.ROOT,
    outputLanguage: 'Korean',
    snapshotHash: 'relocation-fixture',
    tree: buildFractalTree(entries),
    dependencyGraph: {
      nodePaths: [PATHS.ROOT, PATHS.X],
      edges,
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
    collectedAxes: ALL_SNAPSHOT_AXES,
    createdAt: '2026-09-19T00:00:00.000Z',
  };
}

/** `delay.ts` imports `types.ts`, and both are about to move together. */
const BEFORE = snapshotOf(
  [
    fractal(PATHS.ROOT, 'root', ['index.ts']),
    fractal(PATHS.X, 'x', ['index.ts']),
    organ(PATHS.CONTRACTS, 'contracts', ['types.ts']),
    organ(PATHS.SCHEDULING, 'scheduling', ['delay.ts']),
  ],
  [
    {
      fromFractalPath: PATHS.ROOT,
      toFractalPath: PATHS.X,
      evidence: [
        evidence(PATHS.ROOT_INDEX, './x/scheduling/delay.ts', PATHS.DELAY),
        evidence(PATHS.ROOT_INDEX, './x/contracts/types.ts', PATHS.TYPES),
      ],
    },
    {
      fromFractalPath: PATHS.X,
      toFractalPath: PATHS.X,
      evidence: [
        evidence(PATHS.X_INDEX, './scheduling/delay.ts', PATHS.DELAY),
        evidence(PATHS.X_INDEX, './contracts/types.ts', PATHS.TYPES),
        evidence(PATHS.DELAY, '../contracts/types.ts', PATHS.TYPES),
      ],
    },
  ],
);

/** The tree an executor leaves after applying every listed rewrite. */
const AFTER = snapshotOf(
  [
    fractal(PATHS.ROOT, 'root', ['index.ts']),
    fractal(PATHS.X, 'x', ['index.ts']),
    organ(PATHS.OPS, 'ops', ['delay.ts', 'types.ts']),
  ],
  [
    {
      fromFractalPath: PATHS.ROOT,
      toFractalPath: PATHS.ROOT,
      evidence: [
        evidence(PATHS.ROOT_INDEX, './ops/delay.ts', PATHS.OPS_DELAY),
        evidence(PATHS.ROOT_INDEX, './ops/types.ts', PATHS.OPS_TYPES),
        evidence(PATHS.OPS_DELAY, './types.ts', PATHS.OPS_TYPES),
      ],
    },
    {
      fromFractalPath: PATHS.X,
      toFractalPath: PATHS.ROOT,
      evidence: [
        evidence(PATHS.X_INDEX, '../ops/delay.ts', PATHS.OPS_DELAY),
        evidence(PATHS.X_INDEX, '../ops/types.ts', PATHS.OPS_TYPES),
      ],
    },
  ],
);

function internalMove(sourcePath: string): PlacementRequest {
  return { sourcePath, contractIntent: 'internal', organNameHint: 'ops' };
}

function planBothFiles() {
  return createRestructurePlan(BEFORE, {
    path: PATHS.ROOT,
    requests: [internalMove(PATHS.TYPES), internalMove(PATHS.DELAY)],
  });
}

describe('restructure rewrites consumers the same plan relocates', () => {
  it('rewrites a moved consumer at its new path with a specifier from there', () => {
    const typesMove = planBothFiles().moves.find(
      (move) => move.sourcePath === PATHS.TYPES,
    );

    expect(typesMove?.targetPath).toBe(PATHS.OPS_TYPES);
    expect(typesMove?.affectedImports).toEqual([
      {
        consumerPath: PATHS.ROOT_INDEX,
        currentSpecifier: './x/contracts/types.ts',
        requiredSpecifier: './ops/types.ts',
      },
      {
        consumerPath: PATHS.OPS_DELAY,
        currentSpecifier: '../contracts/types.ts',
        requiredSpecifier: './types.ts',
      },
      {
        consumerPath: PATHS.X_INDEX,
        currentSpecifier: './contracts/types.ts',
        requiredSpecifier: '../ops/types.ts',
      },
    ]);
  });

  it('passes the postcondition once the plan is carried out as written', () => {
    expect(validatePlanPostconditions(AFTER, planBothFiles())).toEqual({
      valid: true,
      findings: [],
    });
  });

  it('keeps the pre-move consumer path as placement evidence', () => {
    const typesMove = planBothFiles().moves.find(
      (move) => move.sourcePath === PATHS.TYPES,
    );

    expect(typesMove?.consumerPaths).toContain(PATHS.DELAY);
  });

  it('keeps the relative specifier of a consumer inside a moved directory', () => {
    const plan = createRestructurePlan(
      snapshotOf(
        [
          fractal(PATHS.ROOT, 'root', ['index.ts']),
          fractal(PATHS.X, 'x', ['index.ts']),
          organ(PATHS.CONTRACTS, 'contracts', ['guard.ts', 'types.ts']),
        ],
        [
          {
            fromFractalPath: PATHS.X,
            toFractalPath: PATHS.X,
            evidence: [
              evidence(PATHS.X_INDEX, './contracts/types.ts', PATHS.TYPES),
              evidence(PATHS.GUARD, './types.ts', PATHS.TYPES),
            ],
          },
        ],
      ),
      { path: PATHS.ROOT, requests: [internalMove(PATHS.CONTRACTS)] },
    );

    expect(plan.moves[0]?.affectedImports).toContainEqual({
      consumerPath: PATHS.X_OPS_GUARD,
      currentSpecifier: './types.ts',
      requiredSpecifier: './types.ts',
    });
  });

  it('follows the deepest planned source when two moves contain a consumer', () => {
    const directoryMove = {
      sourcePath: PATHS.SCHEDULING,
      targetPath: '/root/timing',
    };
    const fileMove = { sourcePath: PATHS.DELAY, targetPath: PATHS.OPS_DELAY };

    expect(relocateConsumerPath(PATHS.DELAY, [directoryMove, fileMove])).toBe(
      PATHS.OPS_DELAY,
    );
    expect(relocateConsumerPath(PATHS.DELAY, [fileMove, directoryMove])).toBe(
      PATHS.OPS_DELAY,
    );
  });
});
