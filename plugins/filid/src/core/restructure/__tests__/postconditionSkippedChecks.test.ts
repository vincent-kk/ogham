import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import {
  PLACEMENT_BASES,
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_NODE_TYPES,
  RESTRUCTURE_SCHEMA_VERSION,
  RESTRUCTURE_UNIT_KINDS,
} from '../../../constants/restructure.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import type {
  EntryPointDescriptor,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import type {
  MoveInstruction,
  RestructurePlan,
} from '../../../types/restructure.js';
import { buildFractalTree } from '../../tree/fractalTree/index.js';
import type { NodeEntry } from '../../tree/fractalTree/index.js';
import { validatePlanPostconditions } from '../validator/validatePlanPostconditions.js';

const P = {
  ROOT: '/filid-fixture-root',
  A: '/filid-fixture-root/a',
  X: '/filid-fixture-root/a/x',
  Z: '/filid-fixture-root/z',
  MOVED_X: '/filid-fixture-root/z/x',
  Q: '/filid-fixture-root/q.ts',
  Q_IN_X: '/filid-fixture-root/a/x/q.ts',
  SERVICE_SOURCE: '/filid-fixture-root/a/s.ts',
  SERVICE_DIRECTORY: '/filid-fixture-root/a/svc',
  SVC: '/filid-fixture-root/svc',
  SVC_FILE: '/filid-fixture-root/svc/s.ts',
  SVC_ENTRY: '/filid-fixture-root/svc/index.ts',
} as const;

/**
 * A tree entry of the fixture.
 * @param path Directory path.
 * @param type Fractal or organ.
 * @param peerFiles Files directly inside the directory.
 * @param entryPoints Adapter-reported entry points.
 * @returns Tree entry; fractals carry both documents.
 */
function entry(
  path: string,
  type: typeof NODE_TYPES.FRACTAL | typeof NODE_TYPES.ORGAN,
  peerFiles: string[],
  entryPoints: EntryPointDescriptor[] = [],
): NodeEntry {
  const fractal = type === NODE_TYPES.FRACTAL;
  return {
    path,
    name: path.split('/').at(-1) ?? 'root',
    type,
    hasIntentMd: fractal,
    hasDetailMd: fractal,
    peerFiles,
    entryPoints,
  };
}

/**
 * A post-execution snapshot without dependency evidence.
 * @param entries Tree entries.
 * @returns Snapshot of the executed fixture.
 */
