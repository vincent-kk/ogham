import { MAX_TEST_CASES } from '../../constants/qualityThresholds.js';
import type {
  TestCaseCount,
  TestCaseGateResult,
} from '../../types/metrics.js';

/**
 * Test-case growth gate: flag every spec.ts whose total case count exceeds
 * MAX_TEST_CASES. Only spec files are evaluated — test.ts is exempt.
 */
export function checkTestCaseGate(files: TestCaseCount[]): TestCaseGateResult {
  const specFiles = files.filter((f) => f.fileType === 'spec');
  const violatingFiles = specFiles
    .filter((f) => f.total > MAX_TEST_CASES)
    .map((f) => f.filePath);

  return {
    violated: violatingFiles.length > 0,
    files: specFiles,
    violatingFiles,
  };
}
