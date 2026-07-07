import * as path from 'node:path';

/**
 * Parent directory segments of `filePath`, relative to `cwd`.
 *
 * Claude Code sends absolute tool paths; resolving against `cwd` first keeps
 * the cumulative `join(cwd, segment)` walks in the checkers pointed at real
 * directories (structure-based organ detection needs the filesystem).
 * Paths outside `cwd` return `[]` — ancestor segments above the project
 * (user home, scratch dirs) are not subject to structure checks.
 */
export function getParentSegments(filePath: string, cwd: string): string[] {
  const abs = path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.resolve(cwd, filePath);
  const rel = path.relative(cwd, abs).replace(/\\/g, '/');
  if (rel === '' || rel === '..' || rel.startsWith('../')) return [];
  const parts = rel.split('/').filter((p) => p.length > 0);
  return parts.slice(0, -1);
}
