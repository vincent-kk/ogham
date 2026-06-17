import { join } from 'node:path';

import { pluginCache } from '@ogham/cross-platform/paths';

export const CENNAD_HOME = pluginCache('cennad');
export const CONFIG_PATH = join(CENNAD_HOME, 'config.json');
export const COUNTER_PATH = join(CENNAD_HOME, 'runtime', 'counter.json');
