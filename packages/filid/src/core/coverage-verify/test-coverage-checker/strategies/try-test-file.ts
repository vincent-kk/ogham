/**
 * @file try-test-file.ts
 * @description 후보 경로의 테스트 파일을 읽고 `countTestCases`로 유효성을 검증한다.
 */
import { existsSync, readFileSync } from 'node:fs';

import {
  type RawTestFile,
  countTestCases,
} from '../../../../metrics/test-counter/test-counter.js';

/**
 * Try to read and validate a test file at the given path.
 *
 * Returns the test count if the file exists, is readable, and contains
 * at least one test case. Otherwise returns null.
 *
 * All I/O errors are swallowed — failure is reported as "not found".
 */
export function tryTestFile(
  candidatePath: string,
): { testFilePath: string; testCount: number } | null {
  if (!existsSync(candidatePath)) return null;

  let content: string;
  try {
    content = readFileSync(candidatePath, 'utf-8');
  } catch {
    // File exists but is unreadable
    return null;
  }

  const raw: RawTestFile = { filePath: candidatePath, content };
  const result = countTestCases(raw);
  if (result.total === 0) return null;

  return { testFilePath: candidatePath, testCount: result.total };
}
