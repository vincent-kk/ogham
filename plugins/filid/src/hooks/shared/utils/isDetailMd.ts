import { portableBasename } from '@ogham/cross-platform';

import { DETAIL_MD } from '../../../constants/documentFiles.js';

/**
 * Check if a file path targets DETAIL.md.
 * Handles both POSIX (/) and Windows (\) path separators.
 */
export function isDetailMd(filePath: string): boolean {
  return portableBasename(filePath) === DETAIL_MD;
}
