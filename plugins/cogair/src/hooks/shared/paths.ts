import { join } from 'node:path';

import { pluginCache } from '@ogham/cross-platform/paths';

export const COGAIR_HOME = pluginCache('cogair');
export const CONFIG_PATH = join(COGAIR_HOME, 'config.json');
export const COUNTER_PATH = join(COGAIR_HOME, 'runtime', 'counter.json');
