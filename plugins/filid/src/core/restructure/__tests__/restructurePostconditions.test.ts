import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { DETAIL_MD, INTENT_MD } from '../../../constants/documentFiles.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import {
  PLACEMENT_BASES,
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_NODE_TYPES,
  RESTRUCTURE_UNIT_KINDS,
  RESTRUCTURE_VALIDATION_CODES,
} from '../../../constants/restructure.js';
import type {
  DependencyGraph,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import type {
  MoveInstruction,
  RestructurePlan,
} from '../../../types/restructure.js';
import { buildFractalTree } from '../../tree/fractalTree/index.js';
import type { NodeEntry } from '../../tree/fractalTree/index.js';
import {
  validatePlanPostconditions,
  validatePlanPreconditions,
} from '../index.js';

const PATHS = {
  ROOT: '/project',
  DOMAIN: '/project/domain',
  A: '/project/domain/a',
  B: '/project/domain/b',
  ORGAN: '/project/domain/model',
  SOURCE: '/project/domain/a/value.unit',
  TARGET: '/project/domain/model/value.unit',
  WRONG_TARGET: '/project/domain/other/value.unit',
  CONSUMER: '/project/domain/b/use.unit',
  FRACTAL: '/project/domain/service',
  FRACTAL_SOURCE: '/project/domain/a/service.unit',
  FRACTAL_TARGET: '/project/domain/service/service.unit',
  FRACTAL_ENTRY: '/project/domain/service/module.entry',
  FRACTAL_INTENT: '/project/domain/service/INTENT.md',
  FRACTAL_DETAIL: '/project/domain/service/DETAIL.md',
} as const;

const WINDOWS_PATHS = {
  ROOT: 'C:\\Repo',
  ROOT_ALIAS: 'c:/repo',
} as const;

const POST_STATES = {
  VALID_ORGAN: 'valid-organ',
  SOURCE_PRESENT: 'source-present',
  TARGET_MISSING: 'target-missing',
  WRONG_NODE_TYPE: 'wrong-node-type',
  VALID_FRACTAL: 'valid-fractal',
  MISSING_ENTRY_POINT: 'missing-entry-point',
  MISSING_DETAIL: 'missing-detail',
} as const;

const GRAPH_STATES = {
  EXACT: ANALYSIS_CERTAINTIES.EXACT,
  BOUNDARY_VIOLATION: 'boundary-violation',
  CYCLE: 'cycle',
  INDETERMINATE: 'indeterminate',
} as const;

type PostState = (typeof POST_STATES)[keyof typeof POST_STATES];
type GraphState = (typeof GRAPH_STATES)[keyof typeof GRAPH_STATES];

const CREATED_AT = '2026-07-27T00:00:00.000Z';
const PLAN_SNAPSHOT_HASH = 'before-hash';
const POST_SNAPSHOT_HASH = 'after-hash';
const REQUIRED_SPECIFIER = '../model/value.unit';
const EXPECTED_CYCLE = [PATHS.B, PATHS.FRACTAL, PATHS.B];

const ORGAN_MOVE: MoveInstruction = {
  sourcePath: PATHS.SOURCE,
  targetPath: PATHS.TARGET,
  unitKind: RESTRUCTURE_UNIT_KINDS.FILE,
  targetNodeType: RESTRUCTURE_NODE_TYPES.ORGAN,
  basis: PLACEMENT_BASES.LOWEST_COMMON_FRACTAL,
  consumerPaths: [PATHS.CONSUMER],
  lowestCommonFractalPath: PATHS.DOMAIN,
  reason: 'fixture organ move',
  requiredArtifacts: [],
  affectedImports: [],
  requiresDecision: false,
  decisionReasons: [],
};

const FRACTAL_ARTIFACTS = [
  {
    role: REQUIRED_ARTIFACT_ROLES.INTENT_DOCUMENT,
    path: PATHS.FRACTAL_INTENT,
  },
  {
    role: REQUIRED_ARTIFACT_ROLES.DETAIL_DOCUMENT,
    path: PATHS.FRACTAL_DETAIL,
  },
  {
    role: REQUIRED_ARTIFACT_ROLES.ENTRY_POINT,
    path: PATHS.FRACTAL_ENTRY,
    adapterId: 'fixture',
  },
];

const FRACTAL_MOVE: MoveInstruction = {
  sourcePath: PATHS.FRACTAL_SOURCE,
  targetPath: PATHS.FRACTAL_TARGET,
  unitKind: RESTRUCTURE_UNIT_KINDS.FILE,
  targetNodeType: RESTRUCTURE_NODE_TYPES.FRACTAL,
  basis: PLACEMENT_BASES.PUBLIC_CONTRACT,
  consumerPaths: [PATHS.CONSUMER],
  lowestCommonFractalPath: PATHS.DOMAIN,
  reason: 'fixture fractal move',
  requiredArtifacts: FRACTAL_ARTIFACTS,
  affectedImports: [],
  requiresDecision: false,
  decisionReasons: [],
};

const IMPORT_MOVE: MoveInstruction = {
  ...ORGAN_MOVE,
  affectedImports: [
    {
      consumerPath: PATHS.CONSUMER,
      currentSpecifier: '../a/value.unit',
      requiredSpecifier: REQUIRED_SPECIFIER,
    },
  ],
};

function makePlan(
  move: MoveInstruction = ORGAN_MOVE,
  projectRoot: string = PATHS.ROOT,
  snapshotHash: string = PLAN_SNAPSHOT_HASH,
): RestructurePlan {
  return {
    schemaVersion: 1,
    planId: 'fixture-plan',
    projectRoot,
    snapshotHash,
    createdAt: CREATED_AT,
    moves: [move],
    alreadyPlaced: [],
    unresolved: [],
    summary: {
      moveCount: 1,
      fractalsCreated:
        move.targetNodeType === RESTRUCTURE_NODE_TYPES.FRACTAL ? 1 : 0,
      organsCreated:
        move.targetNodeType === RESTRUCTURE_NODE_TYPES.ORGAN ? 1 : 0,
      alreadyPlacedCount: 0,
      decisionsRequired: 0,
    },
  };
}

function entriesFor(state: PostState): NodeEntry[] {
  const sourcePeerFiles =
    state === POST_STATES.SOURCE_PRESENT ? ['value.unit'] : [];
  const targetPeerFiles =
    state === POST_STATES.TARGET_MISSING ? [] : ['value.unit'];
  const targetType =
    state === POST_STATES.WRONG_NODE_TYPE
      ? NODE_TYPES.FRACTAL
      : NODE_TYPES.ORGAN;
  const fractalEntryPoints =
    state === POST_STATES.MISSING_ENTRY_POINT
      ? []
      : [
          {
            path: PATHS.FRACTAL_ENTRY,
            kind: 'module' as const,
            adapterId: 'fixture',
            surface: 'enumerated' as const,
          },
        ];
  const fractalHasDetail = state !== POST_STATES.MISSING_DETAIL;
  return [
    {
      path: PATHS.ROOT,
      name: 'project',
      type: NODE_TYPES.FRACTAL,
      hasIntentMd: true,
      hasDetailMd: true,
    },
    {
      path: PATHS.DOMAIN,
      name: 'domain',
      type: NODE_TYPES.FRACTAL,
      hasIntentMd: true,
      hasDetailMd: true,
    },
    {
      path: PATHS.A,
      name: 'a',
      type: NODE_TYPES.FRACTAL,
      hasIntentMd: true,
      hasDetailMd: true,
      peerFiles: sourcePeerFiles,
    },
    {
      path: PATHS.B,
      name: 'b',
      type: NODE_TYPES.FRACTAL,
      hasIntentMd: true,
      hasDetailMd: true,
      peerFiles: ['use.unit'],
    },
    {
      path: PATHS.ORGAN,
      name: 'model',
      type: targetType,
      hasIntentMd: targetType === NODE_TYPES.FRACTAL,
      hasDetailMd: targetType === NODE_TYPES.FRACTAL,
      peerFiles: targetPeerFiles,
    },
    {
      path: PATHS.FRACTAL,
      name: 'service',
      type: NODE_TYPES.FRACTAL,
      hasIntentMd: true,
      hasDetailMd: fractalHasDetail,
      entryPoints: fractalEntryPoints,
      peerFiles: [
        'service.unit',
        INTENT_MD,
        ...(fractalHasDetail ? [DETAIL_MD] : []),
        ...(fractalEntryPoints.length > 0 ? ['module.entry'] : []),
      ],
    },
  ];
}

function graphFor(state: GraphState): DependencyGraph {
  const boundaryEdges: DependencyGraph['edges'] =
    state === GRAPH_STATES.BOUNDARY_VIOLATION
      ? [
          {
            fromFractalPath: PATHS.B,
            toFractalPath: PATHS.FRACTAL,
            evidence: [
              {
                sourceFile: PATHS.CONSUMER,
                rawSpecifier: '../service/service.unit',
                resolvedPath: PATHS.FRACTAL_TARGET,
              },
            ],
          },
        ]
      : [];
  return {
    nodePaths: [PATHS.ROOT, PATHS.DOMAIN, PATHS.A, PATHS.B, PATHS.FRACTAL],
    edges: boundaryEdges,
    cycles: state === GRAPH_STATES.CYCLE ? [EXPECTED_CYCLE] : [],
    certainty:
      state === GRAPH_STATES.INDETERMINATE
        ? ANALYSIS_CERTAINTIES.INDETERMINATE
        : ANALYSIS_CERTAINTIES.EXACT,
  };
}

function makeSnapshot(
  state: PostState = POST_STATES.VALID_ORGAN,
  graphState: GraphState = GRAPH_STATES.EXACT,
  snapshotHash: string = POST_SNAPSHOT_HASH,
): ProjectSnapshot {
  const tree = buildFractalTree(entriesFor(state));
  return {
    schemaVersion: 1,
    projectRoot: PATHS.ROOT,
    outputLanguage: 'ko',
    snapshotHash,
    tree,
    dependencyGraph: graphFor(graphState),
    adapterIds: ['fixture'],
    verification: {
      files: [],
      violations: [],
      certainty: ANALYSIS_CERTAINTIES.EXACT,
    },
    legacyCriteriaLedger: null,
    diagnostics: [],
    createdAt: CREATED_AT,
  };
}

function findingCodes(
  result: ReturnType<
    typeof validatePlanPreconditions | typeof validatePlanPostconditions
  >,
): string[] {
  return result.findings.map(({ code }) => code);
}

describe('restructure plan validation', () => {
  it('accepts a matching pre-execution snapshot', () => {
    const result = validatePlanPreconditions(
      makeSnapshot(
        POST_STATES.SOURCE_PRESENT,
        GRAPH_STATES.EXACT,
        PLAN_SNAPSHOT_HASH,
      ),
      makePlan(),
    );
    expect(result).toEqual({ valid: true, findings: [] });
  });

  it('rejects a stale snapshot hash', () => {
    const result = validatePlanPreconditions(makeSnapshot(), makePlan());
    expect(findingCodes(result)).toContain(
      RESTRUCTURE_VALIDATION_CODES.SNAPSHOT_HASH_MISMATCH,
    );
  });

  it('accepts a portable-equivalent Windows project root', () => {
    const snapshot = makeSnapshot(
      POST_STATES.SOURCE_PRESENT,
      GRAPH_STATES.EXACT,
      PLAN_SNAPSHOT_HASH,
    );
    snapshot.projectRoot = WINDOWS_PATHS.ROOT;
    snapshot.tree = buildFractalTree([
      {
        path: WINDOWS_PATHS.ROOT,
        name: 'Repo',
        type: NODE_TYPES.FRACTAL,
        hasIntentMd: true,
        hasDetailMd: true,
      },
    ]);
    const result = validatePlanPreconditions(
      snapshot,
      makePlan(ORGAN_MOVE, WINDOWS_PATHS.ROOT_ALIAS),
    );
    expect(result.valid).toBe(true);
  });

  it('accepts an exact organ move even though the post hash changed', () => {
    expect(validatePlanPostconditions(makeSnapshot(), makePlan()).valid).toBe(
      true,
    );
  });

  it('rejects a source that remains after execution', () => {
    const result = validatePlanPostconditions(
      makeSnapshot(POST_STATES.SOURCE_PRESENT),
      makePlan(),
    );
    expect(findingCodes(result)).toContain(
      RESTRUCTURE_VALIDATION_CODES.SOURCE_STILL_PRESENT,
    );
  });

  it('rejects a missing exact target even if another location could exist', () => {
    const result = validatePlanPostconditions(
      makeSnapshot(POST_STATES.TARGET_MISSING),
      makePlan(),
    );
    expect(findingCodes(result)).toContain(
      RESTRUCTURE_VALIDATION_CODES.TARGET_MISSING,
    );
  });

  it('rejects a target node with the wrong classification', () => {
    const result = validatePlanPostconditions(
      makeSnapshot(POST_STATES.WRONG_NODE_TYPE),
      makePlan(),
    );
    expect(findingCodes(result)).toContain(
      RESTRUCTURE_VALIDATION_CODES.TARGET_NODE_TYPE_MISMATCH,
    );
  });

  it('accepts a complete independent fractal target', () => {
    expect(
      validatePlanPostconditions(
        makeSnapshot(POST_STATES.VALID_FRACTAL),
        makePlan(FRACTAL_MOVE),
      ).valid,
    ).toBe(true);
  });

  it('rejects a missing adapter-recognized entry point', () => {
    const result = validatePlanPostconditions(
      makeSnapshot(POST_STATES.MISSING_ENTRY_POINT),
      makePlan(FRACTAL_MOVE),
    );
    expect(findingCodes(result)).toContain(
      RESTRUCTURE_VALIDATION_CODES.ENTRY_POINT_MISSING,
    );
  });

  it('rejects a missing required document artifact', () => {
    const result = validatePlanPostconditions(
      makeSnapshot(POST_STATES.MISSING_DETAIL),
      makePlan(FRACTAL_MOVE),
    );
    expect(findingCodes(result)).toContain(
      RESTRUCTURE_VALIDATION_CODES.REQUIRED_ARTIFACT_MISSING,
    );
  });

  it('rejects an unapplied import rewrite', () => {
    const result = validatePlanPostconditions(
      makeSnapshot(),
      makePlan(IMPORT_MOVE),
    );
    expect(findingCodes(result)).toContain(
      RESTRUCTURE_VALIDATION_CODES.IMPORT_REWRITE_MISSING,
    );
  });

  it('rejects an external import boundary violation', () => {
    const result = validatePlanPostconditions(
      makeSnapshot(POST_STATES.VALID_FRACTAL, GRAPH_STATES.BOUNDARY_VIOLATION),
      makePlan(FRACTAL_MOVE),
    );
    expect(findingCodes(result)).toContain(
      RESTRUCTURE_VALIDATION_CODES.IMPORT_BOUNDARY_VIOLATION,
    );
  });

  it('rejects a dependency cycle', () => {
    const result = validatePlanPostconditions(
      makeSnapshot(POST_STATES.VALID_FRACTAL, GRAPH_STATES.CYCLE),
      makePlan(FRACTAL_MOVE),
    );
    expect(findingCodes(result)).toContain(
      RESTRUCTURE_VALIDATION_CODES.DEPENDENCY_CYCLE,
    );
  });

  it('does not pass an indeterminate dependency graph', () => {
    const result = validatePlanPostconditions(
      makeSnapshot(POST_STATES.VALID_FRACTAL, GRAPH_STATES.INDETERMINATE),
      makePlan(FRACTAL_MOVE),
    );
    expect(findingCodes(result)).toContain(
      RESTRUCTURE_VALIDATION_CODES.DEPENDENCY_GRAPH_INDETERMINATE,
    );
  });
});
