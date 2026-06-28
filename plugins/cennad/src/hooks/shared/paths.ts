import { join } from 'node:path';

import { pluginCache } from '@ogham/cross-platform/paths';

export const LEGACY_CENNAD_HOME = pluginCache('cennad');
export const CENNAD_HOME =
  process.env.CLAUDE_PLUGIN_DATA?.trim() || LEGACY_CENNAD_HOME;
export const CONFIG_PATH = join(CENNAD_HOME, 'config.json');
export const LEGACY_CONFIG_PATH = join(LEGACY_CENNAD_HOME, 'config.json');
export const COUNTER_PATH = join(CENNAD_HOME, 'runtime', 'counter.json');
