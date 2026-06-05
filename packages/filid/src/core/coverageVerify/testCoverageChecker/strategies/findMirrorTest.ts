/**
 * @file findMirrorTest.ts
 * @description Strategy 2: `src/<layer>/<name>.ts` → `src/__tests__/unit/<layer>/<name>.test.ts` 미러 구조 탐색.
 */
import { portableJoin, portableRelative } from '@ogham/cross-platform/paths';

import { tryTestFile } from './tryTestFile.js';

/**
 * Strategy 2: Mirror-structure test file.
 *
 * Algorithm:
 * 1. Compute relative path from projectRoot
 * 2. Require `src/` prefix
 * 3. Strip `src/` and prepend `src/__tests__/unit/`
 * 4. Try `.test.ts`, `.spec.ts`, and the original extension variant
 */
export function findMirrorTest(
  sourceFilePath: string,
  projectRoot: string,
): { testFilePath: string; testCount: number } | null {
  const rel = portableRelative(projectRoot, sourceFilePath);

  // Must be under src/
  if (!rel.startsWith('src/')) return null;

  // Strip 'src/' and get directory + filename
  const withoutSrc = rel.slice(4);
  const ext = sourceFilePath.match(/\.[^.]+$/)?.[0] ?? '.ts';
  const nameWithoutExt = withoutSrc.replace(/\.[^.]+$/, '');

  const candidates = [
    portableJoin(
      projectRoot,
      'src',
      '__tests__',
      'unit',
      `${nameWithoutExt}.test.ts`,
    ),
    portableJoin(
      projectRoot,
      'src',
      '__tests__',
      'unit',
      `${nameWithoutExt}.spec.ts`,
    ),
    portableJoin(
      projectRoot,
      'src',
      '__tests__',
      'unit',
      `${nameWithoutExt}.test${ext}`,
    ),
  ];

  // Deduplicate (the third candidate may collide with the first when ext === '.ts')
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    const found = tryTestFile(candidate);
    if (found) return found;
  }
  return null;
}
