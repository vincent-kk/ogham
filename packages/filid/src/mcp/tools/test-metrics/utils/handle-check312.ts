import {
  type RawTestFile,
  countTestCases,
} from '../../../../metrics/test-counter/test-counter.js';
import { check312Rule } from '../../../../metrics/three-plus-twelve/three-plus-twelve.js';
import type { TestFileInput, ThreePlusTwelveViolation } from '../test-metrics.js';

export function handleCheck312(files: TestFileInput[]): { violations: ThreePlusTwelveViolation[] } {
  const testCaseCounts = files.map((f) => {
    const raw: RawTestFile = { filePath: f.filePath, content: f.content };
    const count = countTestCases(raw);
    return {
      filePath: f.filePath,
      fileType: f.filePath.includes('.spec.')
        ? ('spec' as const)
        : ('test' as const),
      total: count.total,
      basic: count.total,
      complex: 0,
    };
  });

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
