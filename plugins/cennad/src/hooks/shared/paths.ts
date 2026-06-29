import { join } from 'node:path';

import { pluginCache } from '@ogham/cross-platform/paths';

// Hook bundles cannot import core path constants without pulling in heavier
// dependencies; keep this mirror aligned with src/constants/paths.ts.
export const DEFAULT_CENNAD_HOME = pluginCache('cennad');
export const CENNAD_HOME =
  process.env.CENNAD_CONFIG_PATH?.trim() || DEFAULT_CENNAD_HOME;
export const CONFIG_PATH = join(CENNAD_HOME, 'config.json');
export const FALLBACK_CONFIG_PATH = join(DEFAULT_CENNAD_HOME, 'config.json');
export const COUNTER_PATH = join(CENNAD_HOME, 'runtime', 'counter.json');
