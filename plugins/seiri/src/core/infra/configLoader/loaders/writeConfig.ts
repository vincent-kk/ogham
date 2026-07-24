import { portableJoin } from '@ogham/cross-platform/compat';

import { CONFIG_FILE } from '../../../../constants/files.js';
import type { SeiriConfig } from '../../../../types/config.js';
import { ensureSeiriDir } from '../../../utils/ensureSeiriDir.js';
import { writeAtomically } from '../../../utils/writeAtomically.js';

/**
 * Persist the dial to `<repoRoot>/.seiri/config.json` and return the path
 * written. Routes through `ensureSeiriDir`, so the ignore file that keeps
 * `runtime.json` and the session signals out of commits exists from the
 * first write to `.seiri/` — setup time — rather than waiting for a
 * session to turn the runtime valve. Called only from the settings-page
 * save handler; nothing on a session path writes config.
 */
export function writeConfig(projectRoot: string, config: SeiriConfig): string {
  const path = portableJoin(ensureSeiriDir(projectRoot), CONFIG_FILE);
  writeAtomically(path, `${JSON.stringify(config, null, 2)}\n`);
  return path;
}
