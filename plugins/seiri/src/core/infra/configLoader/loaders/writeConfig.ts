import { writeConfigLayer } from '@ogham/cross-platform/config-scope';

import type {
  SeiriConfig,
  SeiriConfigScope,
} from '../../../../types/config.js';
import { ensureSeiriDir } from '../../../utils/ensureSeiriDir.js';
import { configLayers } from '../utils/configLayers.js';

/**
 * Persist the dial to one layer and return the path written.
 *
 * The project layer routes through `ensureSeiriDir` first, so the ignore
 * file that keeps `runtime.json` and the session signals out of commits
 * exists from the first write to `.seiri/` — setup time — rather than
 * waiting for a session to turn the runtime valve. The user layer needs no
 * such file: it lives under the host state root, outside any repository.
 *
 * Called only from the settings-page save handler; nothing on a session
 * path writes config.
 */
export function writeConfig(
  projectRoot: string,
  scope: SeiriConfigScope,
  config: SeiriConfig,
): string {
  if (scope === 'project') ensureSeiriDir(projectRoot);
  return writeConfigLayer(
    configLayers(projectRoot),
    scope,
    config as unknown as Record<string, unknown>,
  );
}
