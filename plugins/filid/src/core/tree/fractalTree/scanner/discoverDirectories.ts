import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import type { ScanOptions } from '../../../../types/scan.js';

import { shouldExclude } from './shouldExclude.js';

export async function discoverDirectories(
  rootPath: string,
  opts: Required<ScanOptions>,
): Promise<string[]> {
  const root = resolve(rootPath);
  const directories = [root];
  const visit = (directoryPath: string, depth: number): void => {
    if (depth >= opts.maxDepth) return;
    const entries = readdirSync(directoryPath, { withFileTypes: true }).sort(
      (left, right) => left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const path = join(directoryPath, entry.name);
      const isDirectory =
        entry.isDirectory() ||
        (opts.followSymlinks &&
          entry.isSymbolicLink() &&
          statSync(path).isDirectory());
      if (!isDirectory) continue;
      const relativePath = relative(root, path).split(sep).join('/');
      if (shouldExclude(relativePath, opts)) continue;
      directories.push(path);
      visit(path, depth + 1);
    }
  };
  visit(root, 0);
  return directories;
}
