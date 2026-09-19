// filid:contract AC-restructure-guidance
import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import {
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_DECISION_REASONS,
} from '../../../constants/restructure.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import type {
  DependencyEvidence,
  EntryPointDescriptor,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import type { PlacementRequest } from '../../../types/restructure.js';
import { buildFractalTree } from '../../tree/fractalTree/index.js';
import type { NodeEntry } from '../../tree/fractalTree/index.js';
import { createRestructurePlan } from '../planner/createRestructurePlan.js';

const P = {
  ROOT: '/root',
  MANIFEST: '/root/package.json',
  APP: '/root/app',
  APP_INDEX: '/root/app/index.ts',
  B: '/root/b',
  B_USE: '/root/b/use.ts',
  UTIL: '/root/app/util.ts',
  LIB: '/root/b/lib',
  LIB_A: '/root/b/lib/a.ts',
  LIB_B: '/root/b/lib/b.ts',
} as const;

function entry(
  path: string,
  kind: EntryPointDescriptor['kind'],
): EntryPointDescriptor {
  return { path, kind, adapterId: 'fixture', surface: 'enumerated' };
}

function fractal(path: string, name: string, peerFiles: string[]): NodeEntry {
  return {
    path,
    name,
    type: NODE_TYPES.FRACTAL,
    hasIntentMd: true,
    hasDetailMd: true,
    peerFiles,
    entryPoints: [entry(`${path}/index.ts`, 'module')],
  };
}

/** A root organ that holds only the project manifest, plus `app`, `b` and the `b/lib` organ. */
function snapshotWith(evidence: DependencyEvidence[]): ProjectSnapshot {
  return {
    schemaVersion: 1,
    projectRoot: P.ROOT,
    outputLanguage: 'Korean',
    snapshotHash: 'placement-evidence-fixture',
    tree: buildFractalTree([
      {
        path: P.ROOT,
        name: 'root',
        type: NODE_TYPES.ORGAN,
        hasIntentMd: false,
        hasDetailMd: false,
        peerFiles: ['package.json'],
        entryPoints: [entry(P.MANIFEST, 'manifest')],
      },
      fractal(P.APP, 'app', ['index.ts', 'util.ts']),
      fractal(P.B, 'b', ['index.ts', 'use.ts']),
      {
        path: P.LIB,
        name: 'lib',
        type: NODE_TYPES.ORGAN,
        hasIntentMd: false,
        hasDetailMd: false,
        peerFiles: ['a.ts', 'b.ts'],
      },
    ]),
    dependencyGraph: {
      nodePaths: [P.APP, P.B],
      edges: [{ fromFractalPath: P.APP, toFractalPath: P.APP, evidence }],
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

function plan(evidence: DependencyEvidence[], request: PlacementRequest) {
  return createRestructurePlan(snapshotWith(evidence), {
    path: P.ROOT,
    requests: [request],
  });
}

describe('restructure placement evidence', () => {
  it('copies the module entry form even when the root holds a manifest entry', () => {
    const result = plan([], {
      sourcePath: P.UTIL,
      consumerPaths: [P.B_USE],
      contractIntent: 'independent',
    });

    expect(result.unresolved).toEqual([]);
    expect(result.moves[0]?.requiredArtifacts).toContainEqual({
      role: REQUIRED_ARTIFACT_ROLES.ENTRY_POINT,
      path: '/root/b/util/index.ts',
      adapterId: 'fixture',
    });
  });

  it('does not count a directory unit importing its own files as a consumer', () => {
    const result = plan(
      [
        {
          sourceFile: P.APP_INDEX,
          rawSpecifier: '../b/lib/a.ts',
          resolvedPath: P.LIB_A,
        },
        { sourceFile: P.LIB_A, rawSpecifier: './b.ts', resolvedPath: P.LIB_B },
      ],
      { sourcePath: P.LIB, contractIntent: 'internal', organNameHint: 'lib' },
    );

    expect(result.moves.map(({ targetPath }) => targetPath)).toEqual([
      '/root/app/lib',
    ]);
    expect(result.moves[0]?.consumerPaths).toEqual([P.APP_INDEX]);
  });

  it('rejects "." as an organ name hint', () => {
    const result = plan([], {
      sourcePath: P.UTIL,
      consumerPaths: [P.B_USE],
      contractIntent: 'internal',
      organNameHint: '.',
    });

    expect(result.unresolved[0]?.decisionReasons).toEqual([
      RESTRUCTURE_DECISION_REASONS.INVALID_NAME_HINT,
      RESTRUCTURE_DECISION_REASONS.ORGAN_NAME_REQUIRED,
    ]);
  });
});
