import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { LensConfigSchema, type LensConfig } from '../config-schema/config-schema.js';
import { CONFIG_DIR, CONFIG_FILE, CONFIG_VERSION, DEFAULT_LAYERS } from '../defaults/defaults.js';

/**
 * Load .maencof-lens/config.json from the given project root.
 * Returns null if not found or invalid.
 */
export function loadConfig(projectRoot: string): LensConfig | null {
  const configPath = join(projectRoot, CONFIG_DIR, CONFIG_FILE);
  if (!existsSync(configPath)) return null;

  try {
    const raw = readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    const result = LensConfigSchema.safeParse(parsed);
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Write config to .maencof-lens/config.json.
 * Creates .maencof-lens/ directory if needed.
 */
export function writeConfig(projectRoot: string, config: LensConfig): void {
  const configDir = join(projectRoot, CONFIG_DIR);
  mkdirSync(configDir, { recursive: true });
  const configPath = join(configDir, CONFIG_FILE);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

/**
 * Create a default config with a single vault entry.
 */
export function createDefaultConfig(
  vaultPath: string,
  vaultName: string,
): LensConfig {
  return {
    version: CONFIG_VERSION,
    vaults: [
      {
        name: vaultName,
        path: vaultPath,
        layers: [...DEFAULT_LAYERS],
        default: true,
      },
    ],
  };
}
