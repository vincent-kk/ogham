import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { readUtf8FileIfExistsSync } from '@ogham/cross-platform/filesystem/read/utf8';
import { portableJoin } from '@ogham/cross-platform/paths';
import { describe, expect, it, vi } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import {
  FRACTAL_SCAN_DETAILS,
  SNAPSHOT_TOOL_DIAGNOSTIC_CODES,
  STRUCTURE_PLAN_PATH_REQUIRED_MESSAGE,
  STRUCTURE_VALIDATION_MODES,
  VERIFICATION_ROLES,
  VERIFICATION_SCAN_DETAILS,
} from '../../../constants/mcpContracts.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import {
  CONTRACT_INTENTS,
  RESTRUCTURE_NODE_TYPES,
  RESTRUCTURE_SCHEMA_VERSION,
} from '../../../constants/restructure.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import {
  TOOL_PERSISTENCE,
  TOOL_STATUSES,
} from '../../../constants/toolEnvelope.js';
import { handleContextResolve } from '../../../mcp/tools/contextResolve/index.js';
import { handleFractalScan } from '../../../mcp/tools/fractalScan/index.js';
import { handleRestructurePlan } from '../../../mcp/tools/restructurePlan/index.js';
import { handleStructureValidate } from '../../../mcp/tools/structureValidate/index.js';
import type { ToolSnapshotContext } from '../../../mcp/tools/utils/createToolSnapshot.js';
import { createToolSnapshot } from '../../../mcp/tools/utils/createToolSnapshot.js';
import { handleVerificationScan } from '../../../mcp/tools/verificationScan/index.js';
import type { FractalNode, ProjectSnapshot } from '../../../types/fractal.js';
import type { RestructurePlanSummary } from '../../../types/report.js';
import type { RestructurePlan } from '../../../types/restructure.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';

const PROJECT_ROOT = '/project';
const FEATURE_ROOT = '/project/feature';
const SOURCE_PATH = '/project/feature/source.unit';
const CONSUMER_PATH = '/project/feature/consumer.unit';
const VERIFICATION_PATH = '/project/feature/contract.unit';
const UNKNOWN_PATH = '/project/feature/unknown.unit';
const EXPECTED_DATA_MESSAGE = 'expected tool data';
const PLAN_FILE_NAME = 'plan.json';
const EXPECTED_VERIFICATION_SUMMARY = {
  fileCount: 1,
  specDocument: {
    fileCount: 1,
    knownCaseCount: 3,
  },
  testRecord: {
    fileCount: 0,
    knownCaseCount: 0,
  },
  fragmentationCount: 0,
} as const;

function requireData<Data>(data: Data | undefined): Data {
  if (data === undefined) throw new Error(EXPECTED_DATA_MESSAGE);
  return data;
}

const ROOT_NODE: FractalNode = {
  path: PROJECT_ROOT,
  name: 'project',
  type: NODE_TYPES.FRACTAL,
  parent: null,
  parentFractalPath: null,
  children: [FEATURE_ROOT],
  childFractalPaths: [FEATURE_ROOT],
  organs: [],
  organPaths: [],
  hasIntentMd: true,
  hasDetailMd: true,
  entryPoints: [],
  documentEvidence: {
    intentPath: '/project/INTENT.md',
    detailPath: '/project/DETAIL.md',
    intentLines: 10,
    status: 'valid',
    findings: [],
  },
  peerFiles: [],
  hasIndex: false,
  hasMain: false,
  depth: 0,
  metadata: {},
};

const FEATURE_NODE: FractalNode = {
  path: FEATURE_ROOT,
  name: 'feature',
  type: NODE_TYPES.FRACTAL,
  parent: PROJECT_ROOT,
  parentFractalPath: PROJECT_ROOT,
  children: [],
  childFractalPaths: [],
  organs: [],
  organPaths: [],
  hasIntentMd: true,
  hasDetailMd: true,
  entryPoints: [],
  documentEvidence: {
    intentPath: '/project/feature/INTENT.md',
    detailPath: '/project/feature/DETAIL.md',
    intentLines: 12,
    status: 'valid',
    findings: [],
  },
  peerFiles: ['source.unit', 'consumer.unit'],
  hasIndex: false,
  hasMain: false,
  depth: 1,
  metadata: {},
};

