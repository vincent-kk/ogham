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
  RestructurePlan,
} from '../../../types/restructure.js';
import { buildFractalTree } from '../../tree/fractalTree/index.js';
import type { NodeEntry } from '../../tree/fractalTree/index.js';
import { createRestructurePlan } from '../planner/createRestructurePlan.js';
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
          requiredSpecifier: './ops/delay.ts',
        },
      ],
      [
        {
          consumerPath: P.ROOT_INDEX,
          currentSpecifier: './x/sched/other.ts',
          requiredSpecifier: './timing/other.ts',
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
        requiredSpecifier: './svc/a.ts',
      },
    ]);
  });
});
