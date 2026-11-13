import { describe, expect, it } from 'vitest';

import { ALL_SNAPSHOT_AXES } from '../../../../constants/snapshotAxes.js';
import type {
  FractalNode,
  ProjectSnapshot,
} from '../../../../types/fractal.js';
import { checkExternalImportBoundary } from '../utils/checkExternalImportBoundary.js';

/** @param path Owner path in the fixture tree. @returns A fractal with a declared entry and organ. */
function node(path: string): FractalNode {
  return {
    path,
    name: path.split('/').pop()!,
    type: 'fractal',
    parent: null,
    parentFractalPath: null,
    children: [],
    childFractalPaths: [],
    organs: [`${path}/utils`],
    organPaths: [`${path}/utils`],
    hasIntentMd: true,
    hasDetailMd: false,
    hasIndex: false,
    hasMain: false,
    peerFiles: ['body.unit'],
    depth: 0,
    metadata: {},
    entryPoints: [
      {
        path: `${path}/entry.unit`,
        kind: 'module',
        adapterId: 'fixture',
        surface: 'enumerated',
      },
    ],
  };
}

/** @param source Consumer owner. @param target Referenced owner. @param file Concrete target relative to its owner. @returns Boundary findings for one exact edge. */
function check(source: string, target: string, file = 'body.unit') {
  const paths = ['/project', source, target].filter(
    (path, index, all) => all.indexOf(path) === index,
  );
  const snapshot: ProjectSnapshot = {
    schemaVersion: 1,
    projectRoot: '/project',
    outputLanguage: 'en',
    snapshotHash: 'fixture',
    adapterIds: ['fixture'],
    tree: {
      root: '/project',
      nodes: new Map(paths.map((path) => [path, node(path)])),
      totalNodes: paths.length,
      depth: 3,
    },
    dependencyGraph: {
      nodePaths: paths,
      certainty: 'exact',
      cycles: [],
      unknownFiles: [],
      edges: [
        {
          fromFractalPath: source,
          toFractalPath: target,
          evidence: [
            {
              sourceFile: `${source}/body.unit`,
              resolvedPath: `${target}/${file}`,
              rawSpecifier: 'target',
            },
          ],
        },
      ],
    },
    verificationPaths: [],
    verification: { files: [], violations: [], certainty: 'exact' },
    legacyCriteriaLedger: null,
    diagnostics: [],
    normalizedFacts: [],
    filesOutsideFactsScope: 0,
    collectedAxes: ALL_SNAPSHOT_AXES,
    createdAt: '2026-01-01T00:00:00Z',
  };
  return checkExternalImportBoundary({ snapshot });
}

describe('ancestor root files: regressions', () => {
  it('allows a descendant to import an ancestor non-entry root file', () => {
    expect(check('/project/parent/child', '/project/parent')).toEqual([]);
  });
  it('allows a non-entry root file owned by the project root', () => {
    expect(check('/project/child', '/project')).toEqual([]);
  });
  it('allows a non-entry root file owned two levels above', () => {
    expect(
      check('/project/parent/child/grandchild', '/project/parent'),
    ).toEqual([]);
  });
});

describe('ancestor root files: controls', () => {
  it('rejects an ancestor entry point', () => {
    expect(
      check('/project/parent/child', '/project/parent', 'entry.unit'),
    ).toHaveLength(1);
  });
  it('rejects an internal file of a sibling fractal', () => {
    expect(check('/project/left', '/project/right')).toHaveLength(1);
  });
  it('rejects an internal file of a fractal nested within a sibling', () => {
    expect(check('/project/left', '/project/right/nested')).toHaveLength(1);
  });
  it('allows an ancestor organ file', () => {
    expect(
      check('/project/parent/child', '/project/parent', 'utils/helper.unit'),
    ).toEqual([]);
  });
});
