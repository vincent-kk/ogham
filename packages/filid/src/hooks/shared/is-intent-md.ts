import { fileBasename } from './file-basename.js';

/**
 * Check if a file path targets INTENT.md.
 * Handles both POSIX (/) and Windows (\) path separators.
 */
export function isIntentMd(filePath: string): boolean {
  return fileBasename(filePath) === 'INTENT.md';
}
