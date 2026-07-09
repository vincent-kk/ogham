/**
 * @file dialogueConfigPath.ts
 * @description Resolve the `.maencof-meta/dialogue-config.json` path.
 */
import { join } from 'node:path';

import { DIALOGUE_CONFIG_FILE } from '../../../constants/dialogue.js';
import { MAENCOF_META_DIR } from '../../../constants/directories.js';

export function dialogueConfigPath(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, DIALOGUE_CONFIG_FILE);
}
