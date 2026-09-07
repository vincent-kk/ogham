import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../../constants/analysisCertainties.js';
import { ALL_SNAPSHOT_AXES } from '../../../../constants/snapshotAxes.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { deriveEvidenceStatuses } from '../../../../mcp/tools/reviewState/scope/deriveEvidenceStatuses.js';
import type { ProjectSnapshot } from '../../../../types/fractal.js';

const PROJECT_ROOT = '/project';
const SNAPSHOT: ProjectSnapshot = {
  schemaVersion: 1,
  projectRoot: PROJECT_ROOT,
  outputLanguage: 'English',
  snapshotHash: 'snapshot-hash',
  tree: {
    root: PROJECT_ROOT,
    nodes: new Map(),
    depth: 0,
    totalNodes: 0,
  },
  dependencyGraph: {
    nodePaths: [],
    edges: [],
    cycles: [],
    certainty: ANALYSIS_CERTAINTIES.EXACT,
  },
  adapterIds: [],
  verification: {
    files: [],
    violations: [],
    certainty: ANALYSIS_CERTAINTIES.INDETERMINATE,
  },
  legacyCriteriaLedger: null,
  diagnostics: [],
  collectedAxes: ALL_SNAPSHOT_AXES,
  createdAt: '2026-09-04T00:00:00.000Z',
};

describe('deriveEvidenceStatuses', () => {
  it('uses scoped verification certainty for both evidence statuses', () => {
    expect(
      deriveEvidenceStatuses(SNAPSHOT, [], 0, 0, ANALYSIS_CERTAINTIES.EXACT),
    ).toEqual({
      structure: TOOL_STATUSES.OK,
      verification: TOOL_STATUSES.OK,
      evidenceComplete: true,
    });
  });
});
