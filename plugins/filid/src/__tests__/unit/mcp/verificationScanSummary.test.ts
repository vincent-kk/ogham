import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import { VERIFICATION_ROLES } from '../../../constants/mcpContracts.js';
import {
  SPEC_DOCUMENT_CASE_CAP,
  TEST_RECORD_CASE_CAP,
} from '../../../constants/verificationThresholds.js';
import { buildVerificationScanSummary } from '../../../mcp/tools/fractalInspect/verificationScan/utils/buildVerificationScanSummary.js';
import type { VerificationScanSummary } from '../../../types/report.js';
import type {
  VerificationFileAnalysis,
  VerificationViolation,
} from '../../../types/verification.js';

const PROJECT_ROOT = '/project';
const SNAPSHOT_HASH = 'snapshot-hash';
const SPEC_PATH_A = '/project/feature/contract-a.unit';
const SPEC_PATH_B = '/project/feature/contract-b.unit';
const TEST_RECORD_PATH = '/project/feature/regression.unit';
const ADAPTER_ID = 'fixture-adapter';
const OWNER_FRACTAL_PATH = '/project/feature';
const CONTRACT_GROUP_ID = 'AC-contract';
const VIOLATION_MESSAGE = 'verification policy violation';
const ERROR_SEVERITY = 'error';

const VERIFICATION_FILES: readonly VerificationFileAnalysis[] = [
  {
    path: SPEC_PATH_A,
    adapterId: ADAPTER_ID,
    role: VERIFICATION_ROLES.SPEC_DOCUMENT,
    count: {
      certainty: ANALYSIS_CERTAINTIES.EXACT,
      exactCount: 3,
      knownLowerBound: 3,
      reasons: [],
    },
    ownerFractalPath: OWNER_FRACTAL_PATH,
    contractGroupIds: [CONTRACT_GROUP_ID],
  },
  {
    path: SPEC_PATH_B,
    adapterId: ADAPTER_ID,
    role: VERIFICATION_ROLES.SPEC_DOCUMENT,
    count: {
      certainty: ANALYSIS_CERTAINTIES.INDETERMINATE,
      knownLowerBound: 7,
      reasons: [],
    },
    ownerFractalPath: OWNER_FRACTAL_PATH,
    contractGroupIds: [CONTRACT_GROUP_ID],
  },
  {
    path: TEST_RECORD_PATH,
    adapterId: ADAPTER_ID,
    role: VERIFICATION_ROLES.TEST_RECORD,
    count: {
      certainty: ANALYSIS_CERTAINTIES.EXACT,
      exactCount: 5,
      knownLowerBound: 5,
      reasons: [],
    },
    ownerFractalPath: OWNER_FRACTAL_PATH,
    contractGroupIds: [],
  },
];

const VERIFICATION_VIOLATIONS: readonly VerificationViolation[] = [
  {
    ruleId: BUILTIN_RULE_IDS.SPEC_FRAGMENTATION,
    path: SPEC_PATH_B,
    severity: ERROR_SEVERITY,
    message: VIOLATION_MESSAGE,
  },
  {
    ruleId: BUILTIN_RULE_IDS.SPEC_CONTRACT_LINK,
    path: SPEC_PATH_A,
    severity: ERROR_SEVERITY,
    message: VIOLATION_MESSAGE,
  },
];

const EXPECTED_SUMMARY = {
  projectRoot: PROJECT_ROOT,
  snapshotHash: SNAPSHOT_HASH,
  fileCount: 3,
  specDocument: {
    fileCount: 2,
    knownCaseCount: 10,
    caseCap: SPEC_DOCUMENT_CASE_CAP,
  },
  testRecord: {
    fileCount: 1,
    knownCaseCount: 5,
    caseCap: TEST_RECORD_CASE_CAP,
  },
  fragmentationCount: 1,
  violationCount: 2,
  certainty: ANALYSIS_CERTAINTIES.INDETERMINATE,
} as const satisfies VerificationScanSummary;

describe('verification scan summary', () => {
  it('separates role counts and reports stable caps and fragmentation', () => {
    const summary = buildVerificationScanSummary(
      PROJECT_ROOT,
      SNAPSHOT_HASH,
      VERIFICATION_FILES,
      VERIFICATION_VIOLATIONS,
      ANALYSIS_CERTAINTIES.INDETERMINATE,
    );

    expect(summary).toEqual(EXPECTED_SUMMARY);
  });
});
