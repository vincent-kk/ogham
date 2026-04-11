import { join } from 'node:path';

import type { ScanOptions } from '../../../../types/scan.js';
import { shouldExclude } from './should-exclude.js';

/**
 * Discover all directories under rootPath, filtered by ScanOptions.
 * Returns absolute paths including the root itself.
 */
export async function discoverDirectories(
  rootPath: string,
  opts: Required<ScanOptions>,
): Promise<string[]> {
  const { glob } = await import('fast-glob');
  const dirPaths: string[] = await glob('**/', {
    cwd: rootPath,
    deep: opts.maxDepth,
    ignore: opts.exclude,
    followSymbolicLinks: opts.followSymlinks,
    onlyDirectories: true,
    dot: false,
  });

  const allDirs: string[] = [rootPath];
  for (const rel of dirPaths) {
    const clean = rel.replace(/\/$/, '');
    const absPath = join(rootPath, clean);
    if (!shouldExclude(clean, opts)) {
      allDirs.push(absPath);
    }
  }
  return allDirs;
}
