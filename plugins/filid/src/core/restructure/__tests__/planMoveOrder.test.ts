// filid:contract AC-restructure-move-order
import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { RESTRUCTURE_DECISION_REASONS } from '../../../constants/restructure.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import type {
  DependencyEvidence,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import type {
  PlacementRequest,
  RestructureDecision,
  RestructurePlan,
} from '../../../types/restructure.js';
import { buildFractalTree } from '../../tree/fractalTree/index.js';
import type { NodeEntry } from '../../tree/fractalTree/index.js';
import { createRestructurePlan } from '../planner/createRestructurePlan.js';
import { describeOrderConflict } from '../planner/describeOrderConflict.js';
import { validatePlanPostconditions } from '../validator/validatePlanPostconditions.js';

const P = {
  ROOT: '/root',
  ROOT_INDEX: '/root/index.ts',
  X: '/root/x',
  X_INDEX: '/root/x/index.ts',
  SCHED: '/root/x/sched',
  DELAY: '/root/x/sched/delay.ts',
  OTHER: '/root/x/sched/other.ts',
  KEEP: '/root/x/sched/keep.ts',
  A_FILE: '/root/x/sched/a.ts',
  DEEP: '/root/x/sched/deep',
  DEEP_FILE: '/root/x/sched/deep/f.ts',
  Y: '/root/y',
  FMT: '/root/y/fmt.ts',
  OPS: '/root/ops',
  OPS_DELAY: '/root/ops/delay.ts',
  LEGACY: '/root/legacy',
  LEGACY_DELAY: '/root/legacy/delay.ts',
  TIMING: '/root/timing',
  EMPTY: '/root/x/empty',
  M1: '/root/x/m1',
  M1_FILE: '/root/x/m1/f.ts',
  M2: '/root/x/m2',
  M2_FILE: '/root/x/m2/f.ts',
  OPS_A: '/root/ops/a.ts',
} as const;

const CONFLICT = RESTRUCTURE_DECISION_REASONS.MOVE_ORDER_CONFLICT;

