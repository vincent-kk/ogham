import { countTestCases } from '../../../../metrics/testCounter/testCounter.js';
import { check312Rule } from '../../../../metrics/threePlusTwelve/threePlusTwelve.js';
import type {
  TestFileInput,
  ThreePlusTwelveViolation,
} from '../testMetrics.js';

export function handleCheck312(files: TestFileInput[]): {
  violations: ThreePlusTwelveViolation[];
} {
  const testCaseCounts = files.map((f) =>
    countTestCases({ filePath: f.filePath, content: f.content }),
  );

  const result = check312Rule(testCaseCounts);

  const violations: ThreePlusTwelveViolation[] = result.violatingFiles.map(
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
