import { homedir } from 'node:os';
import { join } from 'node:path';

export const COGAIR_HOME = join(homedir(), '.claude', 'plugins', 'cogair');
export const CONFIG_PATH = join(COGAIR_HOME, 'config.json');
export const COUNTER_PATH = join(COGAIR_HOME, 'runtime', 'counter.json');