function fractal(path: string, name: string): NodeEntry {
  return {
    path,
    name,
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    peerFiles: ['index.ts'],
    entryPoints: [
      {
        path: `${path}/index.ts`,
        kind: 'module',
        adapterId: 'fixture',
        surface: 'enumerated',
      },
    ],
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

function edge(
  sourceFile: string,
  rawSpecifier: string,
  resolvedPath: string,
): DependencyEvidence {
  return { sourceFile, rawSpecifier, resolvedPath };
}

/** Root and `x` fractals plus the given organs; every edge sits in one root edge. */
function snapshotOf(
  organs: NodeEntry[],
  evidence: DependencyEvidence[],
): ProjectSnapshot {
  return {
    schemaVersion: 1,
    projectRoot: P.ROOT,
    outputLanguage: 'Korean',
    snapshotHash: 'move-order-fixture',
    tree: buildFractalTree([
      fractal(P.ROOT, 'root'),
      fractal(P.X, 'x'),
      ...organs,
    ]),
    dependencyGraph: {
      nodePaths: [P.ROOT, P.X],
      edges: [{ fromFractalPath: P.ROOT, toFractalPath: P.ROOT, evidence }],
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
    collectedAxes: ALL_SNAPSHOT_AXES,
    createdAt: '2026-09-19T00:00:00.000Z',
  };
}

function move(sourcePath: string, organNameHint: string): PlacementRequest {
  return { sourcePath, contractIntent: 'internal', organNameHint };
}

function plan(
  snapshot: ProjectSnapshot,
  requests: PlacementRequest[],
): RestructurePlan {
  return createRestructurePlan(snapshot, { path: P.ROOT, requests });
}

function order(result: RestructurePlan): string[] {
  return result.moves.map(({ sourcePath }) => sourcePath);
}

/** The `move-order-conflict` decision of the first unresolved request for `sourcePath`. */
function conflictDecision(
  result: RestructurePlan,
  sourcePath: string,
): RestructureDecision {
  const decision = result.unresolved
    .find((entry) => entry.sourcePath === sourcePath)
    ?.decisions.find(({ reason }) => reason === CONFLICT);
  if (!decision) throw new Error(`expected a conflict for ${sourcePath}`);
  return decision;
}

function conflicts(result: RestructurePlan): string[] {
  return result.unresolved
    .filter(({ decisionReasons }) => decisionReasons.includes(CONFLICT))
    .map(({ sourcePath }) => sourcePath);
}

describe('restructure orders overlapping moves for automatic execution', () => {
  it('moves an inner file before the directory holding it and lists each edge once', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['delay.ts', 'other.ts'])],
        [
          edge(P.ROOT_INDEX, './x/sched/other.ts', P.OTHER),
          edge(P.X_INDEX, './sched/delay.ts', P.DELAY),
        ],
      ),
      [move(P.SCHED, 'timing'), move(P.DELAY, 'ops')],
    );

    expect(order(result)).toEqual([P.DELAY, P.SCHED]);
    expect(result.moves.map(({ affectedImports }) => affectedImports)).toEqual([
      [
        {
          consumerPath: P.X_INDEX,
          currentSpecifier: './sched/delay.ts',
          requiredResolvedPath: '/root/x/ops/delay.ts',
          suggestedSpecifier: './ops/delay.ts',
        },
      ],
      [
        {
          consumerPath: P.ROOT_INDEX,
          currentSpecifier: './x/sched/other.ts',
          requiredResolvedPath: '/root/timing/other.ts',
          suggestedSpecifier: './timing/other.ts',
        },
      ],
    ]);
  });

  it('lands a unit inside a moving directory first and validates its final path', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['other.ts']), organ(P.Y, 'y', ['fmt.ts'])],
        [
          edge(P.ROOT_INDEX, './x/sched/other.ts', P.OTHER),
          edge(P.X_INDEX, '../y/fmt.ts', P.FMT),
        ],
      ),
      [move(P.SCHED, 'timing'), move(P.FMT, 'sched')],
    );
    const after = snapshotOf(
      [organ(P.TIMING, 'timing', ['fmt.ts', 'other.ts'])],
      [
        edge(P.ROOT_INDEX, './timing/other.ts', `${P.TIMING}/other.ts`),
        edge(P.X_INDEX, '../timing/fmt.ts', `${P.TIMING}/fmt.ts`),
      ],
    );

    expect(order(result)).toEqual([P.FMT, P.SCHED]);
    expect(validatePlanPostconditions(after, result)).toEqual({
      valid: true,
      findings: [],
      preexisting: [],
      unknownFiles: { relevant: [], other: [] },
    });
  });

  it('vacates a source before another move lands on it', () => {
    const result = plan(
      snapshotOf(
        [
          organ(P.OPS, 'ops', ['delay.ts']),
          organ(P.SCHED, 'sched', ['delay.ts']),
        ],
        [
          edge(P.ROOT_INDEX, './ops/delay.ts', P.OPS_DELAY),
          edge(P.ROOT_INDEX, './x/sched/delay.ts', P.DELAY),
        ],
      ),
      [move(P.DELAY, 'ops'), move(P.OPS_DELAY, 'legacy')],
    );
    const after = snapshotOf(
      [
        organ(P.OPS, 'ops', ['delay.ts']),
        organ(P.LEGACY, 'legacy', ['delay.ts']),
      ],
      [
        edge(P.ROOT_INDEX, './legacy/delay.ts', P.LEGACY_DELAY),
        edge(P.ROOT_INDEX, './ops/delay.ts', P.OPS_DELAY),
      ],
    );

    expect(order(result)).toEqual([P.OPS_DELAY, P.DELAY]);
    expect(validatePlanPostconditions(after, result)).toEqual({
      valid: true,
      findings: [],
      preexisting: [],
      unknownFiles: { relevant: [], other: [] },
    });
  });

  it('creates the outer target directory before a unit lands inside it', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['other.ts']), organ(P.Y, 'y', ['fmt.ts'])],
        [
          edge(P.ROOT_INDEX, './x/sched/other.ts', P.OTHER),
          edge(P.ROOT_INDEX, './y/fmt.ts', P.FMT),
        ],
      ),
      [move(P.FMT, 'timing'), move(P.SCHED, 'timing')],
    );

    expect(order(result)).toEqual([P.SCHED, P.FMT]);
  });

  it('reports a directory move that already carries an inner move to its target as a conflict', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['delay.ts', 'other.ts'])],
        [
          edge(P.ROOT_INDEX, './x/sched/delay.ts', P.DELAY),
          edge(P.ROOT_INDEX, './x/sched/other.ts', P.OTHER),
        ],
      ),
      [move(P.SCHED, 'timing'), move(P.DELAY, 'timing')],
    );

    expect(result.moves).toEqual([]);
    expect(conflicts(result)).toEqual([P.SCHED, P.DELAY]);
  });

  it('reports duplicate sources as a conflict and keeps a move outside the cycle', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['delay.ts', 'other.ts'])],
        [
          edge(P.ROOT_INDEX, './x/sched/delay.ts', P.DELAY),
          edge(P.ROOT_INDEX, './x/sched/other.ts', P.OTHER),
        ],
      ),
      [move(P.DELAY, 'ops'), move(P.DELAY, 'legacy'), move(P.SCHED, 'timing')],
    );

    expect(order(result)).toEqual([P.SCHED]);
    expect(conflicts(result)).toEqual([P.DELAY, P.DELAY]);
  });

  it('reports a directory whose target contains its own source as a conflict', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', []), organ(P.DEEP, 'deep', ['f.ts'])],
        [edge(P.X_INDEX, './sched/deep/f.ts', P.DEEP_FILE)],
      ),
      [move(P.DEEP, 'sched')],
    );

    expect(conflicts(result)).toEqual([P.DEEP]);
  });

  it('reports a directory left empty by inner moves as a conflict', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['delay.ts'])],
        [edge(P.ROOT_INDEX, './x/sched/delay.ts', P.DELAY)],
      ),
      [move(P.SCHED, 'timing'), move(P.DELAY, 'ops')],
    );

    expect(order(result)).toEqual([P.DELAY]);
    expect(conflicts(result)).toEqual([P.SCHED]);
  });

  it('keeps an emptied directory move when another move lands inside it', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['delay.ts']), organ(P.Y, 'y', ['fmt.ts'])],
        [
          edge(P.ROOT_INDEX, './x/sched/delay.ts', P.DELAY),
          edge(P.X_INDEX, '../y/fmt.ts', P.FMT),
        ],
      ),
      [move(P.SCHED, 'timing'), move(P.DELAY, 'ops'), move(P.FMT, 'sched')],
    );

    expect(result.unresolved).toEqual([]);
    expect(order(result)).toEqual([P.DELAY, P.FMT, P.SCHED]);
  });

  it('keeps a nested directory move when its parent directory also moves', () => {
    const result = plan(
      snapshotOf(
        [
          organ(P.SCHED, 'sched', ['other.ts']),
          organ(P.DEEP, 'deep', ['f.ts']),
        ],
        [
          edge(P.ROOT_INDEX, './x/sched/other.ts', P.OTHER),
          edge(P.X_INDEX, './sched/deep/f.ts', P.DEEP_FILE),
        ],
      ),
      [move(P.SCHED, 'timing'), move(P.DEEP, 'layers')],
    );

    expect(result.unresolved).toEqual([]);
    expect(order(result)).toEqual([P.DEEP, P.SCHED]);
  });

  it('still reports a moved child left behind inside an already placed directory', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['delay.ts', 'other.ts'])],
        [
          edge(P.X_INDEX, './sched/other.ts', P.OTHER),
          edge(P.ROOT_INDEX, './x/sched/delay.ts', P.DELAY),
        ],
      ),
      [
        { ...move(P.SCHED, 'sched'), consumerPaths: [P.X_INDEX] },
        move(P.DELAY, 'ops'),
      ],
    );
    const after = snapshotOf(
      [
        organ(P.SCHED, 'sched', ['delay.ts', 'other.ts']),
        organ(P.OPS, 'ops', ['delay.ts']),
      ],
      [
        edge(P.X_INDEX, './sched/other.ts', P.OTHER),
        edge(P.ROOT_INDEX, './ops/delay.ts', P.OPS_DELAY),
      ],
    );

    expect(result.alreadyPlaced.map(({ sourcePath }) => sourcePath)).toEqual([
      P.SCHED,
    ]);
    expect(order(result)).toEqual([P.DELAY]);
    expect(validatePlanPostconditions(after, result).findings).toContainEqual(
      expect.objectContaining({ code: 'source-still-present', path: P.DELAY }),
    );
  });

  it('moves a directory without files when no inner move empties it', () => {
    const result = plan(snapshotOf([organ(P.EMPTY, 'empty', [])], []), [
      { ...move(P.EMPTY, 'spare'), consumerPaths: [P.X_INDEX] },
    ]);

    expect(result.unresolved).toEqual([]);
    expect(order(result)).toEqual([P.EMPTY]);
  });

  it('keeps an unresolved request free of rewrites when nothing moves', () => {
    const result = plan(
      snapshotOf(
        [organ(P.Y, 'y', ['fmt.ts'])],
        [edge(P.ROOT_INDEX, './y/fmt.ts', P.FMT)],
      ),
      [{ sourcePath: P.FMT, organNameHint: 'timing' }],
    );

    expect(
      result.unresolved.map(({ affectedImports }) => affectedImports),
    ).toEqual([[]]);
  });

  it('gives an already placed unit inside a moving directory no rewrites and a final-path postcondition', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['keep.ts', 'other.ts'])],
        [
          edge(P.ROOT_INDEX, './x/sched/other.ts', P.OTHER),
          edge(P.X_INDEX, './sched/keep.ts', P.KEEP),
        ],
      ),
      [move(P.KEEP, 'sched'), move(P.SCHED, 'timing')],
    );
    const after = snapshotOf(
      [organ(P.TIMING, 'timing', ['keep.ts', 'other.ts'])],
      [
        edge(P.ROOT_INDEX, './timing/other.ts', `${P.TIMING}/other.ts`),
        edge(P.X_INDEX, '../timing/keep.ts', `${P.TIMING}/keep.ts`),
      ],
    );

    expect(
      result.alreadyPlaced.map(({ affectedImports }) => affectedImports),
    ).toEqual([[]]);
    expect(validatePlanPostconditions(after, result)).toEqual({
      valid: true,
      findings: [],
      preexisting: [],
      unknownFiles: { relevant: [], other: [] },
    });
  });

  it('does not block an already placed unit over an import it cannot rewrite', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['keep.ts'])],
        [
          edge(P.X_INDEX, './sched/keep.ts', P.KEEP),
          edge(P.KEEP, '..', P.X_INDEX),
        ],
      ),
      [move(P.KEEP, 'sched')],
    );

    expect(result.unresolved).toEqual([]);
    expect(result.alreadyPlaced).toHaveLength(1);
  });

  it('rewrites the inner files of an independent directory move under its target', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['a.ts'])],
        [edge(P.ROOT_INDEX, './x/sched/a.ts', P.A_FILE)],
      ),
      [
        {
          sourcePath: P.SCHED,
          contractIntent: 'independent',
          organNameHint: 'svc',
        },
      ],
    );

    expect(result.moves[0]?.affectedImports).toEqual([
      {
        consumerPath: P.ROOT_INDEX,
        currentSpecifier: './x/sched/a.ts',
        requiredResolvedPath: '/root/svc/a.ts',
        suggestedSpecifier: './svc/a.ts',
      },
    ]);
  });

  it('asks for one request of a source requested twice', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['delay.ts', 'other.ts'])],
        [
          edge(P.ROOT_INDEX, './x/sched/delay.ts', P.DELAY),
          edge(P.ROOT_INDEX, './x/sched/other.ts', P.OTHER),
        ],
      ),
      [move(P.DELAY, 'ops'), move(P.DELAY, 'legacy')],
    );
    const decision = conflictDecision(result, P.DELAY);

    expect(decision.message).toContain('is requested more than once');
    expect(decision.nextAction).toContain(`Keep one request for ${P.DELAY}`);
  });

  it('sends two files exchanging places to the user as a swap', () => {
    const result = plan(
      snapshotOf(
        [organ(P.M1, 'm1', ['f.ts']), organ(P.M2, 'm2', ['f.ts'])],
        [
          edge(P.X_INDEX, './m1/f.ts', P.M1_FILE),
          edge(P.X_INDEX, './m2/f.ts', P.M2_FILE),
        ],
      ),
      [move(P.M1_FILE, 'm2'), move(P.M2_FILE, 'm1')],
    );
    const decision = conflictDecision(result, P.M1_FILE);

    expect(decision.message).toContain(`(${P.M1_FILE}, ${P.M2_FILE})`);
    expect(decision.nextAction).toContain('Ask the user how to stage');
  });

  it('gives every member of a cycle with one occupied landing the swap cause', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['a.ts']), organ(P.OPS, 'ops', ['a.ts'])],
        [
          edge(P.ROOT_INDEX, './x/sched/a.ts', P.A_FILE),
          edge(P.ROOT_INDEX, './ops/a.ts', P.OPS_A),
        ],
      ),
      [move(P.SCHED, 'timing'), move(P.A_FILE, 'ops'), move(P.OPS_A, 'timing')],
    );

    expect(
      [P.SCHED, P.A_FILE, P.OPS_A].map((source) =>
        conflictDecision(result, source).nextAction.startsWith(
          'Ask the user how to stage',
        ),
      ),
    ).toEqual([true, true, true]);
  });

  it('splits an absorbing cycle so the enclosing directory move runs alone first', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['delay.ts', 'other.ts'])],
        [
          edge(P.ROOT_INDEX, './x/sched/delay.ts', P.DELAY),
          edge(P.ROOT_INDEX, './x/sched/other.ts', P.OTHER),
        ],
      ),
      [move(P.DELAY, 'timing'), move(P.SCHED, 'timing')],
    );

    expect(
      [P.DELAY, P.SCHED].map(
        (source) => conflictDecision(result, source).nextAction,
      ),
    ).toEqual([
      expect.stringContaining(`plan and execute the move of ${P.SCHED} alone`),
      expect.stringContaining(`plan and execute the move of ${P.SCHED} alone`),
    ]);
  });

  it('names the source and target of a move nested in itself', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', []), organ(P.DEEP, 'deep', ['f.ts'])],
        [edge(P.X_INDEX, './sched/deep/f.ts', P.DEEP_FILE)],
      ),
      [move(P.DEEP, 'sched')],
    );

    expect(conflictDecision(result, P.DEEP).message).toBe(
      `${P.DEEP} and its target ${P.SCHED} contain each other, so the move cannot run.`,
    );
  });

  it('has the caller check files filid cannot see before deleting an emptied directory', () => {
    const result = plan(
      snapshotOf(
        [organ(P.SCHED, 'sched', ['delay.ts'])],
        [edge(P.ROOT_INDEX, './x/sched/delay.ts', P.DELAY)],
      ),
      [move(P.SCHED, 'timing'), move(P.DELAY, 'ops')],
    );
    const decision = conflictDecision(result, P.SCHED);

    expect(decision.message).toContain(`(${P.DELAY})`);
    expect(decision.nextAction).toContain('excluded directories');
  });

  it('names the same move to run first from every member of a cycle no source encloses', () => {
    const directory = { sourcePath: '/root/x', targetPath: '/root/x/y' };
    const file = { sourcePath: '/root/q.ts', targetPath: '/root/x/y/q.ts' };
    const fromDirectory = describeOrderConflict(directory, 'cycle', [
      file.sourcePath,
    ]);
    const fromFile = describeOrderConflict(file, 'cycle', [
      directory.sourcePath,
    ]);

    expect(fromDirectory.nextAction).toBe(fromFile.nextAction);
  });
});
