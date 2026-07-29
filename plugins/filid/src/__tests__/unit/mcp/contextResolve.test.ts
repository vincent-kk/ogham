import { describe, expect, it, vi } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import { TOOL_STATUSES } from '../../../constants/toolEnvelope.js';
import { handleContextResolve } from '../../../mcp/tools/contextResolve/index.js';
import type { ToolSnapshotContext } from '../../../mcp/tools/utils/createToolSnapshot.js';
import { createToolSnapshot } from '../../../mcp/tools/utils/createToolSnapshot.js';
import type { FractalNode, ProjectSnapshot } from '../../../types/fractal.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

const PROJECT_ROOT = '/project';
const FEATURE_ROOT = '/project/feature';
const SIBLING_ROOT = '/project/sibling';
const SOURCE_PATH = '/project/feature/source.unit';
const PEER_PATH = '/project/feature/peer.unit';
const SIBLING_SOURCE_PATH = '/project/sibling/source.unit';

const OWNER_DIAGNOSTIC: ToolDiagnostic = {
  code: 'owner-evidence',
  message: 'evidence inside the resolved owner',
  path: SOURCE_PATH,
};
const SIBLING_DIAGNOSTIC: ToolDiagnostic = {
  code: 'sibling-evidence',
  message: 'evidence in an unrelated subtree',
  path: SIBLING_SOURCE_PATH,
};
const GLOBAL_DIAGNOSTIC: ToolDiagnostic = {
  code: 'config-warning',
  message: 'evidence with no path',
};

function fractalNode(
  path: string,
  name: string,
  parentFractalPath: string | null,
  depth: number,
): FractalNode {
  return {
    path,
    name,
    type: NODE_TYPES.FRACTAL,
    parent: parentFractalPath,
    parentFractalPath,
    children: [],
    childFractalPaths: [],
    organs: [],
    organPaths: [],
    hasIntentMd: true,
    hasDetailMd: true,
    entryPoints: [],
    documentEvidence: {
      intentPath: `${path}/INTENT.md`,
      detailPath: `${path}/DETAIL.md`,
      intentLines: 10,
      status: 'valid',
      findings: [],
    },
    peerFiles: [],
    hasIndex: false,
    hasMain: false,
    depth,
    metadata: {},
  };
}

const ROOT_NODE = fractalNode(PROJECT_ROOT, 'project', null, 0);
const FEATURE_NODE = fractalNode(FEATURE_ROOT, 'feature', PROJECT_ROOT, 1);
const SIBLING_NODE = fractalNode(SIBLING_ROOT, 'sibling', PROJECT_ROOT, 1);

const SNAPSHOT: ProjectSnapshot = {
  schemaVersion: 1,
  projectRoot: PROJECT_ROOT,
  outputLanguage: 'Korean',
  snapshotHash: 'snapshot-hash',
  tree: {
    root: PROJECT_ROOT,
    nodes: new Map([
      [
        PROJECT_ROOT,
        { ...ROOT_NODE, childFractalPaths: [FEATURE_ROOT, SIBLING_ROOT] },
      ],
      [FEATURE_ROOT, FEATURE_NODE],
      [SIBLING_ROOT, SIBLING_NODE],
    ]),
    depth: 1,
    totalNodes: 3,
  },
  dependencyGraph: {
    nodePaths: [PROJECT_ROOT, FEATURE_ROOT, SIBLING_ROOT],
    edges: [],
    cycles: [],
    certainty: ANALYSIS_CERTAINTIES.EXACT,
  },
  adapterIds: ['fixture-adapter'],
  verification: {
    files: [],
    violations: [],
    certainty: ANALYSIS_CERTAINTIES.EXACT,
  },
  legacyCriteriaLedger: null,
  diagnostics: [],
  collectedAxes: ALL_SNAPSHOT_AXES,
  createdAt: '2026-07-29T00:00:00.000Z',
};

vi.mock('../../../mcp/tools/utils/createToolSnapshot.js', () => ({
  createToolSnapshot: vi.fn(),
}));

const mockedCreateToolSnapshot = vi.mocked(createToolSnapshot);

function mockSnapshotContext(diagnostics: ToolDiagnostic[]): void {
  const context: ToolSnapshotContext = {
    snapshot: SNAPSHOT,
    rules: [],
    maxDepth: 10,
    diagnostics,
  };
  mockedCreateToolSnapshot.mockResolvedValue(context);
}

describe('context_resolve inline chain and scoped evidence', () => {
  it('carries the owner-to-root chain in the summary', async () => {
    mockSnapshotContext([]);

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      targetPath: SOURCE_PATH,
    });

    expect(result.summary.chainPaths).toEqual([FEATURE_ROOT, PROJECT_ROOT]);
    expect(result.summary.chainLength).toBe(2);
  });

  it('drops diagnostics from subtrees outside the chain and counts them', async () => {
    mockSnapshotContext([OWNER_DIAGNOSTIC, SIBLING_DIAGNOSTIC]);

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      targetPath: SOURCE_PATH,
    });

    expect(result.diagnostics).toEqual([OWNER_DIAGNOSTIC]);
    expect(result.summary.diagnosticsOutOfScope).toBe(1);
  });

  it('keeps diagnostics that carry no path', async () => {
    mockSnapshotContext([GLOBAL_DIAGNOSTIC, SIBLING_DIAGNOSTIC]);

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      targetPath: SOURCE_PATH,
    });

    expect(result.diagnostics).toEqual([GLOBAL_DIAGNOSTIC]);
  });

  it('stays ok when only out-of-scope evidence exists', async () => {
    mockSnapshotContext([SIBLING_DIAGNOSTIC]);

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      targetPath: SOURCE_PATH,
    });

    expect(result.status).toBe(TOOL_STATUSES.OK);
    expect(result.summary.diagnosticsOutOfScope).toBe(1);
  });

  it('resolves the lowest common fractal of compared paths', async () => {
    mockSnapshotContext([]);

    const sameOwner = await handleContextResolve({
      path: PROJECT_ROOT,
      targetPath: SOURCE_PATH,
      comparePaths: [SOURCE_PATH, PEER_PATH],
    });
    const acrossOwners = await handleContextResolve({
      path: PROJECT_ROOT,
      targetPath: SOURCE_PATH,
      comparePaths: [SOURCE_PATH, SIBLING_SOURCE_PATH],
    });

    expect(sameOwner.summary.lowestCommonFractalPath).toBe(FEATURE_ROOT);
    expect(acrossOwners.summary.lowestCommonFractalPath).toBe(PROJECT_ROOT);
  });

  it('omits the common fractal field when no comparison was requested', async () => {
    mockSnapshotContext([]);

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      targetPath: SOURCE_PATH,
    });

    expect(result.summary).not.toHaveProperty('lowestCommonFractalPath');
  });

  it('reports null rather than guessing when a compared path is unowned', async () => {
    mockSnapshotContext([]);

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      targetPath: SOURCE_PATH,
      comparePaths: [],
    });

    expect(result.summary.lowestCommonFractalPath).toBeNull();
  });
});
