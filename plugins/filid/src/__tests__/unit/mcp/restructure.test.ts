import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import {
  RESTRUCTURE_ACTIONS,
  RESTRUCTURE_PLAN_ERROR_CODES,
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
import { ToolDiagnosticError } from '../../../mcp/errors/toolDiagnosticError.js';
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
import type { RestructurePlanInput } from '../../../types/restructure.js';
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
    unknownFiles: [],
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

const SOURCE = '/project/a.ts';

/** Persist a plan for `requests` and return its artifact path. */
async function persistPlan(input: RestructurePlanInput): Promise<{
  plan: ToolPayload<RestructurePlanSummary, RestructurePlanData>;
  planPath: string;
}> {
  const plan = await handleRestructure({
    action: RESTRUCTURE_ACTIONS.PLAN,
    ...input,
  });
  if (!isPlanPayload(plan)) throw new Error('expected plan payload');
  const planPath = materializeToolEnvelope(McpToolName.RESTRUCTURE, plan)
    .artifact?.path;
  if (!planPath) throw new Error('expected persisted restructure plan');
  return { plan, planPath };
}

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
    expect(precondition.data).toEqual({
      valid: true,
      findings: [],
      preexisting: [],
      unknownFiles: { relevant: [], other: [] },
    });
    expect(postcondition.status).toBe(TOOL_STATUSES.OK);
    expect(postcondition.summary).toMatchObject({
      mode: STRUCTURE_VALIDATION_MODES.PLAN_POSTCONDITION,
      scopes: STRUCTURE_VALIDATION_SCOPE_VALUES,
    });
    expect(postcondition.data).toEqual({
      valid: true,
      findings: [],
      preexisting: [],
      unknownFiles: { relevant: [], other: [] },
    });
    expect(plan.summary.nextAction).toContain('Nothing to move');
    expect(precondition.summary.nextAction).toContain(
      'Present the plan for approval',
    );
    expect(postcondition.summary.nextAction).toContain('Restructure verified');
  });

  it('sends an executable plan to precondition and a failed landing back to its findings', async () => {
    const { plan, planPath } = await persistPlan({
      path: PROJECT_ROOT,
      requests: [
        {
          sourcePath: SOURCE,
          consumerPaths: ['/project/b.ts'],
          contractIntent: 'internal',
          organNameHint: 'ops',
        },
      ],
    });
    const postcondition = await handleRestructure({
      action: RESTRUCTURE_ACTIONS.POSTCONDITION,
      path: PROJECT_ROOT,
      planPath,
    });

    expect(plan.status).toBe(TOOL_STATUSES.OK);
    expect(plan.summary.nextAction).toContain(
      'Call restructure precondition with this plan',
    );
    expect(postcondition.status).toBe(TOOL_STATUSES.VIOLATIONS);
    expect(postcondition.summary.nextAction).toContain(
      "Restructure not verified: follow each finding's nextAction",
    );
  });

  it('tells the caller to settle the decisions of an unresolved plan', async () => {
    const plan = await handleRestructure({
      action: RESTRUCTURE_ACTIONS.PLAN,
      path: PROJECT_ROOT,
      requests: [{ sourcePath: SOURCE, consumerPaths: ['/project/b.ts'] }],
    });

    expect(plan.status).toBe(TOOL_STATUSES.INDETERMINATE);
    expect(plan.summary.nextAction).toContain(
      'settle each unresolved entry by its decisions[].nextAction',
    );
  });

  it('reports a plan on an unsupported dependency graph as unsupported despite diagnostics', async () => {
    mockedCreateToolSnapshot.mockResolvedValue({
      ...TOOL_CONTEXT,
      snapshot: {
        ...SNAPSHOT,
        dependencyGraph: {
          ...SNAPSHOT.dependencyGraph,
          certainty: ANALYSIS_CERTAINTIES.UNSUPPORTED,
        },
      },
      diagnostics: [
        {
          code: 'dependency-adapter-unavailable',
          message: 'fixture',
          affects: ['dependencies', 'boundaries'],
          nextAction: 'fixture',
        },
      ],
    });
    const plan = await handleRestructure({
      action: RESTRUCTURE_ACTIONS.PLAN,
      path: PROJECT_ROOT,
      requests: [],
    });

    expect(plan.status).toBe(TOOL_STATUSES.UNSUPPORTED);
    expect(plan.summary.nextAction).toContain(
      'report the requests as unsupported',
    );
  });

  it('rejects a relative plan path with its code and next action', async () => {
    await expect(
      handleRestructure({
        action: RESTRUCTURE_ACTIONS.PRECONDITION,
        path: PROJECT_ROOT,
        planPath: 'plan.json',
      }),
    ).rejects.toMatchObject({
      code: RESTRUCTURE_PLAN_ERROR_CODES.PLAN_PATH_NOT_ABSOLUTE,
      nextAction: expect.stringContaining('absolute artifact path'),
    });
  });

  it('rejects a plan path with no artifact behind it', async () => {
    const planPath = portableJoin(stateRoot, 'missing.json');

    await expect(
      handleRestructure({
        action: RESTRUCTURE_ACTIONS.PRECONDITION,
        path: PROJECT_ROOT,
        planPath,
      }),
    ).rejects.toMatchObject({
      code: RESTRUCTURE_PLAN_ERROR_CODES.PLAN_ARTIFACT_NOT_FOUND,
      message: `No plan artifact exists at ${planPath}.`,
      nextAction: expect.stringContaining(
        'if that artifact is gone, create a new plan',
      ),
    });
  });

  it('rejects a plan artifact of an older schema as invalid', async () => {
    const planPath = portableJoin(stateRoot, 'old-plan.json');
    writeFileSync(planPath, JSON.stringify({ schemaVersion: 1 }));
    const rejection = handleRestructure({
      action: RESTRUCTURE_ACTIONS.POSTCONDITION,
      path: PROJECT_ROOT,
      planPath,
    });

    await expect(rejection).rejects.toBeInstanceOf(ToolDiagnosticError);
    await expect(rejection).rejects.toMatchObject({
      code: RESTRUCTURE_PLAN_ERROR_CODES.PLAN_ARTIFACT_INVALID,
      nextAction: expect.stringContaining('Create a new plan'),
    });
  });
});
