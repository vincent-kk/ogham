import { execSync } from 'node:child_process';

import { createLogger } from '../../../../lib/logger.js';

const log = createLogger('config-loader');

/** git root cache: dirPath → resolved root */
const gitRootCache = new Map<string, string>();

/**
 * Resolve the git repository root for a given directory path.
 * Returns the path itself if git root cannot be determined.
 * Results are cached per dirPath to avoid repeated execSync calls.
 */
export function resolveGitRoot(dirPath: string): string {
  const cached = gitRootCache.get(dirPath);
  if (cached !== undefined) return cached;
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd: dirPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    gitRootCache.set(dirPath, gitRoot);
    return gitRoot;
  } catch {
    log.debug('git root not found, using provided path', dirPath);
    gitRootCache.set(dirPath, dirPath);
    return dirPath;
  }
}
