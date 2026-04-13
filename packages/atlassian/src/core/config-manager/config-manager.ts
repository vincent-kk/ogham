import { AtlassianConfigSchema } from '../../types/index.js';
import type { AtlassianConfig } from '../../types/index.js';
import { CONFIG_PATH } from '../../constants/index.js';
import { readJson, writeJson } from '../../lib/file-io.js';

const DEFAULT_CONFIG: AtlassianConfig = {};

/** Load config from disk, merging with defaults. Returns defaults if file missing. */
export async function loadConfig(path: string = CONFIG_PATH): Promise<AtlassianConfig> {
  try {
    const raw = await readJson<unknown>(path);
    return AtlassianConfigSchema.parse(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...DEFAULT_CONFIG };
    }
    throw error;
  }
}

/** Save config to disk */
export async function saveConfig(
  config: AtlassianConfig,
  path: string = CONFIG_PATH,
): Promise<void> {
  const validated = AtlassianConfigSchema.parse(config);
  await writeJson(path, validated);
}

/** Merge partial updates into existing config */
export function mergeConfig(
  existing: AtlassianConfig,
  updates: Partial<AtlassianConfig>,
): AtlassianConfig {
  return AtlassianConfigSchema.parse({ ...existing, ...updates });
}
