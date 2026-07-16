import { INTENT_MD } from '../../constants/documentFiles.js';

import { fileBasename } from './fileBasename.js';

/**
 * Check if a file path targets INTENT.md.
 * Handles both POSIX (/) and Windows (\) path separators.
 */
export function isIntentMd(filePath: string): boolean {
  return fileBasename(filePath) === INTENT_MD;
}
