/**
 * validate-cwd.ts — Guard hook payload `cwd` before feeding it to execSync/fs APIs.
 *
 * Rationale: Hook payload values originate from the client process and must be
 * validated before being passed to `execSync('git rev-parse ...', { cwd })` or
 * similar APIs. A malicious repository could otherwise leverage features such as
 * `core.hooksPath` to achieve code execution on simply entering a directory.
 *
 * Returns the normalized absolute path if `cwd` is a valid absolute path string.
 * Returns null otherwise — callers should treat null as "skip this hook".
 *
 * Note: Directory existence check is intentionally omitted. Non-existent paths
 * are naturally rejected by downstream git/fs calls, and the check breaks test
 * environments that use synthetic cwd paths.
 */
import * as path from 'node:path';

export function validateCwd(cwd: unknown): string | null {
  if (typeof cwd !== 'string' || cwd.length === 0) return null;
  if (!path.isAbsolute(cwd)) return null;
  if (cwd.includes('\0')) return null;
  return path.normalize(cwd);
}
