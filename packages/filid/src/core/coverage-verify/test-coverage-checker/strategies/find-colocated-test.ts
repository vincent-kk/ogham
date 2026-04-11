/**
 * @file find-colocated-test.ts
 * @description Strategy 1: 소스 파일과 같은 디렉터리의 `<name>.{test,spec}.{ts,tsx}` 탐색.
 */
import { dirname, join } from 'node:path';

import { moduleName } from './module-name.js';
import { tryTestFile } from './try-test-file.js';

/**
 * Strategy 1: Co-located test file.
 * Looks for `<name>.test.ts`, `<name>.spec.ts`, or their `.tsx` variants
 * next to the source file.
 */
export function findColocatedTest(
  sourceFilePath: string,
): { testFilePath: string; testCount: number } | null {
  const dir = dirname(sourceFilePath);
  const name = moduleName(sourceFilePath);

  const candidates = [
    join(dir, `${name}.test.ts`),
    join(dir, `${name}.spec.ts`),
    join(dir, `${name}.test.tsx`),
    join(dir, `${name}.spec.tsx`),
  ];

  for (const candidate of candidates) {
    const found = tryTestFile(candidate);
    if (found) return found;
  }
  return null;
}
