import { homedir } from 'node:os';
import { join } from 'node:path';

/** Root data directory for the atlassian plugin */
export const PLUGIN_DATA_DIR = join(homedir(), '.claude', 'plugins', 'atlassian');

/** Config file path */
export const CONFIG_PATH = join(PLUGIN_DATA_DIR, 'config.json');

/** Credentials file path (plain JSON) */
export const CREDENTIALS_PATH = join(PLUGIN_DATA_DIR, 'credentials.json');

/** Runtime state file path */
export const STATE_PATH = join(PLUGIN_DATA_DIR, 'state.json');
