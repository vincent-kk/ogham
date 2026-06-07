import { spawnCliSync } from '@ogham/cross-platform/spawn';

import { createLogger } from '../../../../lib/logger.js';

const log = createLogger('config-loader');

/** git root cache: dirPath → resolved root */
const gitRootCache = new Map<string, string>();

/**
 * Resolve the git repository root for a given directory path.
 * Returns the path itself if git root cannot be determined.
 * Results are cached per dirPath to avoid repeated spawnCliSync calls.
 */
export function resolveGitRoot(dirPath: string): string {
  const cached = gitRootCache.get(dirPath);
  if (cached !== undefined) return cached;
  const result = spawnCliSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: dirPath,
  });
  if (result.code === 0 && !result.spawnError) {
    const gitRoot = result.stdout.trim();
    gitRootCache.set(dirPath, gitRoot);
    return gitRoot;
  }
  log.debug('git root not found, using provided path', dirPath);
  gitRootCache.set(dirPath, dirPath);
  return dirPath;
}
