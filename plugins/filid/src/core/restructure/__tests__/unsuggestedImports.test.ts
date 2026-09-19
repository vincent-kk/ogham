// filid:contract AC-restructure-specifier
import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { RESTRUCTURE_VALIDATION_CODES } from '../../../constants/restructure.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import type {
  DependencyGraphEdge,
  ProjectSnapshot,
  SnapshotDiagnostic,
} from '../../../types/fractal.js';
import { buildFractalTree } from '../../tree/fractalTree/index.js';
import type { NodeEntry } from '../../tree/fractalTree/index.js';
import { collectOutgoingRewrites } from '../imports/collectOutgoingRewrites.js';
import { createRestructurePlan } from '../planner/createRestructurePlan.js';
import { validatePlanPostconditions } from '../validator/validatePlanPostconditions.js';

const P = {
  ROOT: '/root',
  APP: '/root/app',
  APP_INDEX: '/root/app/index.ts',
  FEATURE: '/root/feature',
  FEATURE_INDEX: '/root/feature/index.ts',
  PARTS: '/root/feature/parts',
  PARTS_INDEX: '/root/feature/parts/index.ts',
  MOVED: '/root/app/feature',
  MOVED_INDEX: '/root/app/feature/index.ts',
  MOVED_PARTS: '/root/app/feature/parts',
  MOVED_PARTS_INDEX: '/root/app/feature/parts/index.ts',
  SHADOW: '/root/app/feature/parts.ts',
} as const;

