import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { RESTRUCTURE_VALIDATION_CODES } from '../../../constants/restructure.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import type {
  DependencyEvidence,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import { buildFractalTree } from '../../tree/fractalTree/index.js';
import type { NodeEntry } from '../../tree/fractalTree/index.js';
import { createRestructurePlan } from '../planner/createRestructurePlan.js';
import { validatePlanPostconditions } from '../validator/validatePlanPostconditions.js';

const P = {
  ROOT: '/filid-fixture-root',
  APP: '/filid-fixture-root/app',
  APP_INDEX: '/filid-fixture-root/app/index.ts',
  UTIL: '/filid-fixture-root/app/util',
  UTIL_INDEX: '/filid-fixture-root/app/util/index.ts',
  UTIL_FILE: '/filid-fixture-root/app/util.ts',
  LIB: '/filid-fixture-root/app/lib',
  LIB_INDEX: '/filid-fixture-root/app/lib/index.ts',
  LIB_OTHER: '/filid-fixture-root/app/lib/other.ts',
  STAGING: '/filid-fixture-root/staging',
  THING: '/filid-fixture-root/staging/thing.ts',
  FEATURE: '/filid-fixture-root/app/feature',
  MOVED_THING: '/filid-fixture-root/app/feature/thing.ts',
} as const;

/**
 * A tree entry of the fixture.
 * @param path Directory path.
 * @param type Fractal or organ.
 * @param peerFiles Files directly inside the directory.
 * @returns Tree entry; fractals carry both documents.
 */
function entry(
  path: string,
  type: typeof NODE_TYPES.FRACTAL | typeof NODE_TYPES.ORGAN,
  peerFiles: string[],
): NodeEntry {
  const fractal = type === NODE_TYPES.FRACTAL;
  return {
    path,
    name: path.split('/').at(-1) ?? 'root',
    type,
    hasIntentMd: fractal,
    hasDetailMd: fractal,
    peerFiles,
  };
}

/**
 * A snapshot with every reference in one exact edge.
 * @param entries Tree entries.
 * @param evidence Every import reference.
 * @returns Snapshot of the fixture project.
 */
