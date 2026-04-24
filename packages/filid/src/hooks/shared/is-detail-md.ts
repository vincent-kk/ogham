import { fileBasename } from './file-basename.js';

/**
 * Check if a file path targets DETAIL.md.
 * Handles both POSIX (/) and Windows (\) path separators.
 */
export function isDetailMd(filePath: string): boolean {
  return fileBasename(filePath) === 'DETAIL.md';
}
