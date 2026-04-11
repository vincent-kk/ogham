/**
 * @file find-integration-test.ts
 * @description Strategy 3: `src/__tests__/integration/` 아래의 이름 규칙 매칭 테스트 탐색.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { moduleName } from './module-name.js';
import { tryTestFile } from './try-test-file.js';

/**
 * Strategy 3: Integration test by naming convention.
 *
 * Globs `src/__tests__/integration/` and matches files whose base name
 * equals the source module name or starts with `<name>-`.
 */
export function findIntegrationTest(
  sourceFilePath: string,
  projectRoot: string,
): { testFilePath: string; testCount: number } | null {
  const name = moduleName(sourceFilePath);
  const integrationDir = join(projectRoot, 'src', '__tests__', 'integration');

  let entries: string[];
  try {
    entries = readdirSync(integrationDir);
  } catch {
    // Integration test directory doesn't exist
    return null;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) continue;

    const entryName = entry.replace(/\.(test|spec)\.ts$/, '');
    // Match: entry name equals, or starts with `<name>-`
    if (entryName === name || entryName.startsWith(`${name}-`)) {
      const candidatePath = join(integrationDir, entry);
      const found = tryTestFile(candidatePath);
      if (found) return found;
    }
  }

  return null;
}
