/**
 * @file findIntegrationTest.ts
 * @description Strategy 3: `src/__tests__/integration/` 아래의 이름 규칙 매칭 테스트 탐색.
 */
import { readdirSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform/paths';

import { moduleName } from './moduleName.js';
import { nearestSrcRoot } from './nearestSrcRoot.js';
import { tryTestFile } from './tryTestFile.js';

/**
 * Strategy 4: Integration test by naming convention.
 *
 * Globs `<nearest src>/__tests__/integration/` and matches files whose base
 * name equals the source module name or starts with `<name>-`. Anchored on
 * the source file's own `src` root (see nearestSrcRoot); `projectRoot` is
 * only the fallback anchor.
 */
export function findIntegrationTest(
  sourceFilePath: string,
  projectRoot: string,
): { testFilePath: string; testCount: number } | null {
  const name = moduleName(sourceFilePath);
  const srcRoot =
    nearestSrcRoot(sourceFilePath) ?? portableJoin(projectRoot, 'src');
  const integrationDir = portableJoin(srcRoot, '__tests__', 'integration');

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
      const candidatePath = portableJoin(integrationDir, entry);
      const found = tryTestFile(candidatePath);
      if (found) return found;
    }
  }

  return null;
}
