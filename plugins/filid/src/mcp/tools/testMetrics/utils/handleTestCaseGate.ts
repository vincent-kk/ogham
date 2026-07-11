import { countTestCases } from '../../../../metrics/testCounter/testCounter.js';
import { checkTestCaseGate } from '../../../../metrics/testCaseGate/testCaseGate.js';
import type {
  TestFileInput,
  TestCaseGateViolation,
} from '../testMetrics.js';

export function handleTestCaseGate(files: TestFileInput[]): {
  violations: TestCaseGateViolation[];
} {
  const testCaseCounts = files.map((f) =>
    countTestCases({ filePath: f.filePath, content: f.content }),
  );

  const result = checkTestCaseGate(testCaseCounts);

  const violations: TestCaseGateViolation[] = result.violatingFiles.map(
    (fp) => {
      const entry = testCaseCounts.find((c) => c.filePath === fp);
      return {
        filePath: fp,
        testCount: entry?.total ?? 0,
        threshold: 15,
      };
    },
  );

  return { violations };
}