function snapshotOf(
  entries: NodeEntry[],
  evidence: DependencyEvidence[],
): ProjectSnapshot {
  return {
    schemaVersion: 1,
    projectRoot: P.ROOT,
    outputLanguage: 'Korean',
    snapshotHash: 'resolved-requirements-fixture',
    tree: buildFractalTree(entries),
    dependencyGraph: {
      nodePaths: [P.ROOT, P.APP],
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
    normalizedFacts: [],
    filesOutsideFactsScope: 0,
    collectedAxes: ALL_SNAPSHOT_AXES,
    createdAt: '2026-09-19T00:00:00.000Z',
  };
}

/** `thing.ts` loads the `util` and `lib` directories through their index files; `app` loads `thing.ts`. */
const BEFORE = snapshotOf(
  [
    entry(P.ROOT, NODE_TYPES.FRACTAL, []),
    entry(P.APP, NODE_TYPES.FRACTAL, ['index.ts']),
    entry(P.UTIL, NODE_TYPES.ORGAN, ['index.ts']),
    entry(P.LIB, NODE_TYPES.ORGAN, ['index.ts', 'other.ts']),
    entry(P.STAGING, NODE_TYPES.ORGAN, ['thing.ts']),
  ],
  [
    {
      sourceFile: P.APP_INDEX,
      rawSpecifier: '../staging/thing',
      resolvedPath: P.THING,
    },
    {
      sourceFile: P.THING,
      rawSpecifier: '../app/util',
      resolvedPath: P.UTIL_INDEX,
    },
    {
      sourceFile: P.THING,
      rawSpecifier: '../app/lib',
      resolvedPath: P.LIB_INDEX,
    },
  ],
);

/** `thing.ts` moves into a new `feature` organ under its only consumer's fractal. */
const PLAN = createRestructurePlan(BEFORE, {
  path: P.ROOT,
  requests: [
    {
      sourcePath: P.THING,
      contractIntent: 'internal',
      organNameHint: 'feature',
    },
  ],
});

/**
 * The executed tree, with the three imports resolving where the actor's edits left them.
 * @param resolved Specifier and resolved file of each of the three imports after execution.
 * @param extraAppFiles Files added beside `app/index.ts`.
 * @returns Post-execution snapshot.
 */
function executed(
  resolved: {
    thing: [string, string];
    util: [string, string];
    lib: [string, string];
  },
  extraAppFiles: string[] = [],
): ProjectSnapshot {
  return snapshotOf(
    [
      entry(P.ROOT, NODE_TYPES.FRACTAL, []),
      entry(P.APP, NODE_TYPES.FRACTAL, ['index.ts', ...extraAppFiles]),
      entry(P.UTIL, NODE_TYPES.ORGAN, ['index.ts']),
      entry(P.LIB, NODE_TYPES.ORGAN, ['index.ts', 'other.ts']),
      entry(P.FEATURE, NODE_TYPES.ORGAN, ['thing.ts']),
    ],
    [
      {
        sourceFile: P.APP_INDEX,
        rawSpecifier: resolved.thing[0],
        resolvedPath: resolved.thing[1],
      },
      {
        sourceFile: P.MOVED_THING,
        rawSpecifier: resolved.util[0],
        resolvedPath: resolved.util[1],
      },
      {
        sourceFile: P.MOVED_THING,
        rawSpecifier: resolved.lib[0],
        resolvedPath: resolved.lib[1],
      },
    ],
  );
}

/**
 * Codes of the postcondition findings for one executed tree.
 * @param snapshot Post-execution snapshot.
 * @returns Finding codes with the consumer each names.
 */
function findingsOf(snapshot: ProjectSnapshot): string[] {
  return validatePlanPostconditions(snapshot, PLAN).findings.map(
    ({ code, path }) => `${code} ${path ?? ''}`,
  );
}

describe('postcondition judges import requirements by resolution', () => {
  it('plans one executable move of thing.ts into app/feature', () => {
    expect(PLAN.unresolved).toEqual([]);
    expect(PLAN.moves.map(({ targetPath }) => targetPath)).toEqual([
      P.MOVED_THING,
    ]);
  });

  it('passes an execution whose three imports resolve to the required files', () => {
    expect(
      findingsOf(
        executed({
          thing: ['./feature/thing', P.MOVED_THING],
          util: ['../util', P.UTIL_INDEX],
          lib: ['../lib', P.LIB_INDEX],
        }),
      ),
    ).toEqual([]);
  });

  it('fails when "../util" resolves to a shadowing util.ts instead of util/index.ts', () => {
    expect(
      findingsOf(
        executed(
          {
            thing: ['./feature/thing', P.MOVED_THING],
            util: ['../util', P.UTIL_FILE],
            lib: ['../lib', P.LIB_INDEX],
          },
          ['util.ts'],
        ),
      ),
    ).toContain(
      `${RESTRUCTURE_VALIDATION_CODES.IMPORT_REWRITE_MISSING} ${P.MOVED_THING}`,
    );
  });

  it('fails when "../lib" resolves to lib/other.ts instead of lib/index.ts', () => {
    expect(
      findingsOf(
        executed({
          thing: ['./feature/thing', P.MOVED_THING],
          util: ['../util', P.UTIL_INDEX],
          lib: ['../lib', P.LIB_OTHER],
        }),
      ),
    ).toContain(
      `${RESTRUCTURE_VALIDATION_CODES.IMPORT_REWRITE_MISSING} ${P.MOVED_THING}`,
    );
  });

  it('passes a correct rewrite spelled differently from the suggestion', () => {
    expect(
      findingsOf(
        executed({
          thing: ['./feature/thing.js', P.MOVED_THING],
          util: ['../util/index', P.UTIL_INDEX],
          lib: ['../lib', P.LIB_INDEX],
        }),
      ),
    ).toEqual([]);
  });
});
