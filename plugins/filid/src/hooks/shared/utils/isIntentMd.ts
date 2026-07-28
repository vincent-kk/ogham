import { portableBasename } from '@ogham/cross-platform/compat/basename';

import { INTENT_MD } from '../../../constants/documentFiles.js';

/**
 * Check if a file path targets INTENT.md.
 * Handles both POSIX (/) and Windows (\) path separators.
 */
export function isIntentMd(filePath: string): boolean {
  return portableBasename(filePath) === INTENT_MD;
}
