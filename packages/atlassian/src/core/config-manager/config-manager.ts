import { stat, chmod } from "node:fs/promises";

import { AtlassianConfigSchema } from "../../types/index.js";
import type { AtlassianConfig } from "../../types/index.js";
import { CONFIG_PATH } from "../../constants/index.js";
import { readJson, writeJson } from "../../lib/file-io.js";

const DEFAULT_CONFIG: AtlassianConfig = {};

/** Load config from disk, merging with defaults. Returns defaults if file
 *  missing. Defense-in-depth: tighten file permissions to 0o600 if a
 *  pre-existing file was created under a permissive umask before saveConfig
 *  was hardened (mirrors loadCredentials in auth-manager). */
export async function loadConfig(
  path: string = CONFIG_PATH,
): Promise<AtlassianConfig> {
  try {
    const s = await stat(path);
    if ((s.mode & 0o077) !== 0) await chmod(path, 0o600);
  } catch {
    // ENOENT is expected on first run; the readJson catch below returns defaults
  }
  try {
    const raw = await readJson<unknown>(path);
    return AtlassianConfigSchema.parse(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...DEFAULT_CONFIG };
    }
    throw error;
  }
}

/** Save config to disk with owner-only permissions (0o600). Config holds
 *  base_url and username (email), which are sensitive identifiers worth
 *  protecting from other local users. */
export async function saveConfig(
  config: AtlassianConfig,
  path: string = CONFIG_PATH,
): Promise<void> {
  const validated = AtlassianConfigSchema.parse(config);
  await writeJson(path, validated, { mode: 0o600 });
}

/** Merge partial updates into existing config */
export function mergeConfig(
  existing: AtlassianConfig,
  updates: Partial<AtlassianConfig>,
): AtlassianConfig {
  return AtlassianConfigSchema.parse({ ...existing, ...updates });
}
