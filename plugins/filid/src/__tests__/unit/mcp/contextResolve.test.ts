import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('context_resolve shared-snapshot batch', () => {
  beforeEach(() => {
    mockedCreateToolSnapshot.mockReset();
  });

  it('resolves 100 ordered requests from one snapshot', async () => {
    mockSnapshotContext([]);
    const targetPaths = Array.from(
      { length: 100 },
      (_, index) => `${FEATURE_ROOT}/source-${index}.unit`,
    );

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      requests: targetPaths.map((targetPath) => ({ targetPath })),
    });

    expect(mockedCreateToolSnapshot).toHaveBeenCalledTimes(1);
    expect(result.summary).toEqual({
      projectRoot: PROJECT_ROOT,
      requestCount: 100,
      resolvedCount: 100,
      failedCount: 0,
      indeterminateCount: 0,
    });
    expect(result.data?.results).toHaveLength(100);
    expect(result.data?.results.map(({ targetPath }) => targetPath)).toEqual(
      targetPaths,
    );
  });

  it('keeps the single-request chain in the first resolved item', async () => {
    mockSnapshotContext([]);

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      requests: [{ targetPath: SOURCE_PATH }],
    });
    const item = result.data?.results[0];

    expect(item).toMatchObject({
      index: 0,
      resolved: true,
      targetPath: SOURCE_PATH,
      status: TOOL_STATUSES.OK,
      summary: {
        ownerFractalPath: FEATURE_ROOT,
        chainLength: 2,
        chainPaths: [FEATURE_ROOT, PROJECT_ROOT],
      },
    });
    if (!item?.resolved) throw new Error('expected resolved context item');
    expect(item.resolution.chain.map(({ fractalPath }) => fractalPath)).toEqual(
      [FEATURE_ROOT, PROJECT_ROOT],
    );
  });

  it('scopes item diagnostics and deduplicates their top-level union', async () => {
    mockSnapshotContext([
      OWNER_DIAGNOSTIC,
      SIBLING_DIAGNOSTIC,
      GLOBAL_DIAGNOSTIC,
    ]);

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      requests: [{ targetPath: SOURCE_PATH }, { targetPath: PEER_PATH }],
    });

    expect(result.diagnostics).toEqual([OWNER_DIAGNOSTIC, GLOBAL_DIAGNOSTIC]);
    expect(result.summary.indeterminateCount).toBe(2);
    for (const item of result.data?.results ?? []) {
      expect(item.diagnostics).toEqual([OWNER_DIAGNOSTIC, GLOBAL_DIAGNOSTIC]);
      if (!item.resolved) throw new Error('expected resolved context item');
      expect(item.summary.diagnosticsOutOfScope).toBe(1);
    }
  });

  it('stays ok when only out-of-scope evidence exists', async () => {
    mockSnapshotContext([SIBLING_DIAGNOSTIC]);

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      requests: [{ targetPath: SOURCE_PATH }],
    });

    expect(result.status).toBe(TOOL_STATUSES.OK);
    const item = result.data?.results[0];
    if (!item?.resolved) throw new Error('expected resolved context item');
    expect(item.summary.diagnosticsOutOfScope).toBe(1);
  });

  it('resolves comparison paths independently for each request', async () => {
    mockSnapshotContext([]);

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      requests: [
        {
          targetPath: SOURCE_PATH,
          comparePaths: [SOURCE_PATH, PEER_PATH],
        },
        {
          targetPath: SIBLING_SOURCE_PATH,
          comparePaths: [SOURCE_PATH, SIBLING_SOURCE_PATH],
        },
      ],
    });
    const results = result.data?.results ?? [];

    expect(results[0]).toMatchObject({
      resolved: true,
      summary: { lowestCommonFractalPath: FEATURE_ROOT },
    });
    expect(results[1]).toMatchObject({
      resolved: true,
      summary: { lowestCommonFractalPath: PROJECT_ROOT },
    });
  });

  it('distinguishes omitted comparison paths from an unresolved comparison', async () => {
    mockSnapshotContext([]);

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      requests: [
        { targetPath: SOURCE_PATH },
        { targetPath: SOURCE_PATH, comparePaths: [] },
      ],
    });
    const results = result.data?.results ?? [];

    expect(results[0]).not.toHaveProperty('summary.lowestCommonFractalPath');
    expect(results[1]).toMatchObject({
      resolved: true,
      summary: { lowestCommonFractalPath: null },
    });
  });

  it('keeps successful items when another target cannot be resolved', async () => {
    mockSnapshotContext([]);

    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      requests: [
        { targetPath: SOURCE_PATH },
        { targetPath: '/outside/source.unit' },
        { targetPath: SIBLING_SOURCE_PATH },
      ],
    });

    expect(result.status).toBe(TOOL_STATUSES.INDETERMINATE);
    expect(result.summary).toEqual({
      projectRoot: PROJECT_ROOT,
      requestCount: 3,
      resolvedCount: 2,
      failedCount: 1,
      indeterminateCount: 1,
    });
    expect(result.data?.results).toMatchObject([
      { index: 0, resolved: true, targetPath: SOURCE_PATH },
      {
        index: 1,
        resolved: false,
        targetPath: '/outside/source.unit',
        status: TOOL_STATUSES.INDETERMINATE,
        diagnostics: [
          {
            code: 'context-target-unresolved',
            path: '/outside/source.unit',
          },
        ],
      },
      { index: 2, resolved: true, targetPath: SIBLING_SOURCE_PATH },
    ]);
  });
});
