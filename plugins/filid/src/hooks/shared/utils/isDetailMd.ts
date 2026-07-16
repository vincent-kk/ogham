import { DETAIL_MD } from '../../../constants/documentFiles.js';

import { fileBasename } from './fileBasename.js';

/**
 * Check if a file path targets DETAIL.md.
 * Handles both POSIX (/) and Windows (\) path separators.
 */
export function isDetailMd(filePath: string): boolean {
  return fileBasename(filePath) === DETAIL_MD;
}