function fractal(path: string, name: string, peerFiles: string[]): NodeEntry {
  return {
    path,
    name,
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    peerFiles: ['index.ts', 'INTENT.md', 'DETAIL.md', ...peerFiles],
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

function edge(
  fromFractalPath: string,
  toFractalPath: string,
  sourceFile: string,
  rawSpecifier: string,
  resolvedPath: string,
): DependencyGraphEdge {
  return {
    fromFractalPath,
    toFractalPath,
    evidence: [{ sourceFile, rawSpecifier, resolvedPath }],
  };
}

function snapshotOf(
  entries: NodeEntry[],
  edges: DependencyGraphEdge[],
  diagnostics: SnapshotDiagnostic[] = [],
): ProjectSnapshot {
  return {
    schemaVersion: 1,
    projectRoot: P.ROOT,
    outputLanguage: 'Korean',
    snapshotHash: 'unsuggested-imports-fixture',
    tree: buildFractalTree(entries),
    dependencyGraph: {
      nodePaths: entries.map(({ path }) => path),
      edges,
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
    diagnostics,
    collectedAxes: ALL_SNAPSHOT_AXES,
    createdAt: '2026-09-19T00:00:00.000Z',
  };
}

/** `app` loads the feature directory through its index; the feature loads its own `parts` directory. */
const BEFORE = snapshotOf(
  [
    fractal(P.ROOT, 'root', []),
    fractal(P.APP, 'app', []),
    fractal(P.FEATURE, 'feature', []),
    fractal(P.PARTS, 'parts', []),
  ],
  [
    edge(P.APP, P.FEATURE, P.APP_INDEX, '../feature', P.FEATURE_INDEX),
    edge(P.FEATURE, P.PARTS, P.FEATURE_INDEX, './parts', P.PARTS_INDEX),
  ],
);

const PLAN = createRestructurePlan(BEFORE, {
  path: P.ROOT,
  requests: [{ sourcePath: P.FEATURE }],
});

const MOVED_TREE = [
  fractal(P.ROOT, 'root', []),
  fractal(P.APP, 'app', []),
  fractal(P.MOVED, 'feature', []),
  fractal(P.MOVED_PARTS, 'parts', []),
];

const PARTS_EDGE = edge(
  P.MOVED,
  P.MOVED_PARTS,
  P.MOVED_INDEX,
  './parts',
  P.MOVED_PARTS_INDEX,
);

function findingOf(snapshot: ProjectSnapshot, code: string) {
  return validatePlanPostconditions(snapshot, PLAN).findings.find(
    (finding) => finding.code === code,
  );
}

describe('restructure leaves imports it cannot suggest to the caller', () => {
  it('requires a directory-index reference without a suggestion instead of leaving the move unresolved', () => {
    expect(PLAN.unresolved).toEqual([]);
    expect(PLAN.moves[0]?.affectedImports).toStrictEqual([
      {
        consumerPath: P.APP_INDEX,
        currentSpecifier: '../feature',
        requiredResolvedPath: P.MOVED_INDEX,
      },
    ]);
    expect(PLAN.summary.affectedImportCount).toBe(1);
  });

  it('preserves a directory reference inside the moved directory', () => {
    expect(PLAN.moves[0]?.preservedImports).toStrictEqual([
      {
        consumerPath: P.MOVED_INDEX,
        currentSpecifier: './parts',
        requiredResolvedPath: P.MOVED_PARTS_INDEX,
      },
    ]);
  });

  it('clears affected and preserved imports from a move left unresolved', () => {
    const conflicted = createRestructurePlan(BEFORE, {
      path: P.ROOT,
      requests: [{ sourcePath: P.FEATURE }, { sourcePath: P.FEATURE }],
    });

    expect(conflicted.unresolved.length).toBeGreaterThan(0);
    for (const move of conflicted.unresolved) {
      expect(move.affectedImports).toStrictEqual([]);
      expect(move.preservedImports).toStrictEqual([]);
    }
  });

  it('preserves an outgoing import whose target keeps its relative place', () => {
    const consumer = '/root/app/x/feature.ts';
    const shared = '/root/app/shared.ts';
    const unit = {
      sourcePath: consumer,
      targetPath: '/root/app/y/feature.ts',
      rewriteTargetPath: '/root/app/y/feature.ts',
    };
    const snapshot = snapshotOf(
      [fractal(P.ROOT, 'root', []), fractal(P.APP, 'app', ['shared.ts'])],
      [edge(P.APP, P.APP, consumer, '#shared', shared)],
    );

    const result = collectOutgoingRewrites(snapshot, unit, [unit]);

    expect(result.required).toStrictEqual([]);
    expect(result.preserved).toStrictEqual([
      {
        consumerPath: unit.targetPath,
        currentSpecifier: '#shared',
        requiredResolvedPath: shared,
      },
    ]);
  });

  it('requires an outgoing import whose target changes its relative place, without a suggestion', () => {
    const consumer = '/root/app/x/feature.ts';
    const shared = '/root/app/shared.ts';
    const unit = {
      sourcePath: consumer,
      targetPath: '/root/app/x/deep/feature.ts',
      rewriteTargetPath: '/root/app/x/deep/feature.ts',
    };
    const snapshot = snapshotOf(
      [fractal(P.ROOT, 'root', []), fractal(P.APP, 'app', ['shared.ts'])],
      [edge(P.APP, P.APP, consumer, '#shared', shared)],
    );

    const result = collectOutgoingRewrites(snapshot, unit, [unit]);

    expect(result.preserved).toStrictEqual([]);
    expect(result.required).toStrictEqual([
      {
        consumerPath: unit.targetPath,
        currentSpecifier: '#shared',
        requiredResolvedPath: shared,
      },
    ]);
  });

  it('passes the postcondition once the caller rewrites the unsuggested import', () => {
    const after = snapshotOf(MOVED_TREE, [
      edge(P.APP, P.MOVED, P.APP_INDEX, './feature', P.MOVED_INDEX),
      PARTS_EDGE,
    ]);

    expect(validatePlanPostconditions(after, PLAN)).toEqual({
      valid: true,
      findings: [],
    });
  });

  it('names the consumer and the file it must load when the unsuggested import stays broken', () => {
    const after = snapshotOf(
      MOVED_TREE,
      [PARTS_EDGE],
      [
        {
          code: 'unresolved-local-dependency',
          message: 'fixture',
          nextAction: 'fixture',
          path: P.APP_INDEX,
          specifier: '../feature',
        },
      ],
    );
    const finding = findingOf(
      after,
      RESTRUCTURE_VALIDATION_CODES.IMPORT_REWRITE_MISSING,
    );

    expect(finding?.message).toBe(
      `${P.APP_INDEX} still holds the unresolved import "../feature".`,
    );
    expect(finding?.nextAction).toContain(`In ${P.APP_INDEX}`);
    expect(finding?.nextAction).toContain(`so it loads ${P.MOVED_INDEX}`);
  });

  it('reports an unsuggested import the caller pointed at another file', () => {
    const after = snapshotOf(MOVED_TREE, [
      edge(
        P.APP,
        P.MOVED_PARTS,
        P.APP_INDEX,
        './feature/parts',
        P.MOVED_PARTS_INDEX,
      ),
      PARTS_EDGE,
    ]);

    expect(
      findingOf(after, RESTRUCTURE_VALIDATION_CODES.IMPORT_REWRITE_MISSING)
        ?.message,
    ).toBe(`No import in ${P.APP_INDEX} loads ${P.MOVED_INDEX}.`);
  });

  it('reports an unsuggested import whose old specifier still loads another file beside a rewritten one', () => {
    const intercepting = '/root/feature.ts';
    const after = snapshotOf(
      [
        fractal(P.ROOT, 'root', ['feature.ts']),
        fractal(P.APP, 'app', []),
        fractal(P.MOVED, 'feature', []),
        fractal(P.MOVED_PARTS, 'parts', []),
      ],
      [
        edge(P.APP, P.MOVED, P.APP_INDEX, './feature', P.MOVED_INDEX),
        edge(P.APP, P.ROOT, P.APP_INDEX, '../feature', intercepting),
        PARTS_EDGE,
      ],
    );

    expect(
      findingOf(after, RESTRUCTURE_VALIDATION_CODES.IMPORT_REWRITE_MISSING)
        ?.message,
    ).toBe(
      `The import "../feature" in ${P.APP_INDEX} loads ${intercepting} instead of ${P.MOVED_INDEX} after the moves.`,
    );
  });

  it('reports a preserved import that a same-named sibling file intercepts', () => {
    const after = snapshotOf(
      [
        fractal(P.ROOT, 'root', []),
        fractal(P.APP, 'app', []),
        fractal(P.MOVED, 'feature', ['parts.ts']),
        fractal(P.MOVED_PARTS, 'parts', []),
      ],
      [
        edge(P.APP, P.MOVED, P.APP_INDEX, './feature', P.MOVED_INDEX),
        edge(P.MOVED, P.MOVED, P.MOVED_INDEX, './parts', P.SHADOW),
      ],
    );

    expect(
      findingOf(after, RESTRUCTURE_VALIDATION_CODES.PRESERVED_IMPORT_BROKEN),
    ).toMatchObject({ path: P.MOVED_INDEX, sourcePath: P.FEATURE });
  });

  it('passes a preserved import the caller rewrote to name the index file', () => {
    const after = snapshotOf(
      [
        fractal(P.ROOT, 'root', []),
        fractal(P.APP, 'app', []),
        fractal(P.MOVED, 'feature', ['parts.ts']),
        fractal(P.MOVED_PARTS, 'parts', []),
      ],
      [
        edge(P.APP, P.MOVED, P.APP_INDEX, './feature', P.MOVED_INDEX),
        edge(
          P.MOVED,
          P.MOVED_PARTS,
          P.MOVED_INDEX,
          './parts/index.ts',
          P.MOVED_PARTS_INDEX,
        ),
      ],
    );

    expect(validatePlanPostconditions(after, PLAN).findings).toEqual([]);
  });

  it('reports a preserved import the caller rewrote to another file', () => {
    const after = snapshotOf(
      [
        fractal(P.ROOT, 'root', []),
        fractal(P.APP, 'app', []),
        fractal(P.MOVED, 'feature', ['parts.ts']),
        fractal(P.MOVED_PARTS, 'parts', []),
      ],
      [
        edge(P.APP, P.MOVED, P.APP_INDEX, './feature', P.MOVED_INDEX),
        edge(P.MOVED, P.MOVED, P.MOVED_INDEX, './parts.ts', P.SHADOW),
      ],
    );

    expect(
      findingOf(after, RESTRUCTURE_VALIDATION_CODES.PRESERVED_IMPORT_BROKEN)
        ?.message,
    ).toBe(`No import in ${P.MOVED_INDEX} loads ${P.MOVED_PARTS_INDEX}.`);
  });

  it('reports a preserved import whose old specifier is still unresolved beside a rewritten one', () => {
    const after = snapshotOf(
      MOVED_TREE,
      [
        edge(P.APP, P.MOVED, P.APP_INDEX, './feature', P.MOVED_INDEX),
        edge(
          P.MOVED,
          P.MOVED_PARTS,
          P.MOVED_INDEX,
          './parts/index.ts',
          P.MOVED_PARTS_INDEX,
        ),
      ],
      [
        {
          code: 'unresolved-local-dependency',
          message: 'fixture',
          nextAction: 'fixture',
          path: P.MOVED_INDEX,
          specifier: './parts',
        },
      ],
    );

    expect(
      findingOf(after, RESTRUCTURE_VALIDATION_CODES.PRESERVED_IMPORT_BROKEN)
        ?.message,
    ).toBe(`${P.MOVED_INDEX} holds the unresolved import "./parts".`);
  });

  it('reports a preserved import when any evidence for its specifier is intercepted', () => {
    const after = snapshotOf(
      [
        fractal(P.ROOT, 'root', []),
        fractal(P.APP, 'app', []),
        fractal(P.MOVED, 'feature', ['parts.ts']),
        fractal(P.MOVED_PARTS, 'parts', []),
      ],
      [
        edge(P.APP, P.MOVED, P.APP_INDEX, './feature', P.MOVED_INDEX),
        PARTS_EDGE,
        edge(P.MOVED, P.MOVED, P.MOVED_INDEX, './parts', P.SHADOW),
      ],
    );

    expect(
      findingOf(after, RESTRUCTURE_VALIDATION_CODES.PRESERVED_IMPORT_BROKEN)
        ?.message,
    ).toBe(
      `The import "./parts" in ${P.MOVED_INDEX} loads ${P.SHADOW} instead of ${P.MOVED_PARTS_INDEX} after the moves.`,
    );
  });
});
