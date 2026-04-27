import { homedir } from 'node:os';
import { join } from 'node:path';

export function getPluginRoot(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
  return join(configDir, 'plugins', 'filid');
}
