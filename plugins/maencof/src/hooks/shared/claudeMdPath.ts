import { join } from 'node:path';

/**
 * Return the CLAUDE.md path for the given CWD.
 */
export function claudeMdPath(cwd: string): string {
  return join(cwd, 'CLAUDE.md');
}
