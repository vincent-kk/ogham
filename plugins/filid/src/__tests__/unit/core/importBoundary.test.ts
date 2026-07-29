import { describe, expect, it } from 'vitest';

import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import { checkExternalImportBoundary } from '../../../core/rules/ruleEngine/utils/checkExternalImportBoundary.js';
import type { BoundaryExemptionDeclaration } from '../../../types/documents.js';
import type {
  DependencyEvidence,
  DependencyGraph,
  FractalNode,
  FractalTree,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import type { VerificationFileAnalysis } from '../../../types/verification.js';

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
  collectedAxes: ALL_SNAPSHOT_AXES,
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

const organNode: FractalNode = {
  ...leftNode,
  path: '/project/left/utils',
  name: 'utils',
  type: 'organ',
  parent: '/project/left',
  parentFractalPath: '/project/left',
  entryPoints: [],
  depth: 2,
};

function organOwner(exemptions?: BoundaryExemptionDeclaration[]): FractalNode {
  return {
    ...leftNode,
    organs: ['/project/left/utils'],
    organPaths: ['/project/left/utils'],
    ...(exemptions
      ? {
          documentEvidence: {
            intentPath: '/project/left/INTENT.md',
            detailPath: '/project/left/DETAIL.md',
            status: 'valid',
            findings: [],
            boundaryExemptions: exemptions,
          },
        }
      : {}),
  };
}

const nestedNode: FractalNode = {
  ...leftNode,
  path: '/project/left/nested',
  name: 'nested',
  parent: '/project/left',
  parentFractalPath: '/project/left',
  entryPoints: [
    {
      path: '/project/left/nested/entry.ts',
      kind: 'module',
      adapterId: 'fixture',
      surface: 'enumerated',
    },
  ],
  depth: 2,
};

function checkOrganBoundary(
  owner: FractalNode,
  fromFractalPath: string,
  dependencyEvidence: DependencyEvidence,
) {
  const nodes = new Map(tree.nodes);
  nodes.set(owner.path, owner);
  nodes.set(organNode.path, organNode);
  nodes.set(nestedNode.path, nestedNode);
  return checkExternalImportBoundary({
    snapshot: {
      ...snapshot,
      tree: { ...tree, nodes },
      dependencyGraph: {
        ...snapshot.dependencyGraph,
        edges: [
          {
            fromFractalPath,
            toFractalPath: owner.path,
            evidence: [dependencyEvidence],
          },
        ],
      },
    },
  });
}

const organImport = evidence(
  '/project/right/source.ts',
  '../left/utils/helper.js',
  '/project/left/utils/helper.ts',
);

function exemption(
  overrides: Partial<BoundaryExemptionDeclaration> = {},
): BoundaryExemptionDeclaration {
  return {
    targetPath: '/project/left/utils',
    title: 'hook bundle',
    consumers: ['**/project/right/**'],
    directImport: true,
    reason: 'The barrel would pull every re-exported module into the bundle.',
    line: 12,
    ...overrides,
  };
}

describe('external-import-boundary — organ access by consumer location', () => {
  it('allows a descendant fractal to import an owned organ file directly', () => {
    const violations = checkOrganBoundary(
      organOwner(),
      '/project/left/nested',
      evidence(
        '/project/left/nested/source.ts',
        '../utils/helper.js',
        '/project/left/utils/helper.ts',
      ),
    );

    expect(violations).toEqual([]);
  });

  it('rejects a direct organ import from outside the owner subtree', () => {
    const violations = checkOrganBoundary(
      organOwner(),
      '/project/right',
      organImport,
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      ruleId: 'external-import-boundary',
      path: '/project/right/source.ts',
    });
  });

  it('allows an outside direct import declared in the owner DETAIL exemptions', () => {
    const violations = checkOrganBoundary(
      organOwner([exemption()]),
      '/project/right',
      organImport,
    );

    expect(violations).toEqual([]);
  });

  it('rejects an exemption whose reason is empty', () => {
    const violations = checkOrganBoundary(
      organOwner([exemption({ reason: '   ' })]),
      '/project/right',
      organImport,
    );

    expect(violations).toHaveLength(1);
  });

  it('rejects an exemption that does not allow direct import', () => {
    const violations = checkOrganBoundary(
      organOwner([exemption({ directImport: false })]),
      '/project/right',
      organImport,
    );

    expect(violations).toHaveLength(1);
  });

  it('rejects an exemption whose consumers do not cover this importer', () => {
    const violations = checkOrganBoundary(
      organOwner([exemption({ consumers: ['**/project/other/**'] })]),
      '/project/right',
      organImport,
    );

    expect(violations).toHaveLength(1);
  });

  it('still rejects a sibling import of a concrete file that no organ owns', () => {
    const violations = checkOrganBoundary(
      organOwner([exemption({ consumers: ['**'] })]),
      '/project/right',
      evidence(
        '/project/right/source.ts',
        '../left/internal.js',
        '/project/left/internal.ts',
      ),
    );

    expect(violations).toHaveLength(1);
  });
});

const fractalInternalImport = evidence(
  '/project/right/source.ts',
  '../left/internal.js',
  '/project/left/internal.ts',
);

describe('external-import-boundary — exemptions cover fractal targets', () => {
  it('allows an outside direct import of a fractal internal file the owner declared', () => {
    const violations = checkOrganBoundary(
      organOwner([exemption({ targetPath: '/project/left' })]),
      '/project/right',
      fractalInternalImport,
    );

    expect(violations).toEqual([]);
  });

  it('rejects a fractal-target exemption whose reason is empty', () => {
    const violations = checkOrganBoundary(
      organOwner([exemption({ targetPath: '/project/left', reason: '   ' })]),
      '/project/right',
      fractalInternalImport,
    );

    expect(violations).toHaveLength(1);
  });

  it('rejects a fractal-target exemption that does not allow direct import', () => {
    const violations = checkOrganBoundary(
      organOwner([
        exemption({ targetPath: '/project/left', directImport: false }),
      ]),
      '/project/right',
      fractalInternalImport,
    );

    expect(violations).toHaveLength(1);
  });
});

const siblingInternalImport = evidence(
  '/project/left/source.test.ts',
  '../right/internal.js',
  '/project/right/internal.ts',
);

function verificationFile(path: string): VerificationFileAnalysis {
  return {
    path,
    adapterId: 'fixture',
    role: 'test-record',
    count: { certainty: 'exact', knownLowerBound: 1, reasons: [] },
    ownerFractalPath: '/project/left',
    contractGroupIds: [],
  };
}

function checkVerificationBoundary(files: VerificationFileAnalysis[]) {
  return checkExternalImportBoundary({
    snapshot: {
      ...snapshot,
      verification: { files, violations: [], certainty: 'exact' },
      dependencyGraph: {
        ...snapshot.dependencyGraph,
        edges: [
          {
            fromFractalPath: '/project/left',
            toFractalPath: '/project/right',
            evidence: [siblingInternalImport],
          },
        ],
      },
    },
  });
}

describe('external-import-boundary — verification consumers', () => {
  it('does not judge an import whose consumer the adapter reports as a verification file', () => {
    const violations = checkVerificationBoundary([
      verificationFile('/project/left/source.test.ts'),
    ]);

    expect(violations).toEqual([]);
  });

  it('still judges the same import when no adapter reports it as verification', () => {
    const violations = checkVerificationBoundary([]);

    expect(violations).toHaveLength(1);
  });
});
