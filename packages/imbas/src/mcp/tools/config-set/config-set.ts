/**
 * @file config-set.ts
 * @description Update config.json fields
 */
import {
  applyConfigUpdates,
  loadConfig,
  saveConfig,
} from '../../../core/config-manager/config-manager.js';

export interface ConfigSetInput {
  updates: Record<string, unknown>;
}

export async function handleConfigSet(input: ConfigSetInput) {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const updated = applyConfigUpdates(config, input.updates);
  await saveConfig(cwd, updated);
  return updated;
}
