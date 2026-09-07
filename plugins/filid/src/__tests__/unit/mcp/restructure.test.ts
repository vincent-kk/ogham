import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import {
  RESTRUCTURE_ACTIONS,
  STRUCTURE_VALIDATION_MODES,
  STRUCTURE_VALIDATION_SCOPE_VALUES,
} from '../../../constants/mcpContracts.js';
import { McpToolName } from '../../../constants/mcpToolNames.js';
import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import {
  TOOL_PERSISTENCE,
  TOOL_STATUSES,
} from '../../../constants/toolEnvelope.js';
import { materializeToolEnvelope } from '../../../core/infra/artifactStore/index.js';
import {
  type RestructureResult,
  handleRestructure,
} from '../../../mcp/tools/restructure/index.js';
import type { ToolSnapshotContext } from '../../../mcp/tools/utils/createToolSnapshot.js';
import { createToolSnapshot } from '../../../mcp/tools/utils/createToolSnapshot.js';
import type { FractalNode, ProjectSnapshot } from '../../../types/fractal.js';
import type {
  RestructurePlanData,
  RestructurePlanSummary,
} from '../../../types/report.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';

const PROJECT_ROOT = '/project';
const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

const ROOT_NODE: FractalNode = {
  path: PROJECT_ROOT,
  name: 'project',
  type: NODE_TYPES.FRACTAL,
  parent: null,
  parentFractalPath: null,
  children: [],
  childFractalPaths: [],
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

const SNAPSHOT: ProjectSnapshot = {
  schemaVersion: 1,
  projectRoot: PROJECT_ROOT,
  outputLanguage: 'Korean',
  snapshotHash: 'restructure-dispatch-snapshot',
  tree: {
    root: PROJECT_ROOT,
    nodes: new Map([[PROJECT_ROOT, ROOT_NODE]]),
    depth: 0,
    totalNodes: 1,
  },
  dependencyGraph: {
    nodePaths: [PROJECT_ROOT],
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
  createdAt: '2026-09-05T00:00:00.000Z',
};

const TOOL_CONTEXT: ToolSnapshotContext = {
  snapshot: SNAPSHOT,
  rules: [],
  maxDepth: 10,
  diagnostics: [],
};

vi.mock('../../../mcp/tools/utils/createToolSnapshot.js', () => ({
  createToolSnapshot: vi.fn(),
}));

const mockedCreateToolSnapshot = vi.mocked(createToolSnapshot);
let stateRoot: string;

function isPlanPayload(
  payload: RestructureResult,
): payload is ToolPayload<RestructurePlanSummary, RestructurePlanData> {
  return 'planId' in payload.summary;
}

beforeEach(() => {
  stateRoot = mkdtempSync(portableJoin(tmpdir(), 'filid-restructure-test-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  mockedCreateToolSnapshot.mockResolvedValue(TOOL_CONTEXT);
});

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  rmSync(stateRoot, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('restructure action dispatcher', () => {
  it('persists a plan and validates both lifecycle boundaries', async () => {
    const plan = await handleRestructure({
      action: RESTRUCTURE_ACTIONS.PLAN,
      path: PROJECT_ROOT,
      requests: [],
    });
    expect(plan.status).toBe(TOOL_STATUSES.OK);
    expect(plan.persistence).toBe(TOOL_PERSISTENCE.ALWAYS);
    if (!isPlanPayload(plan)) throw new Error('expected plan payload');

    const envelope = materializeToolEnvelope(McpToolName.RESTRUCTURE, plan);
    const planPath = envelope.artifact?.path;
    if (!planPath) throw new Error('expected persisted restructure plan');

    const precondition = await handleRestructure({
      action: RESTRUCTURE_ACTIONS.PRECONDITION,
      path: PROJECT_ROOT,
      planPath,
    });
    const postcondition = await handleRestructure({
      action: RESTRUCTURE_ACTIONS.POSTCONDITION,
      path: PROJECT_ROOT,
      planPath,
    });

    expect(precondition.status).toBe(TOOL_STATUSES.OK);
    expect(precondition.summary).toMatchObject({
      mode: STRUCTURE_VALIDATION_MODES.PLAN_PRECONDITION,
      scopes: STRUCTURE_VALIDATION_SCOPE_VALUES,
    });
    expect(precondition.data).toEqual({ valid: true, findings: [] });
    expect(postcondition.status).toBe(TOOL_STATUSES.OK);
    expect(postcondition.summary).toMatchObject({
      mode: STRUCTURE_VALIDATION_MODES.PLAN_POSTCONDITION,
      scopes: STRUCTURE_VALIDATION_SCOPE_VALUES,
    });
    expect(postcondition.data).toEqual({ valid: true, findings: [] });
  });
});
