import { describe, expect, it } from 'vitest';

import { checkExternalImportBoundary } from '../../../core/rules/ruleEngine/utils/checkExternalImportBoundary.js';
import type {
  DependencyEvidence,
  DependencyGraph,
  FractalNode,
  FractalTree,
  ProjectSnapshot,
} from '../../../types/fractal.js';

const rootNode: FractalNode = {
  path: '/project',
  name: 'project',
  type: 'fractal',
  parent: null,
  parentFractalPath: null,
  children: ['/project/left', '/project/right'],
  childFractalPaths: ['/project/left', '/project/right'],
  organs: [],
  organPaths: [],
  hasIntentMd: true,
  hasDetailMd: true,
  entryPoints: [
    {
      path: '/project/entry.ts',
      kind: 'module',
      adapterId: 'fixture',
      surface: 'enumerated',
    },
  ],
  peerFiles: ['entry.ts'],
  hasIndex: false,
  hasMain: false,
  depth: 0,
  metadata: {},
};

const leftNode: FractalNode = {
  ...rootNode,
  path: '/project/left',
  name: 'left',
  parent: '/project',
  parentFractalPath: '/project',
  children: [],
  childFractalPaths: [],
  entryPoints: [
    {
      path: '/project/left/entry.ts',
      kind: 'module',
      adapterId: 'fixture',
      surface: 'enumerated',
    },
  ],
  depth: 1,
};

const rightNode: FractalNode = {
  ...leftNode,
  path: '/project/right',
  name: 'right',
  entryPoints: [
    {
      path: '/project/right/entry.ts',
      kind: 'module',
      adapterId: 'fixture',
      surface: 'enumerated',
    },
  ],
};

const tree: FractalTree = {
  root: '/project',
  nodes: new Map([
    ['/project', rootNode],
    ['/project/left', leftNode],
    ['/project/right', rightNode],
  ]),
  depth: 1,
  totalNodes: 3,
};

const snapshot: ProjectSnapshot = {
  schemaVersion: 1,
  projectRoot: '/project',
  outputLanguage: 'English',
  snapshotHash: 'fixture',
  tree,
  dependencyGraph: {
    nodePaths: ['/project', '/project/left', '/project/right'],
    edges: [],
    cycles: [],
    certainty: 'exact',
  },
  adapterIds: ['fixture'],
  verification: { files: [], violations: [], certainty: 'exact' },
  legacyCriteriaLedger: null,
  diagnostics: [],
  createdAt: '2026-07-27T00:00:00.000Z',
};

function evidence(
  sourceFile: string,
  rawSpecifier: string,
  resolvedPath: string,
): DependencyEvidence {
  return { sourceFile, rawSpecifier, resolvedPath };
}

function checkBoundary(
  fromFractalPath: string,
  toFractalPath: string,
  dependencyEvidence: DependencyEvidence,
) {
  const dependencyGraph: DependencyGraph = {
    ...snapshot.dependencyGraph,
    edges: [{ fromFractalPath, toFractalPath, evidence: [dependencyEvidence] }],
  };
  return checkExternalImportBoundary({
    snapshot: { ...snapshot, dependencyGraph },
  });
}

describe('external-import-boundary', () => {
  it('rejects a sibling internal-file import', () => {
    const violations = checkBoundary(
      '/project/left',
      '/project/right',
      evidence(
        '/project/left/source.ts',
        '../right/internal.js',
        '/project/right/internal.ts',
      ),
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      ruleId: 'external-import-boundary',
      path: '/project/left/source.ts',
    });
  });

  it('rejects a child import through its parent barrel', () => {
    const violations = checkBoundary(
      '/project/left',
      '/project',
      evidence('/project/left/source.ts', '../entry.js', '/project/entry.ts'),
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      ruleId: 'external-import-boundary',
      path: '/project/left/source.ts',
    });
  });

  it('rejects a same-owner implementation import through the local barrel', () => {
    const violations = checkBoundary(
      '/project/right',
      '/project/right',
      evidence(
        '/project/right/internal.ts',
        './entry.js',
        '/project/right/entry.ts',
      ),
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      ruleId: 'external-import-boundary',
      path: '/project/right/internal.ts',
    });
  });

  it('allows a sibling import through the sibling entry point', () => {
    const violations = checkBoundary(
      '/project/left',
      '/project/right',
      evidence(
        '/project/left/source.ts',
        '../right/entry.js',
        '/project/right/entry.ts',
      ),
    );

    expect(violations).toEqual([]);
  });

  it('allows a same-owner concrete internal import', () => {
    const violations = checkBoundary(
      '/project/right',
      '/project/right',
      evidence(
        '/project/right/internal.ts',
        './helper.js',
        '/project/right/helper.ts',
      ),
    );

    expect(violations).toEqual([]);
  });

  it('allows a module entry point to expose its own implementation', () => {
    const violations = checkBoundary(
      '/project/right',
      '/project/right',
      evidence(
        '/project/right/entry.ts',
        './internal.js',
        '/project/right/internal.ts',
      ),
    );

    expect(violations).toEqual([]);
  });
});
