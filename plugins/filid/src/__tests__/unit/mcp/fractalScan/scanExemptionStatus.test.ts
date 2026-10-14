import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../../constants/analysisCertainties.js';
import { FRACTAL_SCAN_DETAILS } from '../../../../constants/mcpContracts.js';
import { ALL_SNAPSHOT_AXES } from '../../../../constants/snapshotAxes.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { buildScanResult } from '../../../../mcp/tools/fractalInspect/fractalScan/utils/buildScanResult.js';
import { countUnexemptedViolations } from '../../../../mcp/tools/fractalInspect/fractalScan/utils/countUnexemptedViolations.js';
import type { ProjectSnapshot } from '../../../../types/fractal.js';
import type { ValidationReport } from '../../../../types/report.js';
import type { RuleViolation } from '../../../../types/rules.js';

const PROJECT_ROOT = '/project';
const SNAPSHOT: ProjectSnapshot = {
  schemaVersion: 1,
  projectRoot: PROJECT_ROOT,
  outputLanguage: 'English',
  snapshotHash: 'snapshot-hash',
  tree: { root: PROJECT_ROOT, nodes: new Map(), depth: 0, totalNodes: 0 },
  dependencyGraph: {
    nodePaths: [],
    edges: [],
    cycles: [],
    unknownFiles: [],
    certainty: ANALYSIS_CERTAINTIES.EXACT,
  },
  adapterIds: [],
  verificationPaths: [],
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
  createdAt: '2026-10-14T00:00:00.000Z',
};

const EXEMPTED: RuleViolation = {
  ruleId: 'external-import-boundary',
  severity: 'info',
  message: 'external-import-boundary exempted by config (pattern src/**)',
  path: `${PROJECT_ROOT}/src`,
  suggestion: 'Remove the pattern from rules.<id>.exempt to run the check.',
  exemptedBy: 'src/**',
};
const REAL: RuleViolation = {
  ruleId: 'external-import-boundary',
  severity: 'error',
  message: 'crosses a boundary',
  path: `${PROJECT_ROOT}/src/a.ts`,
  suggestion: 'Import the entry point instead.',
};

const report = (violations: RuleViolation[]): ValidationReport => ({
  result: { violations, passed: 0, failed: 0, skipped: 0, duration: 0 },
  timestamp: '2026-10-14T00:00:00.000Z',
});

describe('fractal scan with config exemptions', () => {
  it('counts only findings without exemptedBy', () => {
    expect(countUnexemptedViolations([EXEMPTED, REAL, EXEMPTED])).toBe(1);
  });

  it('reports OK with a zero count when only exemption findings exist', () => {
    const payload = buildScanResult(
      SNAPSHOT,
      report([EXEMPTED]),
      FRACTAL_SCAN_DETAILS.SUMMARY,
      [],
    );
    expect(payload.status).toBe(TOOL_STATUSES.OK);
    expect(payload.summary.violationCount).toBe(0);
  });

  it('reports VIOLATIONS when a real finding accompanies an exemption', () => {
    const payload = buildScanResult(
      SNAPSHOT,
      report([EXEMPTED, REAL]),
      FRACTAL_SCAN_DETAILS.SUMMARY,
      [],
    );
    expect(payload.status).toBe(TOOL_STATUSES.VIOLATIONS);
    expect(payload.summary.violationCount).toBe(1);
  });
});
