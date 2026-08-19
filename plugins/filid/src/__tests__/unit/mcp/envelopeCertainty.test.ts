import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import { SNAPSHOT_TOOL_DIAGNOSTIC_CODES } from '../../../constants/mcpContracts.js';
import { ALL_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import { TOOL_STATUSES } from '../../../constants/toolEnvelope.js';
import { resolveFractalScanCertainty } from '../../../mcp/tools/fractalScan/utils/resolveFractalScanCertainty.js';
import { resolveFractalScanStatus } from '../../../mcp/tools/fractalScan/utils/resolveFractalScanStatus.js';
import { resolveProjectValidationStatus } from '../../../mcp/tools/structureValidate/utils/resolveProjectValidationStatus.js';
import { resolveVerificationScanStatus } from '../../../mcp/tools/verificationScan/utils/resolveVerificationScanStatus.js';
import type {
  AnalysisCertainty,
  ProjectSnapshot,
} from '../../../types/fractal.js';
import type { ValidationReport } from '../../../types/report.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

const PROJECT_ROOT = '/project';
const SNAPSHOT_HASH = 'snapshot-hash';
const CREATED_AT = '2026-08-20T00:00:00.000Z';
const DOCUMENT_PATH = '/project/INTENT.md';
const DOCUMENT_FINDING_MESSAGE = 'document contract violation';
const CONFIG_WARNING_MESSAGE = 'config could not be read exactly';

const DOCUMENT_FINDING_DIAGNOSTICS: ToolDiagnostic[] = [
  {
    code: BUILTIN_RULE_IDS.INTENT_DOCUMENT_CONTRACT,
    message: DOCUMENT_FINDING_MESSAGE,
    path: DOCUMENT_PATH,
  },
  {
    code: BUILTIN_RULE_IDS.DETAIL_DOCUMENT_CONTRACT,
    message: DOCUMENT_FINDING_MESSAGE,
    path: DOCUMENT_PATH,
  },
];

const CONFIG_WARNING_DIAGNOSTICS: ToolDiagnostic[] = [
  {
    code: SNAPSHOT_TOOL_DIAGNOSTIC_CODES.CONFIG_WARNING,
    message: CONFIG_WARNING_MESSAGE,
    path: PROJECT_ROOT,
  },
];

const EXACT_SNAPSHOT: ProjectSnapshot = {
  schemaVersion: 1,
  projectRoot: PROJECT_ROOT,
  outputLanguage: 'English',
  snapshotHash: SNAPSHOT_HASH,
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
    certainty: ANALYSIS_CERTAINTIES.EXACT,
  },
  legacyCriteriaLedger: null,
  diagnostics: [],
  collectedAxes: ALL_SNAPSHOT_AXES,
  createdAt: CREATED_AT,
};

const DOCUMENT_VIOLATION_REPORT: ValidationReport = {
  result: {
    violations: [
      {
        ruleId: BUILTIN_RULE_IDS.INTENT_DOCUMENT_CONTRACT,
        severity: 'error',
        message: DOCUMENT_FINDING_MESSAGE,
        path: DOCUMENT_PATH,
        certainty: ANALYSIS_CERTAINTIES.EXACT,
      },
    ],
    passed: 0,
    failed: 1,
    skipped: 0,
    duration: 0,
  },
  timestamp: CREATED_AT,
};

function snapshotWithCertainties(
  graphCertainty: AnalysisCertainty,
  verificationCertainty: AnalysisCertainty,
): ProjectSnapshot {
  return {
    ...EXACT_SNAPSHOT,
    dependencyGraph: {
      ...EXACT_SNAPSHOT.dependencyGraph,
      certainty: graphCertainty,
    },
    verification: {
      ...EXACT_SNAPSHOT.verification,
      certainty: verificationCertainty,
    },
  };
}

describe('envelope certainty', () => {
  it('keeps fractal scan exact when diagnostics only restate document findings', () => {
    expect(
      resolveFractalScanCertainty(
        EXACT_SNAPSHOT,
        DOCUMENT_FINDING_DIAGNOSTICS,
      ),
    ).toBe(ANALYSIS_CERTAINTIES.EXACT);
  });

  it('keeps config warnings indeterminate', () => {
    expect(
      resolveFractalScanCertainty(
        EXACT_SNAPSHOT,
        CONFIG_WARNING_DIAGNOSTICS,
      ),
    ).toBe(ANALYSIS_CERTAINTIES.INDETERMINATE);
  });

  it('preserves indeterminate graph certainty', () => {
    expect(
      resolveFractalScanCertainty(
        snapshotWithCertainties(
          ANALYSIS_CERTAINTIES.INDETERMINATE,
          ANALYSIS_CERTAINTIES.EXACT,
        ),
        [],
      ),
    ).toBe(ANALYSIS_CERTAINTIES.INDETERMINATE);
  });

  it('preserves unsupported certainty when both axes are unsupported', () => {
    expect(
      resolveFractalScanCertainty(
        snapshotWithCertainties(
          ANALYSIS_CERTAINTIES.UNSUPPORTED,
          ANALYSIS_CERTAINTIES.UNSUPPORTED,
        ),
        [],
      ),
    ).toBe(ANALYSIS_CERTAINTIES.UNSUPPORTED);
  });

  it('maps exact fractal scan findings to violations', () => {
    expect(resolveFractalScanStatus(ANALYSIS_CERTAINTIES.EXACT, 3)).toBe(
      TOOL_STATUSES.VIOLATIONS,
    );
  });

  it('maps verification findings to violations', () => {
    expect(
      resolveVerificationScanStatus(
        ANALYSIS_CERTAINTIES.EXACT,
        DOCUMENT_FINDING_DIAGNOSTICS.length,
        DOCUMENT_FINDING_DIAGNOSTICS,
      ),
    ).toBe(TOOL_STATUSES.VIOLATIONS);
  });

  it('maps project validation findings to violations', () => {
    expect(
      resolveProjectValidationStatus(
        DOCUMENT_VIOLATION_REPORT,
        DOCUMENT_FINDING_DIAGNOSTICS,
      ),
    ).toBe(TOOL_STATUSES.VIOLATIONS);
  });
});
