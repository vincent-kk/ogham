import { basename } from 'node:path';

/**
 * Get the basename of a file without extension.
 * Useful for test file matching.
 */
export function getModuleName(filePath: string): string {
  const base = basename(filePath);
  return base.replace(/\.[^.]+$/, '');
}
