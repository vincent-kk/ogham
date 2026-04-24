import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Check if the cwd is an FCA-AI project.
 * Treats presence of .filid/ directory or INTENT.md as indicator.
 */
export function isFcaProject(cwd: string): boolean {
  return existsSync(join(cwd, '.filid')) || existsSync(join(cwd, 'INTENT.md'));
}
