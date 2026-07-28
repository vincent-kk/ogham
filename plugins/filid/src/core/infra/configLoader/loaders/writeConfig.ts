import { writeConfigLayer } from '@ogham/cross-platform/config-scope';
import type { ConfigScope } from '@ogham/cross-platform/config-scope';

import { createLogger } from '../../../../lib/logger.js';
import { configLayers } from '../utils/configLayers.js';

import type { FilidConfig } from './configSchemas.js';

const log = createLogger('config-loader');

/**
 * Write one config layer and return the path written.
 *
 * The project layer keeps landing in `<gitRoot>/.filid/config.json`, where
 * it has always been. The user layer holds the same shape and supplies
 * defaults to every project that has not overridden them.
 */
export function writeConfig(
  projectRoot: string,
  scope: ConfigScope,
  config: FilidConfig,
): string {
  const written = writeConfigLayer(
    configLayers(projectRoot),
    scope,
    config as unknown as Record<string, unknown>,
  );
  log.debug('config written', written);
  return written;
}
