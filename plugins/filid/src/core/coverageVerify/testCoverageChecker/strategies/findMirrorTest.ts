/**
 * @file findMirrorTest.ts
 * @description Strategy 2: `src/<layer>/<name>.ts` → `src/__tests__/unit/<layer>/<name>.test.ts` 미러 구조 탐색.
 */
import { portableJoin, portableRelative } from '@ogham/cross-platform/paths';

import { nearestSrcRoot } from './nearestSrcRoot.js';
import { tryTestFile } from './tryTestFile.js';

/**
 * Strategy 2: Mirror-structure test file.
 *
 * Anchored on the source file's own nearest `src` root — anchoring on
 * `projectRoot/src` never fires in a monorepo where sources live under
 * `plugins/<pkg>/src/**`. `projectRoot` remains only as the fallback anchor
 * for files not under any `src` directory.
 *
 * Algorithm:
 * 1. Resolve the nearest `src` root of the source file
 * 2. Mirror the src-relative path under `<src>/__tests__/unit/`
 * 3. Try `.test.ts`, `.spec.ts`, and the original extension variant
 */
export function findMirrorTest(
  sourceFilePath: string,
  projectRoot: string,
): { testFilePath: string; testCount: number } | null {
  const srcRoot =
    nearestSrcRoot(sourceFilePath) ?? portableJoin(projectRoot, 'src');

  const rel = portableRelative(srcRoot, sourceFilePath);
  if (rel.startsWith('..')) return null;

  const ext = sourceFilePath.match(/\.[^.]+$/)?.[0] ?? '.ts';
  const nameWithoutExt = rel.replace(/\.[^.]+$/, '');

  const candidates = [
    portableJoin(srcRoot, '__tests__', 'unit', `${nameWithoutExt}.test.ts`),
    portableJoin(srcRoot, '__tests__', 'unit', `${nameWithoutExt}.spec.ts`),
    portableJoin(srcRoot, '__tests__', 'unit', `${nameWithoutExt}.test${ext}`),
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