const SNAPSHOT: ProjectSnapshot = {
  schemaVersion: 1,
  projectRoot: PROJECT_ROOT,
  outputLanguage: 'Korean',
  snapshotHash: 'snapshot-hash',
  tree: {
    root: PROJECT_ROOT,
    nodes: new Map([
      [PROJECT_ROOT, ROOT_NODE],
      [FEATURE_ROOT, FEATURE_NODE],
    ]),
    depth: 1,
    totalNodes: 2,
  },
  dependencyGraph: {
    nodePaths: [PROJECT_ROOT, FEATURE_ROOT],
    edges: [],
    cycles: [],
    certainty: ANALYSIS_CERTAINTIES.EXACT,
  },
  adapterIds: ['fixture-adapter'],
  verification: {
    files: [
      {
        path: VERIFICATION_PATH,
        adapterId: 'fixture-adapter',
        role: VERIFICATION_ROLES.SPEC_DOCUMENT,
        count: {
          certainty: ANALYSIS_CERTAINTIES.EXACT,
          exactCount: 3,
          knownLowerBound: 3,
          reasons: [],
        },
        ownerFractalPath: FEATURE_ROOT,
        contractGroupIds: ['AC-contract'],
      },
    ],
    violations: [],
    certainty: ANALYSIS_CERTAINTIES.EXACT,
  },
  legacyCriteriaLedger: null,
  diagnostics: [],
  collectedAxes: ALL_SNAPSHOT_AXES,
  createdAt: '2026-07-27T00:00:00.000Z',
};

const TOOL_CONTEXT: ToolSnapshotContext = {
  snapshot: SNAPSHOT,
  rules: [],
  maxDepth: 10,
  diagnostics: [],
};

const VALID_RESTRUCTURE_PLAN: RestructurePlan = {
  schemaVersion: RESTRUCTURE_SCHEMA_VERSION,
  planId: 'filid-restructure-test',
  projectRoot: PROJECT_ROOT,
  snapshotHash: SNAPSHOT.snapshotHash,
  createdAt: '2026-07-27T00:00:00.000Z',
  moves: [],
  alreadyPlaced: [],
  unresolved: [],
  summary: {
    moveCount: 0,
    fractalsCreated: 0,
    organsCreated: 0,
    alreadyPlacedCount: 0,
    decisionsRequired: 0,
  },
};

const PERSISTED_PLAN_PAYLOAD: ToolPayload<
  RestructurePlanSummary,
  RestructurePlan
> = {
  projectRoot: PROJECT_ROOT,
  status: TOOL_STATUSES.OK,
  summary: {
    projectRoot: PROJECT_ROOT,
    planId: VALID_RESTRUCTURE_PLAN.planId,
    snapshotHash: VALID_RESTRUCTURE_PLAN.snapshotHash,
    ...VALID_RESTRUCTURE_PLAN.summary,
  },
  data: VALID_RESTRUCTURE_PLAN,
  diagnostics: [],
  persistence: TOOL_PERSISTENCE.ALWAYS,
};

vi.mock('../../../mcp/tools/utils/createToolSnapshot.js', () => ({
  createToolSnapshot: vi.fn(),
}));

const mockedCreateToolSnapshot = vi.mocked(createToolSnapshot);
mockedCreateToolSnapshot.mockResolvedValue(TOOL_CONTEXT);