function snapshotOf(entries: NodeEntry[]): ProjectSnapshot {
  return {
    schemaVersion: 1,
    projectRoot: P.ROOT,
    outputLanguage: 'Korean',
    snapshotHash: 'skipped-checks-fixture',
    tree: buildFractalTree(entries),
    dependencyGraph: {
      nodePaths: entries.map(({ path }) => path),
      edges: [],
      cycles: [],
      unknownFiles: [],
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
    normalizedFacts: [],
    filesOutsideFactsScope: 0,
    collectedAxes: ALL_SNAPSHOT_AXES,
    createdAt: '2026-09-20T00:00:00.000Z',
  };
}

/**
 * An executable instruction without imports.
 * @param sourcePath Unit before the move.
 * @param targetPath Unit after the move.
 * @param shape Unit kind, target node type and required artifacts.
 * @returns Move instruction.
 */
function instruction(
  sourcePath: string,
  targetPath: string,
  shape: Pick<
    MoveInstruction,
    'unitKind' | 'targetNodeType' | 'requiredArtifacts'
  >,
): MoveInstruction {
  return {
    sourcePath,
    targetPath,
    ...shape,
    basis: PLACEMENT_BASES.SINGLE_OWNER,
    consumerPaths: [],
    reason: 'fixture',
    affectedImports: [],
    preservedImports: [],
    requiresDecision: false,
    decisionReasons: [],
    decisions: [],
  };
}

/**
 * A plan of the given moves in execution order.
 * @param moves Executable moves.
 * @returns Plan without placed or unresolved requests.
 */
function planOf(moves: MoveInstruction[]): RestructurePlan {
  return {
    schemaVersion: RESTRUCTURE_SCHEMA_VERSION,
    planId: 'skipped-checks',
    projectRoot: P.ROOT,
    snapshotHash: 'skipped-checks-fixture',
    readPaths: [],
    probePaths: [],
    readHash: 'skipped-checks-fixture',
    createdAt: '2026-09-20T00:00:00.000Z',
    moves,
    alreadyPlaced: [],
    unresolved: [],
    unknownFiles: { relevant: [], other: [] },
    baseline: { cycles: [], boundaryViolations: [] },
    summary: {
      moveCount: moves.length,
      fractalsCreated: 0,
      organsCreated: 0,
      alreadyPlacedCount: 0,
      decisionsRequired: 0,
      affectedImportCount: 0,
    },
  };
}

/** `a/x` moves out to `z/x`, then `q.ts` lands inside the vacated `a/x`. */
const REOCCUPYING_PLAN = planOf([
  instruction(P.X, P.MOVED_X, {
    unitKind: RESTRUCTURE_UNIT_KINDS.ORGAN,
    targetNodeType: RESTRUCTURE_NODE_TYPES.ORGAN,
    requiredArtifacts: [],
  }),
  instruction(P.Q, P.Q_IN_X, {
    unitKind: RESTRUCTURE_UNIT_KINDS.FILE,
    targetNodeType: RESTRUCTURE_NODE_TYPES.ORGAN,
    requiredArtifacts: [],
  }),
]);

/** Documents and module entry the fractal `svc` must carry. */
const SERVICE_ARTIFACTS: MoveInstruction['requiredArtifacts'] = [
  {
    role: REQUIRED_ARTIFACT_ROLES.INTENT_DOCUMENT,
    path: `${P.SVC}/INTENT.md`,
  },
  {
    role: REQUIRED_ARTIFACT_ROLES.DETAIL_DOCUMENT,
    path: `${P.SVC}/DETAIL.md`,
  },
  {
    role: REQUIRED_ARTIFACT_ROLES.ENTRY_POINT,
    path: P.SVC_ENTRY,
    adapterId: 'fixture',
  },
];

/** `s.ts` becomes the independent fractal `svc` with its module entry. */
const INDEPENDENT_PLAN = planOf([
  instruction(P.SERVICE_SOURCE, P.SVC_FILE, {
    unitKind: RESTRUCTURE_UNIT_KINDS.FILE,
    targetNodeType: RESTRUCTURE_NODE_TYPES.FRACTAL,
    requiredArtifacts: SERVICE_ARTIFACTS,
  }),
]);

/** The fractal directory `a/svc` moves up to `svc`. */
const FRACTAL_MOVE_PLAN = planOf([
  instruction(P.SERVICE_DIRECTORY, P.SVC, {
    unitKind: RESTRUCTURE_UNIT_KINDS.FRACTAL,
    targetNodeType: RESTRUCTURE_NODE_TYPES.FRACTAL,
    requiredArtifacts: SERVICE_ARTIFACTS,
  }),
]);

/**
 * Finding codes of a postcondition with the path each names.
 * @param snapshot Post-execution snapshot.
 * @param plan Plan carried out.
 * @returns `code path` strings.
 */
function findingsOf(snapshot: ProjectSnapshot, plan: RestructurePlan) {
  return validatePlanPostconditions(snapshot, plan).findings.map(
    ({ code, path }) => `${code} ${path ?? ''}`,
  );
}

/**
 * The `svc` fractal whose entry point reports the given surface.
 * @param surface Surface the adapter reports for `svc/index.ts`.
 * @returns Post-execution snapshot of the independent move.
 */
function serviceWithSurface(
  surface: EntryPointDescriptor['surface'],
): ProjectSnapshot {
  return snapshotOf([
    entry(P.ROOT, NODE_TYPES.FRACTAL, []),
    entry(P.A, NODE_TYPES.FRACTAL, []),
    entry(
      P.SVC,
      NODE_TYPES.FRACTAL,
      ['index.ts', 's.ts', 'INTENT.md', 'DETAIL.md'],
      [{ path: P.SVC_ENTRY, kind: 'module', adapterId: 'fixture', surface }],
    ),
  ]);
}

describe('postcondition checks it used to skip', () => {
  it('passes a vacated source that another move reoccupies with nothing left behind', () => {
    expect(
      findingsOf(
        snapshotOf([
          entry(P.ROOT, NODE_TYPES.FRACTAL, []),
          entry(P.A, NODE_TYPES.FRACTAL, []),
          entry(P.X, NODE_TYPES.ORGAN, ['q.ts']),
          entry(P.Z, NODE_TYPES.FRACTAL, []),
          entry(P.MOVED_X, NODE_TYPES.ORGAN, ['old.ts']),
        ]),
        REOCCUPYING_PLAN,
      ),
    ).toEqual([]);
  });

  it('reports source-still-present when a reoccupied source keeps an original file', () => {
    expect(
      findingsOf(
        snapshotOf([
          entry(P.ROOT, NODE_TYPES.FRACTAL, []),
          entry(P.A, NODE_TYPES.FRACTAL, []),
          entry(P.X, NODE_TYPES.ORGAN, ['q.ts', 'old.ts']),
          entry(P.Z, NODE_TYPES.FRACTAL, []),
          entry(P.MOVED_X, NODE_TYPES.ORGAN, ['old.ts']),
        ]),
        REOCCUPYING_PLAN,
      ),
    ).toEqual([`source-still-present ${P.X}`]);
  });

  it('passes an entry point whose surface the adapter enumerates', () => {
    expect(
      findingsOf(serviceWithSurface('enumerated'), INDEPENDENT_PLAN),
    ).toEqual([]);
  });

  it('reports an entry point whose surface the adapter cannot inspect', () => {
    expect(
      findingsOf(serviceWithSurface('unsupported'), INDEPENDENT_PLAN),
    ).toEqual([`entry-point-surface-unsupported ${P.SVC_ENTRY}`]);
  });

  it('reports target-missing when the target directory of a file unit is absent', () => {
    expect(
      findingsOf(
        snapshotOf([
          entry(P.ROOT, NODE_TYPES.FRACTAL, []),
          entry(P.A, NODE_TYPES.FRACTAL, []),
        ]),
        INDEPENDENT_PLAN,
      ),
    ).toEqual([`target-missing ${P.SVC_FILE}`]);
  });

  it('reports target-missing when a directory unit lands as a plain file', () => {
    expect(
      findingsOf(
        snapshotOf([
          entry(P.ROOT, NODE_TYPES.FRACTAL, ['svc']),
          entry(P.A, NODE_TYPES.FRACTAL, []),
        ]),
        FRACTAL_MOVE_PLAN,
      ),
    ).toEqual([`target-missing ${P.SVC}`]);
  });
});
