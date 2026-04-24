import {
  type RawTestFile,
  countTestCases,
} from '../../../../metrics/test-counter/test-counter.js';
import type { TestCountResult, TestFileInput } from '../test-metrics.js';

export function handleCount(files: TestFileInput[]): { counts: TestCountResult[] } {
  const counts: TestCountResult[] = files.map((f) => {
    const raw: RawTestFile = { filePath: f.filePath, content: f.content };
    const result = countTestCases(raw);
    return {
      filePath: f.filePath,
      total: result.total,
      basic: result.basic,
      complex: result.complex,
    };
  });
  return { counts };
}