describe('Filid 1.0 snapshot-backed MCP tools', () => {
  it('returns a bounded fractal summary by default', async () => {
    const result = await handleFractalScan({ path: PROJECT_ROOT });

    expect(result.summary).toMatchObject({
      projectRoot: PROJECT_ROOT,
      snapshotHash: SNAPSHOT.snapshotHash,
      totalNodes: 2,
    });
    expect(result.data).toBeUndefined();
  });

  it('projects flat path evidence without exposing the snapshot Map', async () => {
    const result = await handleFractalScan({
      path: PROJECT_ROOT,
      detail: FRACTAL_SCAN_DETAILS.PATHS,
    });

    expect(result.data).toEqual({
      nodes: [
        expect.objectContaining({ path: PROJECT_ROOT }),
        expect.objectContaining({ path: FEATURE_ROOT }),
      ],
    });
  });

  it('narrows scan diagnostics to the nodes a name filter kept', async () => {
    mockedCreateToolSnapshot.mockResolvedValueOnce({
      ...TOOL_CONTEXT,
      diagnostics: [
        { code: 'in-feature', message: 'inside', path: SOURCE_PATH },
        {
          code: 'outside-feature',
          message: 'elsewhere in the project',
          path: `${PROJECT_ROOT}/other.unit`,
        },
      ],
    });

    const result = await handleFractalScan({
      path: PROJECT_ROOT,
      detail: FRACTAL_SCAN_DETAILS.PATHS,
      nameFilter: 'feature',
    });

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'in-feature',
    ]);
    expect(result.summary.diagnosticsOutOfScope).toBe(1);
  });

  it('resolves only the owner-to-root context chain', async () => {
    const result = await handleContextResolve({
      path: PROJECT_ROOT,
      targetPath: SOURCE_PATH,
    });
    const data = requireData(result.data);

    expect(result.summary.ownerFractalPath).toBe(FEATURE_ROOT);
    expect(data.chain.map((document) => document.fractalPath)).toEqual([
      FEATURE_ROOT,
      PROJECT_ROOT,
    ]);
    expect(result.data).not.toHaveProperty('tree');
  });

  it('returns a read-only restructure payload marked for persistence', async () => {
    const result = await handleRestructurePlan({
      path: PROJECT_ROOT,
      requests: [
        {
          sourcePath: SOURCE_PATH,
          consumerPaths: [CONSUMER_PATH],
          contractIntent: CONTRACT_INTENTS.INTERNAL,
          organNameHint: 'services',
        },
      ],
    });
    const data = requireData(result.data);

    expect(result.persistence).toBe(TOOL_PERSISTENCE.ALWAYS);
    expect(data.projectRoot).toBe(PROJECT_ROOT);
    expect(data.moves[0]?.targetNodeType).toBe(RESTRUCTURE_NODE_TYPES.ORGAN);
  });

  it('keeps per-file verification data out of summary detail', async () => {
    const result = await handleVerificationScan({ path: PROJECT_ROOT });

    expect(result.summary).toMatchObject(EXPECTED_VERIFICATION_SUMMARY);
    expect(result.data).toBeUndefined();
  });

  it('filters verification files with portable path identity', async () => {
    const result = await handleVerificationScan({
      path: PROJECT_ROOT,
      filePaths: [VERIFICATION_PATH],
      detail: VERIFICATION_SCAN_DETAILS.FILES,
    });

    expect(result.data?.files.map((file) => file.path)).toEqual([
      VERIFICATION_PATH,
    ]);
  });

  it('reports requested files absent from snapshot evidence', async () => {
    const result = await handleVerificationScan({
      path: PROJECT_ROOT,
      filePaths: [UNKNOWN_PATH],
      detail: VERIFICATION_SCAN_DETAILS.FILES,
    });

    expect(result.status).toBe(ANALYSIS_CERTAINTIES.INDETERMINATE);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: SNAPSHOT_TOOL_DIAGNOSTIC_CODES.VERIFICATION_PATH_NOT_FOUND,
        path: UNKNOWN_PATH,
      }),
    );
  });

  it('validates project mode against the same snapshot', async () => {
    const result = await handleStructureValidate({
      path: PROJECT_ROOT,
      mode: STRUCTURE_VALIDATION_MODES.PROJECT,
    });

    expect(result.summary).toMatchObject({
      mode: STRUCTURE_VALIDATION_MODES.PROJECT,
      snapshotHash: SNAPSHOT.snapshotHash,
      findingCount: 0,
    });
    expect(result.data).toHaveProperty('result');
  });

  it('requires a plan artifact path in plan validation modes', async () => {
    await expect(
      handleStructureValidate({
        path: PROJECT_ROOT,
        mode: STRUCTURE_VALIDATION_MODES.PLAN_PRECONDITION,
      }),
    ).rejects.toThrow(STRUCTURE_PLAN_PATH_REQUIRED_MESSAGE);
  });

  it('reads an external plan artifact without changing it', async () => {
    const planDirectory = portableJoin(
      tmpdir(),
      `filid-plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    const planPath = portableJoin(planDirectory, PLAN_FILE_NAME);
    const planSource = JSON.stringify(VALID_RESTRUCTURE_PLAN);
    mkdirSync(planDirectory, { recursive: true });
    writeFileSync(planPath, planSource, 'utf8');
    try {
      const result = await handleStructureValidate({
        path: PROJECT_ROOT,
        mode: STRUCTURE_VALIDATION_MODES.PLAN_PRECONDITION,
        planPath,
      });

      expect(result.data).toEqual({ valid: true, findings: [] });
      expect(readUtf8FileIfExistsSync(planPath)).toBe(planSource);
    } finally {
      rmSync(planDirectory, { recursive: true, force: true });
    }
  });

  it('reads a restructure plan from a persisted full tool payload', async () => {
    const planDirectory = portableJoin(
      tmpdir(),
      `filid-payload-plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    const planPath = portableJoin(planDirectory, PLAN_FILE_NAME);
    const planSource = JSON.stringify(PERSISTED_PLAN_PAYLOAD);
    mkdirSync(planDirectory, { recursive: true });
    writeFileSync(planPath, planSource, 'utf8');
    try {
      const result = await handleStructureValidate({
        path: PROJECT_ROOT,
        mode: STRUCTURE_VALIDATION_MODES.PLAN_PRECONDITION,
        planPath,
      });

      expect(result.data).toEqual({ valid: true, findings: [] });
      expect(readUtf8FileIfExistsSync(planPath)).toBe(planSource);
    } finally {
      rmSync(planDirectory, { recursive: true, force: true });
    }
  });
});
