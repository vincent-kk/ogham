/**
 * @file core/config-manager.ts
 * @description Config.json CRUD with dot-path access
 * @see skills/setup/references/init-workflow.md
 */

import { join } from 'node:path';
import { readJson, writeJson } from '../lib/file-io.js';
import { CONFIG_FILENAME, IMBAS_ROOT_DIRNAME } from '../constants/index.js';
import { setNested } from '../utils/index.js';
import { ImbasConfigSchema } from '../types/config.js';
import type { ImbasConfig } from '../types/config.js';

/**
 * Load config.json from cwd/.imbas/config.json.
 * Returns validated defaults if the file does not exist.
 */
export async function loadConfig(cwd: string): Promise<ImbasConfig> {
  const filePath = join(cwd, IMBAS_ROOT_DIRNAME, CONFIG_FILENAME);
  try {
    return await readJson(filePath, ImbasConfigSchema);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('Failed to read file')) {
      // File missing — return defaults
      return ImbasConfigSchema.parse({}) as unknown as ImbasConfig;
    }
    throw err;
  }
}

/** Atomically write config.json */
export async function saveConfig(cwd: string, config: ImbasConfig): Promise<void> {
  await writeJson(join(cwd, IMBAS_ROOT_DIRNAME, CONFIG_FILENAME), config);
}

/**
 * Get a value from config by dot-path (e.g. "defaults.llm_model.validate").
 * Returns undefined if any segment is missing.
 */
export function getConfigValue(config: ImbasConfig, dotPath: string): unknown {
  const parts = dotPath.split('.');
  let current: unknown = config;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Return a new config with the value at dotPath replaced (immutable).
 * Creates intermediate objects as needed.
 */
export function setConfigValue(
  config: ImbasConfig,
  dotPath: string,
  value: unknown,
): ImbasConfig {
  const parts = dotPath.split('.');
  return setNested(config, parts, value) as ImbasConfig;
}

/**
 * Apply multiple dot-path updates at once (immutable).
 */
export function applyConfigUpdates(
  config: ImbasConfig,
  updates: Record<string, unknown>,
): ImbasConfig {
  let result = config;
  for (const [dotPath, value] of Object.entries(updates)) {
    result = setConfigValue(result, dotPath, value);
  }
  return result;
}

